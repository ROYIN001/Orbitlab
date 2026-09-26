/**
 * A custom vehicle, checked before it flies (roadmap S02).
 *
 * A mission may carry its vehicle inline (`MissionConfig.vehicleSpec`), from a
 * mission file today and from the builders of Phase 3 later
 * (docs/ROADMAP-PART2-3.md). The physics trusts a `VehicleSpec` the way it
 * trusts the catalogue's, so everything a file could get wrong is caught here:
 * the wrong type, NaN and Infinity, masses and dimensions that are not
 * positive, engine figures no chemical engine has, a stage count or a strap-on
 * arrangement the model does not fly, ids the model reserves for itself, and
 * fields this version does not know (a field it does not know could change
 * what the vehicle is). Each problem names its path in the spec, so a file can
 * be fixed from the message alone.
 *
 * The bounds are PLAUSIBILITY bounds, not capability: they take in every
 * vehicle in the catalogue with room to spare (Super Heavy's 33 engines and
 * 3 400 t of propellant, an SRB's 16 MN) and reject what is a typo or a unit
 * slip — a thrust in kN where N was meant is a vehicle that never leaves the
 * pad, which is the pre-flight verdict's to say, but an Isp of 3 000 s is no
 * chemical engine. A valid vehicle may still be unable to fly its mission;
 * that is the feasibility verdict's business, not this file's.
 */
import type { VehicleSpec } from '../types';
import { SITES } from '../data/sites';
import { isCatalogueVehicle, vehicleById } from '../data/vehicles';

export interface VehicleSpecIssue {
  /** where in the spec, `stages[1].engine.ispVac` */
  path: string;
  message: string;
}

/** The most stages the model is asked to fly (the catalogue's deepest stack has four). */
export const MAX_STAGES = 6;
/** Strap-on groups on the first stage, and units in one group. */
export const MAX_BOOSTER_GROUPS = 4;
export const MAX_BOOSTERS_PER_GROUP = 12;
/** Ids the vehicle model uses for parts of its own. */
export const RESERVED_PART_IDS: readonly string[] = ['spacecraft', 'fairing', 'payload', 'stage', 'active'];
const ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$/;

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const describe = (v: unknown): string => (typeof v === 'number' ? String(v) : v === null ? 'null' : Array.isArray(v) ? 'an array' : typeof v);

class Checker {
  readonly issues: VehicleSpecIssue[] = [];

  add(path: string, message: string): void {
    this.issues.push({ path, message });
  }

  /** Fields the version knows; anything else is reported. */
  known(o: Obj, path: string, fields: readonly string[]): void {
    for (const key of Object.keys(o)) if (!fields.includes(key)) this.add(`${path}${path ? '.' : ''}${key}`, 'is not a field of this version');
  }

  number(o: Obj, key: string, path: string, min: number, max: number, opts: { optional?: boolean; exclusiveMin?: boolean; integer?: boolean } = {}): number | undefined {
    const v = o[key], at = `${path}${path ? '.' : ''}${key}`;
    if (v === undefined) {
      if (!opts.optional) this.add(at, 'is required');
      return undefined;
    }
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      this.add(at, `must be a finite number (got ${describe(v)})`);
      return undefined;
    }
    if (opts.integer && !Number.isInteger(v)) this.add(at, `must be a whole number (got ${v})`);
    if (opts.exclusiveMin ? v <= min : v < min) this.add(at, `must be ${opts.exclusiveMin ? 'more than' : 'at least'} ${min} (got ${v})`);
    else if (v > max) this.add(at, `must be at most ${max} (got ${v})`);
    return v;
  }

  string(o: Obj, key: string, path: string, opts: { optional?: boolean; max?: number; pattern?: RegExp; allowEmpty?: boolean } = {}): string | undefined {
    const v = o[key], at = `${path}${path ? '.' : ''}${key}`;
    if (v === undefined) {
      if (!opts.optional) this.add(at, 'is required');
      return undefined;
    }
    if (typeof v !== 'string') { this.add(at, `must be text (got ${describe(v)})`); return undefined; }
    if (!opts.allowEmpty && !v.trim()) this.add(at, 'must not be empty');
    else if (v.length > (opts.max ?? 80)) this.add(at, `must be at most ${opts.max ?? 80} characters`);
    else if (opts.pattern && !opts.pattern.test(v)) this.add(at, 'must be Latin letters, digits, "-" or "_", starting with a letter or a digit, at most 40 characters');
    return v;
  }

  boolean(o: Obj, key: string, path: string): void {
    const v = o[key];
    if (v !== undefined && typeof v !== 'boolean') this.add(`${path}${path ? '.' : ''}${key}`, `must be true or false (got ${describe(v)})`);
  }
}

const ENGINE_FIELDS = ['name', 'count', 'thrustSL', 'thrustVac', 'ispSL', 'ispVac', 'minThrottle', 'solid', 'peakFactor', 'vacuumOnly', 'startupS', 'tailoffS'];
const BOOSTER_FIELDS = ['id', 'name', 'count', 'dryMass', 'propellantMass', 'engine', 'diameter', 'length', 'igniteAt', 'sepDelay', 'color', 'conicalTop', 'baseOffset'];
const STAGE_FIELDS = ['id', 'name', 'dryMass', 'propellantMass', 'engine', 'diameter', 'length', 'restartable', 'sepDelay', 'ignitionDelay',
  'throttleWithBoosters', 'boosters', 'color', 'accentColor', 'profile', 'fins', 'gridFins', 'legs', 'flaps', 'nozzleLength'];
const FAIRING_FIELDS = ['mass', 'diameter', 'length', 'sepAltitude', 'sepTime', 'adapter', 'color'];
const VEHICLE_FIELDS = ['id', 'name', 'country', 'manufacturer', 'height', 'payloadLEO', 'payloadGTO', 'payloadSSO', 'fairing', 'escapeSystem',
  'stages', 'sites', 'maxQ', 'maxAccel', 'maxQThrottle', 'recoverable', 'recoveryReserve', 'returnReserve', 'guidanceDefaults',
  'guidanceDefaultsSixDof', 'dragArea', 'crewCapable', 'notes', 'derivedFrom'];
/** Guidance fields a vehicle's own programme may set, with their stored-unit bounds (validation.ts's GUIDANCE_FIELDS, widened to cover the catalogue). */
const GUIDANCE_BOUNDS: Record<string, [number, number]> = {
  pitchOverAltitude: [0, 20000], kickAngle: [0, 60], kickDuration: [0, 120], maxTurnRate: [0, 10], loftAltitude: [0, 1e6],
  gravityTurnEnd: [0, 3e5], parkingAltitude: [0, 3e6], pitchMax: [-90, 90], pitchMin: [-90, 90], slewRate: [0, 50],
  maxAccel: [0, 200], maxTimeToGo: [0, 2e4],
};

function checkEngine(c: Checker, raw: unknown, path: string, groundLit: boolean): void {
  if (!isObj(raw)) { c.add(path, `must be an engine (got ${describe(raw)})`); return; }
  c.known(raw, path, ENGINE_FIELDS);
  c.string(raw, 'name', path);
  c.number(raw, 'count', path, 1, 50, { integer: true });
  const thrustVac = c.number(raw, 'thrustVac', path, 0, 2e7, { exclusiveMin: true });
  const ispVac = c.number(raw, 'ispVac', path, 50, 480);
  const vacuumOnly = raw.vacuumOnly === true;
  // a vacuum-only engine's sea-level pair is a placeholder the model never reads (EngineSpec.vacuumOnly)
  const thrustSL = c.number(raw, 'thrustSL', path, 0, 2e7);
  const ispSL = c.number(raw, 'ispSL', path, 0, 480);
  if (!vacuumOnly && thrustSL !== undefined && thrustVac !== undefined && thrustSL > thrustVac) c.add(`${path}.thrustSL`, `must not exceed thrustVac (${thrustSL} > ${thrustVac}): an engine loses thrust to the air, never gains it`);
  if (!vacuumOnly && ispSL !== undefined && ispVac !== undefined && ispSL > ispVac) c.add(`${path}.ispSL`, `must not exceed ispVac (${ispSL} > ${ispVac})`);
  if (groundLit && !vacuumOnly && thrustSL !== undefined && ispSL !== undefined && (thrustSL <= 0 || ispSL <= 0)) {
    c.add(path, 'lights on the pad, so it needs a sea-level thrust and specific impulse above zero');
  }
  if (groundLit && vacuumOnly) c.add(`${path}.vacuumOnly`, 'cannot be set on an engine that lights on the pad');
  c.number(raw, 'minThrottle', path, 0, 1, { optional: true, exclusiveMin: true });
  c.boolean(raw, 'solid', path);
  c.boolean(raw, 'vacuumOnly', path);
  c.number(raw, 'peakFactor', path, 1, 3, { optional: true });
  c.number(raw, 'startupS', path, 0, 10, { optional: true, exclusiveMin: true });
  c.number(raw, 'tailoffS', path, 0, 10, { optional: true, exclusiveMin: true });
}

function checkBooster(c: Checker, raw: unknown, path: string): string | undefined {
  if (!isObj(raw)) { c.add(path, `must be a strap-on group (got ${describe(raw)})`); return undefined; }
  c.known(raw, path, BOOSTER_FIELDS);
  const id = c.string(raw, 'id', path, { pattern: ID });
  c.string(raw, 'name', path);
  c.number(raw, 'count', path, 1, MAX_BOOSTERS_PER_GROUP, { integer: true });
  c.number(raw, 'dryMass', path, 0, 1e6, { exclusiveMin: true });
  c.number(raw, 'propellantMass', path, 0, 5e6, { exclusiveMin: true });
  const igniteAt = c.number(raw, 'igniteAt', path, 0, 600, { optional: true });
  checkEngine(c, raw.engine, `${path}.engine`, igniteAt === undefined || igniteAt === 0);
  c.number(raw, 'diameter', path, 0, 15, { exclusiveMin: true });
  c.number(raw, 'length', path, 0, 100, { exclusiveMin: true });
  c.number(raw, 'sepDelay', path, 0, 60, { optional: true });
  c.string(raw, 'color', path, { optional: true, max: 32 });
  c.boolean(raw, 'conicalTop', path);
  c.number(raw, 'baseOffset', path, -100, 100, { optional: true });
  return id;
}

function checkStage(c: Checker, raw: unknown, path: string, index: number, ids: string[]): void {
  if (!isObj(raw)) { c.add(path, `must be a stage (got ${describe(raw)})`); return; }
  c.known(raw, path, STAGE_FIELDS);
  const id = c.string(raw, 'id', path, { pattern: ID });
  if (id !== undefined) ids.push(id);
  c.string(raw, 'name', path);
  c.number(raw, 'dryMass', path, 0, 1e6, { exclusiveMin: true });
  c.number(raw, 'propellantMass', path, 0, 1e7, { exclusiveMin: true });
  checkEngine(c, raw.engine, `${path}.engine`, index === 0);
  c.number(raw, 'diameter', path, 0, 15, { exclusiveMin: true });
  c.number(raw, 'length', path, 0, 100, { exclusiveMin: true });
  for (const key of ['restartable', 'fins', 'gridFins', 'legs', 'flaps']) c.boolean(raw, key, path);
  c.number(raw, 'sepDelay', path, 0, 60, { optional: true });
  c.number(raw, 'ignitionDelay', path, 0, 60, { optional: true });
  c.number(raw, 'throttleWithBoosters', path, 0, 1, { optional: true, exclusiveMin: true });
  c.string(raw, 'color', path, { optional: true, max: 32 });
  c.string(raw, 'accentColor', path, { optional: true, max: 32 });
  if (raw.profile !== undefined && raw.profile !== 'r7Core' && raw.profile !== 'r7Upper') c.add(`${path}.profile`, 'must be "r7Core" or "r7Upper"');
  c.number(raw, 'nozzleLength', path, 0, 20, { optional: true, exclusiveMin: true });
  if (raw.boosters !== undefined) {
    if (!Array.isArray(raw.boosters)) c.add(`${path}.boosters`, `must be a list of strap-on groups (got ${describe(raw.boosters)})`);
    else if (index !== 0) c.add(`${path}.boosters`, 'strap-ons are flown on the first stage only');
    else if (raw.boosters.length > MAX_BOOSTER_GROUPS) c.add(`${path}.boosters`, `must have at most ${MAX_BOOSTER_GROUPS} groups`);
    else raw.boosters.forEach((b, i) => { const bid = checkBooster(c, b, `${path}.boosters[${i}]`); if (bid !== undefined) ids.push(bid); });
  }
}

/**
 * Everything wrong with a custom vehicle, or an empty list. `raw` is whatever
 * a file held; nothing is assumed about it.
 */
export function vehicleSpecProblems(raw: unknown): VehicleSpecIssue[] {
  const c = new Checker();
  if (!isObj(raw)) { c.add('', `must be a vehicle (got ${describe(raw)})`); return c.issues; }
  c.known(raw, '', VEHICLE_FIELDS);
  const id = c.string(raw, 'id', '', { pattern: ID });
  if (id !== undefined && isCatalogueVehicle(id)) c.add('id', `"${id}" is a catalogue vehicle's id: a custom vehicle needs an id of its own`);
  c.string(raw, 'name', '');
  c.string(raw, 'country', '', { max: 16 });
  c.string(raw, 'manufacturer', '', { allowEmpty: true });
  c.number(raw, 'height', '', 0, 200, { exclusiveMin: true });
  c.number(raw, 'payloadLEO', '', 0, 5e5);
  c.number(raw, 'payloadGTO', '', 0, 5e5);
  c.number(raw, 'payloadSSO', '', 0, 5e5, { optional: true });
  c.number(raw, 'maxQ', '', 0, 2e5, { exclusiveMin: true });
  c.number(raw, 'maxAccel', '', 0, 150, { exclusiveMin: true });
  c.number(raw, 'dragArea', '', 0, 200, { optional: true, exclusiveMin: true });
  c.number(raw, 'recoveryReserve', '', 0, 0.5, { optional: true });
  c.number(raw, 'returnReserve', '', 0, 0.5, { optional: true });
  for (const key of ['recoverable', 'crewCapable']) c.boolean(raw, key, '');
  c.string(raw, 'notes', '', { optional: true, max: 2000, allowEmpty: true });

  let origin: VehicleSpec | undefined;
  if (raw.derivedFrom !== undefined) {
    if (typeof raw.derivedFrom !== 'string' || !isCatalogueVehicle(raw.derivedFrom)) c.add('derivedFrom', `must name a catalogue vehicle (got ${JSON.stringify(raw.derivedFrom)})`);
    else origin = vehicleById(raw.derivedFrom);
  }
  // G06's escape is modelled on the Soyuz's own tower, fairing motors and descent module
  if (raw.escapeSystem !== undefined && (raw.escapeSystem !== 'soyuz' || origin?.escapeSystem !== 'soyuz')) {
    c.add('escapeSystem', 'the only escape system is the Soyuz\'s, for a vehicle derived from one that has it');
  }

  if (raw.fairing !== null) {
    const f = raw.fairing;
    if (!isObj(f)) c.add('fairing', `must be a fairing, or null for an integrated payload bay (got ${describe(f)})`);
    else {
      c.known(f, 'fairing', FAIRING_FIELDS);
      c.number(f, 'mass', 'fairing', 0, 2e4, { exclusiveMin: true });
      c.number(f, 'diameter', 'fairing', 0, 15, { exclusiveMin: true });
      const length = c.number(f, 'length', 'fairing', 0, 40, { exclusiveMin: true });
      c.number(f, 'sepAltitude', 'fairing', 0, 3e5);
      c.number(f, 'sepTime', 'fairing', 0, 2000, { optional: true });
      const adapter = c.number(f, 'adapter', 'fairing', 0, 40, { optional: true });
      if (adapter !== undefined && length !== undefined && adapter >= length) c.add('fairing.adapter', 'must be shorter than the fairing');
      c.string(f, 'color', 'fairing', { optional: true, max: 32 });
    }
  }

  if (!Array.isArray(raw.stages) || raw.stages.length === 0) c.add('stages', `must be a list of 1 to ${MAX_STAGES} stages`);
  else if (raw.stages.length > MAX_STAGES) c.add('stages', `must have at most ${MAX_STAGES} stages (got ${raw.stages.length})`);
  else {
    const ids: string[] = [];
    raw.stages.forEach((st, i) => checkStage(c, st, `stages[${i}]`, i, ids));
    const seen = new Set<string>();
    for (const part of ids) {
      if (RESERVED_PART_IDS.includes(part)) c.add('stages', `"${part}" is an id the vehicle model uses for itself`);
      if (seen.has(part)) c.add('stages', `"${part}" names two parts: every stage and strap-on group needs its own id`);
      seen.add(part);
    }
  }

  if (!Array.isArray(raw.sites) || raw.sites.length === 0) c.add('sites', 'must list at least one launch site');
  else raw.sites.forEach((site, i) => {
    if (typeof site !== 'string' || !SITES.some((s) => s.id === site)) c.add(`sites[${i}]`, `must be a launch site's id (got ${JSON.stringify(site)})`);
  });

  if (raw.maxQThrottle !== undefined) {
    const m = raw.maxQThrottle;
    if (!isObj(m)) c.add('maxQThrottle', `must be a throttle bucket (got ${describe(m)})`);
    else {
      c.known(m, 'maxQThrottle', ['qStart', 'qEnd', 'throttle']);
      const start = c.number(m, 'qStart', 'maxQThrottle', 0, 2e5);
      const end = c.number(m, 'qEnd', 'maxQThrottle', 0, 2e5);
      if (start !== undefined && end !== undefined && end < start) c.add('maxQThrottle.qEnd', 'must not be below qStart');
      c.number(m, 'throttle', 'maxQThrottle', 0, 1, { exclusiveMin: true });
    }
  }
  for (const key of ['guidanceDefaults', 'guidanceDefaultsSixDof']) {
    const g = raw[key];
    if (g === undefined) continue;
    if (!isObj(g)) { c.add(key, `must be a set of guidance values (got ${describe(g)})`); continue; }
    c.known(g, key, Object.keys(GUIDANCE_BOUNDS));
    for (const [field, [min, max]] of Object.entries(GUIDANCE_BOUNDS)) c.number(g, field, key, min, max, { optional: true });
  }
  return c.issues;
}

/** The problems as one message, for an error thrown at a caller that sent a bad spec. */
export function vehicleSpecText(issues: readonly VehicleSpecIssue[]): string {
  return issues.map((i) => (i.path ? `${i.path} ${i.message}` : `the vehicle ${i.message}`)).join('; ');
}

export function assertVehicleSpec(raw: unknown): asserts raw is VehicleSpec {
  const issues = vehicleSpecProblems(raw);
  if (issues.length) throw new Error(`Invalid custom vehicle: ${vehicleSpecText(issues)}`);
}
