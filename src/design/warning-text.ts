/**
 * What the builder says, as keys and numbers (roadmap D02, D03): its
 * warnings (src/design/warnings.ts), what it refuses to build
 * (src/design/remix.ts, src/design/assemble.ts, and the Explore level's own
 * checks in src/design/explore-model.ts) and what in a design is an
 * estimate — each mapped to the key of a sentence written for a student and
 * the numbers that go into it, with the unit each is shown in.
 *
 * No text and no formatting here: the screen looks the key up in the
 * reader's language and prints the numbers the way the rest of the app does
 * (src/ui/build/design-text.ts). Kept DOM-free and apart from the Explore
 * level so the Engineer level (D03's parts design, D04's readiness review)
 * says the same thing in the same words. The keys are written out as
 * literals, one per code, so tests/i18n.test.ts finds a call site for each
 * and tests/design-warning-text.test.ts can hold every code to a key that
 * exists in all three dictionaries.
 *
 * LEVELS, AS THE SCREEN SHOWS THEM. `fail`: the design will not fly (the
 * flight or the validator would refuse it); `warn`: it may fly, but something
 * is unlike every real rocket or the flight will not like it; `note`: an
 * estimate or a default the builder filled in, said so the figures are not
 * taken for data; `default`: a value the builder filled in that is neither
 * data nor an estimate (the country a design takes from its launch site).
 */
import type { DesignWarning, WarningCode } from './warnings';
import { WARNING_LEVEL } from './warnings';
import type { RemixEstimateCode, RemixRefusal } from './remix';
import { FLEET_FAIRING_SEP_ALTITUDE } from './remix';
import type { AssembleEstimateCode, AssembleRefusal } from './assemble';
import { FLEET_MAX_ACCEL, FLEET_MAX_Q } from './assemble';

/** How a number is shown: the screen formats each (src/ui/build/design-text.ts). SI in, always. */
export type TextUnit =
  /** a thrust-to-weight ratio, two decimals */
  | 'tw'
  /** m/s², one decimal */
  | 'accel'
  /** the same acceleration in g (÷ G0), one decimal */
  | 'g'
  /** m/s, whole */
  | 'speed'
  /** a fraction 0…1 shown as a percentage, one decimal */
  | 'percent'
  /** m, two decimals */
  | 'm'
  /** N shown in kN, whole */
  | 'kN'
  /** kg, whole (in tonnes from 10 t, as the figures show masses) */
  | 'mass'
  /** Pa shown in kPa, whole */
  | 'kPa'
  /** m shown in km, whole */
  | 'km'
  /** a plain count */
  | 'count';

export interface TextNumber {
  value: number;
  unit: TextUnit;
}

/** What a sentence is about, said before it: a stage, a strap-on group or the fairing. */
export type TextSubject =
  | { kind: 'stage'; n: number }
  | { kind: 'strapOns'; n: number }
  | { kind: 'fairing' };

export type TextLevel = 'fail' | 'warn' | 'note' | 'default';

export type TextValue = TextNumber | TextKey | string;

/** A word the screen translates: the key of its name (a field of a body of one's own). */
export interface TextKey {
  key: string;
}

export interface DesignText {
  /** the sentence's dictionary key */
  key: string;
  level: TextLevel;
  subject: TextSubject | null;
  /** the sentence's {placeholders}: a number with its unit, a word to translate, or a word that is data (a name, a country code) */
  values: Record<string, TextValue>;
  /** a technical detail shown as it is, not translated: the validator's path in the spec */
  detail?: string;
}

/** The subject of something about a stage (0-based) or one of the first stage's strap-on groups. */
export function subjectOf(where: { stage?: number; group?: number; booster?: number }): TextSubject | null {
  const group = where.group ?? where.booster;
  if (group !== undefined) return { kind: 'strapOns', n: group + 1 };
  if (where.stage !== undefined) return { kind: 'stage', n: where.stage + 1 };
  return null;
}

// ─── warnings ───────────────────────────────────────────────────────────────

/**
 * Every warning code's sentence. `fixedThrustOverAccel` and
 * `implausibleFraction` have two each, chosen by their numbers (see
 * `warningText`); the table lists both so every key appears here as a literal.
 */
export const WARNING_KEYS: Readonly<Record<WarningCode, readonly string[]>> = {
  invalid: ['build.warn.invalid'],
  vacuumEngineOnPad: ['build.warn.vacuumEngineOnPad'],
  noLiftoff: ['build.warn.noLiftoff'],
  lowLiftoffTW: ['build.warn.lowLiftoffTW'],
  weakUpperStage: ['build.warn.weakUpperStage'],
  fixedThrustOverAccel: ['build.warn.overAccel', 'build.warn.overAccelStrapOns'],
  lowDv: ['build.warn.lowDv'],
  implausibleFraction: ['build.warn.fractionHigh', 'build.warn.fractionLow'],
  upperWiderThanFairing: ['build.warn.widerThanFairing'],
};

/** One warning of `designWarnings` as a sentence's key and its numbers. */
export function warningText(w: DesignWarning): DesignText {
  const level = WARNING_LEVEL[w.code];
  const subject = subjectOf(w);
  const p = w.params;
  const n = (value: number, unit: TextUnit): TextNumber => ({ value, unit });
  const [first, second] = WARNING_KEYS[w.code];
  switch (w.code) {
    case 'invalid':
      return { key: first, level, subject, values: {}, ...(w.path !== undefined ? { detail: w.path } : {}) };
    case 'vacuumEngineOnPad':
      return { key: first, level, subject, values: {} };
    case 'noLiftoff':
      return { key: first, level, subject: null, values: { thrust: n(p.thrustN, 'kN'), weight: n(p.weightN, 'kN'), tw: n(p.tw, 'tw') } };
    case 'lowLiftoffTW':
      return { key: first, level, subject: null, values: { tw: n(p.tw, 'tw'), floor: n(p.floor, 'tw') } };
    case 'weakUpperStage':
      return { key: first, level, subject, values: { accel: n(p.accel, 'accel'), floor: n(p.floor, 'accel') } };
    case 'fixedThrustOverAccel':
      return {
        key: p.strapOnPhase === 1 ? second : first, level, subject,
        values: { accel: n(p.accel, 'accel'), g: n(p.accel, 'g'), limit: n(p.limit, 'accel') },
      };
    case 'lowDv':
      return { key: first, level, subject: null, values: { dv: n(p.dv, 'speed'), floor: n(p.floor, 'speed') } };
    case 'implausibleFraction': {
      const high = p.fraction > p.max;
      return {
        key: high ? first : second, level, subject,
        values: { fraction: n(p.fraction, 'percent'), bound: n(high ? p.max : p.min, 'percent') },
      };
    }
    case 'upperWiderThanFairing':
      return { key: first, level, subject, values: { stage: n(p.stageDiameter, 'm'), fairing: n(p.fairingDiameter, 'm') } };
  }
}

// ─── the Explore level's own checks ─────────────────────────────────────────

/** Checks the Explore level adds to `designWarnings` (src/design/explore-model.ts). */
export type ExploreCheckCode = 'dryBelowEngines';

export const EXPLORE_CHECK_KEYS: Readonly<Record<ExploreCheckCode, string>> = {
  dryBelowEngines: 'build.warn.dryBelowEngines',
};

export interface ExploreCheck {
  code: ExploreCheckCode;
  level: 'warn';
  stage: number;
  /** kg: the stage's dry mass, and its engines' published mass */
  dryMass: number;
  enginesMass: number;
}

export function exploreCheckText(c: ExploreCheck): DesignText {
  return {
    key: EXPLORE_CHECK_KEYS[c.code], level: c.level, subject: subjectOf(c),
    values: { dry: { value: c.dryMass, unit: 'mass' }, engines: { value: c.enginesMass, unit: 'mass' } },
  };
}

// ─── refusals ───────────────────────────────────────────────────────────────

/** What the Explore level refuses before it asks the remix or the assembly (src/design/explore-model.ts). */
export type ExploreRefusal = 'noName' | 'fieldRange' | 'badPayload';

export type RefusalCode = RemixRefusal | AssembleRefusal | ExploreRefusal;

/** Every refusal's sentence, one key per code. */
export const REFUSAL_KEYS: Readonly<Record<RefusalCode, string>> = {
  unknownOp: 'build.refuse.unknownOp',
  noSuchStage: 'build.refuse.noSuchStage',
  noSuchGroup: 'build.refuse.noSuchGroup',
  unknownPart: 'build.refuse.unknownPart',
  badFactor: 'build.refuse.badFactor',
  badCount: 'build.refuse.badCount',
  badIgnition: 'build.refuse.badIgnition',
  lumpedRecount: 'build.refuse.lumpedRecount',
  solidMotor: 'build.refuse.solidMotor',
  familyMismatch: 'build.refuse.familyMismatch',
  vacuumEngineOnPad: 'build.refuse.vacuumEngineOnPad',
  tooManyGroups: 'build.refuse.tooManyGroups',
  outOfLimits: 'build.refuse.outOfLimits',
  noStages: 'build.refuse.noStages',
  tooManyStages: 'build.refuse.tooManyStages',
  boostersNotOnFirstStage: 'build.refuse.boostersNotOnFirstStage',
  unknownSite: 'build.refuse.unknownSite',
  noEngine: 'build.refuse.noEngine',
  noName: 'build.refuse.noName',
  fieldRange: 'build.refuse.fieldRange',
  badPayload: 'build.refuse.badPayload',
};

/** The field a `fieldRange` refusal names, and the key of its name. */
export type BodyField = 'dryMass' | 'propellantMass' | 'diameter' | 'length';
export const BODY_FIELD_KEYS: Readonly<Record<BodyField, string>> = {
  dryMass: 'build.ex.own.dryMass',
  propellantMass: 'build.ex.own.propellant',
  diameter: 'build.ex.own.diameter',
  length: 'build.ex.own.length',
};

export interface DesignRefusal {
  code: RefusalCode;
  stage?: number;
  group?: number;
  /** a fairing op was refused */
  fairing?: true;
  /** `fieldRange`: which field of a body of one's own, and its bounds (SI; the lower one is exclusive) */
  field?: BodyField;
  min?: number;
  max?: number;
  /** the module's own detail, in English, for the curious (not translated) */
  detail?: string;
}

export function refusalText(r: DesignRefusal): DesignText {
  const subject: TextSubject | null = r.fairing ? { kind: 'fairing' } : subjectOf(r);
  const values: Record<string, TextValue> = {};
  if (r.code === 'fieldRange' && r.field) {
    const unit: TextUnit = r.field === 'dryMass' || r.field === 'propellantMass' ? 'mass' : 'm';
    values.field = { key: BODY_FIELD_KEYS[r.field] };
    values.max = { value: r.max ?? 0, unit };
  }
  return { key: REFUSAL_KEYS[r.code], level: 'fail', subject, values, ...(r.detail ? { detail: r.detail } : {}) };
}

// ─── estimates ──────────────────────────────────────────────────────────────

export type EstimateCode = RemixEstimateCode | AssembleEstimateCode;

/** Every estimate's sentence, one key per code. */
export const ESTIMATE_KEYS: Readonly<Record<EstimateCode, string>> = {
  tankMassScaled: 'build.est.tankMassScaled',
  solidCaseScaled: 'build.est.solidCaseScaled',
  engineMassUnknown: 'build.est.engineMassUnknown',
  lengthFromVolume: 'build.est.lengthFromVolume',
  lengthProportional: 'build.est.lengthProportional',
  fairingSepAltitude: 'build.est.fairingSepAltitude',
  originRatings: 'build.est.originRatings',
  noRatings: 'build.est.noRatings',
  maxQDefault: 'build.est.maxQDefault',
  maxAccelDefault: 'build.est.maxAccelDefault',
  countryDefault: 'build.est.countryDefault',
};

export interface DesignEstimate {
  code: EstimateCode;
  stage?: number;
  group?: number;
}

/**
 * One estimate as a sentence. `context` gives the words that are data: the
 * name of the vehicle whose ratings a remix still carries, and the country a
 * design took from its launch site.
 */
export function estimateText(e: DesignEstimate, context: { baseName?: string; country?: string } = {}): DesignText {
  const values: Record<string, TextValue> = {};
  switch (e.code) {
    case 'fairingSepAltitude': values.alt = { value: FLEET_FAIRING_SEP_ALTITUDE, unit: 'km' }; break;
    case 'maxQDefault': values.q = { value: FLEET_MAX_Q, unit: 'kPa' }; break;
    case 'maxAccelDefault': values.accel = { value: FLEET_MAX_ACCEL, unit: 'accel' }; break;
    case 'originRatings': values.name = context.baseName ?? ''; break;
    case 'countryDefault': values.country = context.country ?? ''; break;
    default: break;
  }
  return { key: ESTIMATE_KEYS[e.code], level: e.code === 'countryDefault' ? 'default' : 'note', subject: subjectOf(e), values };
}

/**
 * The estimates a design carries, each said once: a remix's ops can flag the
 * same thing twice (two stretches of one stage), and the same sentence twice
 * says nothing more.
 */
export function uniqueEstimates(list: readonly DesignEstimate[]): DesignEstimate[] {
  const seen = new Set<string>();
  return list.filter((e) => {
    const k = `${e.code}|${e.stage ?? ''}|${e.group ?? ''}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
