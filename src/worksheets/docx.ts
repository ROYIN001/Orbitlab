/**
 * Worksheets and their key as Word documents (roadmap E05), for a teacher who
 * edits the sheet before printing it. The same content as the HTML files:
 * WordprocessingML written directly, the pictures as PNG or JPEG the page
 * makes from the SVGs (`picture`), stored in a zip (`zip.ts`).
 */
import { t } from '../i18n';
import { letterOf } from './bank-items';
import { zipStore } from './zip';
import type { WsFigure, WsItem, Worksheet } from './types';

export interface Picture { bytes: Uint8Array; type: 'png' | 'jpeg'; width: number; height: number }
/** The picture of a figure, or null to leave it out. */
export type PictureOf = (figure: WsFigure) => Picture | null;

const x = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
  // characters XML 1.0 does not allow
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');

interface RunStyle { bold?: boolean; size?: number; color?: string; italic?: boolean }
const FONT = '<w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Tahoma"/>';
function run(text: string, s: RunStyle = {}): string {
  const size = (s.size ?? 10.5) * 2;
  const rpr = `<w:rPr>${FONT}${s.bold ? '<w:b/><w:bCs/>' : ''}${s.italic ? '<w:i/><w:iCs/>' : ''}${s.color ? `<w:color w:val="${s.color}"/>` : ''}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr>`;
  return `<w:r>${rpr}<w:t xml:space="preserve">${x(text)}</w:t></w:r>`;
}
function para(runs: string, o: { after?: number; keepNext?: boolean; border?: boolean; align?: 'center' } = {}): string {
  const ppr = `<w:pPr>${o.keepNext ? '<w:keepNext/>' : ''}${o.border ? '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="9CA3AF"/></w:pBdr>' : ''}`
    + `<w:spacing w:after="${o.after ?? 80}"/>${o.align ? `<w:jc w:val="${o.align}"/>` : ''}</w:pPr>`;
  return `<w:p>${ppr}${runs}</w:p>`;
}
const PAGE_BREAK = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';

const EMU_PER_MM = 36000;

class Doc {
  readonly media: Array<{ name: string; bytes: Uint8Array; type: 'png' | 'jpeg' }> = [];
  constructor(private readonly pictureOf: PictureOf) {}

  image(f: WsFigure, widthMm: number): string {
    const pic = this.pictureOf(f);
    if (!pic) return '';
    const id = this.media.length + 1;
    const name = `image${id}.${pic.type === 'png' ? 'png' : 'jpeg'}`;
    this.media.push({ name, bytes: pic.bytes, type: pic.type });
    const cx = Math.round(widthMm * EMU_PER_MM), cy = Math.round((cx * pic.height) / pic.width);
    return `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Picture ${id}"/>`
      + '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
      + `<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="${name}"/><pic:cNvPicPr/></pic:nvPicPr>`
      + `<pic:blipFill><a:blip r:embed="rIdImg${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>`
      + `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>`
      + '</a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
  }

  figure(f: WsFigure, widthMm: number): string {
    const img = this.image(f, widthMm);
    if (!img) return '';
    return para(img, { after: 20, align: 'center' }) + (f.caption ? para(run(f.caption, { size: 8.5, color: '4B5563' }), { align: 'center' }) : '');
  }
}

function table(rows: Array<[string, string]>): string {
  const border = '<w:tblBorders><w:bottom w:val="single" w:sz="4" w:color="E5E7EB"/><w:insideH w:val="single" w:sz="4" w:color="E5E7EB"/></w:tblBorders>';
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>${border}</w:tblPr><w:tblGrid><w:gridCol w:w="3600"/><w:gridCol w:w="6000"/></w:tblGrid>`
    + rows.map(([a, b]) => `<w:tr><w:tc><w:tcPr><w:tcW w:w="3600" w:type="dxa"/></w:tcPr>${para(run(a, { size: 9.5, color: '374151' }), { after: 20 })}</w:tc>`
      + `<w:tc><w:tcPr><w:tcW w:w="6000" w:type="dxa"/></w:tcPr>${para(run(b, { size: 9.5 }), { after: 20 })}</w:tc></w:tr>`).join('')
    + '</w:tbl>';
}

/** Two pictures to a row, in a table without borders. */
function pictureGrid(doc: Doc, figures: readonly WsFigure[]): string {
  const cells = figures.map((f) => doc.figure(f, 82)).filter(Boolean);
  if (!cells.length) return '';
  let rows = '';
  for (let i = 0; i < cells.length; i += 2) {
    rows += `<w:tr>${[cells[i], cells[i + 1] ?? para('')].map((c) => `<w:tc><w:tcPr><w:tcW w:w="4800" w:type="dxa"/></w:tcPr>${c}</w:tc>`).join('')}</w:tr>`;
  }
  return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/></w:tblPr><w:tblGrid><w:gridCol w:w="4800"/><w:gridCol w:w="4800"/></w:tblGrid>${rows}</w:tbl>`;
}

/** A box to work in: a one-cell table with a dashed border. */
const WORK_BOX = '<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>'
  + ['top', 'left', 'bottom', 'right'].map((s) => `<w:${s} w:val="dashed" w:sz="4" w:color="D1D5DB"/>`).join('')
  + '</w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="9600"/></w:tblGrid><w:tr><w:trPr><w:trHeight w:val="760" w:hRule="atLeast"/></w:trPr><w:tc>';

function item(doc: Doc, it: WsItem, n: number, lang: Worksheet['lang']): string {
  let out = para(run(`${n}. `, { bold: true }) + run(it.prompt, { bold: true }), { keepNext: true, after: 60 });
  if (it.figure) out += doc.figure(it.figure, it.figure.image ? 70 : 120);
  if (it.kind === 'number') {
    out += para(run(`${t('ws.answer')} ______________________ ${it.unit ?? ''}`), { after: 40 });
    out += `${WORK_BOX}${para(run(t('ws.working'), { size: 8, color: '9CA3AF' }))}</w:tc></w:tr></w:tbl>`;
  } else {
    if (it.kind === 'multi') out += para(run(t('ws.multiHint'), { size: 9, color: '4B5563', italic: true }));
    if (it.kind === 'order') out += para(run(t('ws.orderHint'), { size: 9, color: '4B5563', italic: true }));
    const box = it.kind === 'order' ? '[   ]' : '☐';
    out += (it.options ?? []).map((o, k) => para(run(`${box}  ${letterOf(lang, k)}) ${o}`), { after: 20 })).join('');
  }
  return out + para('', { after: 120 });
}

function header(sheet: Worksheet, key: boolean): string {
  return para(run(key ? t('ws.keyTitle', { title: sheet.title }) : sheet.title, { bold: true, size: 17 }), { after: 20 })
    + para(run(sheet.subtitle, { size: 9.5, color: '4B5563' }))
    + para(run(`${t('ws.name')} `, { bold: true }) + run(sheet.student || '______________________________') + run(`     ${t('ws.code')} `, { bold: true }) + run(sheet.code)
      + (key ? '' : run(`     ${t('ws.date')} `, { bold: true }) + run('____________')), { border: true, after: 160 });
}
const heading = (text: string) => para(run(text, { bold: true, size: 12.5 }), { keepNext: true, border: true, after: 80 });

function document(body: string): string {
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"'
    + ' xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">'
    + `<w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="794" w:right="794" w:bottom="794" w:left="794" w:header="400" w:footer="400" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}

function pack(body: string, doc: Doc): Uint8Array<ArrayBuffer> {
  const enc = new TextEncoder();
  const types = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
    + '<Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>'
    + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>';
  const rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  const docRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + doc.media.map((m, i) => `<Relationship Id="rIdImg${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${m.name}"/>`).join('')
    + '</Relationships>';
  return zipStore([
    { name: '[Content_Types].xml', data: enc.encode(types) },
    { name: '_rels/.rels', data: enc.encode(rels) },
    { name: 'word/document.xml', data: enc.encode(document(body)) },
    { name: 'word/_rels/document.xml.rels', data: enc.encode(docRels) },
    ...doc.media.map((m) => ({ name: `word/media/${m.name}`, data: m.bytes })),
  ]);
}

/** The students' sheets in one document, each on a new page. No answers. */
export function worksheetsDocx(sheets: readonly Worksheet[], pictureOf: PictureOf): Uint8Array<ArrayBuffer> {
  const doc = new Doc(pictureOf);
  const body = sheets.map((sheet) => {
    let n = 0;
    let out = header(sheet, false);
    for (const s of sheet.sections) {
      out += heading(s.title);
      if (s.intro) out += para(run(s.intro, { size: 9.5, color: '4B5563' }));
      if (s.table?.length) out += table(s.table) + para('');
      if (s.figures?.length) out += pictureGrid(doc, s.figures) + para('');
      for (const it of s.items) out += item(doc, it, ++n, sheet.lang);
    }
    return out + para(run(t('ws.footer', { date: sheet.generatedAt.toISOString().slice(0, 10) }), { size: 8.5, color: '6B7280' }));
  }).join(PAGE_BREAK);
  return pack(body, doc);
}

/** The key: every student's answers, with tolerances and working. */
export function answerKeyDocx(sheets: readonly Worksheet[]): Uint8Array<ArrayBuffer> {
  const doc = new Doc(() => null);
  const body = sheets.map((sheet) => {
    let n = 0;
    let out = header(sheet, true);
    for (const s of sheet.sections) {
      if (!s.items.length) continue;
      out += heading(s.title);
      for (const it of s.items) {
        out += para(run(`${++n}. `, { bold: true }) + run(it.answer.text, { bold: true, color: '065F46' }) + (it.answer.tolerance ? run(`  (${it.answer.tolerance})`, { color: '4B5563' }) : ''), { after: 20 });
        if (it.answer.working) out += para(run(it.answer.working, { size: 9, color: '374151' }), { after: 100 });
      }
    }
    return out;
  }).join(PAGE_BREAK);
  return pack(body, doc);
}
