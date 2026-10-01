/**
 * "Fly it" for a designed satellite (roadmap D06; Phase 4 map §2.6 c, the
 * integration of Phase 4 stage 3): the box the Explore level's satellite
 * designer and the Engineer level's bench both show, which opens the Launch
 * section with the design as the mission's own satellite
 * (src/design/satellite-launch.ts), on the vehicle the Launch section has now
 * or one the student picks, to the design's own orbit.
 *
 * Before the button it says, in words, what will fly: the vehicle and its
 * site, the target (a preset's name, or the custom orbit's apsides and
 * plane), the mass; what the satellite's engine does in Launch — its own last
 * stage, none, or none because it is electric (said plainly, map §2.6 c) —
 * whether a set plane waits for its window; and C2's fairing-fit note, an
 * estimate, with the box's diagonal measured (`crossSection: 'box'`). What
 * holds it back is said too: a design the checks refuse, a satellite the
 * spec's checker refuses (a C_D·A/m outside `B_RANGE`), a mission the Launch
 * section would not take as it is.
 *
 * THE LAUNCH SECTION'S VERDICT, BEFORE THE CLICK (task I2, item 1; the
 * stage-3a review's first doubt): the setup panel's light and sentence on
 * the mission it is about to open (`designVerdict`,
 * src/design/satellite-verdict.ts), in the panel's own words and states —
 * a designed NAPA-2 on the default Soyuz-2.1a is "Not flyable as set"
 * before the student flies, not after. When it is, the rockets offered here
 * that the same verdict lets fly it are offered as buttons. The picked
 * vehicle's verdict is worked out once the typing pauses (while the
 * figures are stale the last one is shown faded), and the fleet's a vehicle
 * at a time between frames, each kept, since a marginal mission flies the
 * insertion probe (up to half a second for a GTO). Fly it stays open on a
 * failing verdict, as Launch itself still launches a mission it calls
 * infeasible: seeing it fail is a lesson too.
 *
 * The thin DOM part: every decision is satellite-launch.ts's and
 * satellite-verdict.ts's.
 */
import { getLang, t } from '../../i18n';
import type { VehicleSpec } from '../../types';
import type { Feasibility } from '../../config/verdict';
import { VEHICLES, vehicleById } from '../../data/vehicles';
import { siteById } from '../../data/sites';
import { B_RANGE } from '../../orbit/ballistic-range';
import type { MissionDocument } from '../../config/mission-file';
import { satelliteDesignProblems } from '../../config/satellite-design';
import {
  LAUNCH_ISP, designLaunch, designMissionDocument, designMissionIssues, designSite, designTargetOrbit, type DesignFlight, type DesignLaunch,
} from '../../design/satellite-launch';
import { designRockets, designVerdict } from '../../design/satellite-verdict';
import type { SatelliteDesign } from '../../design/satellite-spec';
import { button, el, hhmm, num } from '../orbit/dom';
import { localized, siteName } from '../names';
import { fairingFitText } from '../fairing-fit';
import { field, select } from './explore-level';
import { ballisticDigits, keepUnits, sayFig } from './satellite-text';
import { unbroken } from './figures';
import type { SatelliteWorkspace } from './satellite-workspace';

/** The Launch section's mission, as far as "Fly it" reads it: its vehicle (a custom one inline, S02), site and launch time. */
export interface LaunchMissionNow {
  vehicleId: string;
  vehicleSpec?: VehicleSpec;
  siteId: string;
  launchTime: Date;
}

export interface SatelliteFlyHost {
  /** the Launch section's mission now */
  launchMission(): LaunchMissionNow;
  /** hand the mission to the Launch section and open it; false when it could not take it */
  fly(doc: MissionDocument): boolean;
}

/** The Launch section's own vehicle, as its mission names it. */
const ownVehicle = (m: LaunchMissionNow): VehicleSpec => (m.vehicleSpec?.id === m.vehicleId ? m.vehicleSpec : vehicleById(m.vehicleId));

/** A verdict's state in the setup panel's own words (its `VERDICT_LIGHT`, src/ui/panel.ts). */
const LIGHT: Record<Feasibility['level'], string> = { ok: 'setup.light.ok', warn: 'setup.light.warn', fail: 'setup.light.fail' };

/** Kept verdicts, at most this many (a design edited for an hour is many designs). */
const KEPT_VERDICTS = 400;
/** How long a turn of the fleet's search may hold the page, ms, before it waits for the next. */
const SCAN_SLICE_MS = 30;

/** The design's flight on a vehicle, as "Fly it" makes it: the Launch section's own from its site, any other from its first site that reaches the plane (`designSite`). */
function flightOn(vehicle: VehicleSpec, own: VehicleSpec, mission: LaunchMissionNow): DesignFlight {
  return { vehicle, siteId: vehicle === own ? mission.siteId : undefined, from: mission.launchTime };
}

export class SatelliteFly {
  readonly root = el('div', 'bsat-fly');
  private message: string | null = null;
  /** the verdicts worked out, by `verdictKey` */
  private readonly verdicts = new Map<string, Feasibility>();
  /** the verdict last shown, kept on screen (faded) while the typing goes on */
  private shown: { verdict: Feasibility; alts: HTMLElement } | null = null;
  /** the fleet's search under way: what it was started for, and the box on screen it will fill */
  private scan: { key: string; timer: ReturnType<typeof setTimeout> | null; box: HTMLElement } | null = null;
  private lastRefused = false;

  constructor(private readonly ws: SatelliteWorkspace, private readonly host: SatelliteFlyHost, private readonly prefix: string) {}

  /** The vehicle picked: the workspace's choice, else the Launch section's own. */
  private flight(): { flight: DesignFlight; own: VehicleSpec; mission: LaunchMissionNow } {
    const mission = this.host.launchMission();
    const own = ownVehicle(mission);
    const picked = this.ws.flyVehicle;
    const vehicle = picked && picked !== own.id ? VEHICLES.find((v) => v.id === picked) ?? own : own;
    return { flight: flightOn(vehicle, own, mission), own, mission };
  }

  /** Every vehicle the menu offers, as "Fly it" would fly the design on it: the Launch section's own first, then the fleet. */
  private offered(own: VehicleSpec, mission: LaunchMissionNow): DesignFlight[] {
    return [own, ...VEHICLES.filter((v) => v.id !== own.id)].map((v) => flightOn(v, own, mission));
  }

  /** What a verdict depends on: the language it is said in, the vehicle, its site and time, and the design (its name aside). */
  private verdictKey(d: SatelliteDesign, f: DesignFlight): string {
    const vehicle = VEHICLES.includes(f.vehicle) ? f.vehicle.id : JSON.stringify(f.vehicle);
    return `${getLang()}|${vehicle}|${f.siteId ?? ''}|${f.from.getTime()}|${JSON.stringify({ ...d, name: '' })}`;
  }

  /** The verdict kept for this flight, if it has been worked out. */
  private kept(d: SatelliteDesign, f: DesignFlight): Feasibility | undefined {
    return this.verdicts.get(this.verdictKey(d, f));
  }

  /** The verdict for this flight, worked out now if it is not kept (null if the planner or the probe throws, which none is known to). */
  private verdictOf(d: SatelliteDesign, f: DesignFlight): Feasibility | null {
    const key = this.verdictKey(d, f);
    const kept = this.verdicts.get(key);
    if (kept) return kept;
    let v: Feasibility;
    try { v = designVerdict(d, f); } catch { return null; }
    if (this.verdicts.size >= KEPT_VERDICTS) this.verdicts.clear();
    this.verdicts.set(key, v);
    return v;
  }

  /**
   * Draw the box for the design on screen; `refused` when the design's
   * checker refuses it. The design on screen is checked here as well: while
   * the student types, the workspace's verdict is still the last design's
   * (its figures wait for the typing to pause), and a box emptied on the way
   * to a new number is a NaN no spec is made from (`dragArea` throws on it).
   */
  render(refused: boolean): void {
    const d = this.ws.design;
    refused ||= satelliteDesignProblems(d).length > 0;
    this.lastRefused = refused;
    const { flight, own, mission } = this.flight();
    const parts: HTMLElement[] = [el('h3', 'bx-h3', t('build.ex.fly.title'))];

    // the vehicle: the Launch section's own first (a custom or historical one is only offered as that), then the fleet
    const options = [{ value: own.id, label: t('build.sat.fly.current', { name: own.name }) },
      ...VEHICLES.filter((v) => v.id !== own.id).map((v) => ({ value: v.id, label: `${v.name} (${v.country})` }))];
    const pick = select(`${this.prefix}flyVehicle`, options, flight.vehicle.id, (id) => {
      this.ws.flyVehicle = id === own.id ? null : id;
      this.message = null;
      this.render(refused);
    });
    parts.push(field(t('build.sat.fly.vehicle'), pick, 'bx-field bsat-fly-vehicle'));

    let launch: DesignLaunch | null = null;
    let cannot = refused;
    if (refused) parts.push(this.note(t('build.sat.fly.blocked'), 'warn'));
    else {
      launch = designLaunch(d);
      const siteId = designSite(d, flight);
      parts.push(this.note(t('build.sat.fly.lead', {
        vehicle: flight.vehicle.name, site: siteName(siteById(siteId)), orbit: this.targetText(d),
        mass: sayFig({ value: launch.spec.mass, unit: 'kg' }),
      })));
      parts.push(this.note(this.engineText(d, launch), launch.engine === 'electric' ? 'warn' : ''));
      if (designTargetOrbit(d).orbit.raanMode !== 'free') parts.push(this.note(t('build.sat.fly.window'), 'small'));
      // C2's fairing-fit note, an estimate, measured across the box's diagonal
      const fit = fairingFitText(flight.vehicle, launch.spec);
      const fitNote = this.note(fit.text, fit.warn ? 'warn' : '');
      fitNote.dataset.fairingFit = fit.verdict;
      parts.push(fitNote);
      if (fit.verdict !== 'noFairing' && fit.verdict !== 'noSize') {
        const { width, depth } = d.bus.size;
        parts.push(this.note(t('build.sat.fly.diagonal', { w: num(width, width < 1 ? 2 : 1), d: num(depth, depth < 1 ? 2 : 1), u: t('u.m') }), 'small'));
      }
      if (launch.problems.length) {
        cannot = true;
        const ballistic = launch.problems.some((p) => p.path === 'area');
        const b = (launch.spec.cd! * launch.spec.area!) / launch.spec.mass;
        const text = ballistic
          ? t('build.sat.fly.ballistic', { lo: num(B_RANGE[0], 4), hi: num(B_RANGE[1]), b: num(b, ballisticDigits(b)), u: t('u.m2kg') })
          : t('build.sat.fly.refused');
        parts.push(this.note(text, 'warn'));
      } else {
        const issues = designMissionIssues(d, flight);
        if (issues.length) {
          cannot = true;
          parts.push(this.note(t('build.sat.fly.issues'), 'warn'));
        }
      }
      if (!cannot) {
        parts.push(...this.verdictBox(d, flight, own, mission));
        parts.push(this.note(t('build.sat.fly.after'), 'small'));
      }
    }
    if (cannot) this.stopScan();
    const go = button('watch-btn primary bx-fly-btn', `${t('build.ex.fly')} ›`, () => this.fly());
    go.dataset.k = `${this.prefix}fly`;
    go.disabled = cannot;
    parts.push(go);
    if (this.message) {
      const p = el('p', 'bx-note bx-msg-error', this.message);
      p.setAttribute('role', 'status');
      parts.push(p);
    }
    this.root.replaceChildren(...parts);
  }

  /**
   * The setup panel's light and sentence for the mission (`designVerdict`),
   * and when it fails, the rockets offered here that the same verdict lets
   * fly it. Worked out only once the figures are the design on screen's;
   * until then the last verdict stays, faded.
   */
  private verdictBox(d: SatelliteDesign, flight: DesignFlight, own: VehicleSpec, mission: LaunchMissionNow): HTMLElement[] {
    const stale = this.ws.worked().stale;
    const v = stale ? this.kept(d, flight) ?? null : this.verdictOf(d, flight);
    if (!v) {
      this.stopScan();
      if (!this.shown) return [];
      // the last one, faded, until the typing pauses
      const last = this.light(this.shown.verdict);
      last.classList.add('stale');
      this.shown.alts.classList.add('stale');
      return [last, this.shown.alts];
    }
    const alts = el('div', 'bsat-fly-alts');
    this.shown = { verdict: v, alts };
    if (v.level === 'fail') {
      const others = this.offered(own, mission).filter((f) => f.vehicle.id !== flight.vehicle.id);
      this.paintAlts(alts, d, others, own);
      if (others.some((f) => !this.kept(d, f))) this.startScan(d, flight, others, own, alts);
      else this.stopScan();
    } else this.stopScan();
    return [this.light(v), alts];
  }

  /** The verdict as the setup panel shows it: its light, its state's words and its sentence. */
  private light(v: Feasibility): HTMLElement {
    const note = el('p', `status-note ${v.level} bsat-fly-verdict`);
    note.dataset.verdict = v.level;
    note.dataset.cause = v.cause;
    const body = el('span', 'status-body');
    body.append(el('strong', 'status-title', t('build.sat.fly.verdict', { state: t(LIGHT[v.level]) })), el('span', 'status-text', v.text));
    note.append(el('span', 'status-dot'), body);
    return note;
  }

  /** The rockets that can fly it, once each offered one's verdict is kept; until then, that they are being looked for. */
  private paintAlts(box: HTMLElement, d: SatelliteDesign, others: DesignFlight[], own: VehicleSpec): void {
    box.classList.remove('stale');
    if (others.some((f) => !this.kept(d, f))) {
      const p = this.note(t('build.sat.fly.alts.looking'), 'small');
      p.setAttribute('role', 'status');
      box.replaceChildren(p);
      return;
    }
    const can = designRockets(d, others, (dd, f) => this.kept(dd, f)!);
    if (!can.length) {
      box.replaceChildren(this.note(t('build.sat.fly.alts.none'), 'small'));
      return;
    }
    const row = el('div', 'bsat-fly-alt-row');
    for (const r of can) {
      const id = r.flight.vehicle.id;
      const b = button(`watch-btn bsat-fly-alt ${r.verdict.level}`, r.flight.vehicle.name, () => {
        this.ws.flyVehicle = id === own.id ? null : id;
        this.message = null;
        this.render(this.lastRefused);
        this.root.querySelector<HTMLElement>(`[data-k="${this.prefix}flyVehicle"]`)?.focus();
      });
      b.dataset.k = `${this.prefix}flyOn:${id}`;
      b.dataset.verdict = r.verdict.level;
      b.title = r.verdict.text;
      b.setAttribute('aria-label', t('build.sat.fly.alts.pick', { name: r.flight.vehicle.name, state: t(LIGHT[r.verdict.level]) }));
      b.prepend(el('span', 'status-dot'));
      row.append(b);
    }
    box.replaceChildren(this.note(t('build.sat.fly.alts.lead'), 'small'), row);
  }

  /**
   * Work the offered vehicles' verdicts out a few at a time between frames,
   * then say which can fly it. A search already under way for the same
   * design and vehicle goes on, and fills the box now on screen.
   */
  private startScan(d: SatelliteDesign, flight: DesignFlight, others: DesignFlight[], own: VehicleSpec, box: HTMLElement): void {
    const key = this.verdictKey(d, flight);
    if (this.scan?.key === key) { this.scan.box = box; return; }
    this.stopScan();
    const todo = others.filter((f) => !this.kept(d, f));
    const scan: NonNullable<SatelliteFly['scan']> = { key, timer: null, box };
    this.scan = scan;
    const step = (): void => {
      if (this.scan !== scan) return;
      const until = performance.now() + SCAN_SLICE_MS;
      while (todo.length && performance.now() < until) this.verdictOf(d, todo.shift()!);
      if (todo.length) { scan.timer = setTimeout(step, 0); return; }
      this.scan = null;
      this.paintAlts(scan.box, d, others, own);
    };
    scan.timer = setTimeout(step, 0);
  }

  private stopScan(): void {
    if (this.scan?.timer != null) clearTimeout(this.scan.timer);
    this.scan = null;
  }

  private note(text: string, cls = ''): HTMLParagraphElement {
    // W: each figure with its unit, and a rocket's name whole ("Falcon 9 Block 5"), on a phone
    return el('p', `bx-note${cls ? ` ${cls}` : ''}`, keepUnits(text));
  }

  /** "the Sun-synchronous (600 km) preset", or "a custom orbit, 520 × 540 km, sun-synchronous, ascending node at 22:30". */
  private targetText(d: SatelliteDesign): string {
    const { orbitId, orbit } = designTargetOrbit(d);
    if (orbitId !== 'custom') return t('build.sat.fly.preset', { name: localized(`orbit.${orbit.id}.name`, orbit.name) });
    const km = (m: number): string => num(m / 1000);
    const plane = orbit.raanMode === 'ltan' ? t('build.sat.fly.planeSso', { time: hhmm(orbit.ltan!) })
      : orbit.inclination === 'sso' ? t('build.sat.fly.planeSsoFree')
        : orbit.raanMode === 'fixed' ? t('build.sat.fly.planeNode', { i: num(orbit.inclination as number, 2), raan: num(orbit.raan!, 1) })
          : t('build.sat.fly.planeFree', { i: num(orbit.inclination as number, 2) });
    // the apsides on one line, however narrow the page
    return t('build.sat.fly.custom', { size: unbroken(`${km(orbit.perigee)} × ${km(orbit.apogee)} ${t('u.km')}`), plane });
  }

  private engineText(d: SatelliteDesign, launch: DesignLaunch): string {
    const p = d.propulsion;
    switch (launch.engine) {
      case 'own': return t('build.sat.fly.engineOwn', { thrust: `${num(p!.thrust, p!.thrust < 10 ? 2 : 0)} ${t('u.N')}`, isp: `${num(p!.isp)} ${t('u.s')}` });
      case 'electric': return t('build.sat.fly.engineElectric', { isp: `${num(p!.isp)} ${t('u.s')}`, max: `${num(LAUNCH_ISP[1])} ${t('u.s')}` });
      case 'empty': return t('build.sat.fly.engineEmpty');
      case 'none': return t('build.sat.fly.engineNone');
    }
  }

  private fly(): void {
    this.stopScan();
    const { flight } = this.flight();
    const doc = designMissionDocument(this.ws.design, flight);
    if (!this.host.fly(doc)) {
      this.message = t('build.ex.fly.failed');
      this.render(false);
    } else this.message = null;
  }
}
