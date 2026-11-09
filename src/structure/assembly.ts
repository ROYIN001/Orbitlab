/**
 * Assembling a model to its reference design: which unit goes in which slot,
 * the way round it goes, and what has to be in place first. One state machine
 * for every model of the Structure section (src/structure/soyuz-assembly.ts,
 * src/structure/edusat.ts).
 *
 * The rules are the reference's relations, not a count: a unit goes only into
 * a slot the reference gives it (or one of the slots of its interchangeable
 * kind, as the satellite's four side panels), the way round the reference has
 * it, once every unit it mounts on or needs connected is in place; a unit
 * others rest on cannot be taken off before them. `checkAssembly` says the
 * model is complete only when every unit is in one of its slots, the right
 * way round, every slot holds exactly one unit and every relation holds — so
 * nothing is missing, doubled or left out of place.
 *
 * Pure and immutable: each step returns a new state, with the step on its
 * history so it can be undone (a restart too). DOM-free.
 */

export interface AssemblyUnitSpec {
  id: string;
  /** the slots it may go into; the first is the one the reference gives it */
  slots: readonly string[];
  /** the units that must be in place first: what it mounts on, or must be connected to */
  requires: readonly string[];
  /** how many ways round it can be offered (1: no choice to make); 0 is the reference's */
  orientations: number;
}

export interface AssemblySlotSpec {
  id: string;
  /** the unit the reference puts here */
  reference: string;
}

export interface AssemblySpec {
  units: readonly AssemblyUnitSpec[];
  slots: readonly AssemblySlotSpec[];
}

export interface Placement {
  slot: string;
  /** 0 is the reference's way round */
  orientation: number;
}

export type AssemblyAction =
  | { kind: 'install'; unit: string; placement: Placement }
  | { kind: 'remove'; unit: string; placement: Placement }
  | { kind: 'restart'; previous: Readonly<Record<string, Placement>> };

export interface AssemblyState {
  /** unit id → where it is */
  placed: Readonly<Record<string, Placement>>;
  /** the steps taken, oldest first (at most `HISTORY_LIMIT`) */
  history: readonly AssemblyAction[];
}

/** Why a step was not taken: what the hint says. */
export type AssemblyRefusal =
  | { code: 'unknownUnit'; unit: string }
  | { code: 'unknownSlot'; slot: string }
  | { code: 'alreadyPlaced'; unit: string; slot: string }
  | { code: 'slotTaken'; slot: string; by: string }
  /** not a slot of this unit: the reference puts `owner` there, and this unit in `expected` */
  | { code: 'wrongSlot'; unit: string; slot: string; owner: string; expected: readonly string[] }
  /** what it mounts on or needs connected is not in place yet */
  | { code: 'missing'; unit: string; missing: readonly string[] }
  | { code: 'wrongOrientation'; unit: string; orientation: number }
  | { code: 'notPlaced'; unit: string }
  /** others rest on it: they come off first */
  | { code: 'holds'; unit: string; dependents: readonly string[] }
  | { code: 'nothingToUndo' };

export type AssemblyResult =
  | { ok: true; state: AssemblyState }
  | { ok: false; state: AssemblyState; refusal: AssemblyRefusal };

/** What keeps a model from being complete. */
export type AssemblyIssue =
  | { code: 'missingUnit'; unit: string }
  | { code: 'unknownUnit'; unit: string }
  | { code: 'misplaced'; unit: string; slot: string }
  | { code: 'misoriented'; unit: string; orientation: number }
  | { code: 'shared'; slot: string; units: readonly string[] }
  | { code: 'unsupported'; unit: string; missing: readonly string[] }
  | { code: 'emptySlot'; slot: string };

export interface AssemblyCheck {
  complete: boolean;
  issues: readonly AssemblyIssue[];
  placed: number;
  total: number;
}

export const HISTORY_LIMIT = 100;

export const EMPTY_ASSEMBLY: AssemblyState = Object.freeze({ placed: Object.freeze({}), history: Object.freeze([]) as readonly AssemblyAction[] });

const unitOf = (spec: AssemblySpec, id: string): AssemblyUnitSpec | undefined => spec.units.find((u) => u.id === id);
const slotOf = (spec: AssemblySpec, id: string): AssemblySlotSpec | undefined => spec.slots.find((s) => s.id === id);

function withAction(state: AssemblyState, placed: Record<string, Placement>, action: AssemblyAction): AssemblyState {
  const history = [...state.history, action];
  return { placed, history: history.length > HISTORY_LIMIT ? history.slice(history.length - HISTORY_LIMIT) : history };
}

/** The unit in `slot`, if any. */
export function occupant(state: AssemblyState, slot: string): string | null {
  for (const [unit, p] of Object.entries(state.placed)) if (p.slot === slot) return unit;
  return null;
}

/** The units in place that rest on `unit` (name it in their `requires`). */
export function dependents(spec: AssemblySpec, state: AssemblyState, unit: string): string[] {
  return spec.units.filter((u) => Object.hasOwn(state.placed, u.id) && u.requires.includes(unit)).map((u) => u.id);
}

/** What `unit` still needs in place before it can go in. */
export function missingFor(spec: AssemblySpec, state: AssemblyState, unit: string): string[] {
  return (unitOf(spec, unit)?.requires ?? []).filter((r) => !Object.hasOwn(state.placed, r));
}

/**
 * Put `unit` into `placement.slot`, `placement.orientation` round. Refused,
 * with the reason, when the unit or slot is unknown, the unit is already in
 * place (a unit is never placed twice), the slot is taken, the slot is not
 * one of the unit's, what it needs is not in place yet, or it is the wrong
 * way round — in that order, so the hint names the first thing to change.
 */
export function install(spec: AssemblySpec, state: AssemblyState, unit: string, placement: Placement): AssemblyResult {
  const u = unitOf(spec, unit);
  if (!u) return { ok: false, state, refusal: { code: 'unknownUnit', unit } };
  const slot = slotOf(spec, placement.slot);
  if (!slot) return { ok: false, state, refusal: { code: 'unknownSlot', slot: placement.slot } };
  if (Object.hasOwn(state.placed, unit)) return { ok: false, state, refusal: { code: 'alreadyPlaced', unit, slot: state.placed[unit].slot } };
  const by = occupant(state, slot.id);
  if (by !== null) return { ok: false, state, refusal: { code: 'slotTaken', slot: slot.id, by } };
  if (!u.slots.includes(slot.id)) return { ok: false, state, refusal: { code: 'wrongSlot', unit, slot: slot.id, owner: slot.reference, expected: u.slots } };
  const missing = missingFor(spec, state, unit);
  if (missing.length) return { ok: false, state, refusal: { code: 'missing', unit, missing } };
  if (placement.orientation !== 0) return { ok: false, state, refusal: { code: 'wrongOrientation', unit, orientation: placement.orientation } };
  const p: Placement = { slot: slot.id, orientation: 0 };
  return { ok: true, state: withAction(state, { ...state.placed, [unit]: p }, { kind: 'install', unit, placement: p }) };
}

/** Take `unit` off. Refused when it is not in place, or others rest on it (they come off first). */
export function remove(spec: AssemblySpec, state: AssemblyState, unit: string): AssemblyResult {
  if (!unitOf(spec, unit)) return { ok: false, state, refusal: { code: 'unknownUnit', unit } };
  const placement = state.placed[unit];
  if (!Object.hasOwn(state.placed, unit) || !placement) return { ok: false, state, refusal: { code: 'notPlaced', unit } };
  const held = dependents(spec, state, unit);
  if (held.length) return { ok: false, state, refusal: { code: 'holds', unit, dependents: held } };
  const placed = { ...state.placed };
  delete placed[unit];
  return { ok: true, state: withAction(state, placed, { kind: 'remove', unit, placement }) };
}

/** Take the last step back: an install comes off, a removal goes back, a restart is undone. */
export function undo(state: AssemblyState): AssemblyResult {
  const last = state.history[state.history.length - 1];
  if (!last) return { ok: false, state, refusal: { code: 'nothingToUndo' } };
  const history = state.history.slice(0, -1);
  if (last.kind === 'restart') return { ok: true, state: { placed: { ...last.previous }, history } };
  const placed = { ...state.placed };
  if (last.kind === 'install') delete placed[last.unit];
  else placed[last.unit] = last.placement;
  return { ok: true, state: { placed, history } };
}

/** Start again with nothing in place; undoable, so nobody loses a model to a stray press. */
export function restart(state: AssemblyState): AssemblyState {
  if (!Object.keys(state.placed).length) return state;
  return withAction(state, {}, { kind: 'restart', previous: { ...state.placed } });
}

/** The units that can go in now: not in place, and all they need is. */
export function nextUnits(spec: AssemblySpec, state: AssemblyState): string[] {
  return spec.units.filter((u) => !Object.hasOwn(state.placed, u.id) && missingFor(spec, state, u.id).length === 0).map((u) => u.id);
}

/**
 * Is the model complete? Every unit of the reference in one of its slots, the
 * reference's way round, every slot holding exactly one unit, nothing in
 * place the reference does not have, and everything each unit rests on in
 * place. The issues say what is not.
 */
export function checkAssembly(spec: AssemblySpec, state: AssemblyState): AssemblyCheck {
  const issues: AssemblyIssue[] = [];
  const bySlot = new Map<string, string[]>();
  for (const [unit, p] of Object.entries(state.placed)) {
    bySlot.set(p.slot, [...(bySlot.get(p.slot) ?? []), unit]);
    const u = unitOf(spec, unit);
    if (!u) { issues.push({ code: 'unknownUnit', unit }); continue; }
    if (!u.slots.includes(p.slot)) issues.push({ code: 'misplaced', unit, slot: p.slot });
    if (p.orientation !== 0) issues.push({ code: 'misoriented', unit, orientation: p.orientation });
    const missing = u.requires.filter((r) => !Object.hasOwn(state.placed, r));
    if (missing.length) issues.push({ code: 'unsupported', unit, missing });
  }
  for (const u of spec.units) if (!Object.hasOwn(state.placed, u.id)) issues.push({ code: 'missingUnit', unit: u.id });
  for (const s of spec.slots) {
    const here = bySlot.get(s.id) ?? [];
    if (here.length > 1) issues.push({ code: 'shared', slot: s.id, units: here });
    else if (here.length === 0) issues.push({ code: 'emptySlot', slot: s.id });
  }
  const placed = spec.units.filter((u) => Object.hasOwn(state.placed, u.id)).length;
  return { complete: issues.length === 0, issues, placed, total: spec.units.length };
}

/**
 * A stored assembly read back: each placement re-installed, in an order that
 * puts what a unit rests on first, by the same rules as a learner's step, so
 * a stored state the rules no longer allow (a file edited by hand, a model
 * whose reference changed) comes back as far as it still holds. The history
 * starts empty.
 */
export function restoreAssembly(spec: AssemblySpec, raw: unknown): AssemblyState {
  if (!raw || typeof raw !== 'object') return EMPTY_ASSEMBLY;
  const wanted = new Map<string, Placement>();
  for (const [unit, p] of Object.entries(raw as Record<string, unknown>)) {
    if (!p || typeof p !== 'object') continue;
    const { slot, orientation } = p as { slot?: unknown; orientation?: unknown };
    if (typeof slot === 'string' && Number.isInteger(orientation)) wanted.set(unit, { slot, orientation: orientation as number });
  }
  let state: AssemblyState = EMPTY_ASSEMBLY;
  for (let progress = true; progress && wanted.size;) {
    progress = false;
    for (const [unit, p] of [...wanted]) {
      const r = install(spec, state, unit, p);
      if (r.ok) { state = r.state; wanted.delete(unit); progress = true; }
      else if (r.refusal.code !== 'missing') wanted.delete(unit);
    }
  }
  return { placed: state.placed, history: [] };
}

/** A spec's own consistency: every slot's reference unit lists it first, every requirement is a unit, no unit requires itself in a loop. */
export function specProblems(spec: AssemblySpec): string[] {
  const problems: string[] = [];
  const ids = new Set(spec.units.map((u) => u.id));
  const slots = new Set(spec.slots.map((s) => s.id));
  if (ids.size !== spec.units.length) problems.push('a unit id appears twice');
  if (slots.size !== spec.slots.length) problems.push('a slot id appears twice');
  for (const u of spec.units) {
    if (!u.slots.length) problems.push(`${u.id}: no slot`);
    for (const s of u.slots) if (!slots.has(s)) problems.push(`${u.id}: unknown slot ${s}`);
    for (const r of u.requires) if (!ids.has(r)) problems.push(`${u.id}: requires unknown unit ${r}`);
    if (!(Number.isInteger(u.orientations) && u.orientations >= 1)) problems.push(`${u.id}: orientations must be a whole number from 1`);
  }
  for (const s of spec.slots) {
    const ref = spec.units.find((u) => u.id === s.reference);
    if (!ref) problems.push(`${s.id}: unknown reference unit ${s.reference}`);
    else if (!ref.slots.includes(s.id)) problems.push(`${s.id}: its reference unit ${s.reference} cannot go there`);
  }
  // every slot is some unit's first slot or shared by an interchangeable kind; the reference fills each slot once
  const firsts = spec.slots.map((s) => s.reference);
  if (new Set(firsts).size !== firsts.length) problems.push('the reference puts one unit in two slots');
  // no cycle: a full install in some order must exist
  let state: AssemblyState = EMPTY_ASSEMBLY;
  for (let progress = true; progress;) {
    progress = false;
    for (const s of spec.slots) {
      const r = install(spec, state, s.reference, { slot: s.id, orientation: 0 });
      if (r.ok) { state = r.state; progress = true; }
    }
  }
  if (!checkAssembly(spec, state).complete) problems.push('the reference cannot be assembled in any order');
  return problems;
}
