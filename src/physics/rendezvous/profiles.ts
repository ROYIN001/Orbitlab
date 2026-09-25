/**
 * The three ways a Soyuz MS or Progress MS is flown to the station (roadmap
 * G07), and the spacecraft's own hardware for it. Sources and estimates are in
 * docs/PHYSICS.md §9.2.
 *
 * Each profile is the burn sequence of a flight that flew it, at that flight's
 * times after separation (each burn's centre) and with its phasing burns'
 * sizes: posigrade, along the horizontal. Only the last two are solved rather
 * than copied: the transfer that brings the spacecraft to the aim point a
 * couple of kilometres behind and below the station, and the braking burn
 * there, after which the automatic approach (Kurs) takes over on the attitude
 * and translation thrusters. The station is phased to the plan
 * (`planRendezvous`), so the flight's phasing is the one flown.
 *
 *  - two-orbit (about 3 h): Soyuz MS-28, 27 November 2025 — a correction on the
 *    first revolution, the first rendezvous burn, the transfer;
 *  - four-orbit (about 6 h): Soyuz TMA-19M, 15 December 2015 — two pairs of
 *    phasing burns, the first impulse of the automatic sequence, the transfer;
 *  - two-day (34 revolutions): Soyuz MS-01, 7 July 2016 — the phasing pair on
 *    the third revolution, the always-posigrade trim on the first day (solved
 *    in flight to put the station's lead back where the plan has it), the
 *    first impulse of the automatic sequence on the second day, the transfer.
 */

import { SATELLITES } from '../../data/satellites';
import type { OrbitSpec } from '../../types';

export type RendezvousProfileId = 'twoOrbit' | 'fourOrbit' | 'twoDay';

export type BurnId = 'dv1' | 'dv2' | 'dv3' | 'dv4' | 'dv5' | 'dv6' | 'corr' | 'brake';

/** What a burn does: a phasing burn of a given size, the phase correction, the transfer to the aim point, the braking there. */
export type BurnKind = 'phasing' | 'correction' | 'transfer' | 'brake';

export interface ProfileBurn {
  id: BurnId;
  kind: Exclude<BurnKind, 'brake'>;
  /** the burn's centre, s after separation */
  t: number;
  /** a phasing burn's (and the correction's nominal) impulse, posigrade along the horizontal, m/s */
  dv?: number;
}

export interface RendezvousProfile {
  id: RendezvousProfileId;
  /** the burns up to the transfer, in order; the braking burn follows at the aim point */
  burns: ProfileBurn[];
}

export const PROFILES: Record<RendezvousProfileId, RendezvousProfile> = {
  twoOrbit: {
    id: 'twoOrbit',
    burns: [
      { id: 'dv1', kind: 'phasing', t: 1535, dv: 22 },
      { id: 'dv2', kind: 'phasing', t: 3472, dv: 50.85 },
      { id: 'dv3', kind: 'transfer', t: 6460 },
    ],
  },
  fourOrbit: {
    id: 'fourOrbit',
    burns: [
      { id: 'dv1', kind: 'phasing', t: 2215, dv: 28.54 },
      { id: 'dv2', kind: 'phasing', t: 4863, dv: 23.57 },
      { id: 'dv3', kind: 'phasing', t: 8407, dv: 12.26 },
      { id: 'dv4', kind: 'phasing', t: 11268, dv: 5.8 },
      { id: 'dv5', kind: 'phasing', t: 15157, dv: 8.51 },
      { id: 'dv6', kind: 'transfer', t: 17817 },
    ],
  },
  twoDay: {
    id: 'twoDay',
    burns: [
      { id: 'dv1', kind: 'phasing', t: 12248, dv: 21.63 },
      { id: 'dv2', kind: 'phasing', t: 14700, dv: 22.55 },
      { id: 'corr', kind: 'correction', t: 88454, dv: 2 },
      { id: 'dv3', kind: 'phasing', t: 174521, dv: 24.03 },
      { id: 'dv4', kind: 'transfer', t: 177110 },
    ],
  },
};

export const PROFILE_IDS = Object.keys(PROFILES) as RendezvousProfileId[];

/**
 * Where the transfer delivers the spacecraft and the braking burn stops it, in
 * the station's LVLH axes (x along the velocity, z to nadir), m: behind and
 * below the station, 2.2 km out, where Soyuz MS-28's first braking burn was
 * (2.27 km).
 */
export const AIM_POINT = { x: -2000, z: 1000 } as const;

/** The spacecraft's hardware for the rendezvous (Soyuz MS / Progress MS; estimates marked in PHYSICS.md). */
export const SPACECRAFT = {
  /** the approach-and-correction engine (СКД, S5.80): thrust, N, and specific impulse, s */
  mainThrust: 2950,
  mainIsp: 302,
  /**
   * the attitude and translation thrusters (ДПО-Б, 28 × 129 N): largest force
   * along the long axis (MS-28's 5.06 m/s in 79.6 s on them) and across it
   * (a pair), N; their specific impulse, s
   */
  translationAxial: 460,
  translationLateral: 258,
  thrusterIsp: 291,
  /** largest torque they give about each axis, N·m (estimate) */
  torque: 400,
  /** principal moments of inertia, kg·m² (roll about the long axis, then pitch and yaw; estimates) */
  inertia: [4300, 35500, 35500] as const,
  /** the docking probe's tip ahead of the centre of mass along the long axis, m (estimate) */
  probe: 4.2,
} as const;

/** The approach and docking the Kurs system flies, and what the docking mechanism accepts (PHYSICS.md §9.2). */
export const APPROACH = {
  /** the approach's closing speed, m/s, and the braking it plans with, m/s² (2.27 km to 400 m in about 10 min) */
  farSpeed: 4,
  farBraking: 0.012,
  /** the flyaround: from 400 m to the stationkeeping point on the port's axis, turning at this rate (50° in about 6 min) and taking at least this long, s */
  flyaroundRange: 400,
  flyaroundRate: 0.0024,
  flyaroundMin: 300,
  /** the stationkeeping point, the probe's distance from the port, m, and the hold there before the final approach, s */
  stationkeepingRange: 150,
  stationkeepingHold: 180,
  /** the final approach's closing speed: this fraction of the distance per second plus the contact speed, at most the largest (150 m in about 11 min) */
  finalGain: 0.002,
  contactSpeed: 0.12,
  finalMaxSpeed: 0.5,
  /** capture at contact (the docking mechanism's limits): closing speed, m/s; miss, m; lateral speed, m/s; pitch/yaw and roll, deg; rate, deg/s */
  captureSpeed: [0.1, 0.35] as const,
  captureLateral: 0.34,
  captureLateralSpeed: 0.1,
  captureAngle: 7,
  captureRoll: 10,
  captureRate: 0.6,
  /** from contact to the hooks closed (hard dock), s */
  hooks: 780,
} as const;

/**
 * Whether a mission can fly on to the station (roadmap G07): a Soyuz MS — the
 * crewed spacecraft on a Soyuz-2.1a, the one pairing whose spacecraft, docking
 * system and profiles the rendezvous models — launched into the ISS orbit.
 */
export function rendezvousAvailable(vehicleId: string, satelliteId: string, orbit: Pick<OrbitSpec, 'raanMode' | 'suborbital'>): boolean {
  const sat = SATELLITES.find((x) => x.id === satelliteId);
  return vehicleId === 'soyuz21a' && sat?.kind === 'crew' && !!sat.propulsion && orbit.raanMode === 'iss' && !orbit.suborbital;
}
