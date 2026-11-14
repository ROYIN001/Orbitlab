/**
 * The Structure section's small DOM helpers: elements with a class and text,
 * and buttons that keep their place across a redraw (`data-k`: the screen
 * puts the focus back on the control that had it).
 */

export const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
};

export interface ButtonOptions {
  /** a toggle's state (`aria-pressed`) */
  pressed?: boolean;
  /** the chosen one of a set (`aria-current`) */
  current?: boolean;
  disabled?: boolean;
  cls?: string;
  title?: string;
  /** a small mark before the words (drawn, not read) */
  glyph?: string;
  /** the accessible name, when the words on the button are not enough */
  label?: string;
}

/** A button with its key for the redraw (`k`), words and action. */
export function button(text: string, k: string, onClick: () => void, opts: ButtonOptions = {}): HTMLButtonElement {
  const b = el('button', `st-btn${opts.cls ? ` ${opts.cls}` : ''}`);
  b.type = 'button';
  b.dataset.k = k;
  if (opts.glyph) {
    const g = el('span', 'st-glyph', opts.glyph);
    g.setAttribute('aria-hidden', 'true');
    b.append(g);
  }
  if (text) b.append(el('span', 'st-btn-text', text));
  if (opts.pressed !== undefined) b.setAttribute('aria-pressed', String(opts.pressed));
  if (opts.current !== undefined && opts.current) b.setAttribute('aria-current', 'true');
  if (opts.disabled) b.disabled = true;
  if (opts.title) b.title = opts.title;
  if (opts.label) b.setAttribute('aria-label', opts.label);
  b.addEventListener('click', onClick);
  return b;
}

/** A link styled as a button (an address of the section: Back returns from it). */
export function link(text: string, k: string, href: string, opts: { current?: boolean; cls?: string; title?: string } = {}): HTMLAnchorElement {
  const a = el('a', `st-btn${opts.cls ? ` ${opts.cls}` : ''}`, text);
  a.href = href;
  a.dataset.k = k;
  if (opts.current) a.setAttribute('aria-current', 'true');
  if (opts.title) a.title = opts.title;
  return a;
}

/** A definition list of rows; `mark` puts a `data-*` name on the value (the journeys read figures by it). */
export function facts(rows: readonly { label: string; value: string | Node; mark?: [string, string]; cls?: string }[], cls = 'st-facts'): HTMLDListElement {
  const dl = el('dl', cls);
  for (const r of rows) {
    const dd = el('dd', r.cls ?? '');
    dd.append(r.value);
    if (r.mark) dd.dataset[r.mark[0]] = r.mark[1];
    dl.append(el('dt', '', r.label), dd);
  }
  return dl;
}

const SVG = 'http://www.w3.org/2000/svg';
export const svg = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number> = {}): SVGElementTagNameMap[K] => {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};

export const reducedMotion = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
