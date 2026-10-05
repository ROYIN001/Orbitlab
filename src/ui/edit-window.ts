/**
 * D-36.A3 (owner, 2026-10-05), CO-4: which setup values can still be changed
 * once a flight is launched, and when a change takes effect.
 *
 * While setting up, every change previews and is flown from the next launch.
 * In flight, a value that can still really be adjusted is editable but is used
 * only when the user confirms it ("Use now"), so a slip mid-flight does not
 * change the flight; a value past its window stays locked and needs a restart.
 * Once the flight is over, nothing is changed in it.
 *
 * One table (`IN_FLIGHT`) says which values are which. Pure: no DOM, no flight.
 */
import type { ControlFaultSpec } from '../types';
import type { MissionStage } from './flight-lifecycle';

/** The setup's sections, by the keys the panel gives them (`data-section`, or the step for 01–03). */
export type EditField =
  | 'vehicle' | 'site' | 'payload' | 'orbit' | 'rendezvous'
  | 'guidance' | 'failure' | 'options' | 'dynamics' | 'flex' | 'control'
  | 'navigation' | 'explicit' | 'dispersion' | 'faults';

export type EditReason = 'notLive' | 'notSixDof' | 'pastWindow' | 'finished';
export interface EditWindow { when: 'now' | 'next-launch' | 'locked'; reason?: EditReason }

/** What the window depends on: the lifecycle, and the flight shown. */
export interface EditFlight {
  stage: MissionStage;
  /** the flight is six-DOF (the control system, and its failures, exist) */
  sixDof: boolean;
  /** the cursor is at the recording's head: what is changed now is what the flight flies next */
  live: boolean;
  /** the vehicle is lost or the flight has ended, though the clock may still run */
  failed: boolean;
}

/**
 * In flight: `sixDofLive` — still adjustable in a live six-DOF flight, used on "Use now";
 * `past` — past its window, locked until a restart.
 */
const IN_FLIGHT: Record<EditField, 'sixDofLive' | 'past'> = {
  vehicle: 'past', site: 'past', payload: 'past', orbit: 'past',
  // a later CO-4 step for D-36.A3 (K1–K2) adds the rendezvous target in flight (it needs physics work)
  rendezvous: 'past',
  // a later CO-4 step for D-36.A3 (K1–K2) adds guidance retargeting in flight (it needs physics work)
  guidance: 'past', explicit: 'past',
  failure: 'past', options: 'past', dynamics: 'past', flex: 'past', navigation: 'past', dispersion: 'past',
  // the next CO-4 step for D-36.A3 (K1) adds the attitude-loop gains in flight (it needs physics work)
  control: 'past',
  // a new control-system failure: `Simulation.injectControlFault`, journaled as a flight action
  faults: 'sixDofLive',
};

export const EDIT_FIELDS = Object.keys(IN_FLIGHT) as EditField[];

export function editWindow(field: EditField, flight: EditFlight): EditWindow {
  if (flight.stage === 'setup') return { when: 'next-launch' };
  if (flight.stage === 'analysis') return { when: 'locked', reason: 'finished' };
  if (IN_FLIGHT[field] === 'past') return { when: 'locked', reason: 'pastWindow' };
  if (!flight.sixDof) return { when: 'locked', reason: 'notSixDof' };
  if (flight.failed) return { when: 'locked', reason: 'finished' };
  if (!flight.live) return { when: 'locked', reason: 'notLive' };
  return { when: 'now' };
}

/** What takes a failure in flight: the live `Simulation` (or the session's shell of it). */
export interface FaultTarget {
  injectControlFault(spec: ControlFaultSpec, fdir?: boolean): 'injected' | 'notSixDof' | 'notFlying' | 'invalid';
}

/**
 * "Use now" for a new failure: given to the flight only while its window is open.
 * The flight journals it (`sim.actions`), so a re-fly or a recheck gives it again.
 */
export function useFaultNow(target: FaultTarget, spec: ControlFaultSpec, flight: EditFlight): ReturnType<FaultTarget['injectControlFault']> | EditReason {
  const window = editWindow('faults', flight);
  if (window.when !== 'now') return window.reason ?? 'pastWindow';
  return target.injectControlFault(spec);
}
