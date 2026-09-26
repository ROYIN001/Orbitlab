/**
 * The flight report (roadmap U06): one self-contained HTML file — no network,
 * no scripts — with the mission as it was set up, the result, the key figures,
 * the event log and the charts, in the language on screen, laid out for A4 so
 * the browser's "Print → Save as PDF" makes the document. Built as a string
 * from plain data, so it runs under test; `downloadFlightReport` gathers the
 * data from the page. The base for E05's worksheets.
 */
import { getLang, t, type Lang } from '../i18n';
import { RESULT_COPY, type MissionResultModel, type ResultMetric } from './result-content';
import type { SimEvent } from '../physics/simulation';
import type { MissionPlan } from '../physics/mission';
import type { TelemetrySample } from '../physics/sim/types';
import type { MissionConfig, VehicleSpec } from '../types';
import { RAD } from '../physics/constants';
import { siteById } from '../data/sites';
import { satelliteById } from '../data/satellites';
import { localizeEventParams, satelliteName, siteName } from './names';
import { faultKindName } from './fault-names';
import { chartTitle, insertionEvent } from './telemetry-charts';

export interface ReportFlight {
  cfg: MissionConfig;
  vehicleSpec: VehicleSpec;
  plan: Pick<MissionPlan, 'target'>;
  events: readonly SimEvent[];
  telemetry: readonly TelemetrySample[];
}

export interface ReportFigure { title: string; src: string }

export interface ReportInput {
  flight: ReportFlight;
  result: MissionResultModel | null;
  /** the flight's own charts, then any engineering chart on screen */
  figures: ReportFigure[];
  /** a link that opens the mission (U01), or null */
  link: string | null;
  generatedAt: Date;
  /** the operator changed the vehicle's guidance programme */
  guidanceEdited?: boolean;
}

const esc = (text: string): string => text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

function numberIn(lang: Lang, value: number, digits = 1): string {
  return value.toLocaleString(lang, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

const utc = (d: Date): string => `${d.toISOString().slice(0, 16).replace('T', ' ')} UTC`;

/** The mission as it was set up: every choice that shapes the flight. */
function setupRows(flight: ReportFlight, lang: Lang, guidanceEdited: boolean): [string, string][] {
  const { cfg, plan, vehicleSpec } = flight;
  const site = siteById(cfg.siteId), sat = satelliteById(cfg.satelliteId);
  const n = (v: number, d = 1) => numberIn(lang, v, d);
  const d = cfg.dynamics;
  const target = plan.target;
  const rows: [string, string][] = [
    [t('setup.vehicle'), vehicleSpec.name],
    [t('setup.site'), `${siteName(site)} (${n(Math.abs(site.latitude), 3)}° ${site.latitude >= 0 ? 'N' : 'S'}, ${n(Math.abs(site.longitude), 3)}° ${site.longitude >= 0 ? 'E' : 'W'})`],
    [t('setup.satellite'), satelliteName(sat)],
    [t('setup.payloadMass'), `${n(cfg.payloadMassOverride ?? sat.mass, 0)} ${t('u.kg')}`],
    [t('setup.perigee'), n(target.perigee / 1000)],
    [t('setup.apogee'), n(target.apogee / 1000)],
    [t('setup.inclination'), n(target.inclination * RAD, 2)],
  ];
  if (target.raan !== null) rows.push([t('setup.raan'), n(target.raan * RAD, 2)]);
  rows.push([t('setup.launchTime'), utc(cfg.launchTime)]);
  rows.push([t('setup.dynamics.title'), d?.model === 'sixDof' ? t('setup.dynamics.sixDof') : t('setup.dynamics.pointMass')]);
  if (d) {
    rows.push([t('setup.dynamics.wind'), d.wind === 'calm' ? t('setup.dynamics.calm') : d.wind === 'crosswind' ? t('setup.dynamics.crosswind') : t('setup.dynamics.shear')]);
    const law = d.explicitGuidance?.law;
    rows.push([t('setup.explicit.law'), law === 'peg' ? t('setup.explicit.peg') : law === 'igm' ? t('setup.explicit.igm') : t('setup.explicit.standard')]);
    const nav = d.navigation;
    rows.push([t('setup.nav.title'), nav ? t(`setup.nav.grade.${nav.grade ?? 'tactical'}`) : t('report.off')]);
    const flex = d.flex;
    const flexOn = flex ? [flex.slosh ? t('setup.flex.slosh') : '', flex.bending ? t('setup.flex.bending') : '', flex.notch ? t('setup.flex.notch') : ''].filter(Boolean) : [];
    rows.push([t('setup.flex.title'), flexOn.length ? flexOn.join('; ') : t('report.off')]);
    rows.push([t('setup.control.title'), d.control ? t('report.custom') : t('report.default')]);
    // P08: a dispersed flight names the Monte Carlo run it flies
    if (d.dispersion) rows.push([t('setup.dispersion.title'), t('report.dispersionRun', { run: d.dispersion.run + 1, seed: d.dispersion.seed })]);
    const faults = d.controlFaults?.faults ?? [];
    rows.push([t('setup.faults.title'), faults.length
      ? `${faults.map((f) => `${faultKindName(f.kind)} ${t('report.at', { t: n(f.time) })}`).join('; ')}${d.controlFaults?.fdir ? ` · ${t('setup.faults.fdir')}` : ''}`
      : t('report.none')]);
  }
  const failure = cfg.failure.mode === 'none' ? t('setup.fail.none') : `${t(`setup.fail.${cfg.failure.mode}`)} ${t('report.at', { t: n(cfg.failure.time) })}`;
  rows.push([t('setup.failure'), failure]);
  rows.push([t('setup.guidance'), guidanceEdited ? t('report.custom') : t('report.default')]);
  rows.push([t('setup.boosterRecovery'), cfg.boosterRecovery ? t('report.on') : t('report.off')]);
  return rows;
}

/** The figures a report quotes: the mass at liftoff, max q, max load, insertion, what is left. */
function keyFigures(flight: ReportFlight, lang: Lang): [string, string][] {
  const tel = flight.telemetry;
  if (!tel.length) return [];
  const n = (v: number, d = 1) => numberIn(lang, v, d);
  const at = (s: TelemetrySample) => t('report.at', { t: n(s.t) });
  const liftoff = tel.find((s) => s.t >= 0) ?? tel[0];
  const maxBy = (f: (s: TelemetrySample) => number) => tel.reduce((a, b) => (f(b) > f(a) ? b : a));
  const q = maxBy((s) => s.q), g = maxBy((s) => s.gLoad);
  const event = insertionEvent(flight.events);
  const insertion = event ? tel.reduce((a, b) => (Math.abs(b.t - event.t) < Math.abs(a.t - event.t) ? b : a)) : null;
  const last = tel[tel.length - 1];
  const rows: [string, string][] = [
    [t('report.fig.liftoffMass'), `${n(liftoff.mass / 1000)} ${t('u.t')}`],
    [chartTitle('q'), `${n(q.q / 1000, 2)} ${t('u.kPa')} ${at(q)}`],
    [chartTitle('g'), `${n(g.gLoad, 2)} g ${at(g)}`],
  ];
  if (insertion) {
    rows.push([t('report.fig.insertion'), `${at(insertion)} · ${n(insertion.alt / 1000)} ${t('u.km')} · ${n(insertion.vInertial, 0)} ${t('u.ms')}`]);
  }
  rows.push([chartTitle('dv'), `${n(last.dvRemaining, 0)} ${t('u.ms')} ${at(last)}`]);
  rows.push([t('report.fig.duration'), `T+${n(last.t)} ${t('u.s')}`]);
  return rows;
}

function metricText(lang: Lang, value: number | null, metric: ResultMetric, signed = false): string {
  if (value === null) return '—';
  const digits = metric.unit === 'km' ? 1 : 2;
  const text = numberIn(lang, value, digits);
  return `${signed && value > 0 ? '+' : ''}${text}${metric.unit === 'deg' ? '°' : ` ${t('u.km')}`}`;
}

function table(rows: [string, string][], head?: [string, string]): string {
  const h = head ? `<thead><tr><th>${esc(head[0])}</th><th>${esc(head[1])}</th></tr></thead>` : '';
  return `<table>${h}<tbody>${rows.map(([a, b]) => `<tr><th scope="row">${esc(a)}</th><td>${esc(b)}</td></tr>`).join('')}</tbody></table>`;
}

const STYLE = `
@page { size: A4; margin: 16mm 14mm; }
:root { color-scheme: light; }
body { margin: 0 auto; max-width: 180mm; padding: 12mm 0; font: 10.5pt/1.5 "Noto Sans", "Noto Sans Thai", "DM Sans", "Segoe UI", system-ui, sans-serif; color: #111827; background: #fff; }
h1 { font-size: 19pt; margin: 0 0 2mm; }
h2 { font-size: 13pt; margin: 8mm 0 3mm; border-bottom: 1px solid #d1d5db; padding-bottom: 1mm; break-after: avoid; }
.sub { font-size: 11.5pt; margin: 0; }
.meta, .note, footer { color: #4b5563; font-size: 9pt; }
table { width: 100%; border-collapse: collapse; margin: 2mm 0; break-inside: auto; }
th, td { text-align: left; vertical-align: top; padding: 1.2mm 2mm; border-bottom: 1px solid #e5e7eb; }
thead th { border-bottom: 1.5px solid #9ca3af; font-weight: 600; }
tbody th { font-weight: 500; width: 42%; color: #374151; }
td.num, th.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.miss { color: #b91c1c; font-weight: 600; }
.outcome { font-size: 12pt; font-weight: 600; margin: 0 0 1mm; }
.outcome[data-outcome="target"] { color: #047857; } .outcome[data-outcome="failed"] { color: #b91c1c; } .outcome[data-outcome="offTarget"] { color: #b45309; }
table.events td:first-child { width: 22mm; white-space: nowrap; font-variant-numeric: tabular-nums; }
figure { margin: 4mm 0; break-inside: avoid; }
figure img { width: 100%; height: auto; border: 1px solid #e5e7eb; }
figcaption { font-size: 9pt; color: #374151; margin-top: 1mm; }
a { color: #0f766e; word-break: break-all; }
footer { margin-top: 10mm; border-top: 1px solid #d1d5db; padding-top: 2mm; }
`;

/** The report as a complete HTML document. */
export function buildFlightReport(input: ReportInput): string {
  const lang = getLang();
  const { flight, result, figures } = input;
  const copy = RESULT_COPY[lang];
  const site = siteById(flight.cfg.siteId), sat = satelliteById(flight.cfg.satelliteId);
  const title = t('report.title', { vehicle: flight.vehicleSpec.name, payload: satelliteName(sat) });
  const parts: string[] = [];
  parts.push(`<header><h1>${esc(title)}</h1><p class="sub">${esc(`${flight.vehicleSpec.name} · ${siteName(site)} · ${utc(flight.cfg.launchTime)}`)}</p>`
    + `<p class="meta">${esc(t('report.generated', { date: utc(input.generatedAt) }))}</p></header>`);
  let section = 0;
  const h2 = (key: string) => `<h2>${++section}. ${esc(t(key))}</h2>`;
  parts.push(`<section>${h2('report.setup')}${table(setupRows(flight, lang, !!input.guidanceEdited))}</section>`);
  // result
  let res = `<section>${h2('report.result')}`;
  if (!result) res += `<p>${esc(t('report.noResult'))}</p>`;
  else {
    res += `<p class="outcome" data-outcome="${result.outcome}">${esc(copy.outcome[result.outcome])}</p><p>${esc(copy.cause[result.cause].detail)}</p>`;
    res += `<p class="meta">${esc(`${copy.assessed} T+${numberIn(lang, result.outcomeTime)} ${t('u.s')}`)}</p>`;
    res += `<table><thead><tr><th>${esc(copy.parameter)}</th><th class="num">${esc(copy.target)}</th><th class="num">${esc(copy.actual)}</th><th class="num">${esc(copy.delta)}</th></tr></thead><tbody>`;
    for (const m of result.metrics) {
      res += `<tr><th scope="row">${esc(copy.metric[m.key])}</th><td class="num">${esc(m.target === null ? copy.free : metricText(lang, m.target, m))}</td>`
        + `<td class="num">${esc(metricText(lang, m.actual, m))}</td><td class="num${m.outside ? ' miss' : ''}">${esc(metricText(lang, m.delta, m, true))}</td></tr>`;
    }
    res += `</tbody></table><p class="note">${esc(copy.deltaNote)}</p>`;
    if (flight.cfg.boosterRecovery) res += `<p>${esc(`${copy.booster}: ${copy.recovery[result.recovery]}`)}</p>`;
  }
  parts.push(`${res}</section>`);
  const figuresRows = keyFigures(flight, lang);
  if (figuresRows.length) parts.push(`<section>${h2('report.figures')}${table(figuresRows)}</section>`);
  // events
  const events = flight.events.map((e) => [`T+${numberIn(lang, e.t)} ${t('u.s')}`, t(e.key, localizeEventParams(flight.vehicleSpec, e.params))] as [string, string]);
  parts.push(`<section>${h2('report.events')}${events.length
    ? `<table class="events"><thead><tr><th>${esc(t('report.time'))}</th><th>${esc(t('report.event'))}</th></tr></thead><tbody>${events.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join('')}</tbody></table>`
    : `<p>${esc(t('tel.noEvents'))}</p>`}</section>`);
  if (figures.length) {
    parts.push(`<section>${h2('report.charts')}${figures.map((f, i) =>
      `<figure><img src="${esc(f.src)}" alt="${esc(f.title)}"><figcaption>${esc(t('report.figure', { n: i + 1, title: f.title }))}</figcaption></figure>`).join('')}</section>`);
  }
  const link = input.link ? `<p>${esc(t('report.link'))} <a href="${esc(input.link)}">${esc(input.link)}</a></p>` : '';
  parts.push(`<footer>${link}<p>${esc(t('report.disclaimer'))}</p></footer>`);
  return `<!doctype html>\n<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">`
    + `<title>${esc(title)}</title><style>${STYLE}</style></head><body>${parts.join('\n')}</body></html>\n`;
}

/** A file name for the report: vehicle, site, launch date and language. */
export function reportFileName(cfg: MissionConfig, lang: Lang = getLang()): string {
  const date = cfg.launchTime.toISOString().slice(0, 16).replace(/[:T]/g, '-');
  return `orbitlab-report-${cfg.vehicleId}-${cfg.siteId}-${date}-${lang}.html`;
}

/**
 * Gather the report from the page and save it: the flight's charts redrawn
 * over the whole recording, then every engineering chart on screen (Bode,
 * step response, inspector …) as it is drawn now, each on white.
 */
export async function downloadFlightReport(o: {
  flight: ReportFlight; result: MissionResultModel | null; link: string | null;
  /** canvases the flight's own charts replace (the telemetry panel's) */
  exclude: ReadonlySet<HTMLCanvasElement>;
  guidanceEdited: boolean;
}): Promise<void> {
  const { chartImage, chartSnapshot, visibleCharts } = await import('./chart-export');
  const { reportTelemetryCharts } = await import('./telemetry-charts');
  const { downloadBlob } = await import('./download');
  const image = (snap: Parameters<typeof chartImage>[0]): ReportFigure =>
    ({ title: snap.opt.title, src: chartImage(snap, { width: 1000, height: 420, scale: 2 }).toDataURL('image/png') });
  const figures = reportTelemetryCharts(o.flight).map(image);
  for (const canvas of visibleCharts()) {
    if (o.exclude.has(canvas)) continue;
    const snap = chartSnapshot(canvas);
    if (snap && snap.series.some((s) => s.x.length > 0)) figures.push(image(snap));
  }
  const html = buildFlightReport({ flight: o.flight, result: o.result, figures, link: o.link, generatedAt: new Date(), guidanceEdited: o.guidanceEdited });
  downloadBlob(new Blob([html], { type: 'text/html' }), reportFileName(o.flight.cfg));
}
