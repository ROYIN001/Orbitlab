/**
 * R2.2: who directs the Launch and Watch camera.
 *
 * Three things used to be one: the view on screen (exterior, onboard, space,
 * map), what the camera follows (the rocket or a stage flown home), and who
 * chose the view. Every new flight phase re-applied the camera programme, so a
 * view the user picked lasted only until the next staging or orbit insertion,
 * and the Watch viewer had no view buttons at all.
 *
 * The policy keeps the owner separate:
 *
 * - `cinematic` — the camera programme (the workspace's per-phase plan, or the
 *   viewer's own) picks the view at every phase change. This is the default
 *   and what a new mission starts with.
 * - `manual` — the user picked a view (a tab, keys 1–4, or WebMCP). Phase
 *   changes leave it alone until the user chooses Cinematic again.
 *
 * The follow target is decided elsewhere (src/main.ts `watchFocusTarget`). The
 * only view the policy forces for it is the fallback when the target cannot be
 * seen from the chosen view: a stage flown home has no onboard camera and is a
 * dot on the map, so following one from those views cuts to the exterior.
 *
 * Pure state, no DOM and no Three.js, so the rules are unit-tested directly.
 */
import type { CameraMode } from './cameras';

export type CameraOwner = 'cinematic' | 'manual';

/** What the camera follows: the flying vehicle, or another object (a stage flown home, a pilot). */
export type FollowKind = 'vehicle' | 'other';

/** Views that can show an object other than the vehicle itself. */
const SHOWS_OTHER: ReadonlySet<CameraMode> = new Set<CameraMode>(['exterior', 'space']);

export class CameraPolicy {
  owner: CameraOwner = 'cinematic';

  get cinematic(): boolean {
    return this.owner === 'cinematic';
  }

  /** A new mission: the programme directs the camera again. */
  reset(): void {
    this.owner = 'cinematic';
  }

  /** The user picked `view`: it is shown, and kept across phase changes. */
  choose(view: CameraMode): CameraMode {
    this.owner = 'manual';
    return view;
  }

  /**
   * Back to the programme. Returns the view to show now: the programme's for
   * the current phase, or the current view when there is no phase to go by
   * (a lost vehicle).
   */
  resume(planned: CameraMode | null, current: CameraMode): CameraMode {
    this.owner = 'cinematic';
    return planned ?? current;
  }

  /** Switch the owner without choosing a view (the camera-sequence dialog's switch). */
  setCinematic(on: boolean): void {
    this.owner = on ? 'cinematic' : 'manual';
  }

  /** A new flight phase: the programme's view while cinematic, otherwise nothing changes (null). */
  onPhase(planned: CameraMode): CameraMode | null {
    return this.cinematic ? planned : null;
  }

  /**
   * The follow target changed. Returns the view to show, or null to keep the
   * current one.
   *
   * Cinematic: another object is watched from outside, and back on the vehicle
   * the programme's view for the phase returns. Manual: the chosen view stays
   * unless it cannot show the new target, in which case the exterior view is
   * the fallback (the owner stays manual — the user did not ask for the
   * programme back).
   */
  onTarget(kind: FollowKind, planned: CameraMode | null, current: CameraMode): CameraMode | null {
    if (this.cinematic) return kind === 'other' ? 'exterior' : planned ?? current;
    if (kind === 'other' && !SHOWS_OTHER.has(current)) return 'exterior';
    return null;
  }
}
