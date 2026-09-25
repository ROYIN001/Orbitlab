/**
 * The Frames menu by the camera buttons (roadmap E01): which reference frames
 * the 3-D view draws (src/render/frames.ts). Every frame is off until chosen;
 * the choice is remembered for the next visit.
 */
import { t } from '../i18n';
import { getNotation, symbolText, SYMBOLS, type Notation, type NotationSymbol } from './notation';
import { FRAME_COLORS, FRAME_GROUPS, type FrameGroup, type FrameSymbols } from '../render/frames';
import type { FrameAngle } from '../physics/reference-frames';

export const FRAMES_STORAGE_KEY = 'orbitlab.frames';

const GROUP_LABEL: Record<FrameGroup, string> = {
  body: 'frames.body', earth: 'frames.earth', orbital: 'frames.orbital', inertial: 'frames.inertial',
};
const GROUP_COLORS: Record<FrameGroup, number[]> = {
  body: [FRAME_COLORS.body, FRAME_COLORS.airPath],
  earth: [FRAME_COLORS.normalEarth, FRAME_COLORS.flightPath],
  orbital: [FRAME_COLORS.orbital],
  inertial: [FRAME_COLORS.eci, FRAME_COLORS.ecef],
};

/**
 * The Greenwich sidereal angle between ECI and ECEF. Not a quantity of either
 * flight-dynamics standard: θ_G as astrodynamics writes it, S as Russian
 * astronomy does (гринвичское звёздное время).
 */
const SIDEREAL: Record<Notation, NotationSymbol> = { iso: { base: 'θ', sub: 'G' }, gost: { base: 'S' } };
const ANGLE_QUANTITY = {
  alpha: 'alpha', beta: 'beta', pitch: 'pitchAngle', yaw: 'yawAngle', roll: 'rollAngle', path: 'pathAngle', track: 'trackAngle',
} as const satisfies Record<FrameAngle, keyof typeof SYMBOLS>;

/** The symbols the 3-D view writes, in the notation in force. */
export const frameSymbols: FrameSymbols = {
  axis: (axis, sub) => {
    const base = SYMBOLS[axis === 'x' ? 'axisX' : axis === 'y' ? 'axisY' : 'axisZ'][getNotation()].base;
    return sub ? { base, sub } : { base };
  },
  angle: (angle) => (angle === 'sidereal' ? SIDEREAL[getNotation()] : SYMBOLS[ANGLE_QUANTITY[angle]][getNotation()]),
};

/** The symbols each group's angles are written with, as a hint beside its name. */
function groupSymbols(group: FrameGroup, n: Notation): string {
  const angles: Record<FrameGroup, (FrameAngle | 'sidereal')[]> = {
    body: ['alpha', 'beta'], earth: ['pitch', 'yaw', 'roll', 'path', 'track'], orbital: [], inertial: ['sidereal'],
  };
  return angles[group].map((a) => (a === 'sidereal' ? SIDEREAL[n].base + (SIDEREAL[n].sub ?? '') : symbolText(ANGLE_QUANTITY[a], n))).join(' ');
}

export function loadFrameGroups(store?: Pick<Storage, 'getItem'>): FrameGroup[] {
  try {
    const raw = (store ?? localStorage).getItem(FRAMES_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) as unknown : [];
    return Array.isArray(list) ? FRAME_GROUPS.filter((g) => list.includes(g)) : [];
  } catch { return []; }
}

export class FramesMenu {
  private readonly menu: HTMLDivElement;
  private readonly inputs = new Map<FrameGroup, HTMLInputElement>();
  private readonly hints = new Map<FrameGroup, HTMLElement>();
  private readonly names = new Map<FrameGroup, HTMLElement>();
  private readonly title: HTMLElement;
  private readonly note: HTMLElement;
  private shown: Set<FrameGroup>;

  constructor(private readonly button: HTMLButtonElement, private readonly onChange: (shown: FrameGroup[]) => void) {
    this.shown = new Set(loadFrameGroups());
    this.menu = document.createElement('div');
    this.menu.className = 'frames-menu';
    this.menu.id = 'frames-menu';
    this.menu.hidden = true;
    this.menu.setAttribute('role', 'group');
    this.title = document.createElement('div');
    this.title.className = 'frames-menu-title';
    this.title.id = 'frames-menu-title';
    this.menu.setAttribute('aria-labelledby', this.title.id);
    this.menu.append(this.title);
    for (const group of FRAME_GROUPS) {
      const row = document.createElement('label');
      row.className = 'frames-menu-row';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = this.shown.has(group);
      input.addEventListener('change', () => this.toggle(group, input.checked));
      const swatch = document.createElement('span');
      swatch.className = 'frames-swatch';
      swatch.setAttribute('aria-hidden', 'true');
      for (const c of GROUP_COLORS[group]) {
        const dot = document.createElement('i');
        dot.style.background = `#${c.toString(16).padStart(6, '0')}`;
        swatch.append(dot);
      }
      const name = document.createElement('span');
      name.className = 'frames-name';
      const hint = document.createElement('span');
      hint.className = 'frames-symbols';
      row.append(input, swatch, name, hint);
      this.menu.append(row);
      this.inputs.set(group, input);
      this.names.set(group, name);
      this.hints.set(group, hint);
    }
    this.note = document.createElement('p');
    this.note.className = 'frames-menu-note';
    this.menu.append(this.note);
    button.after(this.menu);
    button.setAttribute('aria-haspopup', 'true');
    button.setAttribute('aria-controls', this.menu.id);
    button.addEventListener('click', () => this.setOpen(!!this.menu.hidden));
    document.addEventListener('pointerdown', (e) => {
      if (this.menu.hidden) return;
      const target = e.target as Node;
      if (!this.menu.contains(target) && !button.contains(target)) this.setOpen(false);
    });
    this.menu.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { this.setOpen(false); button.focus(); }
    });
    this.applyLanguage();
    this.reflect();
  }

  get groups(): FrameGroup[] { return FRAME_GROUPS.filter((g) => this.shown.has(g)); }

  /** Relabel for the language and the notation in force. */
  applyLanguage(): void {
    const n = getNotation();
    this.title.textContent = t('ctl.frames');
    this.note.textContent = t('frames.note');
    for (const group of FRAME_GROUPS) {
      this.names.get(group)!.textContent = t(GROUP_LABEL[group]);
      this.hints.get(group)!.textContent = groupSymbols(group, n);
    }
  }

  private setOpen(open: boolean): void {
    this.menu.hidden = !open;
    this.button.setAttribute('aria-expanded', String(open));
    if (open) this.inputs.get(FRAME_GROUPS[0])!.focus();
  }

  private toggle(group: FrameGroup, on: boolean): void {
    if (on) this.shown.add(group); else this.shown.delete(group);
    try { localStorage.setItem(FRAMES_STORAGE_KEY, JSON.stringify(this.groups)); } catch { /* the choice is optional */ }
    this.reflect();
    this.onChange(this.groups);
  }

  /** The button reads pressed while any frame is drawn. */
  private reflect(): void {
    const any = this.shown.size > 0;
    this.button.setAttribute('aria-pressed', String(any));
    this.button.classList.toggle('active', any);
  }
}
