/**
 * Mission setup panel: vehicle and site, payload, target orbit and launch
 * time, then guidance, failure injection and options in collapsible sections.
 * Keeps its own state and produces a `MissionConfig` on demand.
 *
 * Two things that are not merely cosmetic:
 *
 * - **The guidance shown is the guidance flown.** `DEFAULT_GUIDANCE` is the
 *   library baseline; every vehicle overrides part of it through
 *   `guidanceDefaults`, and `Simulation` merges those in. Displaying the
 *   baseline while flying the merge is how the panel came to show a 2.5° kick
 *   for a Falcon 9 that flies 1.5°. The panel now resolves
 *   `guidanceForVehicle(spec)` and layers the operator's own edits on top of
 *   it, and hands the result back with `guidanceResolved: true` so the
 *   simulation flies exactly what was on screen.
 * - **A pre-flight feasibility verdict** (audit B12) in the status note above
 *   the Launch button. It is derived from data — the vehicle's rated payload
 *   for the orbit class, the site's reachable inclinations, the mission plan —
 *   and never from a headless flight: a full mission takes tens of
 *   milliseconds per keystroke and `runAscent` is not a sound oracle (it stops
 *   at the parking orbit, so it reports success for missions that later fall
 *   short and failure for missions whose coast outlives its horizon).
 */
import type { MissionConfig, OrbitSpec, GuidanceParams, FailureConfig, FailureMode, VehicleSpec } from '../types';
import { VEHICLES, vehicleById } from '../data/vehicles';
import { SATELLITES, satelliteById } from '../data/satellites';
import { SITES, siteById, type SiteExtra } from '../data/sites';
import { ORBIT_PRESETS, orbitById } from '../data/orbits';
import { DEFAULT_FAILURE, guidanceForVehicle } from '../physics/defaults';
import { liftoffMass, liftoffThrust, idealDeltaV, VehicleModel } from '../physics/vehicle';
import { planMission, launchWindows, resolveTarget } from '../physics/mission';
import { runAscent, DEFAULT_KICKS, DEFAULT_RATES, DEFAULT_LOFTS, needsLoftSearch, type TuneResult } from '../physics/autotune';
import { G0, RAD } from '../physics/constants';
import { t, getLang } from '../i18n';
import { localized, satelliteName, siteName, stageName, vehicleManufacturer, vehicleNotes } from './names';

export interface SetupCallbacks {
  onLaunch: (cfg: MissionConfig) => void;
  onReset: () => void;
  onChange?: (cfg: MissionConfig) => void;
}

interface SetupState {
  vehicleId: string;
  satelliteId: string;
  siteId: string;
  orbitId: string;
  orbit: OrbitSpec;
  launchTime: Date;
  /** operator edits layered on top of the vehicle's resolved guidance */
  guidanceOverrides: Partial<GuidanceParams>;
  failure: FailureConfig;
  boosterRecovery: boolean;
  payloadMass: number;
}

/** Which rated payload figure a target orbit should be measured against. */
export type OrbitClass = 'leo' | 'sso' | 'gto';

export interface Feasibility {
  level: 'ok' | 'warn' | 'fail';
  text: string;
}

const FAILURE_MODES: FailureMode[] = ['none', 'engineOut', 'thrustLoss', 'prematureSep', 'fairingStuck', 'rangeSafety', 'random'];

function toDatetimeLocalUTC(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
function fromDatetimeLocalUTC(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0));
}
const fmtUTC = (d: Date) => d.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';

function num(v: number, digits = 0): string {
  try {
    return v.toLocaleString(getLang(), { minimumFractionDigits: digits, maximumFractionDigits: digits });
  } catch {
    return v.toFixed(digits);
  }
}

const orbitName = (o: OrbitSpec): string => localized(`orbit.${o.id}.name`, o.name);
const orbitDesc = (o: OrbitSpec): string => localized(`orbit.${o.id}.desc`, o.description);
const orbitShort = (o: OrbitSpec): string => localized(`orbit.${o.id}.short`, o.id.toUpperCase());

/** Which payload rating this target should be judged against. */
export function orbitClassOf(orbit: OrbitSpec): OrbitClass {
  if (orbit.apogee >= 30000e3) return 'gto';
  if (orbit.raanMode === 'ltan' || orbit.inclination === 'sso') return 'sso';
  if (typeof orbit.inclination === 'number' && orbit.inclination >= 95) return 'sso';
  return 'leo';
}

/**
 * The vehicle's rated payload for an orbit class, and the class the figure
 * actually belongs to. A vehicle with no published SSO figure is judged on its
 * LEO rating, and says so, rather than being failed for missing data.
 */
export function ratedPayload(spec: VehicleSpec, cls: OrbitClass): { cap: number; cls: OrbitClass } {
  if (cls === 'gto') return { cap: spec.payloadGTO, cls: 'gto' };
  if (cls === 'sso') return spec.payloadSSO ? { cap: spec.payloadSSO, cls: 'sso' } : { cap: spec.payloadLEO, cls: 'leo' };
  return { cap: spec.payloadLEO, cls: 'leo' };
}

/**
 * A site cannot fly below its own latitude, nor below the inclination its
 * range-safety corridor allows. A retrograde target is measured against
 * 180° − i, which is the same geometric constraint seen from the south — a
 * 97.8° sun-synchronous orbit is an 82.2° plane, reachable from every site
 * below that latitude. The 0.25° of slack is for a resolved sun-synchronous
 * inclination landing a hair under a minimum that was quoted to one decimal.
 */
export function reachableFromSite(site: SiteExtra, incDeg: number): boolean {
  const effective = incDeg > 90 ? 180 - incDeg : incDeg;
  return effective >= Math.max(Math.abs(site.latitude), site.minInclination) - 0.25;
}

/** Everything the verdict is derived from. Pure data, so it can be tested without a DOM. */
export interface VerdictInput {
  spec: VehicleSpec;
  site: SiteExtra;
  orbit: OrbitSpec;
  payloadMass: number;
  /** resolved target inclination, deg */
  inclinationDeg: number;
  /** the planner's own reachability verdict; null falls back to the site geometry */
  inclinationReachable: boolean | null;
  failureMode: FailureMode;
  /** the vehicle forced a different site and the change has not been reported yet */
  siteReassigned: boolean;
}

/**
 * Pre-flight feasibility verdict (audit B12), from data and the mission plan.
 *
 * Ordering is by how badly the mission is broken: no rating and over-capacity
 * are failures, an unreachable inclination costs a plane change, the site
 * reassignment is news about what the user just did, and the last three are
 * margins and caveats on a mission that will fly.
 *
 * `siteReassigned` is deliberately a **one-shot** input, cleared by the panel
 * as soon as it has been shown. Left sticky it masked every later verdict:
 * once the user picked a vehicle that does not fly from the selected site, the
 * note stayed on "this vehicle does not fly from the previous site" for the
 * rest of the session and never reported a tight margin, an over-capacity
 * payload or an armed failure again.
 *
 * Deliberately not a headless flight: a full mission costs tens of
 * milliseconds per keystroke, and `runAscent` stops at the parking orbit, so
 * it reports success for missions that later run out of propellant and failure
 * for missions whose coast outlives its 2400 s horizon.
 */
export function missionVerdict(i: VerdictInput): Feasibility {
  const cls = orbitClassOf(i.orbit);
  const { cap, cls: capCls } = ratedPayload(i.spec, cls);
  const className = t(`orbit.class.${capCls}`);
  if (cap <= 0) {
    return { level: 'fail', text: t('setup.verdict.noRating', { vehicle: i.spec.name, class: t(`orbit.class.${cls}`) }) };
  }
  if (i.payloadMass > cap) {
    return { level: 'fail', text: t('setup.verdict.overCapacity', { mass: num(i.payloadMass), cap: num(cap), class: className, vehicle: i.spec.name }) };
  }
  const reachable = i.inclinationReachable ?? reachableFromSite(i.site, i.inclinationDeg);
  if (!reachable) {
    return { level: 'warn', text: t('setup.verdict.inclination', { inc: i.inclinationDeg.toFixed(1), site: siteName(i.site), min: i.site.minInclination.toFixed(1) }) };
  }
  if (i.siteReassigned) {
    return { level: 'warn', text: t('setup.verdict.siteChanged', { site: siteName(i.site) }) };
  }
  if (i.payloadMass > cap * 0.9) {
    return { level: 'warn', text: t('setup.verdict.tight', { mass: num(i.payloadMass), cap: num(cap), class: className }) };
  }
  if (i.failureMode !== 'none') {
    return { level: 'warn', text: t('setup.verdict.failureArmed', { mode: t(`setup.fail.${i.failureMode}`) }) };
  }
  return { level: 'ok', text: t('setup.verdict.readyMargin', { mass: num(i.payloadMass), cap: num(cap), class: className }) };
}

export class SetupPanel {
  readonly root: HTMLElement;
  private cb: SetupCallbacks;
  state: SetupState;
  private running = false;
  private tuning = false;
  private tuneMessage = '';
  /** the mission the current auto-tune result was measured for */
  private tunedFor = '';
  /** the vehicle forced a different site than the one that was selected */
  private siteReassigned = false;
  private noteEl: HTMLElement | null = null;
  private infoEl: HTMLElement | null = null;
  private descEl: HTMLElement | null = null;
  private statsEl: HTMLElement | null = null;
  private windowsEl: HTMLElement | null = null;
  private launchBtn: HTMLButtonElement | null = null;
  /** the mission plan for the current state; null when the planner rejected it */
  private planCache: ReturnType<typeof planMission> | null = null;

  constructor(root: HTMLElement, cb: SetupCallbacks) {
    this.root = root;
    this.cb = cb;
    const now = new Date();
    now.setUTCSeconds(0, 0);
    now.setUTCMinutes(Math.ceil(now.getUTCMinutes() / 5) * 5);
    this.state = {
      vehicleId: 'soyuz21a', satelliteId: 'crew', siteId: 'baikonur', orbitId: 'iss', orbit: { ...orbitById('iss') },
      launchTime: now, guidanceOverrides: {}, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
      payloadMass: satelliteById('crew').mass,
    };
    this.tunedFor = this.missionSignature();
    this.render();
  }

  /** The guidance that will be flown: the vehicle's own programme plus operator edits. */
  get guidance(): GuidanceParams {
    return { ...guidanceForVehicle(vehicleById(this.state.vehicleId)), ...this.state.guidanceOverrides };
  }

  getConfig(): MissionConfig {
    const s = this.state;
    return {
      vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: { ...s.orbit },
      launchTime: new Date(s.launchTime.getTime()), guidance: this.guidance, failure: { ...s.failure },
      boosterRecovery: s.boosterRecovery, payloadMassOverride: s.payloadMass,
      // the values above are already merged with the vehicle's own programme
      guidanceResolved: true,
    };
  }

  setRunning(r: boolean): void {
    this.running = r;
    this.render();
  }

  /** What an auto-tune result is valid for: change any of it and the tune is stale. */
  private missionSignature(): string {
    const s = this.state;
    return `${s.vehicleId}|${s.siteId}|${s.orbitId}|${s.orbit.perigee}|${s.orbit.apogee}|${s.orbit.inclination}|${s.payloadMass}|${s.satelliteId}`;
  }

  // ─── element helpers ──────────────────────────────────────────────────────

  private el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  private select(labelKey: string, options: { value: string; label: string }[], value: string, onChange: (v: string) => void): HTMLElement {
    const lab = this.el('label', 'field');
    lab.appendChild(this.el('span', undefined, t(labelKey)));
    const sel = this.el('select');
    sel.setAttribute('aria-label', t(labelKey));
    for (const o of options) {
      const op = this.el('option', undefined, o.label);
      op.value = o.value;
      if (o.value === value) op.selected = true;
      sel.appendChild(op);
    }
    sel.disabled = this.running;
    sel.addEventListener('change', () => onChange(sel.value));
    lab.appendChild(sel);
    return lab;
  }

  private number(labelKey: string, value: number, onChange: (v: number) => void, step = 1, min?: number, max?: number): HTMLElement {
    const lab = this.el('label', 'field');
    lab.appendChild(this.el('span', undefined, t(labelKey)));
    const inp = this.el('input');
    inp.type = 'number';
    inp.value = String(+value.toFixed(3));
    inp.step = String(step);
    inp.setAttribute('aria-label', t(labelKey));
    if (min !== undefined) inp.min = String(min);
    if (max !== undefined) inp.max = String(max);
    inp.disabled = this.running;
    inp.addEventListener('change', () => {
      const v = Number(inp.value);
      if (isFinite(v)) onChange(v);
    });
    lab.appendChild(inp);
    return lab;
  }

  private sectionTitle(step: string, titleKey: string): HTMLElement {
    const head = this.el('div', 'section-title');
    head.appendChild(this.el('span', 'step-number', step));
    head.appendChild(this.el('h2', undefined, t(titleKey)));
    return head;
  }

  private statCell(label: string, value: string, unit?: string): HTMLElement {
    const cell = this.el('div');
    cell.appendChild(this.el('small', undefined, label));
    const strong = this.el('strong', undefined, value);
    if (unit) strong.appendChild(this.el('em', undefined, ` ${unit}`));
    cell.appendChild(strong);
    return cell;
  }

  private changed(): void {
    // An auto-tune result belongs to the mission it was measured on.
    const sig = this.missionSignature();
    if (sig !== this.tunedFor) {
      this.tunedFor = sig;
      if (Object.keys(this.state.guidanceOverrides).length > 0) {
        this.state.guidanceOverrides = {};
        this.tuneMessage = t('setup.autotuneCleared');
        const msg = this.root.querySelector('#tune-msg');
        if (msg) msg.textContent = this.tuneMessage;
      }
    }
    this.refresh();
    this.cb.onChange?.(this.getConfig());
    // The site notice is news about the edit that has just been painted, not a
    // state of the mission: clearing it here is what stops it masking every
    // later verdict for the rest of the session.
    this.siteReassigned = false;
  }

  // ─── rendering ────────────────────────────────────────────────────────────

  /**
   * Rebuild the whole panel from state.
   *
   * The control set itself depends on the state (the site list follows the
   * vehicle, the RAAN mode adds or removes a field), so a rebuild is sometimes
   * unavoidable — but it drops focus, and the operator is often mid-edit. The
   * focused control is identified by its accessible name, which survives the
   * rebuild, and is focused again with its selection restored.
   */
  render(): void {
    const s = this.state;
    const root = this.root;
    const active = document.activeElement as HTMLElement | null;
    const focusName = active && root.contains(active) ? active.getAttribute('aria-label') : null;
    const caret = active instanceof HTMLInputElement && active.type !== 'number' ? active.selectionStart : null;
    root.setAttribute('aria-label', t('a11y.setupPanel'));
    root.replaceChildren();
    const vehicle = vehicleById(s.vehicleId);
    if (!vehicle.sites.includes(s.siteId)) {
      s.siteId = vehicle.sites[0];
      this.siteReassigned = true;
    }

    // heading
    const heading = this.el('div', 'panel-heading');
    const headLeft = this.el('div');
    headLeft.appendChild(this.el('span', 'eyebrow', t('app.missionControl')));
    headLeft.appendChild(this.el('h1', undefined, t('app.buildMission')));
    heading.appendChild(headLeft);
    heading.appendChild(this.el('span', 'step-count', '01—03'));
    root.appendChild(heading);

    const scroll = this.el('div', 'setup-scroll');
    root.appendChild(scroll);

    // ── 01 vehicle & site ───────────────────────────────────────────────────
    const s1 = this.el('section', 'config-section');
    s1.appendChild(this.sectionTitle('01', 'setup.step.vehicle'));
    s1.appendChild(this.select('setup.vehicle', VEHICLES.map((v) => ({ value: v.id, label: `${v.name} (${v.country})` })), s.vehicleId, (v) => {
      s.vehicleId = v;
      const spec = vehicleById(v);
      this.siteReassigned = false;
      if (!spec.sites.includes(s.siteId)) { s.siteId = spec.sites[0]; this.siteReassigned = true; }
      if (!spec.recoverable) s.boosterRecovery = false;
      this.render();
      this.changed();
    }));
    const detail = this.el('div', 'vehicle-detail');
    detail.appendChild(this.el('span', undefined, `${vehicleManufacturer(vehicle)} · ${vehicle.country}`));
    detail.appendChild(this.el('span', undefined, `${vehicle.stages.length} · ${t('setup.info.stages')}`));
    s1.appendChild(detail);
    const stats = this.el('div', 'vehicle-stats');
    stats.id = 'vehicle-stats';
    this.statsEl = stats;
    s1.appendChild(stats);
    if (vehicle.notes) {
      const notes = this.el('p', 'field-note vehicle-notes');
      notes.appendChild(this.el('strong', undefined, `${t('setup.stats.notes')}: `));
      notes.appendChild(document.createTextNode(vehicleNotes(vehicle)));
      s1.appendChild(notes);
    }
    s1.appendChild(this.select('setup.site', SITES.filter((x) => vehicle.sites.includes(x.id)).map((x) => ({ value: x.id, label: siteName(x) })), s.siteId, (v) => {
      s.siteId = v;
      this.siteReassigned = false;
      this.render();
      this.changed();
    }));
    const coords = this.el('p', 'field-note');
    coords.id = 'site-coordinates';
    s1.appendChild(coords);
    scroll.appendChild(s1);

    // ── 02 payload ──────────────────────────────────────────────────────────
    const s2 = this.el('section', 'config-section');
    s2.appendChild(this.sectionTitle('02', 'setup.step.payload'));
    s2.appendChild(this.select('setup.satellite', SATELLITES.map((x) => ({ value: x.id, label: satelliteName(x) })), s.satelliteId, (v) => {
      s.satelliteId = v;
      const sat = satelliteById(v);
      s.payloadMass = sat.mass;
      const typical = orbitById(sat.typicalOrbit);
      s.orbitId = typical.id;
      s.orbit = { ...typical };
      this.render();
      this.changed();
    }));
    s2.appendChild(this.number('setup.payloadMass', s.payloadMass, (v) => { s.payloadMass = Math.max(1, v); this.changed(); }, 10, 1));
    scroll.appendChild(s2);

    // ── 03 target orbit & launch time ───────────────────────────────────────
    const s3 = this.el('section', 'config-section orbit-section');
    s3.appendChild(this.sectionTitle('03', 'setup.step.orbit'));
    const pills = this.el('div', 'orbit-presets');
    pills.setAttribute('role', 'group');
    pills.setAttribute('aria-label', t('a11y.orbitPresets'));
    for (const o of ORBIT_PRESETS) {
      const b = this.el('button', s.orbitId === o.id ? 'active' : undefined, orbitShort(o));
      b.type = 'button';
      b.title = orbitName(o);
      b.setAttribute('aria-pressed', String(s.orbitId === o.id));
      b.disabled = this.running;
      b.addEventListener('click', () => {
        s.orbitId = o.id;
        s.orbit = { ...orbitById(o.id) };
        this.render();
        this.changed();
      });
      pills.appendChild(b);
    }
    s3.appendChild(pills);
    const desc = this.el('p', 'field-note');
    desc.id = 'orbit-description';
    this.descEl = desc;
    s3.appendChild(desc);

    const site = siteById(s.siteId);
    const target = resolveTarget(s.orbit, site, s.launchTime);
    const orbitRow = this.el('div', 'row');
    orbitRow.appendChild(this.number('setup.perigee', s.orbit.perigee / 1000, (v) => { this.customise(); s.orbit.perigee = Math.max(100, v) * 1000; this.changed(); }, 10, 100));
    orbitRow.appendChild(this.number('setup.apogee', s.orbit.apogee / 1000, (v) => { this.customise(); s.orbit.apogee = Math.max(100, v) * 1000; this.changed(); }, 10, 100));
    s3.appendChild(orbitRow);
    const orbitRow2 = this.el('div', 'row');
    // `changed()`, not `render()`: the control set does not depend on the
    // inclination, and rebuilding the panel here destroyed the field the
    // operator had just typed into and dropped focus to the body.
    orbitRow2.appendChild(this.number('setup.inclination', target.inclination * RAD, (v) => { this.customise(); s.orbit.inclination = Math.max(0, Math.min(180, v)); this.changed(); }, 0.1, 0, 180));
    orbitRow2.appendChild(this.number('setup.argPerigee', s.orbit.argPerigee, (v) => { this.customise(); s.orbit.argPerigee = ((v % 360) + 360) % 360; this.changed(); }, 1, 0, 360));
    s3.appendChild(orbitRow2);
    s3.appendChild(this.select('setup.raanMode', [
      { value: 'free', label: t('setup.raanFree') }, { value: 'fixed', label: t('setup.raanFixed') },
      { value: 'iss', label: t('setup.raanIss') }, { value: 'ltan', label: t('setup.raanLtan') },
    ], s.orbit.raanMode, (v) => { this.customise(); s.orbit.raanMode = v as OrbitSpec['raanMode']; this.render(); this.changed(); }));
    if (s.orbit.raanMode === 'fixed') s3.appendChild(this.number('setup.raan', s.orbit.raan ?? 0, (v) => { s.orbit.raan = ((v % 360) + 360) % 360; this.changed(); }, 1, 0, 360));
    if (s.orbit.raanMode === 'ltan') s3.appendChild(this.number('setup.ltan', s.orbit.ltan ?? 10.5, (v) => { s.orbit.ltan = Math.max(0, Math.min(24, v)); this.changed(); }, 0.25, 0, 24));

    const timeLab = this.el('label', 'field');
    timeLab.appendChild(this.el('span', undefined, t('setup.launchTime')));
    const timeInp = this.el('input');
    timeInp.type = 'datetime-local';
    timeInp.value = toDatetimeLocalUTC(s.launchTime);
    timeInp.disabled = this.running;
    timeInp.setAttribute('aria-label', t('setup.launchTime'));
    timeInp.addEventListener('change', () => {
      const d = fromDatetimeLocalUTC(timeInp.value);
      if (d) { s.launchTime = d; this.changed(); }
    });
    timeLab.appendChild(timeInp);
    s3.appendChild(timeLab);
    const winBox = this.el('div', 'windows');
    winBox.id = 'launch-windows';
    this.windowsEl = winBox;
    s3.appendChild(winBox);

    const info = this.el('div', 'info');
    info.id = 'vehicle-info';
    this.infoEl = info;
    s3.appendChild(info);
    scroll.appendChild(s3);

    // ── collapsible: guidance / failure / options ───────────────────────────
    const s4 = this.el('section', 'config-section');
    s4.appendChild(this.guidanceSection());
    s4.appendChild(this.failureSection(vehicle));
    s4.appendChild(this.optionsSection(vehicle));
    scroll.appendChild(s4);

    // ── launch area ─────────────────────────────────────────────────────────
    const area = this.el('div', 'launch-area');
    const note = this.el('p', 'status-note');
    note.id = 'mission-note';
    note.setAttribute('aria-live', 'polite');
    note.appendChild(this.el('span', 'status-dot'));
    note.appendChild(this.el('span', 'status-text'));
    this.noteEl = note;
    area.appendChild(note);
    const launch = this.el('button', 'launch-button');
    launch.type = 'button';
    launch.appendChild(this.el('span', 'arrow', '↗'));
    launch.appendChild(this.el('span', 'launch-label', t(this.running ? 'setup.relaunch' : 'setup.launchMission')));
    launch.appendChild(this.el('span', 'key-hint', 'SPACE'));
    launch.disabled = this.tuning;
    launch.addEventListener('click', () => this.cb.onLaunch(this.getConfig()));
    this.launchBtn = launch;
    area.appendChild(launch);
    const reset = this.el('button', 'ghost-button', t('setup.reset'));
    reset.type = 'button';
    reset.addEventListener('click', () => { this.running = false; this.render(); this.cb.onReset(); });
    area.appendChild(reset);
    area.appendChild(this.el('p', 'launch-note', t('setup.launchNote')));
    root.appendChild(area);

    this.refresh();
    if (focusName) {
      const again = root.querySelector<HTMLElement>(`[aria-label="${CSS.escape(focusName)}"]`);
      if (again) {
        again.focus();
        if (caret !== null && again instanceof HTMLInputElement) {
          try { again.setSelectionRange(caret, caret); } catch { /* not a text-like input */ }
        }
      }
    }
  }

  private guidanceSection(): HTMLElement {
    const gd = this.el('details');
    gd.appendChild(this.el('summary', undefined, t('setup.guidance')));
    const g = this.guidance;
    const set = (k: keyof GuidanceParams, v: number): void => {
      this.state.guidanceOverrides[k] = v;
      // an explicit edit belongs to this mission too
      this.tunedFor = this.missionSignature();
      this.changed();
    };
    gd.appendChild(this.el('p', 'field-note', t('setup.guidanceNote')));
    const r1 = this.el('div', 'row');
    r1.appendChild(this.number('setup.kickAngle', g.kickAngle, (v) => set('kickAngle', v), 0.5, 0, 45));
    r1.appendChild(this.number('setup.maxTurnRate', g.maxTurnRate, (v) => set('maxTurnRate', v), 0.05, 0.1, 3));
    gd.appendChild(r1);
    const r2 = this.el('div', 'row');
    r2.appendChild(this.number('setup.pitchOverAltitude', g.pitchOverAltitude, (v) => set('pitchOverAltitude', v), 50, 20, 5000));
    r2.appendChild(this.number('setup.kickDuration', g.kickDuration, (v) => set('kickDuration', v), 1, 1, 60));
    gd.appendChild(r2);
    const r3 = this.el('div', 'row');
    r3.appendChild(this.number('setup.loftAltitude', g.loftAltitude / 1000, (v) => set('loftAltitude', v * 1000), 10, 0, 400));
    r3.appendChild(this.number('setup.gravityTurnEnd', g.gravityTurnEnd / 1000, (v) => set('gravityTurnEnd', v * 1000), 5, 30, 150));
    gd.appendChild(r3);
    const r4 = this.el('div', 'row');
    r4.appendChild(this.number('setup.pitchMax', g.pitchMax, (v) => set('pitchMax', v), 1, 0, 80));
    r4.appendChild(this.number('setup.pitchMin', g.pitchMin, (v) => set('pitchMin', v), 1, -60, 0));
    gd.appendChild(r4);
    const r5 = this.el('div', 'row');
    r5.appendChild(this.number('setup.slewRate', g.slewRate, (v) => set('slewRate', v), 0.5, 0.5, 20));
    r5.appendChild(this.number('setup.maxAccel', g.maxAccel, (v) => set('maxAccel', v), 1, 0, 100));
    gd.appendChild(r5);
    gd.appendChild(this.number('setup.parkingAltitude', g.parkingAltitude / 1000, (v) => set('parkingAltitude', v * 1000), 10, 0, 2000));
    const tuneBtn = this.el('button', 'btn', this.tuning ? t('setup.autotuning') : t('setup.autotune'));
    tuneBtn.type = 'button';
    tuneBtn.disabled = this.running || this.tuning;
    tuneBtn.addEventListener('click', () => void this.autotune());
    gd.appendChild(tuneBtn);
    gd.appendChild(this.el('p', 'field-note', t('setup.autotuneScope')));
    const tuneMsg = this.el('div', 'progress', this.tuneMessage);
    tuneMsg.id = 'tune-msg';
    gd.appendChild(tuneMsg);
    return gd;
  }

  private failureSection(vehicle: VehicleSpec): HTMLElement {
    const s = this.state;
    const fd = this.el('details');
    fd.appendChild(this.el('summary', undefined, t('setup.failure')));
    fd.appendChild(this.select('setup.failureMode', FAILURE_MODES.map((m) => ({ value: m, label: t(`setup.fail.${m}`) })), s.failure.mode, (v) => { s.failure.mode = v as FailureMode; this.changed(); }));
    const fr = this.el('div', 'row');
    fr.appendChild(this.number('setup.failureTime', s.failure.time, (v) => { s.failure.time = Math.max(0, v); this.changed(); }, 5, 0, 2000));
    fr.appendChild(this.select('setup.failureStage', vehicle.stages.map((st, i) => ({ value: String(i), label: `${i + 1}: ${stageName(vehicle.id, st.id, st.name)}` })), String(Math.min(s.failure.stage, vehicle.stages.length - 1)), (v) => { s.failure.stage = Number(v); this.changed(); }));
    fd.appendChild(fr);
    return fd;
  }

  private optionsSection(vehicle: VehicleSpec): HTMLElement {
    const s = this.state;
    const od = this.el('details');
    od.appendChild(this.el('summary', undefined, t('setup.options')));
    const chk = this.el('label', 'checkbox');
    const cb = this.el('input');
    cb.type = 'checkbox';
    cb.checked = s.boosterRecovery;
    cb.disabled = this.running || !vehicle.recoverable;
    cb.addEventListener('change', () => { s.boosterRecovery = cb.checked; this.changed(); });
    chk.appendChild(cb);
    chk.appendChild(this.el('span', undefined, t('setup.boosterRecovery')));
    od.appendChild(chk);
    return od;
  }

  private customise(): void {
    if (this.state.orbitId !== 'custom') {
      this.state.orbitId = 'custom';
      const custom = orbitById('custom');
      this.state.orbit = { ...this.state.orbit, id: 'custom', name: custom.name, description: custom.description };
      // the preset pills have to follow
      this.root.querySelectorAll<HTMLButtonElement>('.orbit-presets button').forEach((b) => {
        const on = b.title === orbitName(custom);
        b.classList.toggle('active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    }
  }

  /** Update everything derived from state without rebuilding the controls. */
  private refresh(): void {
    // One plan per refresh: both the info card and the feasibility verdict read
    // it, and planning twice per keystroke buys nothing.
    try { this.planCache = planMission(this.getConfig(), siteById(this.state.siteId), vehicleById(this.state.vehicleId)); } catch { this.planCache = null; }
    this.updateStats();
    this.updateWindows();
    this.updateInfo();
    this.updateVerdict();
    if (this.descEl) this.descEl.textContent = orbitDesc(this.state.orbit);
    if (this.launchBtn) {
      const label = this.launchBtn.querySelector('.launch-label');
      if (label) label.textContent = t(this.running ? 'setup.relaunch' : 'setup.launchMission');
    }
  }

  private updateStats(): void {
    const box = this.statsEl;
    if (!box) return;
    const s = this.state;
    const spec = vehicleById(s.vehicleId);
    const sat = satelliteById(s.satelliteId);
    const m0 = liftoffMass(spec, s.payloadMass);
    const T0 = liftoffThrust(spec);
    box.replaceChildren();
    box.appendChild(this.statCell(t('setup.info.height'), num(spec.height, spec.height % 1 === 0 ? 0 : 1), 'm'));
    box.appendChild(this.statCell(t('setup.info.liftoffMass'), num(m0 / 1000, 1), 't'));
    box.appendChild(this.statCell(t('setup.info.liftoffThrust'), num(T0 / 1000), 'kN'));
    box.appendChild(this.statCell(t('setup.info.twr'), num(T0 / (m0 * G0), 2)));
    box.appendChild(this.statCell(t('setup.info.stages'), `${spec.stages.length}${sat.propulsion ? ' + s/c' : ''}`));
    const caps: string[] = [`${t('orbit.class.leo')} ${num(spec.payloadLEO)}`];
    if (spec.payloadGTO) caps.push(`${t('orbit.class.gto')} ${num(spec.payloadGTO)}`);
    if (spec.payloadSSO) caps.push(`${t('orbit.class.sso')} ${num(spec.payloadSSO)}`);
    const cell = this.statCell(t('setup.stats.payloadCap'), caps.join(' · '), 'kg');
    cell.className = 'wide';
    box.appendChild(cell);
  }

  private updateWindows(): void {
    const box = this.windowsEl;
    if (!box) return;
    const s = this.state;
    const site = siteById(s.siteId);
    box.replaceChildren();
    if (s.orbit.raanMode === 'free') {
      box.appendChild(this.el('div', 'k', t('setup.noWindow')));
      return;
    }
    box.appendChild(this.el('div', 'k', t('setup.windowInfo')));
    const wins = launchWindows(s.orbit, site, new Date(s.launchTime.getTime() - 60e3), 3);
    for (const w of wins) {
      const row = this.el('button', 'window-row', `▸ ${fmtUTC(w.time)} · RAAN ${(w.raanTarget * RAD).toFixed(1)}°`);
      row.type = 'button';
      row.disabled = this.running;
      row.addEventListener('click', () => { s.launchTime = w.time; this.render(); this.changed(); });
      box.appendChild(row);
    }
    const btn = this.el('button', 'btn', t('setup.nextWindow'));
    btn.type = 'button';
    btn.disabled = this.running || wins.length === 0;
    btn.addEventListener('click', () => { if (wins[0]) { s.launchTime = wins[0].time; this.render(); this.changed(); } });
    box.appendChild(btn);
  }

  private updateInfo(): void {
    const box = this.infoEl;
    if (!box) return;
    const s = this.state;
    const spec = vehicleById(s.vehicleId);
    const site = siteById(s.siteId);
    const sat = satelliteById(s.satelliteId);
    const dv = idealDeltaV(spec, s.payloadMass);
    const vm = new VehicleModel(spec, s.payloadMass, s.boosterRecovery, sat);
    const plan = this.planCache;
    box.replaceChildren();
    const row = (k: string, v: string, cls = ''): void => {
      const line = this.el('div', cls || undefined);
      line.appendChild(this.el('span', 'k', k));
      line.appendChild(this.el('span', 'v', v));
      box.appendChild(line);
    };
    row(t('setup.info.idealDv'), `${num(dv)} m/s`);
    if (sat.propulsion) row(t('setup.info.spacecraftDv'), `${num(vm.spacecraftDeltaV())} m/s`);
    if (plan) {
      row(t('setup.info.azimuth'), `${(plan.azimuthRotating * RAD).toFixed(1)}° (${plan.descending ? 'S' : 'N'})`);
      row(t('setup.info.ascentInclination'), `${(plan.ascentInclination * RAD).toFixed(2)}°`);
      row(t('setup.info.insertion'), `${num(plan.insertionAltitude / 1000)} × ${num(plan.insertionApoapsis / 1000)} km`);
      if (plan.planeChangeDeg > 0.05) row(t('setup.info.planeChange'), `${plan.planeChangeDeg.toFixed(1)}°`, 'warn');
      row(t('setup.info.burnsDv'), `${num(plan.dvEstimateBurns)} m/s (${plan.burns.length})`);
    }
    // site coordinates note
    const coords = this.root.querySelector('#site-coordinates');
    if (coords) {
      const lat = `${Math.abs(site.latitude).toFixed(2)}° ${site.latitude < 0 ? 'S' : 'N'}`;
      const lon = `${Math.abs(site.longitude).toFixed(2)}° ${site.longitude < 0 ? 'W' : 'E'}`;
      coords.textContent = t('setup.siteCoordinates', { lat, lon, inc: site.minInclination.toFixed(1) });
    }
  }

  /** The current mission's verdict; see `missionVerdict`. */
  feasibility(): Feasibility {
    const s = this.state;
    const site = siteById(s.siteId);
    return missionVerdict({
      spec: vehicleById(s.vehicleId),
      site,
      orbit: s.orbit,
      payloadMass: s.payloadMass,
      inclinationDeg: resolveTarget(s.orbit, site, s.launchTime).inclination * RAD,
      // The planner's own verdict when there is one: it knows about the
      // range-safety corridor as well as the latitude.
      inclinationReachable: this.planCache ? this.planCache.inclinationReachable : null,
      failureMode: s.failure.mode,
      siteReassigned: this.siteReassigned,
    });
  }

  private updateVerdict(): void {
    const note = this.noteEl;
    if (!note) return;
    const v = this.feasibility();
    note.className = `status-note ${v.level}`;
    const text = note.querySelector('.status-text');
    if (text) text.textContent = v.text;
  }

  /** Chunked auto-tune so the UI stays responsive. */
  private async autotune(): Promise<void> {
    if (this.tuning) return;
    this.tuning = true;
    this.tuneMessage = t('setup.autotuning');
    this.render();
    const cfg = this.getConfig();
    const lofts = needsLoftSearch(cfg) ? DEFAULT_LOFTS : [0];
    const combos: [number, number, number][] = [];
    for (const loft of lofts) for (const rate of DEFAULT_RATES) for (const k of DEFAULT_KICKS) combos.push([k, rate, loft]);
    const results: TuneResult[] = [];
    for (let i = 0; i < combos.length; i++) {
      const [k, rate, loft] = combos[i];
      results.push(runAscent(cfg, k, rate, loft));
      const msg = this.root.querySelector('#tune-msg');
      if (msg) msg.textContent = `${t('setup.autotuning')} ${i + 1}/${combos.length}`;
      if (i % 3 === 2) await new Promise((r) => setTimeout(r, 0));
    }
    const ok = results.filter((r) => r.success);
    let best: TuneResult | null = null;
    if (ok.length) best = ok.reduce((a, b) => (b.dvRemaining > a.dvRemaining ? b : a));
    this.tuning = false;
    if (best) {
      // Scoped to this mission: `changed()` drops the overrides as soon as the
      // vehicle, site, orbit or payload moves away from what was measured.
      this.state.guidanceOverrides = {
        ...this.state.guidanceOverrides,
        kickAngle: best.kickAngle,
        maxTurnRate: best.maxTurnRate,
        loftAltitude: best.loftAltitude,
      };
      this.tunedFor = this.missionSignature();
      this.tuneMessage = t('setup.autotuneResult', { kick: best.kickAngle, rate: best.maxTurnRate, loft: best.loftAltitude / 1000, dv: Math.round(best.dvRemaining) });
    } else {
      this.tuneMessage = t('setup.autotuneFail');
    }
    this.render();
    this.cb.onChange?.(this.getConfig());
  }
}

