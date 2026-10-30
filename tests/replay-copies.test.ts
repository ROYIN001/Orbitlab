/**
 * A seek hands out a frame that shares nothing a consumer could write to with
 * the recording (`cloneFrame`, src/physics/frame.ts). The frame travels through
 * `replay/simview.ts` into `ui/map.ts` and `ui/onboard.ts`, and the recording
 * must stay as it was flown.
 *
 * The recording is deep-frozen here, so an object a seek still shares with it
 * is frozen in what the seek returns: each test lists those objects by path,
 * then writes into every field of what it was handed and checks the recording
 * against a copy taken before. `debris[].visual` is the one deliberate share:
 * spec data the simulation owns and never writes, and costlier to copy than
 * the rest of the frame (see `cloneFrame`).
 *
 * Before: `jettisoned`, `apollo` (and, where the CSM, the ascent stage or the
 * service module blend, its sub-objects) and `debris[].recovery.target` were
 * shared (docs/development/reports/replay-frame-copies.md).
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { cloneFrame, interpolateFrames, type VisualFrame } from '../src/physics/frame';
import { FlightRecorder } from '../src/replay/recorder';
import { ReplayPlayer } from '../src/replay/player';
import { missionConfigFromState } from '../src/lessons/config';
import { watchMissionSettings, type WatchMissionId } from '../src/ui/watch-missions';
import type { ApolloState } from '../src/physics/sim/apollo';

/** A watch mission flown point-mass through the recorder, as the app flies it, to mission time `until`. */
function recorded(id: WatchMissionId, until: number): FlightRecorder {
  const sim = new Simulation(missionConfigFromState({ ...watchMissionSettings(id), dynamics: { model: 'pointMass', wind: 'calm', seed: 1 } }),
    { headless: true });
  const rec = new FlightRecorder();
  rec.start(sim);
  let guard = 0;
  while ((!sim.done || sim.apollo.active) && !sim.isFailed() && sim.state.t < until && guard++ < 50_000) rec.advance(1, 5000);
  return rec;
}

/** Freeze an object and everything under it (a typed array cannot be frozen; frames carry none). */
function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object' && !ArrayBuffer.isView(o) && !Object.isFrozen(o)) {
    Object.freeze(o);
    for (const v of Object.values(o)) deepFreeze(v);
  }
  return o;
}

/** The objects under `f` still shared with the frozen recording, by path (`debris[]` for any debris item). */
function shared(f: unknown, path = 'frame', out = new Set<string>()): Set<string> {
  for (const [k, v] of Object.entries(f as object)) {
    if (!v || typeof v !== 'object' || k === 'visual') continue;
    const p = Array.isArray(f) ? `${path}[]` : `${path}.${k}`;
    if (Object.isFrozen(v)) out.add(p);
    else shared(v, p, out);
  }
  return out;
}

/** Write into every field of a frame a seek returned, as a careless consumer might (`visual` aside). */
function scribble(f: unknown): void {
  const o = f as Record<string, unknown>;
  for (const [k, v] of Object.entries(o)) {
    if (k === 'visual') continue;
    if (v && typeof v === 'object') scribble(v);
    else if (typeof v === 'number') o[k] = -v - 1;
    else if (typeof v === 'boolean') o[k] = !v;
    else if (typeof v === 'string') o[k] = `${v}!`;
  }
}

/** Every seek through the player, on each stored frame and half way to the next; what each shares; then scribbled on. */
function seekAll(rec: FlightRecorder, keep: (f: VisualFrame) => boolean): { seeks: number; paths: string[] } {
  const frames = rec.frames, player = new ReplayPlayer(rec), paths = new Set<string>();
  let seeks = 0;
  for (let k = 0; k < frames.length; k++) {
    const a = frames[k], b = frames[k + 1];
    if (!keep(a) && !(b && keep(b))) continue;
    for (const t of b ? [a.t, (a.t + b.t) / 2] : [a.t]) {
      const f = player.frameAt(t)!;
      shared(f, 'frame', paths);
      seeks++;
    }
  }
  // only now, so a write into the frozen recording cannot stop the listing above
  if (paths.size === 0) for (let k = 0; k < frames.length; k++) {
    const a = frames[k], b = frames[k + 1];
    if (keep(a)) scribble(player.frameAt(b ? (a.t + b.t) / 2 : a.t));
  }
  return { seeks, paths: [...paths].sort() };
}

describe('a seek shares nothing a consumer could write to with the recording', () => {
  it('Apollo 11 to its parking orbit: the parts the Saturn V dropped and Apollo\'s state are the seek\'s own', { timeout: 60_000 }, () => {
    const rec = recorded('apollo11', 900);
    const frames = rec.frames, carries = (f: VisualFrame) => !!f.jettisoned || !!f.apollo;
    expect(frames.filter((f) => f.jettisoned?.interstage && f.jettisoned.tower).length).toBeGreaterThan(100);
    expect(frames.filter((f) => f.apollo?.sequence).length).toBeGreaterThan(3);
    const before = structuredClone(frames);
    deepFreeze(frames);
    const { seeks, paths } = seekAll(rec, carries);
    expect(seeks).toBeGreaterThan(1000);
    // before: frame.apollo, frame.jettisoned
    expect(paths).toEqual([]);
    expect(frames).toEqual(before);
  });

  it('Falcon 9 Demo-2 past its booster\'s targeting: the drone ship it is flown to is the seek\'s own', { timeout: 60_000 }, () => {
    const rec = recorded('falcon9Demo2', 450);
    const frames = rec.frames, carries = (f: VisualFrame) => f.debris.some((d) => d.recovery?.target);
    expect(frames.filter(carries).length).toBeGreaterThan(1000);
    expect(frames.find(carries)!.debris.find((d) => d.recovery?.target)!.recovery!.target!.kind).toBe('droneShip');
    const before = structuredClone(frames);
    deepFreeze(frames);
    const { seeks, paths } = seekAll(rec, carries);
    expect(seeks).toBeGreaterThan(1000);
    // before: frame.debris[].recovery.target
    expect(paths).toEqual([]);
    expect(frames).toEqual(before);
  });

  it('Apollo with every figure it carries, the CSM, the ascent stage and the service module blending or not', { timeout: 60_000 }, () => {
    // the lunar flight's later figures, which a recording reaches only days in, on two frames of the parking orbit
    const at = recorded('apollo11', 900).frames.filter((f) => f.apollo).slice(-2).map((f) => structuredClone(f));
    expect(at).toHaveLength(2);
    const body = (x: number) => ({ r: { x, y: 2, z: 3 }, v: { x: 4, y: 5, z: 6 } });
    const full = (f: VisualFrame, x: number): VisualFrame => ({ ...f, apollo: {
      ...f.apollo!, tli: { c3: -1.5e6, e: 0.97, inc: 31, argp: 5 }, perilune: { alt: 110e3, t: 2.7e5, lat: 1, lon: 170 }, mcc: { dv: 6.5 },
      lunar: { ap: 310e3, pe: 110e3, inc: 1.2, loi: 889, loi2: 48 }, csm: body(x), ascentStage: body(x + 1), serviceModule: body(x + 2),
      descent: { phase: 'braking', ftp: true, throttle: 1, alt: 12e3, range: 400e3, vh: 1500, vz: 20 },
      landed: { lat: 0.67, lon: 23.47, miss: 300, t: 3.9e5 }, rendezvous: { range: 5e3, closing: 10, dh: 28e3, elevation: 27 },
      dockAxis: { x: 1, y: 0, z: 0 }, entry: { bank: 30, load: 3, maxLoad: 6.5, drogue: 0, main: 0 },
      interfaceAhead: { fpa: -6.5, t: 7.0e5 }, splash: { lat: 13.3, lon: -169.2, t: 7.1e5 },
    } as ApolloState });
    const a = deepFreeze(full(at[0], 1)), b = deepFreeze(full(at[1], 9));
    const alone = deepFreeze({ ...at[1], apollo: { ...at[1].apollo! } });
    const before = structuredClone([a, b, alone]);
    const mid = (a.t + b.t) / 2;
    for (const [name, f] of [['clone', cloneFrame(a)], ['blend', interpolateFrames(a, b, mid)], ['no blend', interpolateFrames(a, alone, mid)],
      ['on a', interpolateFrames(a, b, a.t)]] as const) {
      // before: frame.apollo (clone, no blend, on a); frame.apollo.dockAxis, .landed, .moon, ... (blend)
      expect([...shared(f)], name).toEqual([]);
      scribble(f);
    }
    expect([a, b, alone]).toEqual(before);
    // and the blend still blends: the CSM half way between its two states' cubic, not either end's
    const blended = interpolateFrames(a, b, mid).apollo!;
    expect(blended.csm!.r.x).toBeGreaterThan(1);
    expect(blended.csm!.r.x).toBeLessThan(9);
    expect(blended.moon).toEqual(a.apollo!.moon);
  });
});
