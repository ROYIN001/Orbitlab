/**
 * A speed picked in Watch holds for the whole flight (src/ui/watch.ts, `WatchView.setSpeed`): Soyuz T-10-1's
 * pad abort, flown at Watch's own 100×, reaches its end card, which offers "Try this launch yourself" (R3.5),
 * and Watch sets no other warp on the way. tests/browser/journeys/r3-first-launch.mjs speeds the same flight up
 * this way since #209; it runs only in the Pages workflow, and this runs in every PR's unit shards. A warp set
 * from outside Watch is not held like this: its automatic pace sets its own again
 * (docs/development/reports/r3-first-launch-watch-speed.md).
 */
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { WatchView, type WatchHost } from '../src/ui/watch';
import { watchMissionSettings } from '../src/ui/watch-missions';
import { flightEnding } from '../src/ui/watch-logic';
import { Simulation } from '../src/physics/simulation';
import { FlightRecorder } from '../src/replay/recorder';
import { vehicleById } from '../src/data/vehicles';
import { guidanceForVehicle } from '../src/physics/defaults';
import { defaultDynamics } from '../src/physics/rigid/config';
import { en } from '../src/i18n/en';

/** The few DOM calls the viewer makes. */
class Node {
  readonly tagName: string;
  children: Node[] = [];
  textContent = ''; className = ''; id = ''; type = ''; title = '';
  hidden = false;
  dataset: Record<string, string> = {};
  style: Record<string, string> = {};
  private readonly attrs: Record<string, string> = {};
  private readonly listeners: Record<string, Array<() => void>> = {};
  readonly classList = {
    add: (...c: string[]) => { this.className = [...new Set([...this.className.split(' ').filter(Boolean), ...c])].join(' '); },
    remove: (...c: string[]) => { this.className = this.className.split(' ').filter((x) => x && !c.includes(x)).join(' '); },
    toggle: (c: string, on?: boolean) => { if (on ?? !this.classList.contains(c)) this.classList.add(c); else this.classList.remove(c); },
    contains: (c: string) => this.className.split(' ').includes(c),
  };
  constructor(tag: string) { this.tagName = tag.toUpperCase(); }
  append(...c: (Node | string)[]): void { this.children.push(...c.map(asNode)); }
  replaceChildren(...c: (Node | string)[]): void { this.children = c.map(asNode); }
  setAttribute(k: string, v: unknown): void { this.attrs[k] = String(v); }
  getAttribute(k: string): string | null { return this.attrs[k] ?? null; }
  addEventListener(type: string, fn: () => void): void { (this.listeners[type] ??= []).push(fn); }
  click(): void { for (const fn of this.listeners.click ?? []) fn(); }
  focus(): void {}
  all(): Node[] { return this.children.flatMap((c) => [c, ...c.all()]); }
  querySelectorAll(sel: string): Node[] { return this.all().filter((n) => n.classList.contains(sel.slice(1))); }
  querySelector(sel: string): Node | null { return this.querySelectorAll(sel)[0] ?? null; }
}
const asNode = (c: Node | string): Node => (typeof c === 'string' ? Object.assign(new Node('#text'), { textContent: c }) : c);

beforeEach(() => { vi.stubGlobal('document', { createElement: (tag: string) => new Node(tag), documentElement: { lang: 'en' } }); });
afterEach(() => { vi.unstubAllGlobals(); });

it('Watch\'s 100× holds through Soyuz T-10-1\'s pad abort to the end card, which offers "Try this launch yourself"', () => {
  // the flight as the viewer flies it (main.ts `startWatch`: the panel's guidance and the vehicle's six-DOF model)
  const s = watchMissionSettings('soyuzT10', new Date('2026-11-05T16:58:00Z'));
  const dynamics = defaultDynamics(s.vehicleId);
  const sim = new Simulation({
    vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, padId: s.padId,
    launchTime: s.launchTime, payloadMassOverride: s.payloadMass,
    guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, dynamics.model), guidanceResolved: true,
    failure: s.failure, boosterRecovery: s.boosterRecovery, recoveryPlan: s.recoveryPlan, dynamics,
  }, { headless: true });
  const recorder = new FlightRecorder();
  recorder.start(sim);
  let warp = 1, playing = true;
  const warps: number[] = [];
  const copies: string[] = [];
  const host: WatchHost = {
    start: () => {}, explore: () => {}, follow: () => {},
    togglePlay: () => { playing = !playing; },
    setWarp: (w) => { warp = w; warps.push(w); },
    tryCopy: (id) => { copies.push(id); },
  };
  const root = new Node('div');
  const view = new WatchView(root as unknown as HTMLElement, host);
  const update = () => view.update(recorder.recordNow(), recorder.events, { playing, vehicle: sim.vehicleSpec });
  view.begin('soyuzT10');
  update(); // the count-down, at the automatic pace
  expect(warps).toEqual([1]);

  const speed100 = root.querySelectorAll('.watch-speed').find((b) => b.dataset.speed === '100')!;
  speed100.click();
  expect(warp).toBe(100);
  expect(speed100.getAttribute('aria-pressed')).toBe('true');

  // the viewer's 10 Hz updates, each a tenth of a second of the flight at the warp in force, until the card pauses it
  const end = root.querySelector('.watch-end')!;
  let guard = 0;
  while (playing && guard++ < 10_000) {
    recorder.advance(0.1 * warp);
    update();
  }
  expect(warps).toEqual([1, 100]);
  expect(end.hidden).toBe(false);
  const frame = recorder.recordNow();
  expect(flightEnding(frame, recorder.events)).toBe('crewSafe');
  expect(end.all().find((n) => n.tagName === 'H2')?.textContent).toBe(en['watch.end.crewSafeTitle']);
  const copy = end.querySelectorAll('.watch-btn').find((b) => b.textContent === en['watch.end.copy']);
  expect(copy, 'the end card has no "Try this launch yourself"').toBeDefined();
  copy!.click();
  expect(copies).toEqual(['soyuzT10']);
});
