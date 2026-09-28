/**
 * A part's catalogue card (the Build section): what a clicked stage,
 * strap-on group, fairing or interstage is — its engines with their thrust
 * and Isp at sea level and in vacuum, what they burn, the body's masses and
 * size, and where the figures come from, as links. The thin DOM part of
 * src/design/part-card.ts, which also holds the rules for what is left out
 * (a vacuum engine's placeholder sea-level figures) and what is flagged (a
 * solid's mean thrust, a lumped entry, figures the data never cited).
 *
 * Engine and part names are data — proper names — and are shown as the data
 * writes them; a stage's name is shown in the interface language where the
 * dictionaries have it (src/ui/names.ts).
 */
import { t } from '../../i18n';
import type { VehicleSpec } from '../../types';
import type { PropellantFamily } from '../../physics/rigid/vehicle-data';
import { linkText, type BodyCard, type EngineCard, type PartCard, type Sources } from '../../design/part-card';
import { stageName } from '../names';
import { el, num } from '../orbit/dom';
import { mass } from './figures';

const FAMILY_KEY: Record<PropellantFamily, string> = {
  kerolox: 'build.family.kerolox',
  hydrolox: 'build.family.hydrolox',
  methalox: 'build.family.methalox',
  hypergolic: 'build.family.hypergolic',
  solid: 'build.family.solid',
};

const metres = (v: number): string => `${num(v, v < 10 && v % 1 ? 2 : v % 1 ? 1 : 0)} ${t('u.m')}`;
const kN = (n: number): string => `${num(n / 1000, n < 100_000 ? 1 : 0)} ${t('u.kN')}`;
const isp = (s: number): string => `${num(s, s % 1 ? 1 : 0)} ${t('u.s')}`;

function dl(rows: readonly (readonly [string, string] | null)[]): HTMLDListElement {
  const out = el('dl', 'pg-dl bs-dl');
  for (const row of rows) if (row) out.append(el('dt', undefined, row[0]), el('dd', undefined, row[1]));
  return out;
}

function note(text: string, cls = ''): HTMLElement {
  return el('p', `bs-note${cls ? ` ${cls}` : ''}`, text);
}

/** A catalogue source, as links and as the references that are not links (quoted as the data records them). */
function sources(label: string, s: Sources | null): HTMLElement | null {
  if (!s) return null;
  const box = el('div', 'bs-sources');
  box.append(el('span', 'bs-sources-what', label));
  const list = el('ul');
  for (const item of s.items) {
    const li = el('li');
    if (item.kind === 'link') {
      const a = el('a', undefined, linkText(item.url));
      a.href = item.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      li.append(a);
    } else {
      const q = el('q', undefined, item.text);
      q.lang = 'en';
      li.append(q);
    }
    list.append(li);
  }
  if (s.uncited !== 'none') list.append(el('li', 'bs-uncited', t(s.uncited === 'all' ? 'build.card.uncited' : 'build.card.partlyUncited')));
  box.append(list);
  return box;
}

function engineSection(e: EngineCard): HTMLElement {
  const box = el('section', 'bs-card-sec');
  box.append(el('h3', undefined, t('build.card.engine')));
  box.append(dl([
    [t('build.card.engineName'), e.name],
    [t('build.card.engineCount'), num(e.count)],
    e.thrustSL !== null ? [t('build.card.thrustSL'), kN(e.thrustSL)] : null,
    [t('build.card.thrustVac'), kN(e.thrustVac)],
    e.ispSL !== null ? [t('build.card.ispSL'), isp(e.ispSL)] : null,
    [t('build.card.ispVac'), isp(e.ispVac)],
    e.minThrottle !== null ? [t('build.card.throttle'), `${num(e.minThrottle * 100)} %`] : null,
    e.family ? [t('build.card.family'), t(FAMILY_KEY[e.family])] : null,
    e.dryMass !== null ? [t('build.card.engineMass'), mass(e.dryMass)] : null,
  ]));
  if (e.vacuumOnly) box.append(note(t('build.card.vacuumOnly')));
  if (e.solid && e.peakFactor !== null) box.append(note(t('build.card.solid', { f: num(e.peakFactor, 2) })));
  if (e.kind === 'lumped') box.append(note(t('build.card.lumped'), 'warn'));
  if (e.kind === 'cluster') box.append(note(t('build.card.cluster')));
  if (e.historical) box.append(note(t('build.card.historical')));
  return box;
}

function bodySection(b: BodyCard, heading: string, units: number | null): HTMLElement {
  const box = el('section', 'bs-card-sec');
  box.append(el('h3', undefined, heading));
  box.append(dl([
    units !== null ? [t('build.card.units'), num(units)] : null,
    [t('build.card.dryMass'), mass(b.dryMass)],
    [t('build.card.propellant'), mass(b.propellantMass)],
    [t('build.card.diameter'), metres(b.diameter)],
    [t('build.card.length'), metres(b.length)],
    [t('build.fig.eps'), num(b.structuralRatio, 3)],
    [t('build.fig.prop'), num(b.propellantFraction, 3)],
  ]));
  return box;
}

/** The card's head: what the part is, its name, the catalogue part it is. */
function head(role: string, title: string, partId: string | null, catalogue: boolean): HTMLElement {
  const h = el('header', 'bs-card-head');
  const eyebrow = el('span', 'eyebrow bs-card-role', role);
  if (catalogue) {
    eyebrow.append(' · ');
    if (partId) {
      const code = el('code', undefined, partId);
      eyebrow.append(t('build.card.part'), ' ', code);
    } else eyebrow.append(t('build.card.own'));
  }
  const h2 = el('h2', 'bs-card-title', title);
  h2.id = 'bs-card-title';
  h.append(eyebrow, h2);
  return h;
}

/** The card of `card` on `spec`. */
export function partCardView(spec: VehicleSpec, card: PartCard): HTMLElement {
  const box = el('div', 'bs-card-body');
  if (card.kind === 'stage' || card.kind === 'booster') {
    const st = spec.stages[card.stageIndex];
    const hw = card.kind === 'stage' ? st : st.boosters![card.group];
    const role = card.kind === 'stage' ? t('build.label.stage', { n: card.stageIndex + 1 }) : t('build.label.boosters', { n: card.units });
    box.append(head(role, stageName(spec, hw.id, hw.name), card.body.partId, true));
    box.append(engineSection(card.engine));
    box.append(bodySection(card.body, t(card.kind === 'stage' ? 'build.card.stage' : 'build.card.strapOn'), card.kind === 'booster' ? card.units : null));
    const src = el('section', 'bs-card-sec');
    src.append(el('h3', undefined, t('build.card.sources')));
    const eng = sources(`${t('build.card.engineName')} · ${card.engine.name}`, card.engine.sources);
    const body = sources(t(card.kind === 'stage' ? 'build.card.stage' : 'build.card.strapOn'), card.body.sources);
    if (eng) src.append(eng);
    if (body) src.append(body);
    if (eng || body) box.append(src);
  } else if (card.kind === 'fairing') {
    box.append(head(t('build.label.fairing'), t('build.card.fairing'), card.partId, true));
    const sec = el('section', 'bs-card-sec');
    sec.append(dl([
      [t('build.card.mass'), mass(card.mass)],
      [t('build.card.diameter'), metres(card.diameter)],
      [t('build.card.length'), metres(card.length)],
      card.adapter !== null ? [t('build.card.adapter'), metres(card.adapter)] : null,
      [t('build.card.sepAltitude'), `${num(card.sepAltitude / 1000)} ${t('u.km')}`],
      card.sepTime !== null ? [t('build.card.sepTime'), t('build.card.sepTimeValue', { t: num(card.sepTime) })] : null,
    ]));
    box.append(sec);
    const src = sources(t('build.card.sources'), card.sources);
    if (src) box.append(src);
  } else {
    box.append(head(t('build.label.interstage'), t('build.card.interstageOn', { n: card.stageIndex + 1 }), null, false));
    const sec = el('section', 'bs-card-sec');
    sec.append(dl([
      [t('build.card.lower'), metres(card.lowerDiameter)],
      [t('build.card.upper'), metres(card.upperDiameter)],
      [t('build.card.height'), metres(card.height)],
    ]), note(t('build.card.interstageText')));
    box.append(sec);
  }
  if (card.kind !== 'interstage') box.append(note(t('build.card.estimate'), 'est'));
  return box;
}
