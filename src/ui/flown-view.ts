/**
 * The real flight beside the simulated one (roadmap C01): a table of the
 * flown event times and orbit against the model's, for the panel under the
 * mission result (Explore, Engineer) and the viewer's end card.
 */
import { getLang, onLangChange, t } from '../i18n';
import type { SimEvent } from '../physics/sim/types';
import { compareEvents, FLOWN_LABEL, simPayloadOrbit, type FlownRecord } from './flown';
import { historicalFor } from './watch-missions';

/** Mission time as T+h:mm:ss (hours past 24 are kept: a two-day rendezvous reads T+50:26:39). */
export function fmtMissionTime(s: number): string {
  const total = Math.round(Math.max(0, s));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), sec = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `T+${h}:${pad(m)}:${pad(sec)}` : `T+${pad(m)}:${pad(sec)}`;
}

/** A difference in seconds: "+12 s", "−1:05", "+2:03:10". */
export function fmtDelta(s: number): string {
  const a = Math.round(Math.abs(s));
  const sign = a === 0 ? '±' : s < 0 ? '−' : '+';
  if (a < 600) return `${sign}${a} ${t('u.s')}`;
  return `${sign}${fmtMissionTime(a).slice(2)}`;
}

const num = (x: number, digits: number) => x.toLocaleString(getLang(), { minimumFractionDigits: digits, maximumFractionDigits: digits });
const orbitText = (o: { perigee: number; apogee: number; inclination: number }) =>
  `${num(o.perigee, 0)} × ${num(o.apogee, 0)} ${t('u.km')}, ${num(o.inclination, 2)}°`;

/** The comparison as a table, with its caption and the note on what "≈" means. */
export function flownTable(record: FlownRecord, events: readonly SimEvent[]): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'flown';
  const table = document.createElement('table');
  const caption = document.createElement('caption');
  caption.textContent = t('flown.title');
  table.append(caption);
  const head = table.createTHead().insertRow();
  for (const key of ['flown.col.event', 'flown.col.model', 'flown.col.real', 'flown.col.delta']) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = t(key);
    head.append(th);
  }
  const body = table.createTBody();
  const row = (label: string, model: string, real: string, delta: string) => {
    const tr = body.insertRow();
    const th = document.createElement('th');
    th.scope = 'row';
    th.textContent = label;
    tr.append(th);
    for (const text of [model, real, delta]) tr.insertCell().textContent = text;
  };
  for (const r of compareEvents(record, events)) {
    row(t(FLOWN_LABEL[r.key]), r.sim === null ? '—' : fmtMissionTime(r.sim), `${r.approx ? '≈ ' : ''}${fmtMissionTime(r.real)}`,
      r.delta === null ? '—' : fmtDelta(r.delta));
  }
  if (record.orbit) {
    const sim = simPayloadOrbit(events);
    row(t('flown.orbit'), sim ? orbitText(sim) : '—', `${record.orbit.approx ? '≈ ' : ''}${orbitText(record.orbit)}`, '');
  }
  const note = document.createElement('p');
  note.className = 'flown-note';
  note.textContent = t('flown.note');
  wrap.append(table, note);
  return wrap;
}

/** The panel under the mission result: shown for an unchanged historical flight once it has flown. */
export class FlownPanel {
  private sig = '';
  private last: { record: FlownRecord; events: readonly SimEvent[] } | null = null;

  constructor(private readonly host: HTMLElement) {
    host.hidden = true;
    onLangChange(() => { if (this.last) this.render(this.last.record, this.last.events); });
  }

  clear(): void {
    this.sig = '';
    this.last = null;
    this.host.hidden = true;
    this.host.replaceChildren();
  }

  update(sim: { cfg: { vehicleId: string; siteId: string; satelliteId: string; launchTime: Date; payloadMassOverride?: number }; events: readonly SimEvent[] }): void {
    const cfg = sim.cfg;
    const record = historicalFor({ ...cfg, payloadMass: cfg.payloadMassOverride })?.flown;
    const events = sim.events;
    if (!record || !events.some((e) => e.key === 'evt.liftoff')) { if (!this.host.hidden) this.clear(); return; }
    const sig = `${events.length}|${events[events.length - 1]?.t ?? 0}`;
    if (sig === this.sig) return;
    this.sig = sig;
    this.render(record, events);
  }

  private render(record: FlownRecord, events: readonly SimEvent[]): void {
    this.last = { record, events };
    this.host.replaceChildren(flownTable(record, events));
    this.host.hidden = false;
  }
}
