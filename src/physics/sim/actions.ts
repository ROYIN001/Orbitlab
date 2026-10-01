/**
 * The commands given to a flight while it flies (roadmap T02; Phase 4 map
 * §4.2), kept as a journal so an instructor can fly the flight again.
 *
 * A mission document says everything a flight starts from, but not what the
 * student did during it: a control command or a failure injected by hand, an
 * attitude test, the TORU hand controllers, the Abort button. Each is taken at
 * a step boundary, at the simulation's own clock — which is not the clock on
 * screen: a live point-mass flight runs up to one step ahead of the picture
 * (src/replay/recorder.ts) — so a journal entry's `t` is the boundary it was
 * taken at, and a re-fly that steps `sim.step(sim.suggestedDt())` from the pad
 * reaches that same boundary bit for bit and gives the same command there
 * (`applyAction`). Only commands that changed something are kept; one the
 * flight refused or ignored has nothing to replay.
 *
 * Each entry is plain JSON, named for the `Simulation` method that took it,
 * with that method's arguments as it accepted them.
 */
import type { RigidCommand } from '../rigid/telemetry';
import type { AttitudeTestSpec } from '../rigid/attitude-test';
import type { ControlFaultSpec } from '../../types';
import type { ToruCommand } from './rendezvous';

export type FlightAction =
  | { t: number; kind: 'setRigidCommand'; command: RigidCommand }
  | { t: number; kind: 'injectControlFault'; spec: ControlFaultSpec; fdir?: boolean }
  | { t: number; kind: 'startAttitudeTest'; spec: AttitudeTestSpec }
  | { t: number; kind: 'commandToru'; cmd: ToruCommand | null }
  | { t: number; kind: 'commandAbort' };

export type FlightActionKind = FlightAction['kind'];
export const FLIGHT_ACTION_KINDS: readonly FlightActionKind[] = ['setRigidCommand', 'injectControlFault', 'startAttitudeTest', 'commandToru', 'commandAbort'];

/** What takes a journal's commands: a `Simulation`. */
export interface ActionTarget {
  setRigidCommand(command: RigidCommand): void;
  injectControlFault(spec: ControlFaultSpec, fdir?: boolean): unknown;
  startAttitudeTest(spec: AttitudeTestSpec): unknown;
  commandToru(cmd: ToruCommand | null): boolean;
  commandAbort(): boolean;
}

/** Give a journaled command to a flight again, as it was given. */
export function applyAction(sim: ActionTarget, a: FlightAction): void {
  switch (a.kind) {
    case 'setRigidCommand': sim.setRigidCommand(structuredClone(a.command)); break;
    case 'injectControlFault': sim.injectControlFault(structuredClone(a.spec), a.fdir); break;
    case 'startAttitudeTest': sim.startAttitudeTest(structuredClone(a.spec)); break;
    case 'commandToru': sim.commandToru(a.cmd ? structuredClone(a.cmd) : null); break;
    case 'commandAbort': sim.commandAbort(); break;
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * A journal read from a file, or null when it is not one: every entry has a
 * finite time, a kind this build knows and the argument that kind takes, and
 * the times do not go back. The arguments are checked again by the flight
 * that takes them, as a live command's are.
 */
export function readActions(raw: unknown): FlightAction[] | null {
  if (!Array.isArray(raw)) return null;
  let last = -Infinity;
  for (const a of raw) {
    if (!isRecord(a) || typeof a.t !== 'number' || !Number.isFinite(a.t) || a.t < last) return null;
    last = a.t;
    switch (a.kind) {
      case 'setRigidCommand': if (!isRecord(a.command)) return null; break;
      case 'injectControlFault': if (!isRecord(a.spec) || (a.fdir !== undefined && typeof a.fdir !== 'boolean')) return null; break;
      case 'startAttitudeTest': if (!isRecord(a.spec)) return null; break;
      case 'commandToru': if (a.cmd !== null && !isRecord(a.cmd)) return null; break;
      case 'commandAbort': break;
      default: return null;
    }
  }
  return raw as FlightAction[];
}
