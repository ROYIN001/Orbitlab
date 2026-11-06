/**
 * A speed picked in Watch holds for the whole flight (src/ui/watch.ts, `WatchView.setSpeed`): Soyuz T-10-1's
 * pad abort, flown at Watch's own 100×, reaches its end card, which offers "Try this launch yourself" (R3.5),
 * and Watch sets no other warp on the way. tests/browser/journeys/r3-first-launch.mjs speeds the same flight up
 * this way since #209; it runs only in the Pages workflow, and this runs in every PR's unit shards. A warp set
 * from outside Watch (WebMCP's `control_playback`, the `.` and `,` keys) is a speed picked there too
 * (`WatchView.speedPicked`, told by `App.setWarp`): without that, its automatic pace set its own warp again, and
 * a journey that sped the flight up over WebMCP missed its end card on a slow runner
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
import mainSource from '../src/main.ts?raw';

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

/** Soyuz T-10-1 as the viewer flies it (main.ts `startWatch`: the panel's guidance and the vehicle's six-DOF model), on a stub DOM. */
function viewer() {
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
  const live = { warp: 1, playing: true };
  const warps: number[] = [];
  const copies: string[] = [];
  const host: WatchHost = {
    start: () => {}, explore: () => {}, follow: () => {},
    togglePlay: () => { live.playing = !live.playing; },
    setWarp: (w) => { live.warp = w; warps.push(w); },
    tryCopy: (id) => { copies.push(id); },
  };
  const root = new Node('div');
  const view = new WatchView(root as unknown as HTMLElement, host);
  const update = () => view.update(recorder.recordNow(), recorder.events, { playing: live.playing, vehicle: sim.vehicleSpec });
  view.begin('soyuzT10');
  update(); // the count-down, at the automatic pace
  const button = (speed: string) => root.querySelectorAll('.watch-speed').find((b) => b.dataset.speed === speed)!;
  /** The viewer's 10 Hz updates, each a tenth of a second of the flight at the warp in force, until the card pauses it. */
  const flyToTheCard = () => {
    let guard = 0;
    while (live.playing && guard++ < 10_000) {
      recorder.advance(0.1 * live.warp);
      update();
    }
  };
  return { sim, recorder, live, warps, copies, root, view, update, button, flyToTheCard };
}

/** What the end card offers once the flight is over: the crew safe, and a copy of the launch to try. */
function expectCrewSafeCard(v: ReturnType<typeof viewer>) {
  const end = v.root.querySelector('.watch-end')!;
  expect(end.hidden).toBe(false);
  expect(flightEnding(v.recorder.recordNow(), v.recorder.events)).toBe('crewSafe');
  expect(end.all().find((n) => n.tagName === 'H2')?.textContent).toBe(en['watch.end.crewSafeTitle']);
  const copy = end.querySelectorAll('.watch-btn').find((b) => b.textContent === en['watch.end.copy']);
  expect(copy, 'the end card has no "Try this launch yourself"').toBeDefined();
  copy!.click();
  expect(v.copies).toEqual(['soyuzT10']);
}

it('Watch\'s 100× holds through Soyuz T-10-1\'s pad abort to the end card, which offers "Try this launch yourself"', () => {
  const v = viewer();
  expect(v.warps).toEqual([1]);

  const speed100 = v.button('100');
  speed100.click();
  expect(v.live.warp).toBe(100);
  expect(speed100.getAttribute('aria-pressed')).toBe('true');

  v.flyToTheCard();
  expect(v.warps).toEqual([1, 100]);
  expectCrewSafeCard(v);
});

it('a warp set from outside Watch (WebMCP, the . and , keys) is a speed picked there: it holds to the end card and marks its button', () => {
  const v = viewer();
  expect(v.warps).toEqual([1]);

  // what `App.setWarp` does: the warp itself (`App.applyWarp`, which does not tell the viewer), then the viewer
  v.live.warp = 100;
  v.view.speedPicked(100);
  expect(v.button('100').getAttribute('aria-pressed')).toBe('true');
  expect(v.button('auto').getAttribute('aria-pressed')).toBe('false');

  v.flyToTheCard();
  // Auto would have set 20×, 5× and 1× on the way (the same flight with the automatic pace left on)
  expect(v.warps).toEqual([1]);
  expect(v.live.warp).toBe(100);
  expectCrewSafeCard(v);
});

it('a warp that is not one of the viewer\'s buttons is a pick too: Auto is off and no button is marked', () => {
  const v = viewer();
  v.live.warp = 1000;
  v.view.speedPicked(1000);
  for (const b of v.root.querySelectorAll('.watch-speed')) expect(b.getAttribute('aria-pressed'), b.dataset.speed).toBe('false');
  v.root.querySelectorAll('.watch-speed').find((b) => b.dataset.speed === 'auto')!.click();
  // Auto is back: it sets the pace of the beat on screen, and the button is marked again
  expect(v.warps).toEqual([1, 1]);
  expect(v.button('auto').getAttribute('aria-pressed')).toBe('true');
});

it('the viewer\'s own speeds and its automatic pace reach the warp without telling it (main.ts)', () => {
  // A copy of the warp set by the viewer itself must not come back as a pick, or its first pace would turn Auto off.
  const host = mainSource.slice(mainSource.indexOf('this.watch = new WatchView('), mainSource.indexOf('this.aboutDialog'));
  expect(host).toContain('setWarp: (warp) => this.applyWarp(warp),');
  const start = mainSource.slice(mainSource.indexOf('startWatch(id: WatchMissionId): void {'));
  expect(start.slice(0, start.indexOf('\n  }\n'))).toContain('this.applyWarp(1);');
  // …and a warp set from outside is told to the viewer, on the live flight, while the viewer is the page
  const set = mainSource.slice(mainSource.indexOf('  setWarp(v: number): void {'));
  expect(set.slice(0, set.indexOf('\n  }\n'))).toContain("if (this.mode === 'watch' && this.player.live) this.watch.speedPicked(v);");
  const apply = mainSource.slice(mainSource.indexOf('  private applyWarp(v: number): void {'));
  expect(apply.slice(0, apply.indexOf('\n  }\n'))).not.toContain('watch');
});
