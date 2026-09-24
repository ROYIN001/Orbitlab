/**
 * Flight-dynamics notation (roadmap U07): the symbols, body axes and signs of
 * ISO 1151 (with ISO 80000 for the Mach number) or of ГОСТ 20058-80, chosen by
 * the interface language — Russian reads ГОСТ, English and Thai read ISO — or
 * set in the Engineer mode.
 *
 * The simulator keeps its own body axes (x the nose; y and z the two lateral
 * axes of `targetAttitude`, which during ascent put y in the trajectory plane,
 * towards the belly, and z to the left of the heading). Both standards take x
 * to the nose; ISO puts y to the right and z to the belly, ГОСТ y to the top and
 * z to the right. As fixed relabellings of the same body:
 *
 *   ISO   (x, y, z) = (x,  −z,  y)      p = ωx,  q = −ωz,  r = ωy
 *   ГОСТ  (x, y, z) = (x,  −y, −z)      ωx = ωx, ωy = −ωy, ωz = −ωz
 *
 * so pitching nose-up is +q in ISO and +ωz in ГОСТ, rolling the right side
 * down +p and +ωx, and yawing nose-right +r in ISO but −ωy in ГОСТ.
 * α and β are defined alike in both (α positive with the air from below,
 * β with the air from the right) and are taken in these axes.
 */
import { getLang, onLangChange, type Lang } from '../i18n';
import type { Vec3 } from '../physics/vec3';

export type Notation = 'iso' | 'gost';
export type NotationPreference = 'auto' | Notation;
export const NOTATION_PREFERENCES: readonly NotationPreference[] = ['auto', 'iso', 'gost'];
export const NOTATION_STORAGE_KEY = 'orbitlab.notation';

/** A symbol: a base letter and an optional subscript. */
export interface NotationSymbol { base: string; sub?: string }
export type Quantity =
  | 'axisX' | 'axisY' | 'axisZ'
  | 'rollRate' | 'pitchRate' | 'yawRate'
  | 'alpha' | 'beta'
  | 'pitchAngle' | 'rollAngle' | 'yawAngle' | 'pathAngle' | 'trackAngle'
  | 'altitude' | 'airspeed' | 'verticalSpeed' | 'dynamicPressure' | 'mach' | 'loadFactor' | 'mass' | 'thrust';

const s = (base: string, sub?: string): NotationSymbol => (sub ? { base, sub } : { base });
/** The table, in the order the physics dialog lists it. */
export const SYMBOLS: Readonly<Record<Quantity, Readonly<Record<Notation, NotationSymbol>>>> = {
  axisX: { iso: s('x'), gost: s('x') },
  axisY: { iso: s('y'), gost: s('y') },
  axisZ: { iso: s('z'), gost: s('z') },
  rollRate: { iso: s('p'), gost: s('ω', 'x') },
  pitchRate: { iso: s('q'), gost: s('ω', 'z') },
  yawRate: { iso: s('r'), gost: s('ω', 'y') },
  alpha: { iso: s('α'), gost: s('α') },
  beta: { iso: s('β'), gost: s('β') },
  pitchAngle: { iso: s('Θ'), gost: s('ϑ') },
  rollAngle: { iso: s('Φ'), gost: s('γ') },
  yawAngle: { iso: s('Ψ'), gost: s('ψ') },
  pathAngle: { iso: s('γ'), gost: s('θ') },
  trackAngle: { iso: s('χ'), gost: s('Ψ') },
  altitude: { iso: s('h'), gost: s('H') },
  airspeed: { iso: s('V'), gost: s('V') },
  verticalSpeed: { iso: s('ḣ'), gost: s('V', 'y') },
  dynamicPressure: { iso: s('q̄'), gost: s('q') },
  mach: { iso: s('Ma'), gost: s('M') },
  loadFactor: { iso: s('n'), gost: s('n') },
  mass: { iso: s('m'), gost: s('m') },
  thrust: { iso: s('F'), gost: s('P') },
};
export const QUANTITIES = Object.keys(SYMBOLS) as Quantity[];

let preference: NotationPreference = 'auto';
const listeners: Array<(n: Notation) => void> = [];
let last: Notation | null = null;

export function notationFor(lang: Lang, pref: NotationPreference): Notation {
  return pref === 'auto' ? (lang === 'ru' ? 'gost' : 'iso') : pref;
}
export function getNotationPreference(): NotationPreference { return preference; }
export function getNotation(): Notation { return notationFor(getLang(), preference); }

/** Read the stored choice (an Engineer-mode setting; absent: follow the language). */
export function initNotation(store?: Pick<Storage, 'getItem'>): void {
  try {
    const value = (store ?? localStorage).getItem(NOTATION_STORAGE_KEY);
    preference = NOTATION_PREFERENCES.includes(value as NotationPreference) ? value as NotationPreference : 'auto';
  } catch { preference = 'auto'; }
  last = getNotation();
}

export function setNotationPreference(pref: NotationPreference, store?: Pick<Storage, 'setItem'>): void {
  if (!NOTATION_PREFERENCES.includes(pref)) throw new RangeError('Unknown notation');
  preference = pref;
  try { (store ?? localStorage).setItem(NOTATION_STORAGE_KEY, pref); } catch { /* preference is optional */ }
  notify();
}

/** Called when the notation in force changes: a new choice, or a language that changes 'auto'. */
export function onNotationChange(fn: (n: Notation) => void): void { listeners.push(fn); }
function notify(): void {
  const now = getNotation();
  if (now === last) return;
  last = now;
  for (const fn of listeners) fn(now);
}
onLangChange(() => notify());

/** A symbol as plain text (a canvas, a CSV header): the subscript follows the base. */
export function symbolText(q: Quantity, n: Notation = getNotation()): string {
  const symbol = SYMBOLS[q][n];
  return symbol.base + (symbol.sub ?? '');
}

/** A symbol as markup, its subscript lowered. */
export function symbolNode(q: Quantity, n: Notation = getNotation()): HTMLElement {
  const symbol = SYMBOLS[q][n], node = document.createElement('var');
  node.className = 'notation-symbol';
  node.append(symbol.base);
  if (symbol.sub) { const sub = document.createElement('sub'); sub.textContent = symbol.sub; node.append(sub); }
  return node;
}

/** A label with its symbol put before its unit: "Altitude (km)" → "Altitude H (km)". */
export function withSymbol(label: string, q: Quantity, n: Notation = getNotation()): string {
  const symbol = symbolText(q, n), unit = / \(([^()]*)\)$/.exec(label);
  return unit ? `${label.slice(0, unit.index)} ${symbol} (${unit[1]})` : `${label} ${symbol}`;
}

/** `withSymbol` as markup (one span), the symbol's subscript lowered. */
export function labelWithSymbol(label: string, q: Quantity, n: Notation = getNotation()): HTMLSpanElement {
  const span = document.createElement('span'), unit = / \(([^()]*)\)$/.exec(label);
  span.append(`${unit ? label.slice(0, unit.index) : label} `, symbolNode(q, n));
  if (unit) span.append(` (${unit[1]})`);
  return span;
}

/** Negation without a negative zero (a displayed or compared "−0"). */
const neg = (value: number): number => (value === 0 ? 0 : -value);

/** Body rates in the standard's axes: roll, pitch and yaw rate (ISO p q r; ГОСТ ωx ωz ωy). */
export function bodyRates(omega: Vec3, n: Notation = getNotation()): { roll: number; pitch: number; yaw: number } {
  return n === 'iso' ? { roll: omega.x, pitch: neg(omega.z), yaw: omega.y } : { roll: omega.x, pitch: neg(omega.z), yaw: neg(omega.y) };
}

/** The simulator's body rates from rates in the standard's axes (the inverse of `bodyRates`). */
export function simulatorRates(rates: { roll: number; pitch: number; yaw: number }, n: Notation = getNotation()): Vec3 {
  return n === 'iso' ? { x: rates.roll, y: rates.yaw, z: neg(rates.pitch) } : { x: rates.roll, y: neg(rates.yaw), z: neg(rates.pitch) };
}

/**
 * α and β in the standard's body axes from the simulator's recorded pair,
 * which are taken in its own x–z and x–y planes (α' = atan2(v_z, v_x),
 * β' = atan2(v_y, √(v_x² + v_z²)) of the velocity relative to the air).
 * Identical in ISO and ГОСТ.
 */
export function aeroAngles(simAlpha: number, simBeta: number): { alpha: number; beta: number } {
  const vx = Math.cos(simBeta) * Math.cos(simAlpha), vy = Math.sin(simBeta), vz = Math.cos(simBeta) * Math.sin(simAlpha);
  return { alpha: Math.atan2(vy, vx), beta: Math.asin(Math.max(-1, Math.min(1, -vz))) };
}
