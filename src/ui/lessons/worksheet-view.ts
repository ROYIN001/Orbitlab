/**
 * The lessons page's Worksheets tab (roadmap E05): make printable sheets from
 * the flight on screen — the open lesson's, or any mission's — for a class,
 * each student with their own numbers, and the answer key as a separate file,
 * as HTML to print or as a Word document. The sheets are built by
 * `src/worksheets/`; this view gathers the form, turns the SVG pictures into
 * PNG and the photographs into bytes for the files, and saves them.
 */
import { getLang, t } from '../../i18n';
import { vehicleById } from '../../data/vehicles';
import { siteById } from '../../data/sites';
import { questionBank, FLIGHT_DATA } from '../../lessons/assessment/bank';
import { DOMAINS, type Domain, type Lesson } from '../../lessons/types';
import { lessonNumber } from '../../lessons/catalog';
import { localText } from '../../lessons/text';
import { buildClass, worksheetSource } from '../../worksheets/build';
import { answerKeyHtml, worksheetsHtml } from '../../worksheets/html';
import { answerKeyDocx, worksheetsDocx, type Picture } from '../../worksheets/docx';
import { printSvg, svgSize } from '../../worksheets/print-svg';
import type { WsFigure, Worksheet } from '../../worksheets/types';
import type { WsFlight } from '../../worksheets/flight-questions';
import type { ProgressData } from '../../lessons/progress';
import { siteName } from '../names';
import { downloadBlob } from '../download';

export interface WorksheetHost {
  /** the flight on screen, and whether it has ended (the answers need all of it) */
  flight(): { flight: WsFlight; ended: boolean } | null;
  /** the lesson open now, if any */
  lesson(): Lesson | null;
  progress(): ProgressData;
}

const STORE = 'orbitlab.worksheets';
interface Form { students: string; classCode: string; flightCount: number; bankCount: number; domains: Domain[]; format: 'html' | 'docx' }

function loadForm(): Form {
  const fallback: Form = { students: '', classCode: String(1000 + Math.floor(Math.random() * 9000)), flightCount: 6, bankCount: 4, domains: [...DOMAINS], format: 'html' };
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Partial<Form> | null;
    return raw ? { ...fallback, ...raw } : fallback;
  } catch { return fallback; }
}
function saveForm(f: Form): void {
  try { localStorage.setItem(STORE, JSON.stringify(f)); } catch { /* a convenience only */ }
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
};
const base = import.meta.env.BASE_URL;

/** Every figure the sheets carry. */
function figuresOf(sheets: readonly Worksheet[]): WsFigure[] {
  return sheets.flatMap((s) => s.sections.flatMap((sec) => [...(sec.figures ?? []), ...sec.items.flatMap((i) => (i.figure ? [i.figure] : []))]));
}

async function photoBytes(address: string): Promise<Picture | null> {
  try {
    const blob = await (await fetch(`${base}${address}`)).blob();
    const bitmap = await createImageBitmap(blob);
    return { bytes: new Uint8Array(await blob.arrayBuffer()), type: 'jpeg', width: bitmap.width, height: bitmap.height };
  } catch { return null; }
}

async function svgPng(svg: string): Promise<Picture | null> {
  const printed = printSvg(svg);
  const { width, height } = svgSize(printed);
  const scale = 2.5;
  const url = URL.createObjectURL(new Blob([printed], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    const g = canvas.getContext('2d')!;
    g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height);
    g.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/png'));
    return blob ? { bytes: new Uint8Array(await blob.arrayBuffer()), type: 'png', width, height } : null;
  } catch { return null; } finally { URL.revokeObjectURL(url); }
}

const dataUrl = (p: Picture): string => {
  let s = '';
  for (let i = 0; i < p.bytes.length; i += 0x8000) s += String.fromCharCode(...p.bytes.subarray(i, i + 0x8000));
  return `data:image/${p.type};base64,${btoa(s)}`;
};

class WorksheetView {
  private form = loadForm();
  private status = '';

  constructor(private readonly host: WorksheetHost, private readonly container: HTMLElement) {}

  applyLanguage(): void { this.render(); }

  private sheets(): Worksheet[] | null {
    const f = this.host.flight();
    if (!f?.ended) return null;
    const lesson = this.host.lesson() ?? undefined;
    return buildClass({
      flight: f.flight, lang: getLang(), generatedAt: new Date(), lesson, classCode: this.form.classCode,
      flightCount: this.form.flightCount, bankCount: this.form.bankCount, domains: this.form.domains,
      bank: questionBank(this.host.progress().customQuestions), data: FLIGHT_DATA,
    }, this.form.students.split('\n'));
  }

  private fileName(kind: 'worksheets' | 'key', sheets: Worksheet[], ext: string): string {
    const source = worksheetSource({ lesson: this.host.lesson() ?? undefined, flight: this.host.flight()!.flight }).replace(/[^a-z0-9]+/gi, '-').replace(/-+$/, '').slice(0, 60);
    const code = this.form.classCode.replace(/[^\p{L}\p{N}]+/gu, '') || 'class';
    return `orbitlab-${kind}-${source}-${code}-${sheets[0].lang}.${ext}`;
  }

  private async make(kind: 'worksheets' | 'key'): Promise<void> {
    const sheets = this.sheets();
    if (!sheets) return;
    const docx = this.form.format === 'docx';
    let blob: Blob;
    if (kind === 'key') {
      blob = docx ? new Blob([answerKeyDocx(sheets)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
        : new Blob([answerKeyHtml(sheets)], { type: 'text/html' });
    } else {
      const pictures = new Map<string, Picture | null>();
      for (const f of figuresOf(sheets)) {
        const id = f.image ?? f.svg ?? '';
        if (!id || pictures.has(id)) continue;
        if (f.image) pictures.set(id, await photoBytes(f.image));
        else if (docx) pictures.set(id, await svgPng(f.svg!));
      }
      if (docx) {
        blob = new Blob([worksheetsDocx(sheets, (f) => pictures.get(f.image ?? f.svg ?? '') ?? null)], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      } else {
        const images: Record<string, string> = {};
        for (const [id, p] of pictures) if (p && !id.startsWith('<svg')) images[id] = dataUrl(p);
        blob = new Blob([worksheetsHtml(sheets, images)], { type: 'text/html' });
      }
    }
    const name = this.fileName(kind, sheets, docx ? 'docx' : 'html');
    downloadBlob(blob, name);
    this.status = t('ws.made', { file: name });
    this.render();
  }

  render(): void {
    const body = el('div', 'ws-page');
    body.append(el('h2', undefined, t('ws.tab')), el('p', 'lead', t('ws.page.lead')));
    // the flight
    const src = el('div', 'ws-source');
    src.append(el('span', 'lesson-eyebrow', t('ws.source')));
    const f = this.host.flight(), lesson = this.host.lesson();
    const cfg = f?.flight.cfg;
    const what = lesson ? t('ws.source.lesson', { n: lessonNumber(lesson), title: localText(lesson.title) })
      : cfg ? t('ws.source.mission', { vehicle: vehicleById(cfg.vehicleId).name, site: siteName(siteById(cfg.siteId)) }) : '';
    if (what) src.append(el('p', 'ws-what', what));
    if (!f?.ended) src.append(el('p', 'lesson-note fail', t('ws.source.none')));
    body.append(src);
    // the form
    const grid = el('div', 'ws-form');
    const students = el('textarea');
    students.rows = 6;
    students.value = this.form.students;
    students.addEventListener('input', () => { this.form.students = students.value; saveForm(this.form); });
    const field = (label: string, control: HTMLElement, cls = '') => { const l = el('label', `ws-field ${cls}`); l.append(el('span', undefined, label), control); grid.append(l); };
    field(t('ws.students'), students, 'wide');
    const code = el('input');
    code.value = this.form.classCode;
    code.addEventListener('input', () => { this.form.classCode = code.value; saveForm(this.form); });
    field(t('ws.classCode'), code);
    const number = (value: number, max: number, set: (v: number) => void) => {
      const input = el('input');
      input.type = 'number'; input.min = '0'; input.max = String(max); input.value = String(value);
      input.addEventListener('change', () => { set(Math.max(0, Math.min(max, Math.round(Number(input.value) || 0)))); saveForm(this.form); });
      return input;
    };
    field(t('ws.flightCount'), number(this.form.flightCount, 11, (v) => { this.form.flightCount = v; }));
    field(t('ws.bankCount'), number(this.form.bankCount, 12, (v) => { this.form.bankCount = v; }));
    const format = el('select');
    for (const k of ['html', 'docx'] as const) { const o = el('option', undefined, t(`ws.format.${k}`)); o.value = k; format.append(o); }
    format.value = this.form.format;
    format.addEventListener('change', () => { this.form.format = format.value as Form['format']; saveForm(this.form); });
    field(t('ws.format'), format);
    const areas = el('div', 'ws-areas');
    for (const d of DOMAINS) {
      const box = el('label', 'checkbox');
      const input = el('input');
      input.type = 'checkbox';
      input.checked = this.form.domains.includes(d);
      input.addEventListener('change', () => {
        this.form.domains = DOMAINS.filter((x) => (x === d ? input.checked : this.form.domains.includes(x)));
        saveForm(this.form);
      });
      box.append(input, document.createTextNode(` ${d} · ${t(`assess.domain.${d}`)}`));
      areas.append(box);
    }
    field(t('ws.areas'), areas, 'wide');
    body.append(grid);
    const actions = el('div', 'assess-actions ws-actions');
    const button = (label: string, kind: 'worksheets' | 'key', primary: boolean) => {
      const b = el('button', primary ? 'lesson-primary' : '', label);
      b.type = 'button';
      b.disabled = !f?.ended;
      b.addEventListener('click', () => void this.make(kind));
      actions.append(b);
    };
    button(t('ws.makeKey'), 'key', false);
    button(t('ws.makeSheets'), 'worksheets', true);
    body.append(el('p', 'small', t('ws.languageNote')), actions);
    if (this.status) body.append(el('p', 'lesson-note ok', this.status));
    this.container.replaceChildren(body);
  }
}

export function renderWorksheets(host: WorksheetHost, container: HTMLElement): { applyLanguage(): void } {
  const view = new WorksheetView(host, container);
  view.render();
  return view;
}
