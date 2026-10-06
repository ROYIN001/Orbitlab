/**
 * No style sheet animates forever where less motion may be asked for. An
 * infinite CSS animation keeps the compositor drawing every frame for as long
 * as its element is on screen: on the CI's software GPU the two attention cues
 * of the landing page (the lesson button's glow and the "more below" arrow)
 * kept the GPU process busy enough to stall a page reload by ~13 s. So an
 * `animation` (or `animation-iteration-count`) with `infinite` iterations has
 * to sit inside `@media (prefers-reduced-motion: no-preference)`; an
 * attention cue pulses a few times and then rests highlighted instead.
 *
 * The project has no node types (tsconfig: vite/client only), so node's
 * modules are loaded through a non-literal dynamic import, as in
 * tests/repo-hygiene.test.ts.
 */
import { describe, expect, it } from 'vitest';

interface FsModule {
  readdirSync(path: string, options: { recursive: true }): string[];
  readFileSync(path: string, encoding: 'utf8'): string;
}
interface UrlModule {
  fileURLToPath(url: string | URL): string;
}
const load = (id: string): Promise<unknown> => import(/* @vite-ignore */ id);
const { readdirSync, readFileSync } = (await load('node:fs')) as FsModule;
const { fileURLToPath } = (await load('node:url')) as UrlModule;

const srcDir = fileURLToPath(new URL('../src/', import.meta.url));
const sheets = readdirSync(srcDir, { recursive: true }).filter((f) => f.endsWith('.css')).map((f) => f.replace(/\\/g, '/')).sort();

/** Every declaration in a sheet, with the at-rule and selector preludes it sits inside. */
function declarations(css: string): { decl: string; within: string[] }[] {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: { decl: string; within: string[] }[] = [];
  const stack: string[] = [];
  let buf = '';
  for (const ch of text) {
    if (ch === '{') { stack.push(buf.trim()); buf = ''; }
    else if (ch === ';' || ch === '}') {
      if (buf.trim() && stack.length) out.push({ decl: buf.trim(), within: [...stack] });
      buf = '';
      if (ch === '}') stack.pop();
    } else buf += ch;
  }
  return out;
}

const infinite = (decl: string) => /^animation(-iteration-count)?\s*:[^]*\binfinite\b/i.test(decl);
const motionAllowed = (within: string[]) => within.some((p) => /^@media\b[^]*prefers-reduced-motion\s*:\s*no-preference/i.test(p));

describe('CSS motion', () => {
  it('finds the style sheets', () => {
    expect(sheets.length).toBeGreaterThan(5);
  });

  it('the scanner sees an infinite animation and its media query', () => {
    const found = declarations('a{animation:x 1s infinite}@media (prefers-reduced-motion: no-preference){b{color:red;animation-iteration-count:infinite}}')
      .filter((d) => infinite(d.decl));
    expect(found.map((d) => motionAllowed(d.within))).toEqual([false, true]);
  });

  it('every infinite animation sits inside @media (prefers-reduced-motion: no-preference)', () => {
    const offenders = sheets.flatMap((file) => declarations(readFileSync(srcDir + file, 'utf8'))
      .filter((d) => infinite(d.decl) && !motionAllowed(d.within))
      .map((d) => `src/${file}: ${d.within.at(-1)} { ${d.decl} }`));
    expect(offenders).toEqual([]);
  });
});
