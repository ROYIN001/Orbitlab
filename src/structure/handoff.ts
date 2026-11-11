/**
 * Handing the educational satellite on to the rest of Orbitlab: what the
 * section gives the app (`SatelliteRecord`, plain figures), what the app says
 * it would send and did hold (`HandoffPreview`, `HandoffReceipt`), and the
 * check of one against the other (`checkReceipt`).
 *
 * The app's side — its satellite record, its checks, the Orbit and Launch
 * sections — is src/structure-host/handoff.ts, which the section reaches
 * through `HandoffEnv`, never by import. What the destinations carry is the
 * mass, size, drag and orbit; the battery and the power balance stay in the
 * Structure section, which says so.
 *
 * DOM-free.
 */
import type { Depth } from './types';

/** The satellite as the section hands it to the app: plain figures, SI. */
export interface SatelliteRecord {
  id: string;
  name: string;
  /** kg: the parts list's mass (no propellant: no engine) */
  massKg: number;
  /** the body, m: across, across, and along the long axis */
  size: { width: number; height: number; depth: number };
  /** the solar cells' area, m², on a spinner's mount */
  cellArea: number;
  /** the battery fitted, Wh, and the depth of discharge allowed, 0–1 */
  batteryWh: number;
  dod: number;
  /** orbit-average loads, W: the mission payload's and everything else's */
  payloadW: number;
  busW: number;
  /** a circular sun-synchronous orbit: altitude, m; local time of the ascending node, h */
  orbit: { altitude: number; ltan: number };
  lifeYears: number;
}

/** What the app would send for a record, from its own satellite model: shown before sending, and what a receipt is checked against. */
export interface HandoffPreview {
  name: string;
  massKg: number;
  size: { width: number; height: number; depth: number };
  /** drag: reference area, m², and the coefficients C_D and C_R the app's template gives */
  dragArea: number;
  cd: number;
  cr: number;
  /** altitudes above the equatorial radius, m; inclination, deg (sun-synchronous at that height) */
  perigee: number;
  apogee: number;
  inclination: number;
  sso: boolean;
}

/**
 * What a destination holds once it has taken the satellite, read back from
 * the destination, not from what was sent: the mass, kg; the orbit, its
 * altitudes above the equatorial radius, m, and its inclination, deg (or
 * Launch's own 'sso' target); and how many values its checks put back to its
 * own defaults (0: it took everything as sent).
 */
export interface HandoffReceipt {
  mass: number;
  /**
   * Orbit: the mass its lifetime analysis and planner take — another than
   * the satellite's while its planner keeps a spacecraft chosen there (said
   * beside the receipt; not a fault of the hand-off)
   */
  analysisMass?: number;
  perigeeAlt: number;
  apogeeAlt: number;
  inclination: number | 'sso' | 'site';
  replaced: number;
  /** Launch: the site it flies from */
  siteId?: string;
}

/** What a receipt counts as "as sent": half a gram, a kilometre, a twentieth of a degree. */
export const RECEIPT_TOLERANCE = { kg: 5e-4, m: 1000, deg: 0.05 } as const;

export interface ReceiptCheck { mass: boolean; orbit: boolean; whole: boolean; ok: boolean }

/** The receipt against what was sent: the mass, the orbit, nothing replaced. */
export function checkReceipt(sent: Pick<HandoffPreview, 'massKg' | 'perigee' | 'apogee' | 'inclination' | 'sso'>, r: HandoffReceipt): ReceiptCheck {
  const T = RECEIPT_TOLERANCE;
  const mass = Math.abs(r.mass - sent.massKg) < T.kg;
  const plane = r.inclination === 'sso' ? sent.sso : r.inclination !== 'site' && Math.abs(r.inclination - sent.inclination) < T.deg;
  const orbit = plane && Math.abs(r.perigeeAlt - sent.perigee) < T.m && Math.abs(r.apogeeAlt - sent.apogee) < T.m;
  const whole = r.replaced === 0;
  return { mass, orbit, whole, ok: mass && orbit && whole };
}

export type HandoffTarget = 'orbit' | 'launch';

/** Why a send was not handed over: the app's design checks, its pre-flight checks (how many issues), or Launch refusing the mission. */
export type SendRefusal = { reason: 'design' } | { reason: 'checks'; issues: number } | { reason: 'launch' };

export type SendResult =
  /** handed over; `receipt` is what the destination then held, or null when it said nothing back */
  | { ok: true; sent: HandoffPreview; receipt: HandoffReceipt | null }
  | ({ ok: false } & SendRefusal);

/** The app's side of the hand-off (src/structure-host/handoff.ts). */
export interface HandoffEnv {
  /** what the app would send for this record, by its own satellite model */
  preview(record: SatelliteRecord): HandoffPreview;
  /** hand the satellite to Orbit or Launch and open that section at `level` */
  send(where: HandoffTarget, record: SatelliteRecord, level: Depth): SendResult;
  /** Launch still holds what this section last sent there, and what it held before is kept: "put back" can be offered */
  canRestoreLaunch(): boolean;
  /** put back the mission Launch had before this section replaced it, and open Launch at `level`; false when Launch could not use it */
  restoreLaunch(level: Depth): boolean;
}
