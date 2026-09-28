/**
 * The Earth's orientation as a dataset (roadmap P2.5): how far the Earth's
 * turning is behind or ahead of atomic time (UT1 − UTC) and where its pole
 * wanders (x_p, y_p), day by day, measured and then predicted by the IERS
 * (Rapid Service/Prediction Center, Bulletin A; `finals2000A`). The real
 * satellites' positions over the ground read it (src/orbit/earth-orientation.ts):
 * SGP4's TEME frame turns into the Earth-fixed one by the sidereal time of
 * UT1, not of UTC, and UT1 − UTC reaches 0.9 s — some 400 m of the Earth's
 * turning under a low satellite.
 *
 * The IERS answers without a cross-origin header, so a browser cannot fetch
 * it: the dataset lives in its snapshot, which the scheduled build refreshes
 * (scripts/refresh-snapshots.ts), whatever the data mode.
 *
 * Self-contained on purpose (type-only imports at most): the snapshot script
 * runs it under Node without a bundler.
 */

/** IERS finals2000A, all days since 1973 with Bulletin A's predictions, as CSV. */
export const IERS_FINALS_URL = 'https://datacenter.iers.org/data/csv/finals2000A.all.csv';

/** The snapshot keeps the days from this one: the era of the element sets the app reads. */
export const EOP_FROM = '2019-01-01';

export interface EarthOrientation {
  /** the first day, YYYY-MM-DD; the values are at 0 h UTC of each day from it */
  from: string;
  /** UT1 − UTC, s */
  dut1: number[];
  /** the pole's position, arcseconds */
  xp: number[];
  yp: number[];
  /** the first day that is a prediction, not a measurement, YYYY-MM-DD */
  predictedFrom: string;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * The dataset from the IERS CSV (semicolon-separated, a header row), from
 * `from` to the last day with every value — measured or predicted — rounded
 * to 0.1 ms and 0.01 milliarcseconds, below the file's own precision. Throws
 * on a file that is not that, so a changed format keeps the old snapshot.
 */
export function parseIersFinals(text: string, from = EOP_FROM): { data: EarthOrientation; asOf: string } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const head = lines[0]?.split(';') ?? [];
  const col = (name: string, nth = 0): number => {
    let seen = -1;
    for (let i = 0; i < head.length; i++) if (head[i] === name && ++seen === nth) return i;
    throw new Error(`no ${name} column`);
  };
  const [cy, cm, cd] = [col('Year'), col('Month'), col('Day')];
  const [cx, cyp, cu] = [col('x_pole'), col('y_pole'), col('UT1-UTC')];
  // the first Type column is the pole's, the second UT1's
  const cType = col('Type', 1);
  const out: EarthOrientation = { from: '', dut1: [], xp: [], yp: [], predictedFrom: '' };
  let asOf = '', last = '';
  for (const line of lines.slice(1)) {
    const f = line.split(';');
    const date = `${f[cy]}-${f[cm]}-${f[cd]}`;
    if (!DATE.test(date) || date < from) continue;
    const x = Number(f[cx]), y = Number(f[cyp]), u = Number(f[cu]);
    if (f[cx] === '' || f[cyp] === '' || f[cu] === '' || ![x, y, u].every(Number.isFinite)) break;
    if (last && Date.parse(`${date}T00:00:00Z`) - Date.parse(`${last}T00:00:00Z`) !== 86400000) throw new Error(`a day missing before ${date}`);
    if (!out.from) out.from = date;
    out.dut1.push(Math.round(u * 1e4) / 1e4);
    out.xp.push(Math.round(x * 1e5) / 1e5);
    out.yp.push(Math.round(y * 1e5) / 1e5);
    if (f[cType] === 'prediction') { if (!out.predictedFrom) out.predictedFrom = date; }
    else asOf = date;
    last = date;
  }
  if (!out.dut1.length || !asOf || !out.predictedFrom) throw new Error('no days');
  return { data: out, asOf: `${asOf}T00:00:00Z` };
}

/** An Earth-orientation dataset, from a snapshot: every day finite and in range. */
export function validEarthOrientation(data: unknown): data is EarthOrientation {
  if (!isObj(data)) return false;
  const { from, dut1, xp, yp, predictedFrom } = data;
  if (typeof from !== 'string' || !DATE.test(from) || typeof predictedFrom !== 'string' || !DATE.test(predictedFrom)) return false;
  if (![dut1, xp, yp].every((a) => Array.isArray(a) && a.length)) return false;
  const n = (dut1 as unknown[]).length;
  if ((xp as unknown[]).length !== n || (yp as unknown[]).length !== n) return false;
  const inRange = (a: unknown, m: number) => typeof a === 'number' && Number.isFinite(a) && Math.abs(a) <= m;
  return (dut1 as unknown[]).every((v) => inRange(v, 1)) && (xp as unknown[]).every((v) => inRange(v, 2)) && (yp as unknown[]).every((v) => inRange(v, 2));
}
