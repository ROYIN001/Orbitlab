/**
 * M-LAUNCH-029 (FX-5): the Compare table's "This flight" column reads the
 * flight at the replay cursor, like the HUD and the telemetry panel, and in
 * the live run it reads exactly what it read before.
 */
import mainSource from '../src/main.ts?raw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as compare from '../src/ui/compare';
import { ComparePanel, type CompareHost } from '../src/ui/compare';
import { referenceFromFlight, type ReferenceFlight } from '../src/replay/reference';
import { missionDocument, type MissionState } from '../src/config/mission-file';
import { orbitById } from '../src/data/orbits';
import { DEFAULT_FAILURE } from '../src/physics/defaults';
import type { TelemetrySample } from '../src/physics/sim/types';
import type { SimEvent } from '../src/physics/simulation';

/** The few DOM calls the panel makes; the table is read back as text. */
class Node {
  readonly tagName: string;
  children: Node[] = [];
  textContent = ''; className = ''; id = ''; type = ''; accept = ''; title = ''; value = '';
  hidden = false; disabled = false; files: null = null;
  constructor(tag: string) { this.tagName = tag.toUpperCase(); }
  append(...c: (Node | string)[]): void { this.children.push(...c.map(asNode)); }
  replaceChildren(...c: (Node | string)[]): void { this.children = c.map(asNode); }
  setAttribute(): void {}
  addEventListener(): void {}
  click(): void {}
  createTHead(): Node { return this.add('thead'); }
  createTBody(): Node { return this.add('tbody'); }
  insertRow(): Node { return this.add('tr'); }
  private add(tag: string): Node { const n = new Node(tag); this.children.push(n); return n; }
  all(tag: string): Node[] { return this.children.flatMap((c) => [...(c.tagName === tag.toUpperCase() ? [c] : []), ...c.all(tag)]); }
  text(): string { return this.textContent + this.children.map((c) => c.text()).join(''); }
  /** the whole subtree, as a string to compare two renders by */
  dump(): string {
    return `<${this.tagName} ${this.className}|${this.id}|${this.textContent}>${this.children.map((c) => c.dump()).join('')}</>`;
  }
}
const asNode = (c: Node | string): Node => (typeof c === 'string' ? Object.assign(new Node('#text'), { textContent: c }) : c);

beforeEach(() => { vi.stubGlobal('document', { createElement: (tag: string) => new Node(tag) }); });
afterEach(() => { vi.unstubAllGlobals(); });

const MISSION: MissionState = {
  vehicleId: 'falcon9', satelliteId: 'cubesats', siteId: 'cape', orbitId: 'starlink', orbit: { ...orbitById('starlink') },
  launchTime: new Date('2026-10-01T13:37:00Z'), guidanceOverrides: {}, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false, payloadMass: 5000,
};

function telemetry(n: number): TelemetrySample[] {
  return Array.from({ length: n }, (_, i) => {
    const t = -10 + i * 0.1;
    return {
      t, alt: Math.max(0, t) * 60, vInertial: 400 + Math.max(0, t) * 12, vAir: 0, q: t > 0 && t < 160 ? 30000 * Math.sin((t / 160) * Math.PI) : 0,
      mach: 0, gLoad: 1 + Math.max(0, t) / 300, mass: 5e5, thrust: 0, throttle: 1, pitch: 90, ap: t > 500 ? 550e3 : 0, pe: t > 500 ? 540e3 : -6.4e6,
      inc: 53, dvRemaining: 9000 - Math.max(0, t), downrange: 0, lat: 0, lon: 0, stage: 0, phase: 'ascent',
    };
  });
}

const EVENTS: SimEvent[] = [
  { t: 0, key: 'evt.liftoff', severity: 'info' },
  { t: 72, key: 'evt.maxQ', severity: 'info' },
  { t: 150, key: 'evt.meco', severity: 'info' },
  { t: 520, key: 'evt.targetOrbit', severity: 'success' },
];

type Flight = { telemetry: TelemetrySample[]; events: SimEvent[] };

/** The live run: recorded to T+590 s, in orbit. */
const LIVE: Flight = { telemetry: telemetry(6000), events: EVENTS };
/** What the frame-backed view holds with the cursor at `t`: everything recorded by then. */
const atCursor = (t: number): Flight => ({ telemetry: LIVE.telemetry.filter((s) => s.t <= t), events: EVENTS.filter((e) => e.t <= t) });

function reference(): ReferenceFlight {
  const tel = telemetry(6000);
  return referenceFromFlight({
    label: 'Falcon 9 · PEG', mission: missionDocument(MISSION), launchJd: 2461315.07, telemetry: tel, events: EVENTS,
    path: tel.map((s) => ({ t: s.t, r: { x: 6.4e6 + s.alt, y: s.t * 1000, z: 1e5 } })),
  });
}

function mount(current: CompareHost['current']): { panel: ComparePanel; root: Node } {
  const panel = new ComparePanel({ currentAsReference: () => null, current, onReference: () => {} });
  panel.setReference(reference());
  return { panel, root: panel.root as unknown as Node };
}

/** The "This flight" cell of the row whose label is `label`. */
function currentCell(root: Node, label: string): string {
  const row = root.all('tr').find((tr) => tr.children[0]?.text() === label);
  if (!row) throw new Error(`no row ${label}`);
  return row.children[1].text();
}

describe('Compare table follows the replay cursor (M-LAUNCH-029)', () => {
  it('in replay, the current column is the flight at the cursor, not the live head, and moves with it', () => {
    const flightOnScreen = (compare as Record<string, unknown>).flightOnScreen as
      (<T>(live: boolean, liveRun: T | null, atCursor: T | null) => T | null) | undefined;
    expect(flightOnScreen, 'compare.ts exports flightOnScreen').toBeTypeOf('function');
    let cursor = 60;
    const { panel, root } = mount(() => flightOnScreen!(false, LIVE, atCursor(cursor)));
    // T+60 s: max g so far is 1.20, Δv left 8940 m/s, no MECO yet
    expect(currentCell(root, 'Maximum load factor')).toBe('1.20 g');
    expect(currentCell(root, 'Δv left at the end')).toBe('8,940 m/s');
    // scrub forward to T+120 s: the column changes with the cursor
    cursor = 120;
    panel.update();
    expect(currentCell(root, 'Maximum load factor')).toBe('1.40 g');
    expect(currentCell(root, 'Δv left at the end')).toBe('8,880 m/s');
    // and the live head (T+590 s) is not what is shown
    expect(currentCell(root, 'Maximum load factor')).not.toBe('2.97 g');
  });

  it('the app hands the panel the flight on screen: live run while live, the frame-backed view otherwise', () => {
    const main = mainSource;
    const hook = main.slice(main.indexOf('new ComparePanel('), main.indexOf('this.tel.compareHost.append'));
    expect(hook).toMatch(/current:\s*\(\)\s*=>\s*flightOnScreen\(this\.player\.live,\s*this\.tel\.exportSource\(\),\s*this\.simView\?\.sim\s*\?\?\s*null\)/);
  });

  it('in the live run, the DOM is exactly what the panel drew before the fix', () => {
    const flightOnScreen = (compare as Record<string, unknown>).flightOnScreen as
      (<T>(live: boolean, liveRun: T | null, atCursor: T | null) => T | null) | undefined;
    const before = mount(() => LIVE); // the wiring before the fix: always the live run
    const after = mount(() => (flightOnScreen ? flightOnScreen(true, LIVE, atCursor(60)) : LIVE));
    expect(after.root.dump()).toBe(before.root.dump());
    expect(currentCell(after.root, 'Maximum load factor')).toBe('2.97 g');
  });
});
