/**
 * The satellite builder's controls (roadmap D06; Phase 4 map §2.7, track
 * B): a number box for each field of `SATELLITE_FIELDS`
 * (src/design/satellite-model.ts) in the units it is shown in, the menus and
 * switches a design has, and the mark each figure carries — sourced (with
 * where from), an estimate, or yours (Principle 4). Shared by the Explore
 * level's satellite designer and the Engineer level's bench, over the one
 * `SatelliteWorkspace`.
 *
 * A box moves the design, not the controls: typing never rebuilds the box
 * being typed in (the explore-level.ts rule), and the marks and a
 * sun-synchronous orbit's inclination are brought up to date in place
 * (`refreshControls`).
 */
import { getLang, t } from '../../i18n';
import {
  DIFFRACTION_WAVELENGTH, SHOWN, fieldOrigin, ssoInclinationDeg, todayDesignDate, valueAt, withCamera, withChoice, withEngine, withSso, withValue, type SatelliteField,
} from '../../design/satellite-model';
import { typedText } from '../../design/number-entry';
import type { SatelliteDesign } from '../../design/satellite-spec';
import { STATIONS } from '../../orbit/applications-setup';
import { STATION_KEY } from '../orbit/applications-panel';
import { button, el } from '../orbit/dom';
import { field, numberBox, select } from './explore-level';
import { fieldUnitText } from './satellite-text';
import type { SatelliteWorkspace } from './satellite-workspace';

const ORIGIN_KEY = { sourced: 'build.sat.origin.sourced', estimate: 'build.stat.estimate', yours: 'build.sat.origin.yours' } as const;

/** The mark beside a field's name: where its number comes from, the source in its title and, on a phone, in the group's source list. */
export function originTag(design: SatelliteDesign, path: string): HTMLElement {
  const o = fieldOrigin(design, path);
  const tag = el('em', `bsat-origin bsat-origin-${o.kind}`, t(ORIGIN_KEY[o.kind]));
  tag.dataset.origin = path;
  if (o.kind !== 'yours' && o.source) tag.title = o.source;
  return tag;
}

/** A number field: its name and mark, the box in the units shown, and the unit. */
export function numberField(ws: SatelliteWorkspace, f: SatelliteField, keyPrefix: string): HTMLElement {
  const d = ws.design;
  const v = valueAt(d, f.path);
  const scale = SHOWN[f.unit];
  const box = numberBox(`${keyPrefix}${f.path}`, typeof v === 'number' ? v : Number.NaN, {
    min: f.min * scale, max: f.max * scale, step: f.step, show: (x) => x * scale, read: (n) => n / scale,
  }, (next) => ws.change(withValue(ws.design, f.path, f.integer && Number.isFinite(next) ? Math.round(next) : next)));
  box.dataset.path = f.path;
  // a node the design does not fix is flown at 0 (`designOrbit`): the empty box says so
  if (f.path === 'orbit.raan' && v === undefined) box.placeholder = '0';
  // a camera that gives no wavelength is read at 550 nm (an estimate, `cameraWavelength`): the empty box says so
  if (f.path === 'payload.wavelength' && v === undefined) box.placeholder = typedText(DIFFRACTION_WAVELENGTH * SHOWN.um, getLang());
  if (f.path === 'orbit.inclination') box.disabled = inclinationFollows(d);
  const unit = fieldUnitText(f.unit);
  const row = el('span', 'bx-with-unit');
  row.append(box);
  if (unit) row.append(el('span', 'bx-unit', unit));
  const label = field(t(f.key), row, 'bx-field bsat-field');
  label.querySelector('.bx-field-name')!.append(' ', originTag(d, f.path));
  return label;
}

/** A switch (sun-synchronous, has an engine, has a camera). */
export function toggle(key: string, labelKey: string, on: boolean, onChange: (on: boolean) => void, noteKey?: string): HTMLElement {
  const label = el('label', 'bx-check bsat-toggle');
  const input = el('input');
  input.type = 'checkbox';
  input.checked = on;
  input.dataset.k = key;
  input.addEventListener('change', () => onChange(input.checked));
  const text = el('span', undefined, t(labelKey));
  if (noteKey) text.append(el('small', 'bsat-toggle-note', t(noteKey)));
  label.append(input, text);
  return label;
}

export const sso = (ws: SatelliteWorkspace, prefix: string): HTMLElement =>
  toggle(`${prefix}sso`, 'build.sat.sso', ws.design.orbit.sso, (on) => ws.change(withSso(ws.design, on)), 'build.sat.ssoNote');
export const engine = (ws: SatelliteWorkspace, prefix: string): HTMLElement =>
  toggle(`${prefix}engine`, 'build.sat.engine', !!ws.design.propulsion, (on) => ws.change(withEngine(ws.design, on)));
export const camera = (ws: SatelliteWorkspace, prefix: string): HTMLElement =>
  toggle(`${prefix}camera`, 'build.sat.camera', !!ws.design.payload, (on) => ws.change(withCamera(ws.design, on)));

const MOUNT_KEY = { tracking: 'build.sat.mount.tracking', body: 'build.sat.mount.body', spinner: 'build.sat.mount.spinner' } as const;
const REGULATION_KEY = { DET: 'build.sat.regulation.DET', PPT: 'build.sat.regulation.PPT' } as const;
const MODE_KEY = { gravityGradient: 'build.sat.mode.gravityGradient', spin: 'build.sat.mode.spin', threeAxis: 'build.sat.mode.threeAxis' } as const;

/** One of the design's menus, labelled and marked like a number field. */
export function menu(ws: SatelliteWorkspace, which: 'mount' | 'regulation' | 'mode' | 'station', prefix: string): HTMLElement {
  const d = ws.design;
  const [labelKey, path, options, value] = which === 'mount'
    ? ['build.sat.mount', 'power.mount', Object.entries(MOUNT_KEY), d.power.mount] as const
    : which === 'regulation' ? ['build.sat.regulation', 'power.regulation', Object.entries(REGULATION_KEY), d.power.regulation] as const
      : which === 'mode' ? ['build.sat.mode', 'adcs.mode', Object.entries(MODE_KEY), d.adcs.mode] as const
        : ['build.sat.station', 'comms.station', STATIONS.map((s) => [s.id, STATION_KEY[s.id]] as const), d.comms.station] as const;
  const s = select(`${prefix}${which}`, options.map(([v, k]) => ({ value: v, label: t(k) })), value, (v) => ws.change(withChoice(ws.design, which, v)));
  const label = field(t(labelKey), s, 'bx-field bsat-field');
  label.querySelector('.bx-field-name')!.append(' ', originTag(d, path));
  return label;
}

/**
 * The controls already drawn, brought up to the design without a rebuild:
 * each mark, and a box whose number the model moved (a sun-synchronous
 * orbit's inclination follows its height). A box being typed in is left as
 * it is.
 */
export function refreshControls(root: HTMLElement, design: SatelliteDesign): void {
  for (const tag of root.querySelectorAll<HTMLElement>('[data-origin]')) tag.replaceWith(originTag(design, tag.dataset.origin!));
  const inc = root.querySelectorAll<HTMLInputElement>('input[data-path="orbit.inclination"]');
  for (const box of inc) {
    box.disabled = inclinationFollows(design);
    if (document.activeElement !== box && Number.isFinite(design.orbit.inclination)) box.value = typedText(design.orbit.inclination, getLang());
  }
}

/**
 * The design date (the integration of D06; `DesignDate`): a date box and a
 * "Today" button, shared by the Explore level's head and the bench's. A day
 * the model does not take (empty, outside 1957–2200) puts the box back.
 */
export function designDateField(ws: SatelliteWorkspace, prefix: string): HTMLElement {
  const box = el('input', 'bx-text bsat-date');
  box.type = 'date';
  box.min = '1957-10-04';
  box.max = '2200-12-31';
  box.value = ws.date;
  box.dataset.k = `${prefix}date`;
  box.addEventListener('change', () => { if (!ws.setDate(box.value)) box.value = ws.date; });
  const today = button('watch-btn link bsat-today', t('build.sat.date.today'), () => { ws.setDate(todayDesignDate()); box.value = ws.date; });
  today.dataset.k = `${prefix}today`;
  const wrap = el('div', 'bsat-date-field');
  wrap.append(field(t('build.sat.date'), box, 'bx-field'), today);
  wrap.title = t('build.sat.date.note');
  return wrap;
}

/** A sun-synchronous orbit's inclination is J2's for its height, not the student's to type (where one exists). */
const inclinationFollows = (d: SatelliteDesign): boolean => d.orbit.sso && ssoInclinationDeg(d.orbit.perigee, d.orbit.apogee) !== null;
