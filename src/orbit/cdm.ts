/**
 * A conjunction data message read (roadmap P2.5, for M01): the warning an
 * operator receives of a close approach to its satellite, in the CCSDS
 * format (CCSDS 508.0-B-1, *Conjunction Data Message*, KVN form) — the time
 * of closest approach, both objects' states at it, and each one's position
 * covariance as the orbit determination behind it measured it.
 *
 * With it the probability of collision is the operators' own: computed from
 * the message's covariances instead of the rough ones estimated for public
 * element sets (R04), which is why a screening of element sets shows traffic
 * and a message shows risk. An operator of a satellite gets these messages
 * for it from the combined space operations centre (through Space-Track); the
 * app only reads a file the user brings, and nothing leaves the page.
 *
 * The probability is src/orbit/conjunction.ts's two-dimensional one; each
 * object's axes are taken from its inertial velocity, as CCSDS defines them
 * (a state in ITRF has the Earth's turning added back, ω × r). The combined
 * radius of the two bodies is not a field of the format: a `COMMENT HBR = …`
 * line, as NASA's test messages carry one, is read, otherwise the user gives
 * it.
 *
 * DOM-free; tests/cdm.test.ts holds the probability to NASA CARA's test
 * conjunctions and the reading to the format.
 */
import { v3 } from '../physics/vec3';
import { collisionProbability, inertialVelocity, rtnAxes, rtnToFrame, type Mat3, type PosVel, type Probability } from './conjunction';

export interface CdmObject {
  /** OBJECT1 or OBJECT2 */
  role: string;
  designator: string;
  name: string;
  /** the reference frame of the state (EME2000, GCRF, ITRF) */
  frame: string;
  /** the state at the closest approach, m and m/s, in `frame` */
  state: PosVel;
  /** the position covariance in the object's radial, transverse, normal axes, m² */
  covRtn: Mat3;
}

export interface ConjunctionMessage {
  /** the time of closest approach, Julian date (UTC) */
  tca: number;
  /** as the message states them: miss distance, m; relative speed, m/s; null where absent */
  miss: number | null;
  speed: number | null;
  /** the message's own probability and the method it names, where given */
  pc: number | null;
  pcMethod: string | null;
  /** the combined radius from a `COMMENT HBR` line, m */
  hbr: number | null;
  originator: string | null;
  created: string | null;
  objects: [CdmObject, CdmObject];
}

/** Why a file is not a conjunction data message this reader takes. */
export class CdmError extends Error {}

const STATE = ['X', 'Y', 'Z', 'X_DOT', 'Y_DOT', 'Z_DOT'] as const;
const COV = ['CR_R', 'CT_R', 'CT_T', 'CN_R', 'CN_T', 'CN_N'] as const;

/** A date as CCSDS writes it (UTC): 2008-06-27T15:34:55.320, or with a day of the year, 2008-179T15:34:55.320. */
function julianOf(s: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)Z?$/.exec(s) ?? null;
  const d = /^(\d{4})-(\d{3})T(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)Z?$/.exec(s) ?? null;
  let ms: number;
  if (m) ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) + Number(m[6]) * 1000;
  else if (d) ms = Date.UTC(+d[1], 0, 1, +d[3], +d[4]) + (+d[2] - 1) * 86400000 + Number(d[5]) * 1000;
  else throw new CdmError(`not a CCSDS time: ${s}`);
  return ms / 86400000 + 2440587.5;
}

/** Read a CDM in KVN. Throws `CdmError` for anything that is not one with both objects' states and covariances. */
export function parseCdm(text: string): ConjunctionMessage {
  const head = new Map<string, string>();
  const objects: Map<string, string>[] = [];
  let hbr: number | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const hb = /^COMMENT\s+HBR\s*=\s*([-+\d.eE]+)/.exec(line);
    if (hb) { hbr = Number(hb[1]); continue; }
    if (line.startsWith('COMMENT')) continue;
    const kv = /^([A-Z0-9_]+)\s*=\s*(.*?)\s*(\[[^\]]*\])?$/.exec(line);
    if (!kv) continue;
    const [, key, value] = kv;
    if (key === 'OBJECT') { objects.push(new Map([['OBJECT', value]])); continue; }
    (objects.length ? objects[objects.length - 1] : head).set(key, value);
  }
  if (!head.has('CCSDS_CDM_VERS')) throw new CdmError('no CCSDS_CDM_VERS: not a conjunction data message (KVN)');
  if (objects.length !== 2) throw new CdmError(`${objects.length} objects, not two`);
  const num = (m: Map<string, string>, key: string): number => {
    const v = Number(m.get(key));
    if (!m.has(key) || !Number.isFinite(v)) throw new CdmError(`no ${key}`);
    return v;
  };
  const opt = (key: string): number | null => (head.has(key) && Number.isFinite(Number(head.get(key))) ? Number(head.get(key)) : null);
  const obj = (m: Map<string, string>): CdmObject => {
    const [x, y, z, vx, vy, vz] = STATE.map((k) => num(m, k) * 1000);
    const [rr, tr, tt, nr, nt, nn] = COV.map((k) => num(m, k));
    return {
      role: m.get('OBJECT') ?? '', designator: m.get('OBJECT_DESIGNATOR') ?? '', name: m.get('OBJECT_NAME') ?? '',
      frame: (m.get('REF_FRAME') ?? '').toUpperCase(),
      state: { r: v3(x, y, z), v: v3(vx, vy, vz) },
      covRtn: [[rr, tr, nr], [tr, tt, nt], [nr, nt, nn]],
    };
  };
  const tca = head.get('TCA');
  if (!tca) throw new CdmError('no TCA');
  const [a, b] = objects.map(obj);
  if (a.frame !== b.frame) throw new CdmError(`the two states are in different frames (${a.frame}, ${b.frame})`);
  if (!['EME2000', 'GCRF', 'ITRF'].includes(a.frame)) throw new CdmError(`a frame this reader does not take: ${a.frame}`);
  return {
    tca: julianOf(tca), miss: opt('MISS_DISTANCE'), speed: opt('RELATIVE_SPEED'),
    pc: opt('COLLISION_PROBABILITY'), pcMethod: head.get('COLLISION_PROBABILITY_METHOD') ?? null,
    hbr, originator: head.get('ORIGINATOR') ?? null, created: head.get('CREATION_DATE') ?? null,
    objects: [a, b],
  };
}

/** Both objects' covariances turned into the frame of their states, m², each from its own axes. */
export function cdmCovariances(m: ConjunctionMessage): [Mat3, Mat3] {
  // each object's axes from its inertial velocity; an Earth-fixed state has the Earth's turning added back
  const inertial = (o: CdmObject): PosVel => (o.frame === 'ITRF' ? inertialVelocity(o.state) : o.state);
  const [a, b] = m.objects;
  return [rtnToFrame(a.covRtn, rtnAxes(inertial(a))), rtnToFrame(b.covRtn, rtnAxes(inertial(b)))];
}

/** The two-dimensional probability of collision from a message's own states and covariances, for a combined radius (m). */
export function cdmProbability(m: ConjunctionMessage, radius: number): Probability {
  const [a, b] = m.objects;
  const [covA, covB] = cdmCovariances(m);
  return collisionProbability(a.state, covA, b.state, covB, radius);
}
