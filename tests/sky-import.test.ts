/** Real-satellite imports must keep accepted data and its provenance together. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import iss from './fixtures/gp/iss.json?raw';
import { MAX_IMPORT_BYTES, RealSky } from '../src/ui/orbit/sky-panel';
import type { SkyObject, SkySourceId } from '../src/orbit/real-sky';

/** Only the DOM operations used to render the import report, not the whole page. */
class ReportElement {
  className = '';
  private text = '';
  private children: ReportElement[] = [];
  get textContent(): string { return this.text + this.children.map((child) => child.textContent).join('\n'); }
  set textContent(value: string) { this.text = value; }
  append(...children: ReportElement[]): void { this.children.push(...children); }
  setAttribute(): void { /* attributes do not affect report text */ }
}

interface PageState {
  source: SkySourceId;
  selected: SkyObject | null;
  imported: unknown;
  objects(source?: SkySourceId): SkyObject[];
  importReport(): HTMLElement;
}

function page(): { sky: RealSky; state: PageState } {
  const sky = new RealSky({
    level: () => 'explore',
    provider: () => { throw new Error('Import must not need a provider'); },
    refresh: vi.fn(), refreshFacts: vi.fn(), toPlayground: vi.fn(),
  });
  vi.stubGlobal('document', { createElement: () => new ReportElement() });
  return { sky, state: sky as unknown as PageState };
}

const file = (name: string, text: string): File => new File([text], name);
afterEach(() => vi.unstubAllGlobals());

describe('RealSky accepted imports survive a rejected replacement', () => {
  it('keeps the selected satellite, provenance and records even when the object cache is rebuilt', async () => {
    const { sky, state } = page();
    await sky.importFile(file('accepted.json', iss));
    const selected = state.selected!;
    expect(selected.el.satnum).toBe(25544);
    const accepted = sky.overInputs();
    expect(accepted.data).toEqual({ from: 'file', asOf: 'accepted.json', fetched: '1' });

    await sky.importFile(file('rejected.json', '[not json'));
    expect(sky.overInputs()).toEqual(accepted);
    expect(sky.screeningInputs(selected).file).toBe('accepted.json#1');
    expect(state.selected).toBe(selected);
    const report = state.importReport().textContent;
    expect(report).toContain('No element set could be read from rejected.json.');
    expect(report).toContain('1 element sets read from accepted.json (JSON).');

    // Switching data mode discards cached objects; it must not discard the file.
    sky.reset();
    expect(state.objects().map((object) => object.el.satnum)).toEqual([25544]);
    expect(state.selected?.key).toBe(selected.key);
    expect(sky.overInputs()).toEqual(accepted);
  });

  it('does not create an imported source from the first invalid file', async () => {
    const { sky, state } = page();
    await sky.importFile(file('rejected.json', '[not json'));
    expect(state.imported).toBeNull();
    expect(state.source).toBe('stations');
    expect(state.objects('imported')).toEqual([]);
    expect(state.importReport().textContent).toContain('No element set could be read from rejected.json.');
  });

  it.each(['empty', 'oversized'] as const)('shows only the latest %s-file diagnostic after an earlier rejection', async (kind) => {
    const { sky, state } = page();
    await sky.importFile(file('accepted.json', iss));
    const accepted = sky.overInputs();
    await sky.importFile(file('rejected.json', '[not json'));
    expect(state.importReport().textContent).toContain('1 could not be read:');

    const text = vi.fn(async () => iss);
    await sky.importFile(kind === 'empty' ? file('empty.txt', '') : {
      name: 'oversized.json', size: MAX_IMPORT_BYTES + 1, text,
    } as unknown as File);
    expect(text).not.toHaveBeenCalled();
    expect(sky.overInputs()).toEqual(accepted);
    const report = state.importReport().textContent;
    expect(report).toContain(kind === 'empty' ? 'No element set could be read from empty.txt.' : 'The file is larger than 30 MB.');
    expect(report).not.toContain('could not be read:');
    expect(report).toContain('1 element sets read from accepted.json (JSON).');
  });

  it('accepts a later partially valid file and updates the selected object and provenance together', async () => {
    const { sky, state } = page();
    await sky.importFile(file('accepted.json', iss));
    await sky.importFile(file('rejected.json', '[not json'));
    const replacement = { ...JSON.parse(iss)[0], NORAD_CAT_ID: 100828, OBJECT_NAME: 'Replacement satellite' };
    await sky.importFile(file('replacement.json', JSON.stringify([replacement, { NORAD_CAT_ID: 42 }])));
    expect(state.objects().map((object) => object.el.satnum)).toEqual([100828]);
    expect(state.selected?.el.satnum).toBe(100828);
    expect(sky.overInputs().data).toEqual({ from: 'file', asOf: 'replacement.json', fetched: '2' });
    const report = state.importReport().textContent;
    expect(report).toContain('1 element sets read from replacement.json (JSON).');
    expect(report).toContain('1 could not be read:');
    expect(report).not.toContain('accepted.json');
    sky.reset();
    expect(state.objects().map((object) => object.el.satnum)).toEqual([100828]);
  });
});
