/**
 * Element sets in the Orbit Mean-Elements Message (roadmap R02): the OMM of
 * CCSDS 502.0-B-3 that CelesTrak and Space-Track publish alongside the
 * two-line format, which cannot hold the six-digit catalogue numbers given
 * since 2026-07-11 (CelesTrak, "A New Way to Obtain GP Data"). Read here in
 * each of its forms — JSON (CelesTrak's numbers, or Space-Track's strings),
 * CSV, XML and KVN — and the two- and three-line format through
 * src/orbit/tle.ts, into the elements SGP4 runs on.
 *
 * A file the user brings (their own download from CelesTrak or Space-Track)
 * is read in the page and goes nowhere; `readElementFile` finds its format
 * and says, set by set, what it could not read and why. An element set made
 * for another theory — SGP4-XP, ephemeris type 4 — is refused: SGP4 would
 * propagate its numbers without complaint and put the satellite in the
 * wrong place.
 *
 * DOM-free.
 */
import type { OmmRecord } from '../provider/satellites';
import { jday, parseTleFile, type ElementSet, type TleProblem } from './tle';

const XPDOTP = 1440.0 / (2.0 * Math.PI);
const DEG2RAD = Math.PI / 180;

export type ElementFormat = 'tle' | 'json' | 'csv' | 'xml' | 'kvn';

export type OmmProblem =
  | { kind: 'missing'; field: string }
  | { kind: 'value'; field: string }
  | { kind: 'theory'; theory: string }
  | TleProblem;

/** The keywords every OMM carries that SGP4 needs. */
const NEEDED = [
  'EPOCH', 'MEAN_MOTION', 'ECCENTRICITY', 'INCLINATION', 'RA_OF_ASC_NODE', 'ARG_OF_PERICENTER', 'MEAN_ANOMALY',
  'NORAD_CAT_ID', 'BSTAR', 'MEAN_MOTION_DOT', 'MEAN_MOTION_DDOT',
] as const;

/** "1998-067A" as the two-line format writes it: "98067A". */
const tleDesignator = (objectId: string): string => {
  const m = /^\d{2}(\d{2})-(\d{3})([A-Z]*)$/.exec(objectId.trim());
  return m ? `${m[1]}${m[2]}${m[3]}` : objectId.trim();
};

/** An OMM epoch (ISO 8601, UTC, with or without a Z; or year and day of year) as the calendar. */
function readEpoch(s: string): { year: number; mon: number; day: number; hr: number; minute: number; sec: number; doy: number } | null {
  const text = s.trim();
  const cal = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)Z?$/.exec(text);
  // CCSDS also allows the ordinal date, YYYY-DDD
  const ord = cal ? null : /^(\d{4})-(\d{3})T(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)Z?$/.exec(text);
  if (!cal && !ord) return null;
  let year: number, mon: number, day: number, time: string[];
  if (cal) {
    year = +cal[1]; mon = +cal[2]; day = +cal[3]; time = cal.slice(4, 7);
  } else {
    year = +ord![1];
    const d = new Date(Date.UTC(year, 0, +ord![2]));
    mon = d.getUTCMonth() + 1; day = d.getUTCDate(); time = ord!.slice(3, 6);
  }
  const hr = +time[0], minute = +time[1], sec = +time[2];
  if (mon < 1 || mon > 12 || day < 1 || day > 31 || hr > 23 || minute > 59 || sec >= 61) return null;
  const doy = (Date.UTC(year, mon - 1, day) - Date.UTC(year, 0, 1)) / 86400e3 + 1 + (hr * 3600 + minute * 60 + sec) / 86400;
  return { year, mon, day, hr, minute, sec, doy };
}

type Fields = Record<string, string | number | null | undefined>;

const numberOf = (v: string | number | null | undefined): number | null => {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string' || !v.trim()) return null;
  const n = Number(v.trim());
  return Number.isFinite(n) ? n : null;
};

/**
 * One OMM's keywords as an element set, or what is wrong with them. Numbers
 * may come as numbers (CelesTrak's JSON) or as text (Space-Track's JSON, CSV,
 * XML, KVN); units are the OMM's (rev/day, degrees) and become SGP4's here.
 */
export function elementsFromOmm(f: Fields): { elements: ElementSet | null; problems: OmmProblem[] } {
  const theory = String(f.MEAN_ELEMENT_THEORY ?? 'SGP4').trim().toUpperCase();
  const ephType = numberOf(f.EPHEMERIS_TYPE ?? 0);
  // ephemeris type 0 is what is published; 2 and 3 are Spacetrack Report #3's own numbers for SGP4 and SDP4.
  // Space-Track gives 4 to SGP4-XP, a different theory
  if (!/^SGP\/?SGP4$|^SGP4$/.test(theory) || (ephType !== null && ephType !== 0 && ephType !== 2 && ephType !== 3)) {
    return { elements: null, problems: [{ kind: 'theory', theory: theory !== 'SGP4' ? theory : `EPHEMERIS_TYPE ${ephType}` }] };
  }
  for (const k of NEEDED) if (f[k] === undefined || f[k] === null || f[k] === '') return { elements: null, problems: [{ kind: 'missing', field: k }] };
  const epoch = readEpoch(String(f.EPOCH));
  if (!epoch) return { elements: null, problems: [{ kind: 'value', field: 'EPOCH' }] };
  const v: Record<string, number> = {};
  for (const k of NEEDED) {
    if (k === 'EPOCH') continue;
    const n = numberOf(f[k]);
    if (n === null) return { elements: null, problems: [{ kind: 'value', field: k }] };
    v[k] = n;
  }
  if (v.MEAN_MOTION <= 0) return { elements: null, problems: [{ kind: 'value', field: 'MEAN_MOTION' }] };
  if (v.ECCENTRICITY < 0 || v.ECCENTRICITY >= 1) return { elements: null, problems: [{ kind: 'value', field: 'ECCENTRICITY' }] };
  if (v.INCLINATION < 0 || v.INCLINATION > 180) return { elements: null, problems: [{ kind: 'value', field: 'INCLINATION' }] };
  if (!Number.isInteger(v.NORAD_CAT_ID) || v.NORAD_CAT_ID <= 0) return { elements: null, problems: [{ kind: 'value', field: 'NORAD_CAT_ID' }] };

  const { jd, jdFrac } = jday(epoch.year, epoch.mon, epoch.day, epoch.hr, epoch.minute, epoch.sec);
  const name = f.OBJECT_NAME === undefined || f.OBJECT_NAME === null ? null : String(f.OBJECT_NAME).trim() || null;
  return {
    elements: {
      name,
      satnum: v.NORAD_CAT_ID,
      classification: String(f.CLASSIFICATION_TYPE ?? 'U').trim() || 'U',
      intldesg: tleDesignator(String(f.OBJECT_ID ?? '')),
      epochYear: epoch.year,
      epochDays: epoch.doy,
      jdEpoch: jd,
      jdEpochFrac: jdFrac,
      ndot: v.MEAN_MOTION_DOT / (XPDOTP * 1440.0),
      nddot: v.MEAN_MOTION_DDOT / (XPDOTP * 1440.0 * 1440),
      bstar: v.BSTAR,
      inclo: v.INCLINATION * DEG2RAD,
      nodeo: v.RA_OF_ASC_NODE * DEG2RAD,
      ecco: v.ECCENTRICITY,
      argpo: v.ARG_OF_PERICENTER * DEG2RAD,
      mo: v.MEAN_ANOMALY * DEG2RAD,
      noKozai: v.MEAN_MOTION / XPDOTP,
      elnum: numberOf(f.ELEMENT_SET_NO) ?? 0,
      revnum: numberOf(f.REV_AT_EPOCH) ?? 0,
    },
    problems: [],
  };
}

/** A catalogue record (src/provider/satellites.ts) as an element set; it has passed its check, so it reads. */
export const elementsFromRecord = (r: OmmRecord): ElementSet => elementsFromOmm(r as unknown as Fields).elements!;

// ─── the forms of a file ────────────────────────────────────────────────────

/** CSV rows by their header, quotes honoured (RFC 4180). */
function csvRows(text: string): Fields[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x !== '')) rows.push(row);
  const [head, ...body] = rows;
  if (!head) return [];
  const keys = head.map((h) => h.trim().toUpperCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i]])));
}

const unescapeXml = (s: string): string => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

/** Each <segment> of an OMM XML (NDM) file: its leaf elements' text by tag. */
function xmlSegments(text: string): Fields[] {
  const out: Fields[] = [];
  for (const seg of text.match(/<segment[\s>][\s\S]*?<\/segment>/g) ?? []) {
    const f: Fields = {};
    for (const m of seg.matchAll(/<([A-Z_0-9]+)(?:\s[^>]*)?>([^<]*)<\/\1>/g)) f[m[1]] = unescapeXml(m[2]);
    out.push(f);
  }
  return out;
}

/** Each message of an OMM KVN file: `KEY = value` lines, a new message at each CCSDS_OMM_VERS. */
function kvnMessages(text: string): Fields[] {
  const out: Fields[] = [];
  let cur: Fields | null = null;
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Z_0-9]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    if (m[1] === 'CCSDS_OMM_VERS' || !cur) { cur = {}; out.push(cur); }
    // a value may carry its unit in brackets: "MEAN_MOTION = 15.49 [rev/day]"
    cur[m[1]] = m[2].replace(/\s*\[[^\]]*\]$/, '');
  }
  return out;
}

/** Which form a file is in, by its content. */
export function detectFormat(text: string): ElementFormat | null {
  const s = text.replace(/^﻿/, '').trimStart();
  if (s.startsWith('[') || s.startsWith('{')) return 'json';
  if (s.startsWith('<')) return /<omm[\s>]|<segment[\s>]/.test(s) ? 'xml' : null;
  if (/^\s*CCSDS_OMM_VERS\s*=/m.test(s)) return 'kvn';
  const first = s.split(/\r?\n/, 1)[0].toUpperCase();
  if (first.includes(',') && first.includes('MEAN_MOTION') && first.includes('EPOCH')) return 'csv';
  if (/^1 [ \dA-Z]{5}/m.test(s) && /^2 [ \dA-Z]{5}/m.test(s)) return 'tle';
  return null;
}

export interface ElementFile {
  format: ElementFormat | null;
  sets: ElementSet[];
  /** each set that could not be read: where it is (a line for the two-line format, else its place, from 1) and why */
  rejected: { at: number; problems: OmmProblem[] }[];
}

/** Every element set in a file of any of the forms, and what could not be read. */
export function readElementFile(text: string): ElementFile {
  const format = detectFormat(text);
  const sets: ElementSet[] = [];
  const rejected: ElementFile['rejected'] = [];
  if (format === 'tle') {
    const tle = parseTleFile(text);
    return { format, sets: tle.sets, rejected: tle.rejected.map((r) => ({ at: r.line, problems: r.problems })) };
  }
  let records: Fields[] = [];
  if (format === 'json') {
    try {
      const raw: unknown = JSON.parse(text.replace(/^﻿/, ''));
      const list = Array.isArray(raw) ? raw : [raw];
      records = list.map((r) => (r && typeof r === 'object' && !Array.isArray(r) ? r as Fields : {}));
    } catch {
      return { format, sets, rejected: [{ at: 1, problems: [{ kind: 'value', field: 'JSON' }] }] };
    }
  } else if (format === 'csv') records = csvRows(text);
  else if (format === 'xml') records = xmlSegments(text);
  else if (format === 'kvn') records = kvnMessages(text);
  records.forEach((f, i) => {
    const res = elementsFromOmm(f);
    if (res.elements) sets.push(res.elements);
    else rejected.push({ at: i + 1, problems: res.problems });
  });
  return { format, sets, rejected };
}
