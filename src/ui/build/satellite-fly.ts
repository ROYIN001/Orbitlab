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
 * The thin DOM part: every decision is satellite-launch.ts's.
 */
import { t } from '../../i18n';
import type { VehicleSpec } from '../../types';
import { VEHICLES, vehicleById } from '../../data/vehicles';
import { siteById } from '../../data/sites';
import { B_RANGE } from '../../orbit/ballistic-range';
import type { MissionDocument } from '../../config/mission-file';
import {
  LAUNCH_ISP, designLaunch, designMissionDocument, designMissionIssues, designTargetOrbit, type DesignFlight, type DesignLaunch,
} from '../../design/satellite-launch';
import type { SatelliteDesign } from '../../design/satellite-spec';
import { button, el, hhmm, num } from '../orbit/dom';
import { localized, siteName } from '../names';
import { fairingFitText } from '../fairing-fit';
import { field, select } from './explore-level';
import { sayFig } from './satellite-text';
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

export class SatelliteFly {
  readonly root = el('div', 'bsat-fly');
  private message: string | null = null;

  constructor(private readonly ws: SatelliteWorkspace, private readonly host: SatelliteFlyHost, private readonly prefix: string) {}

  /** The vehicle picked: the workspace's choice, else the Launch section's own. */
  private flight(): { flight: DesignFlight; own: VehicleSpec; mission: LaunchMissionNow } {
    const mission = this.host.launchMission();
    const own = ownVehicle(mission);
    const picked = this.ws.flyVehicle;
    const vehicle = picked && picked !== own.id ? VEHICLES.find((v) => v.id === picked) ?? own : own;
    return { flight: { vehicle, siteId: vehicle === own ? mission.siteId : undefined, from: mission.launchTime }, own, mission };
  }

  /** Draw the box for the design on screen; `refused` when the design's checker refuses it. */
  render(refused: boolean): void {
    const d = this.ws.design;
    const { flight, own } = this.flight();
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
      const siteId = flight.siteId && flight.vehicle.sites.includes(flight.siteId) ? flight.siteId : flight.vehicle.sites[0];
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
        const b = launch.problems.some((p) => p.path === 'area');
        const text = b
          ? t('build.sat.fly.ballistic', { lo: num(B_RANGE[0], 4), hi: num(B_RANGE[1]), b: num((launch.spec.cd! * launch.spec.area!) / launch.spec.mass, 4), u: t('u.m2kg') })
          : t('build.sat.fly.refused');
        parts.push(this.note(text, 'warn'));
      } else {
        const issues = designMissionIssues(d, flight);
        if (issues.length) {
          cannot = true;
          parts.push(this.note(t('build.sat.fly.issues'), 'warn'));
        }
      }
      parts.push(this.note(t('build.sat.fly.after'), 'small'));
    }
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

  private note(text: string, cls = ''): HTMLParagraphElement {
    return el('p', `bx-note${cls ? ` ${cls}` : ''}`, text);
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
    const { flight } = this.flight();
    const doc = designMissionDocument(this.ws.design, flight);
    if (!this.host.fly(doc)) {
      this.message = t('build.ex.fly.failed');
      this.render(false);
    } else this.message = null;
  }
}
