/**
 * Worksheets and their key as HTML (roadmap E05): self-contained files laid
 * out for A4, so the browser's "Print → Save as PDF" makes the paper. The
 * sheets hold no answer; the key is a file of its own, one block per student.
 */
import { t } from '../i18n';
import { letterOf } from './bank-items';
import { printSvg } from './print-svg';
import type { WsFigure, WsItem, Worksheet } from './types';

const esc = (text: string): string => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Image addresses (a vehicle's photograph) to what the file embeds, e.g. a data URL. */
export type ImageSources = Readonly<Record<string, string>>;

const STYLE = `
@page { size: A4; margin: 14mm 14mm; }
:root { color-scheme: light; }
body { margin: 0 auto; max-width: 182mm; padding: 8mm 0; font: 10.5pt/1.5 "Noto Sans", "Noto Sans Thai", "DM Sans", "Segoe UI", Tahoma, system-ui, sans-serif; color: #111827; background: #fff; }
article + article { break-before: page; margin-top: 12mm; }
h1 { font-size: 17pt; margin: 0 0 1mm; }
h2 { font-size: 12.5pt; margin: 6mm 0 2mm; border-bottom: 1px solid #d1d5db; padding-bottom: 1mm; break-after: avoid; }
.sub, .meta { margin: 0; color: #4b5563; font-size: 9.5pt; }
.who { display: flex; gap: 8mm; margin: 3mm 0 1mm; font-size: 10.5pt; }
.who span { flex: 1; border-bottom: 1px solid #6b7280; padding-bottom: 1mm; }
.who b { font-weight: 600; margin-right: 2mm; }
table { width: 100%; border-collapse: collapse; margin: 1mm 0; }
th, td { text-align: left; vertical-align: top; padding: 0.8mm 2mm; border-bottom: 1px solid #e5e7eb; font-size: 9.5pt; }
th { width: 38%; font-weight: 500; color: #374151; }
.charts { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; }
figure { margin: 0; break-inside: avoid; }
figure svg, figure img { width: 100%; height: auto; max-height: 85mm; object-fit: contain; }
figcaption { font-size: 8.5pt; color: #4b5563; text-align: center; }
ol.items { padding-left: 7mm; margin: 2mm 0; }
ol.items > li { margin: 0 0 5mm; break-inside: avoid; }
.q { margin: 0 0 1.5mm; font-weight: 500; }
.q-figure { max-width: 120mm; margin: 1mm 0 2mm; }
.opts { list-style: none; padding: 0; margin: 0; }
.opts li { margin: 0.6mm 0; }
.box { display: inline-block; width: 4mm; height: 4mm; border: 1px solid #374151; margin-right: 2mm; vertical-align: -0.6mm; }
.box.wide { width: 8mm; border-radius: 1mm; }
.answer { margin-top: 2mm; }
.answer span { display: inline-block; min-width: 45mm; border-bottom: 1px solid #374151; margin: 0 2mm; }
.work { height: 14mm; border: 1px dashed #d1d5db; border-radius: 1.5mm; margin-top: 1.5mm; color: #9ca3af; font-size: 8pt; padding: 0.5mm 1.5mm; }
.key li { margin: 0 0 3mm; }
.key .a { font-weight: 600; color: #065f46; }
.key .tol { color: #4b5563; }
.key .w { color: #374151; font-size: 9pt; margin: 0.5mm 0 0; }
footer { margin-top: 8mm; border-top: 1px solid #d1d5db; padding-top: 2mm; color: #6b7280; font-size: 8.5pt; }
`;

function figureHtml(f: WsFigure, images: ImageSources, cls = ''): string {
  const body = f.svg ? printSvg(f.svg) : f.image ? `<img src="${esc(images[f.image] ?? f.image)}" alt="">` : '';
  if (!body) return '';
  return `<figure class="${cls}">${body}${f.caption ? `<figcaption>${esc(f.caption)}</figcaption>` : ''}</figure>`;
}

function itemHtml(item: WsItem, sheet: Worksheet, images: ImageSources): string {
  const parts = [`<p class="q">${esc(item.prompt)}</p>`];
  if (item.figure) parts.push(figureHtml(item.figure, images, 'q-figure'));
  const lang = sheet.lang;
  if (item.kind === 'number') {
    parts.push(`<p class="answer">${esc(t('ws.answer'))}<span></span>${esc(item.unit ?? '')}</p><div class="work">${esc(t('ws.working'))}</div>`);
  } else if (item.kind === 'order') {
    parts.push(`<p class="meta">${esc(t('ws.orderHint'))}</p><ul class="opts">${(item.options ?? []).map((o, k) =>
      `<li><span class="box wide"></span>${esc(letterOf(lang, k))}) ${esc(o)}</li>`).join('')}</ul>`);
  } else {
    if (item.kind === 'multi') parts.push(`<p class="meta">${esc(t('ws.multiHint'))}</p>`);
    parts.push(`<ul class="opts">${(item.options ?? []).map((o, k) => `<li><span class="box"></span>${esc(letterOf(lang, k))}) ${esc(o)}</li>`).join('')}</ul>`);
  }
  return `<li>${parts.join('')}</li>`;
}

function head(sheet: Worksheet, key: boolean): string {
  const name = sheet.student ? esc(sheet.student) : '';
  return `<header><h1>${esc(key ? t('ws.keyTitle', { title: sheet.title }) : sheet.title)}</h1><p class="sub">${esc(sheet.subtitle)}</p>`
    + `<div class="who"><span><b>${esc(t('ws.name'))}</b>${name}</span><span><b>${esc(t('ws.code'))}</b>${esc(sheet.code)}</span>${key ? '' : `<span><b>${esc(t('ws.date'))}</b></span>`}</div></header>`;
}

function doc(title: string, lang: string, body: string): string {
  return `<!doctype html>\n<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">`
    + `<title>${esc(title)}</title><style>${STYLE}</style></head><body>${body}</body></html>\n`;
}

/** The students' sheets, one after another, each starting a page. No answers. */
export function worksheetsHtml(sheets: readonly Worksheet[], images: ImageSources = {}): string {
  const articles = sheets.map((sheet) => {
    let n = 0;
    const sections = sheet.sections.map((s) => {
      let html = `<section><h2>${esc(s.title)}</h2>`;
      if (s.intro) html += `<p class="meta">${esc(s.intro)}</p>`;
      if (s.table?.length) html += `<table><tbody>${s.table.map(([a, b]) => `<tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td></tr>`).join('')}</tbody></table>`;
      if (s.figures?.length) html += `<div class="charts">${s.figures.map((f) => figureHtml(f, images)).join('')}</div>`;
      if (s.items.length) html += `<ol class="items" start="${n + 1}">${s.items.map((i) => itemHtml(i, sheet, images)).join('')}</ol>`;
      n += s.items.length;
      return `${html}</section>`;
    }).join('');
    return `<article>${head(sheet, false)}${sections}<footer>${esc(t('ws.footer', { date: sheet.generatedAt.toISOString().slice(0, 10) }))}</footer></article>`;
  });
  return doc(sheets[0]?.title ?? 'Orbitlab', sheets[0]?.lang ?? 'en', articles.join('\n'));
}

/** The key: for each student, every answer with its tolerance and how it is worked out. */
export function answerKeyHtml(sheets: readonly Worksheet[]): string {
  const articles = sheets.map((sheet) => {
    let n = 0;
    const blocks = sheet.sections.filter((s) => s.items.length).map((s) => {
      const list = s.items.map((i) => {
        const tol = i.answer.tolerance ? ` <span class="tol">(${esc(i.answer.tolerance)})</span>` : '';
        return `<li><span class="a">${esc(i.answer.text)}</span>${tol}${i.answer.working ? `<p class="w">${esc(i.answer.working)}</p>` : ''}</li>`;
      }).join('');
      const html = `<h2>${esc(s.title)}</h2><ol class="key" start="${n + 1}">${list}</ol>`;
      n += s.items.length;
      return html;
    }).join('');
    return `<article>${head(sheet, true)}${blocks}</article>`;
  });
  return doc(t('ws.keyTitle', { title: sheets[0]?.title ?? '' }), sheets[0]?.lang ?? 'en', articles.join('\n'));
}
