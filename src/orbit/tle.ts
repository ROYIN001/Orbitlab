/**
 * Two-line element sets (roadmap R01): the fixed-column format of Spacetrack
 * Report #3 that CelesTrak and Space-Track publish, read into the elements
 * SGP4 runs on (src/orbit/sgp4.ts). CelesTrak documents the format at
 * https://celestrak.org/NORAD/documentation/tle-fmt.php.
 *
 * The epoch is read the way the reference implementation reads it (its
 * `days2mdhms` and `jday`): the two-digit year taken as 1957–2056, the day of
 * the year cut into month, day, hours, minutes and seconds and put back as a
 * Julian date and a fraction, so the propagator starts from the same number
 * the verification output was made with.
 *
 * A catalogue number past 99 999 is written in Alpha-5 (a letter for the
 * ten-thousands: A = 10, skipping I and O), which is read here.
 *
 * DOM-free.
 */

const XPDOTP = 1440.0 / (2.0 * Math.PI); // rev/day to rad/min: 229.1831180523293
const DEG2RAD = Math.PI / 180;

/** The mean elements of one element set, in the units SGP4 runs on. */
export interface ElementSet {
  /** the satellite's name, from a three-line set's title line (or an OMM's), else null */
  name: string | null;
  /** the catalogue (NORAD) number */
  satnum: number;
  classification: string;
  /** the international designator as written, e.g. "98067A" */
  intldesg: string;
  /** the epoch: the year, the day of the year with its fraction, and as a Julian date and its fraction (UTC) */
  epochYear: number;
  epochDays: number;
  jdEpoch: number;
  jdEpochFrac: number;
  /** the first and second derivatives of the mean motion, as the theory wants them: rad/min², rad/min³ */
  ndot: number;
  nddot: number;
  /** the drag term, 1/earth radii */
  bstar: number;
  /** inclination, node, argument of perigee, mean anomaly, rad; eccentricity */
  inclo: number;
  nodeo: number;
  ecco: number;
  argpo: number;
  mo: number;
  /** the mean motion (Kozai's), rad/min */
  noKozai: number;
  /** the element set's number, and the revolution number at the epoch */
  elnum: number;
  revnum: number;
}

export type TleProblem =
  | { kind: 'line1' | 'line2'; detail: string }
  | { kind: 'checksum'; line: 1 | 2 }
  | { kind: 'mismatch' };

/** A line's check digit: the sum of its digits, minus signs counting one, modulo 10. */
export function tleChecksum(line: string): number {
  let sum = 0;
  for (let i = 0; i < Math.min(68, line.length); i++) {
    const c = line[i];
    if (c >= '0' && c <= '9') sum += c.charCodeAt(0) - 48;
    else if (c === '-') sum += 1;
  }
  return sum % 10;
}

/** Whether a line carries a check digit in column 69 that agrees with it. */
export const checksumOk = (line: string): boolean => line.length >= 69 && /\d/.test(line[68]) && Number(line[68]) === tleChecksum(line);

const ALPHA5 = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // A = 10 … Z = 33, without I and O

/** A catalogue number as written in columns 3–7: digits, or Alpha-5 (a letter, then four digits). */
export function readSatnum(field: string): number | null {
  const f = field.trim();
  if (/^\d+$/.test(f)) return Number(f);
  if (/^[A-Z]\d{4}$/.test(f)) {
    const k = ALPHA5.indexOf(f[0]);
    if (k < 0) return null;
    return (k + 10) * 10000 + Number(f.slice(1));
  }
  return null;
}

/** A catalogue number in five columns: as digits up to 99 999, in Alpha-5 up to 339 999. */
export function writeSatnum(n: number): string {
  if (n < 100000) return String(n).padStart(5, '0');
  const k = Math.floor(n / 10000) - 10;
  return ALPHA5[k] + String(n % 10000).padStart(4, '0');
}

/** days2mdhms: a day of the year with its fraction as month, day, hours, minutes, seconds. */
export function days2mdhms(year: number, days: number): { mon: number; day: number; hr: number; minute: number; sec: number } {
  const lmonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const dayofyr = Math.floor(days);
  if (year % 4 === 0) lmonth[2] = 29;
  let i = 1, inttemp = 0;
  while (dayofyr > inttemp + lmonth[i] && i < 12) {
    inttemp = inttemp + lmonth[i];
    i++;
  }
  const mon = i;
  const day = dayofyr - inttemp;
  let temp = (days - dayofyr) * 24.0;
  const hr = Math.floor(temp);
  temp = (temp - hr) * 60.0;
  const minute = Math.floor(temp);
  const sec = (temp - minute) * 60.0;
  return { mon, day, hr, minute, sec };
}

/** jday: a calendar date and time (UTC) as a Julian date, the day at 0h and its fraction. */
export function jday(year: number, mon: number, day: number, hr: number, minute: number, sec: number): { jd: number; jdFrac: number } {
  let jd = 367.0 * year - Math.floor(7 * (year + Math.floor((mon + 9) / 12.0)) * 0.25) + Math.floor((275 * mon) / 9.0) + day + 1721013.5;
  let jdFrac = (sec + minute * 60.0 + hr * 3600.0) / 86400.0;
  if (Math.abs(jdFrac) > 1.0) {
    const dtt = Math.floor(jdFrac);
    jd = jd + dtt;
    jdFrac = jdFrac - dtt;
  }
  return { jd, jdFrac };
}

/** invjday: a Julian date and fraction back to the calendar (the reference's, for its printed dates). */
export function invjday(jdIn: number, jdfracIn: number): { year: number; mon: number; day: number; hr: number; minute: number; sec: number } {
  let jd = jdIn, jdfrac = jdfracIn;
  if (Math.abs(jdfrac) >= 1.0) {
    jd = jd + Math.floor(jdfrac);
    jdfrac = jdfrac - Math.floor(jdfrac);
  }
  const dt = jd - Math.floor(jd) - 0.5;
  if (Math.abs(dt) > 0.00000001) {
    jd = jd - dt;
    jdfrac = jdfrac + dt;
  }
  const temp = jd - 2415019.5;
  const tu = temp / 365.25;
  let year = 1900 + Math.floor(tu);
  let leapyrs = Math.floor((year - 1901) * 0.25);
  let days = Math.floor(temp - ((year - 1900) * 365.0 + leapyrs));
  if (days + jdfrac < 1.0) {
    year = year - 1;
    leapyrs = Math.floor((year - 1901) * 0.25);
    days = Math.floor(temp - ((year - 1900) * 365.0 + leapyrs));
  }
  return { year, ...days2mdhms(year, days + jdfrac) };
}

/**
 * A number in the format's "assumed decimal point" form, eight columns:
 * a sign, five digits, the exponent's sign and digit — " 12345-3" is
 * 0.12345 × 10⁻³.
 */
function readExponential(field: string): number | null {
  const f = field.padEnd(8, ' ').slice(0, 8);
  if (f.trim() === '') return 0;
  // blanks in the digits are zeros, as the reference reads them
  const sign = f[0], digits = f.slice(1, 6).replace(/ /g, '0'), esign = f[6], edigit = f[7] === ' ' ? '0' : f[7];
  if (!/[ +-]/.test(sign) || !/^\d{5}$/.test(digits) || !/[ +-]/.test(esign) || !/\d/.test(edigit)) return null;
  const mantissa = Number(`${sign === '-' ? '-' : ''}0.${digits}`);
  const exponent = Number(`${esign === '-' ? '-' : ''}${edigit}`);
  return mantissa * Math.pow(10.0, exponent);
}

const num = (field: string): number | null => {
  const f = field.trim();
  if (f === '' || !/^[+-]?(\d+\.?\d*|\.\d+)$/.test(f)) return null;
  return Number(f);
};

export interface ParseResult {
  elements: ElementSet | null;
  problems: TleProblem[];
}

/**
 * One element set from its two lines (and a name, if it came with one).
 * Columns are checked as the format fixes them; a check digit that does not
 * agree is a problem, not a rejection, unless `requireChecksum` — the
 * verification file of the 2006 paper and older sets have none.
 */
export function parseTle(line1In: string, line2In: string, name: string | null = null, requireChecksum = false): ParseResult {
  const problems: TleProblem[] = [];
  const line1 = line1In.replace(/\s+$/, '');
  const line2 = line2In.replace(/\s+$/, '');

  if (!(line1.length >= 64 && line1.startsWith('1 ') && line1[23] === '.')) {
    return { elements: null, problems: [{ kind: 'line1', detail: 'not a first line (columns 1–64)' }] };
  }
  if (!(line2.length >= 63 && line2.startsWith('2 ') && line2[11] === '.' && line2[20] === '.' && line2[37] === '.' && line2[46] === '.')) {
    return { elements: null, problems: [{ kind: 'line2', detail: 'not a second line (columns 1–63)' }] };
  }
  const satnum = readSatnum(line1.slice(2, 7));
  const satnum2 = readSatnum(line2.slice(2, 7));
  if (satnum === null) return { elements: null, problems: [{ kind: 'line1', detail: 'catalogue number (columns 3–7)' }] };
  if (satnum !== satnum2) return { elements: null, problems: [{ kind: 'mismatch' }] };

  if (line1.length >= 69 && !checksumOk(line1)) problems.push({ kind: 'checksum', line: 1 });
  if (line2.length >= 69 && !checksumOk(line2.slice(0, 69))) problems.push({ kind: 'checksum', line: 2 });
  if (requireChecksum && (line1.length < 69 || line2.length < 69)) problems.push({ kind: 'checksum', line: line1.length < 69 ? 1 : 2 });
  if (requireChecksum && problems.some((p) => p.kind === 'checksum')) return { elements: null, problems };

  const yy = num(line1.slice(18, 20));
  const epochDays = num(line1.slice(20, 32));
  const ndot = num(line1.slice(33, 43));
  const nddot = readExponential(line1.slice(44, 52));
  const bstar = readExponential(line1.slice(53, 61));
  const elnum = line1.length >= 68 ? num(line1.slice(64, 68)) ?? 0 : 0;
  const bad1 = [['epoch year', yy], ['epoch day', epochDays], ['first derivative of mean motion', ndot], ['second derivative', nddot], ['drag term', bstar]]
    .find(([, v]) => v === null);
  if (bad1) return { elements: null, problems: [...problems, { kind: 'line1', detail: String(bad1[0]) }] };

  const inclo = num(line2.slice(8, 16));
  const nodeo = num(line2.slice(17, 25));
  const eccField = line2.slice(26, 33).replace(/ /g, '0');
  const ecco = /^\d{7}$/.test(eccField) ? Number(`0.${eccField}`) : null;
  const argpo = num(line2.slice(34, 42));
  const mo = num(line2.slice(43, 51));
  const noRevDay = num(line2.slice(52, 63));
  const revnum = num(line2.slice(63, 68)) ?? 0;
  const bad2 = [['inclination', inclo], ['node', nodeo], ['eccentricity', ecco], ['argument of perigee', argpo], ['mean anomaly', mo], ['mean motion', noRevDay]]
    .find(([, v]) => v === null);
  if (bad2) return { elements: null, problems: [...problems, { kind: 'line2', detail: String(bad2[0]) }] };

  // 1957–2056: the format's two-digit year
  const year = (yy as number) < 57 ? (yy as number) + 2000 : (yy as number) + 1900;
  const t = days2mdhms(year, epochDays as number);
  const { jd, jdFrac } = jday(year, t.mon, t.day, t.hr, t.minute, t.sec);

  return {
    elements: {
      name: name?.trim() || null,
      satnum,
      classification: line1[7] && line1[7] !== ' ' ? line1[7] : 'U',
      intldesg: line1.slice(9, 17).trim(),
      epochYear: year,
      epochDays: epochDays as number,
      jdEpoch: jd,
      jdEpochFrac: jdFrac,
      ndot: (ndot as number) / (XPDOTP * 1440.0),
      nddot: (nddot as number) / (XPDOTP * 1440.0 * 1440),
      bstar: bstar as number,
      inclo: (inclo as number) * DEG2RAD,
      nodeo: (nodeo as number) * DEG2RAD,
      ecco: ecco as number,
      argpo: (argpo as number) * DEG2RAD,
      mo: (mo as number) * DEG2RAD,
      noKozai: (noRevDay as number) / XPDOTP,
      elnum: elnum as number,
      revnum: revnum as number,
    },
    problems,
  };
}

export interface ParsedFile {
  sets: ElementSet[];
  /** the 1-based line of each set that could not be read, and why */
  rejected: { line: number; problems: TleProblem[] }[];
}

/**
 * Every element set in a text file: two-line sets, or three-line ones with a
 * name first (CelesTrak's "0 NAME" form too). Blank and comment (#) lines
 * are passed over.
 */
export function parseTleFile(text: string, requireChecksum = false): ParsedFile {
  const lines = text.split(/\r?\n/);
  const sets: ElementSet[] = [];
  const rejected: ParsedFile['rejected'] = [];
  let name: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.trim() === '' || l.startsWith('#')) continue;
    if (l.startsWith('1 ') && i + 1 < lines.length && lines[i + 1].startsWith('2 ')) {
      const res = parseTle(l, lines[i + 1], name, requireChecksum);
      if (res.elements) sets.push(res.elements);
      else rejected.push({ line: i + 1, problems: res.problems });
      name = null;
      i++;
      continue;
    }
    // a title line: the name, with CelesTrak's "0 " in front taken off
    name = l.startsWith('0 ') ? l.slice(2).trim() : l.trim();
  }
  return { sets, rejected };
}
