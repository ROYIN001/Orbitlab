/** Exercise the real case export callback while its data request is pending. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RealSky } from '../src/ui/orbit/sky-panel';
import { setLang, t } from '../src/i18n';
import type { CaseId, CaseSource } from '../src/worksheets/cases';
import { downloadBlob } from '../src/ui/download';

vi.mock('../src/ui/download', () => ({ downloadBlob: vi.fn() }));

class CaseElement {
  className = '';
  textContent = '';
  value = '';
  disabled = false;
  open = false;
  type = '';
  children: CaseElement[] = [];
  handlers = new Map<string, () => void>();
  constructor(readonly tag: string) {}
  append(...children: CaseElement[]): void { this.children.push(...children); }
  addEventListener(type: string, handler: () => void): void { this.handlers.set(type, handler); }
  setAttribute(): void { /* status semantics do not affect export */ }
  find(tag: string): CaseElement[] { return [this, ...this.children.flatMap((c) => c.find(tag))].filter((c) => c.tag === tag); }
}

function exportPage() {
  vi.stubGlobal('document', { documentElement: {}, createElement: (tag: string) => new CaseElement(tag) });
  setLang('en');
  let complete!: (value: CaseSource) => void;
  const input = new Promise<CaseSource>((resolve) => { complete = resolve; });
  const sky = Object.create(RealSky.prototype) as {
    caseChoice: CaseId; casesOpen: boolean; lessonCase: null;
    host: { refresh(): void }; caseInput(): Promise<CaseSource>; caseSheetsBlock(): CaseElement;
  };
  Object.assign(sky, { caseChoice: 'iridium', casesOpen: true, lessonCase: null,
    host: { refresh: vi.fn() }, caseInput: vi.fn(() => input) });
  const block = sky.caseSheetsBlock();
  return { sky, block, finish: () => complete({ activity: { f107: 140, f107a: 140, ap: 15 }, theos2: null }) };
}

afterEach(() => { setLang('en'); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('case worksheet exports keep identity across asynchronous data loading', () => {
  it.each([false, true])('keeps the clicked case in the content and filename (answer key: %s)', async (key) => {
    const { sky, block, finish } = exportPage();
    const button = block.find('button').find((b) => b.textContent === t(key ? 'cases.key' : 'cases.sheet'))!;
    expect(button.disabled).toBe(false);
    button.handlers.get('click')!();
    const select = block.find('select')[0];
    select.value = 'cz5b';
    select.handlers.get('change')!();
    expect(sky.caseChoice).toBe('cz5b');
    finish();
    await vi.waitFor(() => expect(downloadBlob).toHaveBeenCalledOnce());
    const [blob, filename] = vi.mocked(downloadBlob).mock.calls[0];
    expect(filename).toBe(`orbitlab-case-iridium${key ? '-key' : ''}-en.html`);
    const html = await blob.text();
    expect(html).toContain('Iridium 33');
    expect(html).toContain('lang="en"');
    expect(html).not.toContain('CASE-CZ5B');
  });

  it('uses the completion language consistently for content and filename without changing the UI language', async () => {
    const { block, finish } = exportPage();
    block.find('button').find((b) => b.textContent === t('cases.key'))!.handlers.get('click')!();
    setLang('th');
    const thaiTitle = t('wsc.iridium.title');
    finish();
    await vi.waitFor(() => expect(downloadBlob).toHaveBeenCalledOnce());
    const [blob, filename] = vi.mocked(downloadBlob).mock.calls[0];
    expect(filename).toBe('orbitlab-case-iridium-key-th.html');
    const html = await blob.text();
    expect(html).toContain('lang="th"');
    expect(html).toContain(thaiTitle);
    expect(document.documentElement.lang).toBe('th');
  });
});
