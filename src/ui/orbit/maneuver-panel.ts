/**
 * The maneuver planner on the page (roadmap O02): the controls — which
 * maneuver, and its numbers — and the plan they make, burn by burn. The
 * planning itself is src/orbit/maneuvers.ts and src/orbit/maneuver-setup.ts;
 * this only draws them and hands the user's changes back.
 */
import { t } from '../../i18n';
import { R_EARTH, RAD } from '../../physics/constants';
import { norm } from '../../physics/vec3';
import type { AppLevel } from '../app-mode';
import { linearScale, logScale } from '../../orbit/playground-model';
import { hohmannDv, type BurnPoint, type ManualNode, type Plan, type PlanError } from '../../orbit/maneuvers';
import {
  ENGINEER_KINDS, EXPLORE_KINDS, MANEUVER_LIMITS, MAX_NODES, type ManeuverSettings, type PlannerKind,
} from '../../orbit/maneuver-setup';
import { Field, button, clockText, deg, el, num, plain, span } from './dom';

export interface ManeuverPanelHost {
  level(): AppLevel;
  settings(): ManeuverSettings | null;
  /** a kind chosen (its defaults), or none to clear the plan */
  choose(kind: PlannerKind | null): void;
  /** a number changed: plan again */
  change(patch: Partial<ManeuverSettings>): void;
  /** plan again from the time on the clock */
  replanNow(): void;
  /** the plan flown: its final orbit becomes the playground's */
  adopt(): void;
  /** Engineer: show the porkchop plot */
  showPorkchop(): void;
}

const KIND_KEY: Record<PlannerKind, string> = {
  hohmann: 'mv.kind.hohmann', biElliptic: 'mv.kind.biElliptic', planeChange: 'mv.kind.planeChange',
  circularizeApogee: 'mv.kind.circularizeApogee', phasing: 'mv.kind.phasing', deorbit: 'mv.kind.deorbit',
  spiral: 'mv.kind.spiral', manual: 'mv.kind.manual', rendezvous: 'mv.kind.rendezvous',
};
const ABOUT_KEY: Record<PlannerKind, string> = {
  hohmann: 'mv.about.hohmann', biElliptic: 'mv.about.biElliptic', planeChange: 'mv.about.planeChange',
  circularizeApogee: 'mv.about.circularizeApogee', phasing: 'mv.about.phasing', deorbit: 'mv.about.deorbit',
  spiral: 'mv.about.spiral', manual: 'mv.about.manual', rendezvous: 'mv.about.rendezvous',
};
const POINT_KEY: Record<BurnPoint, string> = {
  now: 'mv.point.now', perigee: 'mv.point.perigee', apogee: 'mv.point.apogee', ascendingNode: 'mv.point.ascendingNode',
  descendingNode: 'mv.point.descendingNode', time: 'mv.point.time',
};
const ERROR_KEY: Record<PlanError['error'], string> = {
  notClosed: 'mv.err.notClosed', hitsEarth: 'mv.err.hitsEarth', badTarget: 'mv.err.badTarget',
  notCircular: 'mv.err.notCircular', noNode: 'mv.err.noNode', lambert: 'mv.err.lambert',
};
const NODE_POINTS: readonly BurnPoint[] = ['now', 'perigee', 'apogee', 'ascendingNode', 'descendingNode', 'time'];

export const kindName = (k: PlannerKind): string => t(KIND_KEY[k]);
export const burnPointName = (p: BurnPoint): string => t(POINT_KEY[p]);
export const planErrorText = (e: PlanError): string => t(ERROR_KEY[e.error]);

const alt = { show: (v: number) => v / 1000, read: (n: number) => n * 1000 };
const minutes = { show: (v: number) => v / 60, read: (n: number) => n * 60 };
const mmS2 = { show: (v: number) => v * 1000, read: (n: number) => n / 1000 };

/** The controls: the maneuver chosen and its numbers. */
export function maneuverControls(host: ManeuverPanelHost): HTMLElement {
  const box = el('details', 'pg-tool pg-maneuvers');
  box.open = true;
  box.append(el('summary', undefined, t('mv.title')));
  const s = host.settings();
  const engineer = host.level() === 'engineer';
  const kinds = engineer ? ENGINEER_KINDS : EXPLORE_KINDS;

  const pick = el('label', 'pg-preset');
  pick.append(el('span', undefined, t('mv.kind')));
  const sel = el('select');
  const none = el('option', undefined, t('mv.none'));
  none.value = '';
  sel.append(none, ...kinds.map((k) => { const o = el('option', undefined, kindName(k)); o.value = k; return o; }));
  sel.value = s && kinds.includes(s.kind) ? s.kind : '';
  sel.addEventListener('change', () => host.choose(sel.value ? sel.value as PlannerKind : null));
  pick.append(sel);
  box.append(pick);
  if (!s) return box;
  box.append(el('p', 'pg-tool-lead', t(ABOUT_KEY[s.kind])));

  const fields = el('div', 'pg-fields');
  const set = (patch: Partial<ManeuverSettings>) => host.change(patch);
  const field = (label: string, unit: string, scale: ReturnType<typeof linearScale>, conv: { show: (v: number) => number; read: (n: number) => number },
    digits: number, limits: { min: number; max: number }, value: number, onInput: (v: number) => void): void => {
    const f = new Field(label, unit, scale, conv.show, conv.read, digits, limits, onInput);
    f.set(value);
    fields.append(f.root);
  };
  const L = MANEUVER_LIMITS, km = t('u.km');
  const altitude = (label: string, value: number, key: 'targetAlt' | 'farAlt') =>
    field(label, km, logScale(L.altitude.min, L.altitude.max), alt, 0, L.altitude, value, (v) => set({ [key]: v }));
  const inclination = (value: number) =>
    field(t('mv.targetI'), '°', linearScale(0, Math.PI), deg, engineer ? 2 : 1, { min: 0, max: Math.PI }, value, (v) => set({ targetI: v }));
  switch (s.kind) {
    case 'hohmann': altitude(t('mv.targetAlt'), s.targetAlt, 'targetAlt'); break;
    case 'biElliptic':
      altitude(t('mv.farAlt'), s.farAlt, 'farAlt');
      altitude(t('mv.targetAlt'), s.targetAlt, 'targetAlt');
      break;
    case 'planeChange': inclination(s.targetI); break;
    case 'circularizeApogee':
      field(t('mv.parts'), '', linearScale(L.parts.min, L.parts.max), plain, 0, L.parts, s.parts, (v) => set({ parts: Math.round(v) }));
      break;
    case 'phasing':
      field(t('mv.phase'), '°', linearScale(L.phase.min, L.phase.max), deg, 1, L.phase, s.phase, (v) => set({ phase: v }));
      field(t('mv.revs'), '', linearScale(L.revs.min, L.revs.max), plain, 0, L.revs, s.revs, (v) => set({ revs: Math.round(v) }));
      break;
    case 'deorbit':
      field(t('mv.perigeeAlt'), km, linearScale(L.perigee.min, L.perigee.max), alt, 0, L.perigee, s.perigeeAlt, (v) => set({ perigeeAlt: v }));
      break;
    case 'spiral':
      altitude(t('mv.targetAlt'), s.targetAlt, 'targetAlt');
      inclination(s.targetI);
      field(t('mv.accel'), t('mv.unit.mms2'), logScale(L.accel.min, L.accel.max), mmS2, 3, L.accel, s.accel, (v) => set({ accel: v }));
      break;
    case 'manual': box.append(fields, manualNodes(host, s, engineer)); break;
    case 'rendezvous': {
      altitude(t('mv.target'), s.targetAlt, 'targetAlt');
      field(t('mv.targetPhase'), '°', linearScale(L.phase.min, L.phase.max), deg, 1, L.phase, s.targetPhase, (v) => set({ targetPhase: v }));
      const tmin = t('u.min');
      field(t('mv.dep'), tmin, linearScale(0, 86400), minutes, 1, { min: 0, max: 30 * 86400 }, s.dep, (v) => set({ dep: v }));
      field(t('mv.tof'), tmin, linearScale(60, 86400), minutes, 1, { min: 60, max: 30 * 86400 }, s.tof, (v) => set({ tof: v }));
      break;
    }
  }
  if (s.kind !== 'manual') box.append(fields);
  if (s.kind === 'rendezvous') {
    box.append(button('watch-btn pg-porkchop-btn', t('mv.pickPorkchop'), () => host.showPorkchop()), el('p', 'pg-tool-lead', t('pc.hint')));
  }
  return box;
}

/** Your own burns: up to five, each at a point of the orbit and in the orbit's axes. */
function manualNodes(host: ManeuverPanelHost, s: ManeuverSettings, engineer: boolean): HTMLElement {
  const list = el('ol', 'pg-nodes');
  const L = MANEUVER_LIMITS, ms = t('u.ms');
  // read the burns as they are now, not as they were drawn: several fields change one list
  const update = (k: number, patch: { point?: BurnPoint; after?: number; vnb?: Partial<ManualNode['vnb']> }) => {
    const now = host.settings()?.nodes ?? s.nodes;
    const nodes = now.map((n, j) => (j === k ? { ...n, ...patch, vnb: { ...n.vnb, ...(patch.vnb ?? {}) } } : n));
    host.change({ nodes });
  };
  s.nodes.forEach((node, k) => {
    const li = el('li', 'pg-node');
    const head = el('div', 'pg-node-head');
    head.append(el('strong', undefined, String(k + 1)));
    const when = el('select');
    when.setAttribute('aria-label', t('mv.node.when'));
    when.append(...NODE_POINTS.map((p) => { const o = el('option', undefined, burnPointName(p)); o.value = p; return o; }));
    when.value = node.point;
    when.addEventListener('change', () => update(k, { point: when.value as BurnPoint }));
    head.append(when);
    if (s.nodes.length > 1) {
      const rm = button('pg-node-remove', '×', () => host.change({ nodes: (host.settings()?.nodes ?? s.nodes).filter((_, j) => j !== k) }));
      rm.title = t('mv.node.remove');
      rm.setAttribute('aria-label', t('mv.node.remove'));
      head.append(rm);
    }
    li.append(head);
    const fields = el('div', 'pg-fields');
    if (node.point === 'time') {
      const f = new Field(t('mv.node.after'), t('u.min'), linearScale(0, 1440 * 60), minutes.show, minutes.read, 1, L.after, (v) => update(k, { after: v }));
      f.set(node.after ?? 0);
      fields.append(f.root);
    }
    const axis = (label: string, key: 'prograde' | 'normal' | 'radial') => {
      const range = engineer ? L.burn : { min: -2000, max: 2000 };
      const f = new Field(label, ms, linearScale(range.min, range.max), plain.show, plain.read, 1, L.burn, (v) => update(k, { vnb: { [key]: v } }));
      f.set(node.vnb[key]);
      fields.append(f.root);
    };
    axis(t('mv.prograde'), 'prograde');
    axis(t('mv.normal'), 'normal');
    axis(t('mv.radial'), 'radial');
    li.append(fields);
    list.append(li);
  });
  const wrap = el('div');
  wrap.append(list);
  if (s.nodes.length < MAX_NODES) {
    wrap.append(button('watch-btn', t('mv.node.add'), () =>
      host.change({ nodes: [...(host.settings()?.nodes ?? s.nodes), { point: 'apogee', vnb: { prograde: 50, normal: 0, radial: 0 } }] })));
  }
  return wrap;
}

/** The plan: its burns, what they add up to, and where it ends. `now` is the clock, for "next burn in". */
export function planTable(host: ManeuverPanelHost, plan: Plan | PlanError, s: ManeuverSettings, now: number): HTMLElement {
  const box = el('section', 'pg-plan');
  box.append(el('h2', 'pg-facts-title', t('mv.planOf', { kind: kindName(s.kind) })));
  if (!('burns' in plan)) {
    box.append(el('p', 'pg-warn', planErrorText(plan)));
    box.append(actions(host, false));
    return box;
  }
  const engineer = host.level() === 'engineer';
  const kms = t('u.kms'), ms = t('u.ms');
  if (plan.burns.length) {
    const list = el('ol', 'pg-burns');
    plan.burns.forEach((b, k) => {
      const li = el('li');
      if (b.t <= now) li.classList.add('done');
      li.append(el('strong', 'pg-burn-n', String(k + 1)));
      const what = el('span', 'pg-burn-what');
      what.append(el('span', undefined, `${burnPointName(b.point)} · T+ ${clockText(b.t)}`));
      if (engineer) {
        what.append(el('small', undefined, t('mv.vnb', {
          p: num(b.vnb.prograde, 1), n: num(b.vnb.normal, 1), r: num(b.vnb.radial, 1), u: ms,
        })));
      }
      li.append(what, el('b', 'pg-burn-dv', `${num(norm(b.dv) / 1000, 3)} ${kms}`));
      list.append(li);
    });
    box.append(list);
  }
  const dl = el('dl', 'pg-dl');
  const row = (k: string, v: string) => dl.append(el('dt', undefined, k), el('dd', undefined, v));
  row(t('mv.total'), `${num(plan.totalDv / 1000, 3)} ${kms}`);
  const first = plan.burns[0]?.t ?? plan.spiral?.t0 ?? 0;
  if (plan.arrival > first) row(plan.spiral ? t('mv.thrust') : t('mv.duration'), span(plan.arrival - first));
  const f = plan.final;
  if (f.e < 1) {
    row(t('mv.final'), t('mv.finalValue', {
      pe: num((f.a * (1 - f.e) - R_EARTH) / 1000), ap: num((f.a * (1 + f.e) - R_EARTH) / 1000), i: num(f.i * RAD, engineer ? 2 : 1), u: t('u.km'),
    }));
  } else row(t('mv.final'), t('mv.escape'));
  if (plan.entry !== undefined) row(t('mv.entry'), t('mv.entryValue', { time: span(plan.entry - (plan.burns[0]?.t ?? 0)) }));
  if (s.kind === 'biElliptic') {
    const r1 = plan.segments[0].orbit.a;
    row(t('mv.hohmannCompare'), `${num(hohmannDv(r1, R_EARTH + s.targetAlt).total / 1000, 3)} ${kms}`);
  }
  box.append(dl);
  const next = plan.burns.find((b) => b.t > now);
  const note = el('p', 'pg-note pg-plan-next');
  note.textContent = next ? t('mv.next', { time: span(next.t - now) }) : plan.arrival <= now ? t('mv.done') : '';
  box.append(note, actions(host, plan.arrival <= now || plan.burns.length > 0));
  return box;
}

function actions(host: ManeuverPanelHost, canAdopt: boolean): HTMLElement {
  const row = el('div', 'pg-actions');
  row.append(button('watch-btn', t('mv.fromNow'), () => host.replanNow()));
  if (canAdopt) row.append(button('watch-btn', t('mv.adopt'), () => host.adopt()));
  row.append(button('watch-btn link', t('mv.clear'), () => host.choose(null)));
  return row;
}
