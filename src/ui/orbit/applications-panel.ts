/**
 * What satellites are for, on the page (roadmap O04): the controls — which
 * application, where the dish stands, the downlink, the camera, which Thai
 * satellite — and what they show for the orbit in the playground. The
 * numbers are src/orbit/applications.ts and applications-setup.ts; this
 * only draws them.
 */
import { t } from '../../i18n';
import { DEG, RAD } from '../../physics/constants';
import type { AppLevel } from '../app-mode';
import { linearScale, logScale } from '../../orbit/playground-model';
import {
  APP_KINDS, STATIONS, stationOf, type AppKind, type AppSettings, type CommsReport, type EoReport,
} from '../../orbit/applications-setup';
import type { GroundStation } from '../../orbit/applications';
import { THAI_SATELLITES, THAI_SATELLITES_AS_OF, type ThaiSatellite } from '../../data/thai-satellites';
import { Field, button, deg, el, hhmm, num, plain } from './dom';

export interface AppsHost {
  level(): AppLevel;
  apps(): AppSettings | null;
  choose(kind: AppKind | null): void;
  change(patch: Partial<AppSettings>): void;
  /** put a Thai satellite's catalogue orbit in the playground */
  showThai(id: string): void;
}

const KIND_KEY: Record<AppKind, string> = { comms: 'use.kind.comms', eo: 'use.kind.eo', thai: 'use.kind.thai' };
const ABOUT_KEY: Record<AppKind, string> = { comms: 'use.about.comms', eo: 'use.about.eo', thai: 'use.about.thai' };
export const STATION_KEY: Record<string, string> = {
  bangkok: 'use.st.bangkok', chiangMai: 'use.st.chiangMai', hatYai: 'use.st.hatYai', ubon: 'use.st.ubon',
  stPetersburg: 'use.st.stPetersburg', moscow: 'use.st.moscow',
};
/** the eight points of the compass, from north, as i18n keys */
const COMPASS = ['use.dir.n', 'use.dir.ne', 'use.dir.e', 'use.dir.se', 'use.dir.s', 'use.dir.sw', 'use.dir.w', 'use.dir.nw'];
export const compass = (az: number): string => t(COMPASS[Math.round(((az * RAD) % 360) / 45) % 8]);

export const stationName = (a: AppSettings): string => (a.stationId in STATION_KEY ? t(STATION_KEY[a.stationId]) : t('use.st.custom'));

/** The controls: which application, and its settings. */
export function appsControls(host: AppsHost): HTMLElement {
  const box = el('details', 'pg-tool pg-apps');
  box.open = true;
  box.append(el('summary', undefined, t('use.title')));
  const a = host.apps();
  const pick = el('label', 'pg-preset');
  pick.append(el('span', undefined, t('use.kind')));
  const sel = el('select');
  const none = el('option', undefined, t('mv.none'));
  none.value = '';
  sel.append(none, ...APP_KINDS.map((k) => { const o = el('option', undefined, t(KIND_KEY[k])); o.value = k; return o; }));
  sel.value = a?.kind ?? '';
  sel.addEventListener('change', () => host.choose(sel.value ? sel.value as AppKind : null));
  pick.append(sel);
  box.append(pick);
  if (!a) return box;
  box.append(el('p', 'pg-tool-lead', t(ABOUT_KEY[a.kind])));
  const engineer = host.level() === 'engineer';
  const fields = el('div', 'pg-fields');
  const field = (label: string, unit: string, scale: ReturnType<typeof linearScale>, show: (v: number) => number, read: (n: number) => number,
    digits: number, limits: { min: number; max: number }, value: number, onInput: (v: number) => void) => {
    const f = new Field(label, unit, scale, show, read, digits, limits, onInput);
    f.set(value);
    fields.append(f.root);
  };
  if (a.kind === 'comms' || a.kind === 'eo') box.append(stationControls(host, a));
  if (a.kind === 'comms') {
    field(t('use.minEl'), '°', linearScale(0, 30 * DEG), deg.show, deg.read, 0, { min: 0, max: 30 * DEG }, a.minElevation, (v) => host.change({ minElevation: v }));
    if (engineer) {
      const L = a.link, set = (patch: Partial<AppSettings['link']>) => host.change({ link: { ...(host.apps()?.link ?? L), ...patch } });
      field(t('use.link.f'), t('use.unit.GHz'), logScale(1e9, 40e9), (v) => v / 1e9, (n) => n * 1e9, 2, { min: 1e9, max: 40e9 }, L.frequency, (v) => set({ frequency: v }));
      field(t('use.link.eirp'), t('use.unit.dBW'), linearScale(20, 70), plain.show, plain.read, 1, { min: 20, max: 70 }, L.eirp, (v) => set({ eirp: v }));
      field(t('use.link.d'), t('u.m'), logScale(0.3, 15), plain.show, plain.read, 2, { min: 0.3, max: 15 }, L.diameter, (v) => set({ diameter: v }));
      field(t('use.link.eta'), '%', linearScale(0.3, 0.85), (v) => v * 100, (n) => n / 100, 0, { min: 0.3, max: 0.85 }, L.efficiency, (v) => set({ efficiency: v }));
      field(t('use.link.t'), t('use.unit.K'), logScale(30, 1000), plain.show, plain.read, 0, { min: 30, max: 1000 }, L.noiseTemperature, (v) => set({ noiseTemperature: v }));
      field(t('use.link.loss'), t('use.unit.dB'), linearScale(0, 20), plain.show, plain.read, 1, { min: 0, max: 20 }, L.losses, (v) => set({ losses: v }));
      field(t('use.link.rate'), t('use.unit.Mbps'), logScale(0.01e6, 1000e6), (v) => v / 1e6, (n) => n * 1e6, 2, { min: 0.01e6, max: 1000e6 }, L.dataRate, (v) => set({ dataRate: v }));
      box.append(fields, el('p', 'pg-tool-lead', t('use.link.note')));
      return box;
    }
  }
  if (a.kind === 'eo') {
    const C = a.camera, set = (patch: Partial<AppSettings['camera']>) => host.change({ camera: { ...(host.apps()?.camera ?? C), ...patch } });
    if (!a.optics) {
      field(t('use.cam.swath'), t('u.km'), logScale(1e3, 3000e3), (v) => v / 1e3, (n) => n * 1e3, 1, { min: 1e3, max: 3000e3 }, C.swath, (v) => set({ swath: v }));
      field(t('use.cam.gsd'), t('u.m'), logScale(0.1, 1000), plain.show, plain.read, 2, { min: 0.1, max: 1000 }, C.gsd, (v) => set({ gsd: v }));
    }
    field(t('use.cam.tilt'), '°', linearScale(0, 60 * DEG), deg.show, deg.read, 0, { min: 0, max: 60 * DEG }, C.tilt, (v) => set({ tilt: v }));
    if (engineer) {
      const toggle = el('label', 'pg-toggle');
      const input = el('input');
      input.type = 'checkbox';
      input.checked = !!a.optics;
      input.addEventListener('change', () => host.change({ optics: input.checked ? { focalLength: 16.1, pixelPitch: 13e-6, pixels: 20_600 } : null }));
      const text = el('span', 'pg-toggle-text');
      text.append(el('strong', undefined, t('use.cam.optics')), el('small', undefined, t('use.cam.opticsNote')));
      toggle.append(input, text);
      fields.append(toggle);
      if (a.optics) {
        const O = a.optics, setO = (patch: Partial<NonNullable<AppSettings['optics']>>) => host.change({ optics: { ...(host.apps()?.optics ?? O), ...patch } });
        field(t('use.cam.focal'), t('u.m'), logScale(0.05, 30), plain.show, plain.read, 2, { min: 0.05, max: 30 }, O.focalLength, (v) => setO({ focalLength: v }));
        field(t('use.cam.pitch'), t('use.unit.um'), logScale(1e-6, 50e-6), (v) => v * 1e6, (n) => n / 1e6, 1, { min: 1e-6, max: 50e-6 }, O.pixelPitch, (v) => setO({ pixelPitch: v }));
        field(t('use.cam.pixels'), '', logScale(100, 100_000), plain.show, plain.read, 0, { min: 100, max: 100_000 }, O.pixels, (v) => setO({ pixels: Math.round(v) }));
      }
    }
  }
  if (a.kind === 'thai') {
    const list = el('ul', 'pg-thai');
    for (const s of THAI_SATELLITES) {
      const li = el('li');
      if (s.id === a.thaiId) li.classList.add('current');
      const head = el('div', 'pg-thai-head');
      head.append(el('strong', undefined, s.name), el('span', 'pg-thai-kind', s.orbit.kind === 'geo' ? t('use.thai.geo', { lon: num(s.orbit.longitude, 1) }) : t('use.thai.leo')));
      li.append(head, el('span', 'pg-thai-op', s.operator));
      if (s.reentered) li.append(el('span', 'pg-thai-down', t('use.thai.reentered', { date: s.reentered })));
      li.append(button('watch-btn', t('use.thai.show'), () => host.showThai(s.id)));
      list.append(li);
    }
    box.append(list);
    return box;
  }
  box.append(fields);
  return box;
}

/** A place to stand: one of `STATIONS` by its id, or 'custom' with the coordinates typed in. */
export interface StationChoice { stationId: string; station: GroundStation }

export const placeName = (c: StationChoice): string => (c.stationId in STATION_KEY ? t(STATION_KEY[c.stationId]) : t('use.st.custom'));

/**
 * Where the dish (or the observer) stands: a city, or coordinates typed in —
 * never asked of the browser. `current` reads the choice as it is when a
 * field changes (another field may have changed it since this was drawn).
 */
export function stationPicker(label: string, choice: StationChoice, current: () => StationChoice, change: (next: StationChoice) => void): HTMLElement {
  const box = el('div', 'pg-station');
  const pick = el('label', 'pg-preset');
  pick.append(el('span', undefined, label));
  const sel = el('select');
  sel.append(...[...STATIONS.map((s) => s.id), 'custom'].map((id) => {
    const o = el('option', undefined, id in STATION_KEY ? t(STATION_KEY[id]) : t('use.st.custom'));
    o.value = id;
    return o;
  }));
  sel.value = choice.stationId;
  sel.addEventListener('change', () => {
    const st = stationOf(sel.value);
    change(st ? { stationId: sel.value, station: st } : { stationId: 'custom', station: current().station });
  });
  pick.append(sel);
  box.append(pick);
  if (choice.stationId === 'custom') {
    const row = el('div', 'pg-tool-row');
    const input = (name: string, value: number, min: number, max: number, set: (v: number) => void) => {
      const wrap = el('label');
      const i = el('input');
      i.type = 'number'; i.min = String(min); i.max = String(max); i.step = '0.0001'; i.value = (value * RAD).toFixed(4);
      i.addEventListener('change', () => { const v = Number(i.value); if (Number.isFinite(v)) set(Math.max(min, Math.min(max, v)) * DEG); });
      wrap.append(el('span', undefined, name), i);
      row.append(wrap);
    };
    input(t('use.lat'), choice.station.lat, -90, 90, (v) => { const c = current(); change({ ...c, station: { ...c.station, lat: v } }); });
    input(t('use.lon'), choice.station.lon, -180, 180, (v) => { const c = current(); change({ ...c, station: { ...c.station, lon: v } }); });
    box.append(row, el('p', 'pg-tool-lead', t('use.privacy')));
  }
  return box;
}

function stationControls(host: AppsHost, a: AppSettings): HTMLElement {
  const now = (): StationChoice => { const x = host.apps() ?? a; return { stationId: x.stationId, station: x.station }; };
  return stationPicker(t('use.station'), { stationId: a.stationId, station: a.station }, now, (next) => host.change(next));
}

/** What the application shows for the orbit flown now. */
export function appsResults(host: AppsHost, a: AppSettings, ctx: { comms: CommsReport | null; eo: EoReport | null; thai: ThaiSatellite | null }): HTMLElement {
  const box = el('section', 'pg-plan pg-apps-results');
  box.append(el('h2', 'pg-facts-title', t(KIND_KEY[a.kind])));
  const engineer = host.level() === 'engineer';
  const dl = el('dl', 'pg-dl');
  const row = (k: string, v: string) => dl.append(el('dt', undefined, k), el('dd', undefined, v));
  const km = t('u.km'), ms = t('use.unit.ms');
  if (a.kind === 'comms' && ctx.comms) {
    const c = ctx.comms;
    box.append(el('p', 'pg-note', t('use.from', { place: stationName(a) })));
    if (c.visible) {
      row(t('use.az'), `${num(c.look.azimuth * RAD, 1)}° (${compass(c.look.azimuth)})`);
      row(t('use.el'), `${num(c.look.elevation * RAD, 1)}°`);
    } else row(t('use.el'), t('use.below'));
    row(t('use.range'), `${num(c.look.range / 1e3)} ${km}`);
    row(t('use.hop'), `${num(c.hop * 1e3, 1)} ${ms}`);
    row(t('use.roundTrip'), `${num(c.roundTrip * 1e3, 0)} ${ms}`);
    row(t('use.leoHop'), `${num(c.leoHop * 1e3, 1)} ${ms}`);
    row(t('use.footprint'), t('use.footprintValue', { g: num(c.footprint * RAD, 1), el: num(a.minElevation * RAD, 0), pct: num(c.share * 100, 1) }));
    box.append(dl);
    if (engineer && c.visible) {
      const L = el('dl', 'pg-dl');
      const lr = (k: string, v: string) => L.append(el('dt', undefined, k), el('dd', undefined, v));
      const dB = t('use.unit.dB');
      lr(t('use.lb.fspl'), `${num(c.link.pathLoss, 1)} ${dB}`);
      lr(t('use.lb.gain'), `${num(c.link.gain, 1)} ${t('use.unit.dBi')}`);
      lr(t('use.lb.gt'), `${num(c.link.gOverT, 1)} ${t('use.unit.dBK')}`);
      lr(t('use.lb.cn0'), `${num(c.link.cOverN0, 1)} ${t('use.unit.dBHz')}`);
      lr(t('use.lb.ebn0'), `${num(c.link.ebOverN0, 1)} ${dB}`);
      box.append(el('h3', 'pg-sub', t('use.lb.title')), L);
    }
  } else if (a.kind === 'eo' && ctx.eo) {
    const e = ctx.eo;
    row(t('use.cam.swath'), `${num(e.swath / 1e3, 1)} ${km}`);
    row(t('use.cam.gsd'), `${num(e.gsd, 2)} ${t('u.m')}`);
    if (engineer) row(t('use.cam.pixels'), num(e.pixels));
    row(t('use.eo.spacing', { place: stationName(a) }), `${num(e.spacing / 1e3)} ${km}`);
    row(t('use.eo.nadir'), `${num(e.nadirShare * 100, e.nadirShare < 0.1 ? 2 : 0)} %`);
    if (e.reach !== null) row(t('use.eo.reach', { tilt: num(a.camera.tilt * RAD, 0) }), `${num(e.reach / 1e3)} ${km}`);
    row(t('use.eo.ltdn'), hhmm(e.ltdn));
    if (e.repeatSpacing) row(t('use.eo.grid'), `${num(e.repeatSpacing / 1e3, 1)} ${km}`);
    box.append(dl, el('p', 'pg-note', e.closesGap ? t('use.eo.closes') : t('use.eo.gaps')));
  } else if (a.kind === 'thai') {
    const s = ctx.thai;
    if (!s) { box.append(el('p', 'pg-note', t('use.thai.pick'))); return box; }
    box.append(el('h3', 'pg-sub', s.name), el('p', 'pg-note', t(s.aboutKey)));
    row(t('use.thai.operator'), s.operator);
    row(t('use.thai.builder'), s.builder);
    row(t('use.thai.launch'), `${s.launch.date} · ${s.launch.vehicle} · ${s.launch.site}`);
    row(t('use.thai.orbit'), s.orbit.kind === 'geo' ? t('use.thai.geo', { lon: num(s.orbit.longitude, 1) })
      : `${num(s.orbit.perigee)} × ${num(s.orbit.apogee)} ${km}, i = ${num(s.orbit.inclination, 2)}°`);
    if (s.imaging) row(t('use.cam.gsd'), `${num(s.imaging.gsd, s.imaging.gsd < 1 ? 1 : 0)} ${t('u.m')}${s.imaging.swath ? ` · ${t('use.cam.swath')} ${num(s.imaging.swath, 1)} ${km}` : ''}`);
    if (s.ltdn) row(t('use.eo.ltdn'), s.ltdn[0] === s.ltdn[1] ? hhmm(s.ltdn[0]) : `${hhmm(s.ltdn[0])}–${hhmm(s.ltdn[1])}`);
    if (s.repeat) row(t('use.thai.repeat'), t('use.thai.repeatValue', { revs: num(s.repeat.revs), days: num(s.repeat.days) }));
    row(t('use.thai.ids'), `${s.cospar} · NORAD ${s.norad}`);
    if (s.reentered) row(t('use.thai.status'), t('use.thai.reentered', { date: s.reentered }));
    box.append(dl);
    const src = el('ul', 'pg-sources');
    for (const x of s.sources) {
      const li = el('li');
      const link = el('a', undefined, x.title);
      link.href = x.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      li.append(link);
      src.append(li);
    }
    box.append(el('h3', 'pg-sub', t('use.thai.sources')), src, el('p', 'pg-note', t('use.thai.nominal', { date: THAI_SATELLITES_AS_OF })));
  }
  return box;
}
