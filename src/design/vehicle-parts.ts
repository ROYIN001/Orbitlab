/**
 * Which catalogue parts a vehicle is built from (roadmap D01, for the Build
 * section's drawings and part cards, and for D02's remix, which starts from a
 * real vehicle and has to know what each of its stages is made of).
 *
 * WHY BY VALUE. A `VehicleSpec` carries no reference back to the catalogue:
 * D01 kept the spec exactly as it was, so the validator, mission files and
 * design files did not change (src/data/parts.ts, "upstream of the spec"). The
 * part a stage came from is found the way tests/parts.test.ts finds it: the
 * one stage body, strap-on body or fairing whose emitted hardware fields equal
 * the stage's, field for field. That test proves every stage, strap-on group
 * and fairing of the 21 catalogue vehicles matches exactly one part, so for
 * them the answer is never ambiguous; tests/design-exploded.test.ts checks that
 * this module finds it for every one. A custom design's stage that no part
 * emits gets `null`, and a caller shows it as the design's own.
 *
 * DOM-free: read by src/design/exploded.ts, src/design/part-card.ts and the
 * Build screen (src/ui/build/).
 */
import type { BoosterGroupSpec, EngineSpec, FairingSpec, StageSpec, VehicleSpec } from '../types';
import {
  BOOSTER_BODIES, ENGINE_PARTS, FAIRING_PARTS, STAGE_BODIES, boosterSpec, enginePart, engineSpec, fairingSpec, stageSpec,
  type BoosterBodyPart, type EnginePart, type FairingPart, type StageBodyPart,
} from '../data/parts';

/** A stage's or strap-on group's parts; either may be null for a design's own hardware. */
export interface BodyParts<B> {
  body: B | null;
  engine: EnginePart | null;
}

export interface VehicleParts {
  /** one per entry of `spec.stages` */
  stages: BodyParts<StageBodyPart>[];
  /** per stage, one per strap-on group (empty where a stage has none) */
  boosters: BodyParts<StageBodyPart>[][];
  fairing: FairingPart | null;
}

/** Deep equality of plain data: the same own keys, values `Object.is` at the leaves. */
function sameData(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length
    && ka.every((k) => Object.prototype.hasOwnProperty.call(b, k) && sameData((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
}

const pick = (o: object, keys: readonly string[]): Record<string, unknown> =>
  Object.fromEntries(keys.filter((k) => k in o).map((k) => [k, (o as Record<string, unknown>)[k]]));

/** The hardware fields a body part emits; the rest of a `StageSpec` is its installation. */
const BODY_HARDWARE = ['id', 'name', 'dryMass', 'propellantMass', 'engine', 'diameter', 'length'] as const;
const FAIRING_HARDWARE = ['mass', 'diameter', 'length', 'adapter'] as const;

/** The one element of `list` the predicate holds for, or null when none or several do. */
function only<T>(list: readonly T[], match: (item: T) => boolean): T | null {
  let hit: T | null = null;
  for (const item of list) {
    if (!match(item)) continue;
    if (hit) return null;
    hit = item;
  }
  return hit;
}

/** The engine part that emits this engine at this count, found by value. */
export function engineOf(engine: EngineSpec): EnginePart | null {
  return only(ENGINE_PARTS, (p) => sameData(engineSpec(p, engine.count), engine));
}

export function stageBodyOf(stage: StageSpec): StageBodyPart | null {
  const want = pick(stage, BODY_HARDWARE);
  return only(STAGE_BODIES, (b) => sameData(pick(stageSpec(b), BODY_HARDWARE), want));
}

export function boosterBodyOf(group: BoosterGroupSpec): BoosterBodyPart | null {
  const want = pick(group, BODY_HARDWARE);
  return only(BOOSTER_BODIES, (b) => sameData(pick(boosterSpec(b, group.count), BODY_HARDWARE), want));
}

export function fairingOf(fairing: FairingSpec): FairingPart | null {
  const want = pick(fairing, FAIRING_HARDWARE);
  return only(FAIRING_PARTS, (f) => sameData(pick(fairingSpec(f, { sepAltitude: 0 }), FAIRING_HARDWARE), want));
}

function bodyParts<B extends StageBodyPart>(body: B | null, engine: EngineSpec): BodyParts<B> {
  return { body, engine: body ? enginePart(body.engine.part) : engineOf(engine) };
}

const cache = new WeakMap<VehicleSpec, VehicleParts>();

/** The catalogue parts of every stage, strap-on group and the fairing of a vehicle (cached per spec object). */
export function vehicleParts(spec: VehicleSpec): VehicleParts {
  const hit = cache.get(spec);
  if (hit) return hit;
  const out: VehicleParts = {
    stages: spec.stages.map((st) => bodyParts(stageBodyOf(st), st.engine)),
    boosters: spec.stages.map((st) => (st.boosters ?? []).map((g) => bodyParts(boosterBodyOf(g), g.engine))),
    fairing: spec.fairing ? fairingOf(spec.fairing) : null,
  };
  cache.set(spec, out);
  return out;
}
