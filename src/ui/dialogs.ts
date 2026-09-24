/**
 * Modal dialogs: "Physics & sources" and the camera sequence.
 *
 * Both are native `<dialog>` elements opened with `showModal()`, which gives
 * Escape-to-close and the top layer for free, plus an explicit focus trap and
 * focus restoration on top (the audit asked for both, and `showModal`'s own
 * trap is not honoured by every engine when the dialog's content changes while
 * it is open — which ours does on every language switch).
 *
 * Content is rebuilt from the dictionaries on every language change, so nothing
 * here is allowed to keep English in the DOM.
 */
import type { CameraMode } from '../render/cameras';
import { t } from '../i18n';
import rigidDossierUrl from '../../docs/SIXDOF-VEHICLE-DATA.md?url';
import { getNotation, QUANTITIES, symbolNode, type Quantity } from './notation';
import './notation.css';

/** Flight phases the camera sequence can be programmed for. */
export type FlightPhase = 'pad' | 'ascent' | 'staging' | 'upper' | 'coast' | 'burn' | 'orbit' | 'deployment' | 'descent';

export const FLIGHT_PHASES: FlightPhase[] = ['pad', 'ascent', 'staging', 'upper', 'coast', 'burn', 'orbit', 'deployment', 'descent'];

export type CameraPlan = Record<FlightPhase, CameraMode>;

/** The Codex version's sequence, which is the one the owner liked. */
export const DEFAULT_CAMERA_PLAN: CameraPlan = {
  pad: 'exterior',
  ascent: 'exterior',
  staging: 'exterior',
  upper: 'onboard',
  coast: 'space',
  burn: 'space',
  orbit: 'space',
  deployment: 'map',
  // a ship flown home from a suborbital cut-off, from the entry interface down
  descent: 'exterior',
};

const CAMERA_MODES: CameraMode[] = ['exterior', 'onboard', 'space', 'map'];

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

/** A section heading plus one paragraph, both from the dictionaries. */
function section(titleKey: string, textKey: string): DocumentFragment {
  const f = document.createDocumentFragment();
  f.append(el('h3', undefined, t(titleKey)), el('p', undefined, t(textKey)));
  return f;
}

// --- U07: the notation table -------------------------------------------------
const QUANTITY_NAMES: Record<Quantity, string> = {
  axisX: 'notation.q.axisX', axisY: 'notation.q.axisY', axisZ: 'notation.q.axisZ',
  rollRate: 'notation.q.rollRate', pitchRate: 'notation.q.pitchRate', yawRate: 'notation.q.yawRate',
  alpha: 'notation.q.alpha', beta: 'notation.q.beta', pitchAngle: 'notation.q.pitchAngle', rollAngle: 'notation.q.rollAngle',
  yawAngle: 'notation.q.yawAngle', pathAngle: 'notation.q.pathAngle', trackAngle: 'notation.q.trackAngle', altitude: 'notation.q.altitude', airspeed: 'notation.q.airspeed',
  verticalSpeed: 'notation.q.verticalSpeed', dynamicPressure: 'notation.q.dynamicPressure', mach: 'notation.q.mach',
  loadFactor: 'notation.q.loadFactor', mass: 'notation.q.mass', thrust: 'notation.q.thrust',
};
/** Each quantity's definition: one text, or one per standard where they differ. */
const QUANTITY_DEFINITIONS: Record<Quantity, string | { iso: string; gost: string }> = {
  axisX: 'notation.def.axisX',
  axisY: { iso: 'notation.def.iso.axisY', gost: 'notation.def.gost.axisY' },
  axisZ: { iso: 'notation.def.iso.axisZ', gost: 'notation.def.gost.axisZ' },
  rollRate: 'notation.def.rollRate', pitchRate: 'notation.def.pitchRate',
  yawRate: { iso: 'notation.def.iso.yawRate', gost: 'notation.def.gost.yawRate' },
  alpha: 'notation.def.alpha', beta: 'notation.def.beta', pitchAngle: 'notation.def.pitchAngle', rollAngle: 'notation.def.rollAngle',
  yawAngle: { iso: 'notation.def.iso.yawAngle', gost: 'notation.def.gost.yawAngle' },
  pathAngle: 'notation.def.pathAngle',
  trackAngle: { iso: 'notation.def.iso.trackAngle', gost: 'notation.def.gost.trackAngle' },
  altitude: 'notation.def.altitude', airspeed: 'notation.def.airspeed',
  verticalSpeed: 'notation.def.verticalSpeed', dynamicPressure: 'notation.def.dynamicPressure', mach: 'notation.def.mach',
  loadFactor: 'notation.def.loadFactor', mass: 'notation.def.mass', thrust: 'notation.def.thrust',
};

/** Symbols in both standards, and each quantity's definition and sign in the one in force. */
function notationTable(): HTMLTableElement {
  const n = getNotation(), table = el('table', 'notation-table') as HTMLTableElement;
  const head = el('tr');
  for (const [key, active] of [['notation.col.quantity', false], ['notation.col.iso', n === 'iso'], ['notation.col.gost', n === 'gost'], ['notation.col.meaning', false]] as const) {
    const th = el('th', active ? 'active' : undefined, t(key));
    th.setAttribute('scope', 'col');
    head.append(th);
  }
  const thead = el('thead'); thead.append(head);
  const tbody = el('tbody');
  for (const q of QUANTITIES) {
    const row = el('tr'), definition = QUANTITY_DEFINITIONS[q];
    const name = el('th', undefined, t(QUANTITY_NAMES[q])); name.setAttribute('scope', 'row');
    const iso = el('td', n === 'iso' ? 'active' : undefined), gost = el('td', n === 'gost' ? 'active' : undefined);
    iso.append(symbolNode(q, 'iso')); gost.append(symbolNode(q, 'gost'));
    row.append(name, iso, gost, el('td', undefined, t(typeof definition === 'string' ? definition : definition[n])));
    tbody.append(row);
  }
  table.append(thead, tbody);
  return table;
}

function link(href: string, label: string): HTMLLIElement {
  const li = el('li');
  const a = el('a', undefined, label);
  a.href = href;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  li.append(a);
  return li;
}

/**
 * Shared modal behaviour: a close button, a focus trap, Escape, and focus
 * handed back to whatever opened it.
 */
export class Modal {
  readonly el: HTMLDialogElement;
  protected body: HTMLElement;
  private closeBtn: HTMLButtonElement;
  private opener: HTMLElement | null = null;

  constructor(dialog: HTMLDialogElement) {
    this.el = dialog;
    this.closeBtn = el('button', 'dialog-close');
    this.closeBtn.type = 'button';
    this.closeBtn.textContent = '×';
    this.closeBtn.addEventListener('click', () => this.close());
    this.body = el('div', 'dialog-body');
    dialog.replaceChildren(this.closeBtn, this.body);
    // Escape fires `cancel`; let it close, then restore focus like any close.
    dialog.addEventListener('close', () => {
      const o = this.opener;
      this.opener = null;
      if (o && document.contains(o)) o.focus();
    });
    // A click on the backdrop lands on the dialog element itself.
    dialog.addEventListener('click', (e) => { if (e.target === dialog) this.close(); });
    dialog.addEventListener('keydown', (e) => this.trap(e));
  }

  /** Keep Tab inside the dialog even if the engine's own trap is not applied. */
  private trap(e: KeyboardEvent): void {
    if (e.key !== 'Tab') return;
    const items = Array.from(this.el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((n) => n.offsetParent !== null || n === this.closeBtn);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && (active === first || !this.el.contains(active))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus(); }
  }

  open(opener: HTMLElement | null = null): void {
    this.opener = opener ?? (document.activeElement as HTMLElement | null);
    this.applyLanguage();
    if (typeof this.el.showModal === 'function') this.el.showModal();
    else this.el.setAttribute('open', '');
    const first = this.el.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? this.closeBtn).focus();
  }

  close(): void {
    if (typeof this.el.close === 'function') this.el.close();
    else this.el.removeAttribute('open');
  }

  get isOpen(): boolean {
    return this.el.open;
  }

  /** Rebuild the localized chrome; subclasses rebuild their body. */
  applyLanguage(): void {
    this.closeBtn.title = t('misc.close');
    this.closeBtn.setAttribute('aria-label', t('misc.close'));
  }
}

/** Localized summary of docs/PHYSICS.md with the data sources and credits. */
export class PhysicsDialog extends Modal {
  applyLanguage(): void {
    super.applyLanguage();
    this.el.setAttribute('aria-label', t('dlg.physics.title'));
    const b = this.body;
    b.replaceChildren();
    b.append(el('span', 'eyebrow', t('dlg.physics.eyebrow')));
    b.append(el('h2', undefined, t('dlg.physics.title')));
    b.append(el('p', 'lead', t('dlg.physics.intro')));
    b.append(section('dlg.physics.rigid', 'dlg.physics.rigidText'));
    b.append(section('dlg.physics.estimates', 'dlg.physics.estimatesText'));
    const dossier = el('ul'); dossier.append(link(rigidDossierUrl, t('dlg.physics.dossier'))); b.append(dossier);
    b.append(section('dlg.physics.frames', 'dlg.physics.framesText'));
    b.append(section('dlg.physics.notation', 'dlg.physics.notationText'), notationTable());
    b.append(section('dlg.physics.forces', 'dlg.physics.forcesText'));
    b.append(section('dlg.physics.atmosphere', 'dlg.physics.atmosphereText'));
    b.append(section('dlg.physics.propulsion', 'dlg.physics.propulsionText'));
    b.append(section('dlg.physics.guidance', 'dlg.physics.guidanceText'));
    b.append(section('dlg.physics.sequencing', 'dlg.physics.sequencingText'));
    b.append(section('dlg.physics.limits', 'dlg.physics.limitsText'));
    b.append(section('dlg.physics.shortcuts', 'dlg.physics.shortcutsText'));
    b.append(el('h3', undefined, t('dlg.physics.sources')));
    const ul = el('ul');
    ul.append(
      link('https://www.spacex.com/vehicles/falcon-9/', 'SpaceX — Falcon 9 / Falcon Heavy'),
      link('https://www.rocketlabusa.com/launch/electron/', 'Rocket Lab — Electron'),
      link('https://www.esa.int/Enabling_Support/Space_Transportation/Vega', 'ESA / Avio — Vega-C'),
      link('https://global.jaxa.jp/projects/rockets/h3/', 'JAXA — H3 and H-IIA'),
      link('http://www.cgwic.com/LaunchServices/LaunchVehicle/LM.html', 'CGWIC — Long March user manuals'),
      link('https://www.samspace.ru/products/launch_vehicles/rn_soyuz_2/', 'Roscosmos / RKTs Progress — Soyuz-2'),
      link('https://www.isro.gov.in/PSLV.html', 'ISRO — PSLV'),
      link('https://www1.grc.nasa.gov/beginners-guide-to-aeronautics/rocket-thrust-equation/', 'NASA Glenn — rocket thrust and the ideal rocket equation'),
      link('https://ntrs.nasa.gov/citations/19770009539', 'US Standard Atmosphere 1976 (NASA-TM-X-74335)'),
      link('https://ntrs.nasa.gov/citations/20160002944', 'NASA — flight equations and reference frames'),
      link('https://ntrs.nasa.gov/citations/19980210404', 'NASA — dynamics of variable-mass systems'),
      link('https://celestrak.org/software/vallado-sw.php', 'Vallado — Fundamentals of Astrodynamics and Applications'),
      link('https://threejs.org/', 'three.js'),
    );
    b.append(ul);
    b.append(el('p', 'small', t('dlg.physics.credits')));
  }
}

export interface CameraDialogCallbacks {
  plan: CameraPlan;
  isAuto: () => boolean;
  setAuto: (on: boolean) => void;
  onChange: (phase: FlightPhase, mode: CameraMode) => void;
}

/** Per-phase camera choice plus the "switch automatically" master toggle. */
export class CameraDialog extends Modal {
  private cb: CameraDialogCallbacks;

  constructor(dialog: HTMLDialogElement, cb: CameraDialogCallbacks) {
    super(dialog);
    this.cb = cb;
  }

  applyLanguage(): void {
    super.applyLanguage();
    this.el.setAttribute('aria-label', t('ctl.cameraSequence'));
    const b = this.body;
    b.replaceChildren();
    b.append(el('span', 'eyebrow', t('cam.eyebrow')));
    b.append(el('h2', undefined, t('ctl.cameraSequence')));
    b.append(el('p', 'lead', t('cam.intro')));
    const check = el('label', 'check-label');
    const box = el('input');
    box.type = 'checkbox';
    box.id = 'auto-camera';
    box.checked = this.cb.isAuto();
    box.addEventListener('change', () => this.cb.setAuto(box.checked));
    check.append(box, el('span', undefined, t('ctl.autoCamera')));
    b.append(check);
    const grid = el('div', 'camera-plan');
    for (const phase of FLIGHT_PHASES) {
      const row = el('div', 'camera-plan-row');
      const id = `camera-phase-${phase}`;
      const label = el('label', undefined, t(`cam.phase.${phase}`));
      label.htmlFor = id;
      const sel = el('select');
      sel.id = id;
      for (const mode of CAMERA_MODES) {
        const opt = el('option', undefined, t(`ctl.camera.${mode}`));
        opt.value = mode;
        if (this.cb.plan[phase] === mode) opt.selected = true;
        sel.append(opt);
      }
      sel.addEventListener('change', () => this.cb.onChange(phase, sel.value as CameraMode));
      row.append(label, sel);
      grid.append(row);
    }
    b.append(grid);
  }
}
