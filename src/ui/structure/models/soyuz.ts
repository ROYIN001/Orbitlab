/**
 * Soyuz-2.1b / Fregat / ST31 for the Structure section's screens
 * (`ModelAdapter`): the owner's Anatomy page as the files of
 * public/structure/ carry it (src/structure/soyuz-content.ts), with its own
 * Thai — the components' texts, the groups' names, the circuits and their
 * steps, the flight sequence — shown as the page has it, and this section's
 * words only where the page has none (the assemblies' short cards for a
 * first look, the places' names, the reasons of the assembly's order).
 */
import { fetchStructureJson, fetchStructureLayer } from '../../../render/structure-mesh';
import type { ViewerMesh } from '../../../render/structure-viewer';
import { REST, TIER_OF_DEPTH, partnerOf, relationsOf, ruleFor, type ModelRelation, type ModelTree, type Turn } from '../../../structure/model';
import {
  FLIGHT_EVENT_UNITS, SOYUZ_ASSEMBLY, SOYUZ_BOOSTERS, SOYUZ_COMPONENT, SOYUZ_FAIRING, SOYUZ_MOUNTS, SOYUZ_ORDER, SOYUZ_RELATIONS, SOYUZ_UNITS,
  isSoyuzUnit, soyuzFactCertainty, type SoyuzUnit,
} from '../../../structure/soyuz';
import {
  SOYUZ_FILES, SOYUZ_LAYERS, circuitParts, cutawayAzimuth, indexSoyuz, jointParts, parseSoyuzContent, soyuzTree, unitAxis,
  type SoyuzIndex, type SoyuzLayer,
} from '../../../structure/soyuz-content';
import { CERTAINTIES, PART_CATEGORIES, type Certainty, type Depth, type PartCategory } from '../../../structure/types';
import type { StructureEnv } from '../env';
import { hasText, num, tx } from '../text';
import type { FlightState, InfoBlock, InfoDoc, InfoSource, ModelAdapter, ModelGuide, ModelSystem, PictureSetup } from './types';

/** Thrown when the content and a layer come from two versions of the page or two revisions of the files (said in the interface language). */
export const FILES_MISMATCH = 'structure:files-mismatch';

/** How a unit lies as it is picked up: quarter turns from the reference, so its way round has to be set right. */
const TRAY_TURN: Readonly<Record<string, number>> = { 'booster-b': 2, 'booster-v': 1, 'booster-g': 3, 'booster-d': 2, fregat: 1 };

/** What flows in a circuit, by the page's words for it: the colour its parts are painted, and the text key of its name. */
const MEDIA: Readonly<Record<string, string>> = {
  kerosene: '#e8a54a', oxygen: '#6ec8ff', nitrogen: '#9db4c8', 'hydrogen-peroxide': '#c792ea', helium: '#f2e394',
  'peroxide-decomposition-gas': '#e88fb2', 'oxygen-rich-gas': '#8fe0d0', N2O4: '#ff8f6b', UDMH: '#b7e07a',
};

/** The engine a circuit belongs to, from its id: the heading it is listed under. */
const ENGINE_OF = (circuitId: string): string => (circuitId.startsWith('rd107108') ? 'rd107108' : circuitId.startsWith('rd0124') ? 'rd0124' : 'fregat');

const local = (id: string): string => id.slice(id.indexOf('.') + 1);
/** Where a strap-on stands round the axis, rad: the angle that turns +x onto it about +y. */
const azimuth = (x: number, z: number): number => Math.atan2(-z, x);

export function soyuzAdapter(env: StructureEnv): ModelAdapter {
  let index: SoyuzIndex | null = null;
  let tree: ModelTree | null = null;
  const axes = new Map<string, [number, number]>();
  /** each unit's box from its parts' centres (the picture's own boxes are the viewer's; these place markers and previews) */
  const centres = new Map<string, [number, number, number]>();
  let systemList: ModelSystem[] | null = null;

  const need = (): SoyuzIndex => {
    if (!index) throw new Error('the Soyuz model is not loaded');
    return index;
  };
  const unitName = (unit: string): string => tx(`soyuz.unit.${unit}`);
  const groupLabel = (key: string): string => {
    const g = need().groups.find((x) => x.key === key);
    return g?.group ? g.group.label : tx('list.other');
  };
  const sourcesOf = (ids: readonly string[]): InfoSource[] => ids.flatMap((id) => {
    const s = need().content.sources.find((x) => x.id === id);
    return s ? [{ title: s.title, url: s.url, note: s.supports, scope: s.scope }] : [];
  });

  const name = (id: string): string => {
    const n = tree?.nodes.get(id);
    if (!n) return id;
    if (n.tier === 1) return unitName(id);
    if (n.tier === 2) return groupLabel(id);
    return local(id);
  };

  /** The circuits a set of parts lies on, each with the step most of them are (when they are of one). */
  const systemsThrough = (items: readonly number[]): { id: string; label: string; step?: string }[] => {
    const c = need().content;
    const count = new Map<string, Map<number, number>>();
    for (const i of items) {
      const p = c.items[i];
      for (const id of p.circuits ?? []) {
        const steps = count.get(id) ?? new Map<number, number>();
        for (const s of p.steps ?? []) if (c.circuitSteps[s].startsWith(`${id}/`)) steps.set(s, (steps.get(s) ?? 0) + 1);
        count.set(id, steps);
      }
    }
    return c.circuits.filter((x) => count.has(x.id)).map((x) => {
      const steps = [...count.get(x.id)!].sort((a, b) => b[1] - a[1]);
      const only = steps.length === 1 ? x.steps.find((s) => s.id === c.circuitSteps[steps[0][0]]) : undefined;
      return { id: x.id, label: x.label, ...(only ? { step: only.label } : {}) };
    });
  };

  // ─── words ────────────────────────────────────────────────────────────────

  function introDoc(depth: Depth): InfoDoc {
    const g = need().content.guide;
    const blocks: InfoBlock[] = [
      { kind: 'text', text: g.intro, tone: 'lead' },
      { kind: 'text', text: tx('soyuz.st31'), tone: 'note' },
      { kind: 'facts', rows: [
        { label: tx('soyuz.fact.core'), value: `${num(Number(g.geometryReference.coreMaximumDiameterM), 2)} ${tx('unit.m')}`, certainty: 'documented' },
        { label: tx('soyuz.fact.stage3'), value: `${num(Number(g.geometryReference.thirdStageDiameterM), 2)} ${tx('unit.m')}`, certainty: 'documented' },
        { label: tx('soyuz.fact.fairing'), value: `${num(Number(g.geometryReference.fairingDiameterM), 2)} × ${num(Number(g.geometryReference.fairingLengthM), 2)} ${tx('unit.m')}`, certainty: 'documented' },
        ...g.summaryStats.filter((s) => !/m$/.test(s.value)).map((s) => ({ label: s.label, value: s.value, certainty: 'documented' as Certainty })),
      ] },
      { kind: 'text', text: g.statusNote, tone: 'small' },
      { kind: 'text', text: tx('soyuz.terms'), tone: 'small' },
    ];
    if (depth !== 'watch') blocks.push({ kind: 'heading', text: tx('info.notes') }, { kind: 'list', items: g.engineeringNotes.slice(1) });
    if (depth === 'engineer') {
      blocks.push({ kind: 'heading', text: tx('info.note') }, { kind: 'list', items: g.reviewWarnings }, { kind: 'text', text: tx('cert.legend'), tone: 'small' });
    }
    return { title: tx('model.soyuz-st31'), subtitle: g.configuration, path: [], blocks };
  }

  function relationBlocks(unit: string): InfoBlock[] {
    const rows = relationsOf(SOYUZ_RELATIONS, unit).map((r) => {
      const other = partnerOf(r, unit);
      const rule = ruleFor(SOYUZ_ORDER, r.a, r.b);
      return { relation: r.id, other, text: tx(`soyuz.joint.${r.joint}`), ...(rule && r.a === unit ? { why: tx(rule.why) } : {}), hasJoint: jointParts(need(), r).at !== null };
    });
    return rows.length ? [{ kind: 'heading', text: tx('info.relations') }, { kind: 'relations', rows }] : [];
  }

  function unitDoc(unit: SoyuzUnit, depth: Depth): InfoDoc {
    const s = need();
    const comp = s.units[unit].component;
    const card = SOYUZ_COMPONENT[unit].replace(/^booster-.$/, 'booster');
    const blocks: InfoBlock[] = [];
    if (depth === 'watch') {
      // a first look: what it is and where it sits, then what it does, in plain words (this section's own)
      blocks.push({ kind: 'text', text: tx(`soyuz.card.${card}.what`), tone: 'lead' }, { kind: 'heading', text: tx('info.function') }, { kind: 'text', text: tx(`soyuz.card.${card}.does`) });
    } else if (comp) {
      const paragraphs = comp.body.split('\n\n').filter(Boolean);
      blocks.push({ kind: 'text', text: paragraphs[0] ?? '', tone: 'lead' });
      for (const p of paragraphs.slice(1)) blocks.push({ kind: 'text', text: p });
    }
    blocks.push(...relationBlocks(unit));
    if (depth !== 'watch' && comp) {
      blocks.push({ kind: 'heading', text: tx('info.facts') }, {
        kind: 'facts', rows: comp.facts.map((f) => ({ label: f.label, value: f.value, certainty: soyuzFactCertainty(comp.id, f.label) })),
      });
      // the page's own things to look for; those that name the page's own buttons are left out (this view has other ones)
      const seen = comp.observations.filter((o) => !/เลือกมุม|“|”/.test(o));
      if (seen.length) blocks.push({ kind: 'heading', text: tx('info.observe') }, { kind: 'list', items: seen });
      const through = systemsThrough(s.units[unit].items);
      if (through.length) blocks.push({ kind: 'heading', text: tx('info.systems') }, { kind: 'systems', rows: through.map(({ id, label }) => ({ id, label })) });
    }
    if (depth === 'engineer' && comp) {
      blocks.push({ kind: 'facts', rows: [
        { label: tx('info.partsCount'), value: tx('list.parts', { n: s.units[unit].items.length }) },
        { label: tx('info.pageName'), value: `${comp.title} · ${comp.subtitle}` },
      ] });
      blocks.push({ kind: 'heading', text: tx('info.note') }, { kind: 'text', text: comp.note, tone: 'small' });
      blocks.push({ kind: 'heading', text: tx('info.sources') }, { kind: 'sources', rows: sourcesOf(comp.sourceIds) }, { kind: 'text', text: tx('cert.legend'), tone: 'small' });
    }
    return { title: unitName(unit), subtitle: tx(`soyuz.sub.${card}`), path: [], blocks };
  }

  /**
   * What a group of the page's is, in a sentence of this section's own: the
   * page names its groups but does not describe them. The page uses one id
   * for different things in the lower blocks and the upper stages (a
   * booster's `tanks`, Fregat's `tanks`), so the sentence is looked up for
   * the assembly first, then for its family.
   */
  function groupText(unit: SoyuzUnit, id: string): string {
    const card = SOYUZ_COMPONENT[unit].replace(/^booster-.$/, 'booster');
    const family = card === 'booster' || card === 'core' || card === 'interstage' ? 'lower' : 'upper';
    for (const key of [`soyuz.group.${card}.${id}`, `soyuz.group.${family}.${id}`]) if (hasText(key)) return tx(key);
    return tx('soyuz.group.other');
  }

  function groupDoc(key: string, depth: Depth): InfoDoc {
    const s = need();
    const g = s.groups.find((x) => x.key === key)!;
    const node = tree!.nodes.get(key)!;
    const blocks: InfoBlock[] = [];
    blocks.push({ kind: 'text', text: g.group ? groupText(g.unit, g.group.id) : tx('soyuz.group.other'), tone: 'lead' });
    const through = systemsThrough(node.items);
    if (through.length) blocks.push({ kind: 'heading', text: tx('info.systems') }, { kind: 'systems', rows: through });
    const byCat = new Map<PartCategory, number>(), byCert = new Map<Certainty, number>();
    for (const i of node.items) {
      const c = PART_CATEGORIES[s.category[i]], k = CERTAINTIES[s.certainty[i]];
      byCat.set(c, (byCat.get(c) ?? 0) + 1);
      byCert.set(k, (byCert.get(k) ?? 0) + 1);
    }
    blocks.push({ kind: 'heading', text: tx('info.madeOf') }, {
      kind: 'kinds',
      categories: [...byCat].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
      certainties: [...byCert].map(([certainty, count]) => ({ certainty, count })),
    });
    const rows = [{ label: tx('info.partsCount'), value: tx('list.parts', { n: node.items.length }) }];
    if (g.group) rows.push({ label: tx('info.count'), value: `${g.group.count} ${g.group.unit}` });
    blocks.push({ kind: 'facts', rows });
    const comp = s.units[g.unit].component;
    if (depth === 'engineer' && comp) {
      blocks.push({ kind: 'heading', text: tx('info.note') }, { kind: 'text', text: comp.note, tone: 'small' }, { kind: 'heading', text: tx('info.sources') }, { kind: 'sources', rows: sourcesOf(comp.sourceIds) });
    }
    blocks.push({ kind: 'text', text: tx('cert.byPilot'), tone: 'small' });
    return { title: g.group ? g.group.label : tx('list.other'), subtitle: tx('info.groupOf', { unit: unitName(g.unit) }), path: [g.unit], blocks };
  }

  function partDoc(i: number): InfoDoc {
    const s = need(), c = s.content, p = c.items[i];
    const key = s.groups[s.groupOf[i]].key;
    const blocks: InfoBlock[] = [];
    const medium = p.medium ? `${tx(`medium.${p.medium}`)} (${tx(`phase.${p.phase ?? 'liquid'}`)})` : null;
    blocks.push({ kind: 'facts', rows: [
      { label: tx('info.kind'), value: tx(`cat.${PART_CATEGORIES[s.category[i]]}`) },
      { label: tx('info.status'), value: '', certainty: CERTAINTIES[s.certainty[i]] },
      ...(medium ? [{ label: tx('info.medium'), value: medium }] : []),
      ...(p.model ? [{ label: tx('info.engineModel'), value: p.model }] : []),
      ...(p.role ? [{ label: tx('info.role'), value: p.role, mono: true }] : []),
      { label: tx('info.partId'), value: p.id, mono: true },
      { label: tx('info.layer'), value: tx(`info.layer.${p.layer}`) },
      { label: tx('info.position'), value: p.center.map((v) => num(v, 2)).join(', ') },
      ...(p.pivot ? [{ label: tx('info.pivot'), value: p.pivot.map((v) => num(v, 2)).join(', ') }] : []),
      ...(p.axis ? [{ label: tx('info.axis'), value: `${p.axis.map((v) => num(v, 2)).join(', ')}${p.approximate ? ` (${tx('info.approximate')})` : ''}` }] : []),
      ...(p.gimbalAxes ? [{ label: tx('info.gimbal'), value: tx('info.gimbalAxes', { n: p.gimbalAxes }) }] : []),
      ...(p.leaves ? [{ label: tx('info.leaves'), value: tx(`flight.event.${p.leaves.event}`) }] : []),
    ] });
    const through = systemsThrough([i]);
    if (through.length) blocks.push({ kind: 'heading', text: tx('info.systems') }, { kind: 'systems', rows: through });
    if (p.mounts?.length) {
      blocks.push({ kind: 'heading', text: tx('info.mounts') }, { kind: 'nodes', ids: p.mounts.map((m) => c.items[m].id) });
      if (p.ends?.length) blocks.push({ kind: 'text', text: tx('info.seats', { n: p.ends.length, r: num(Math.max(...p.ends.map((e) => e.r)) * 1000, 0) }), tone: 'small' });
    }
    if (p.terminals?.length) blocks.push({ kind: 'heading', text: tx('info.joins') }, { kind: 'nodes', ids: p.terminals.map((m) => c.items[m].id) });
    const held = [p.inside, p.host].filter((x): x is number => x !== undefined);
    if (held.length) blocks.push({ kind: 'heading', text: tx(p.inside !== undefined ? 'info.inside' : 'info.host') }, { kind: 'nodes', ids: held.map((m) => c.items[m].id) });
    const notes = [p.contents, p.steering, p.scope !== undefined ? c.scopes[p.scope] : undefined].filter((x): x is string => !!x);
    if (notes.length) blocks.push({ kind: 'heading', text: tx('info.scope') }, ...notes.map((text): InfoBlock => ({ kind: 'text', text, tone: 'note' })));
    if (p.evidence?.length) blocks.push({ kind: 'heading', text: tx('info.evidence') }, { kind: 'list', items: p.evidence.map((e) => c.evidence[e]) });
    blocks.push({ kind: 'text', text: tx('cert.byPilot'), tone: 'small' });
    return { title: local(p.id), subtitle: tx('info.partOf', { group: groupLabel(key) }), path: [p.unit, key], blocks };
  }

  // ─── what runs through it, and the helpers ────────────────────────────────

  function systems(): ModelSystem[] {
    if (systemList) return systemList;
    const s = need(), c = s.content;
    systemList = c.circuits.map((circuit) => {
      const parts = circuitParts(s, circuit.id);
      // painted by what flows: the medium most of its parts carry
      const tally = new Map<string, number>();
      for (const i of parts.all) { const m = c.items[i].medium; if (m) tally.set(m, (tally.get(m) ?? 0) + 1); }
      const medium = [...tally].sort((a, b) => b[1] - a[1])[0]?.[0];
      return {
        id: circuit.id, group: tx(`soyuz.engine.${ENGINE_OF(circuit.id)}`), label: circuit.label, text: circuit.description,
        confidence: circuit.confidence, limitation: circuit.limitation, sources: sourcesOf(circuit.sourceIds), items: parts.all,
        steps: circuit.steps.map((step, k) => ({ label: step.label, text: step.description, schematic: step.representation !== 'physicalpipe', items: parts.steps[k] })),
        colour: (medium && MEDIA[medium]) || '#8be5cd',
      };
    });
    return systemList;
  }

  function guides(): ModelGuide[] {
    const c = need().content;
    const flight: ModelGuide = {
      id: 'soyuz-flight', title: tx('guide.soyuzFlight.title'), summary: `${c.flight.title} · ${c.flight.note}`, mode: 'explore',
      steps: c.flight.steps.map((f, k) => ({
        title: f.title, text: f.text, note: [f.time, f.engines].filter(Boolean).join(' · '),
        show: { mode: 'explore', flight: k, select: f.part === null ? null : f.part === 'fairing' ? 'fairing-left' : f.part, view: { explode: 0, open: 0, cutaway: false }, camera: 'home' },
      })),
    };
    const tour: ModelGuide = {
      id: 'soyuz-tour', title: tx('guide.soyuzTour.title'), summary: tx('guide.soyuzTour.summary'), mode: 'explore',
      steps: [
        { title: tx('guide.soyuzTour.1.title'), text: tx('guide.soyuzTour.1.text'), show: { mode: 'explore', select: null, flight: null, view: { explode: 0, open: 0, cutaway: false, shell: false }, camera: 'home' } },
        { title: tx('guide.soyuzTour.2.title'), text: tx('guide.soyuzTour.2.text'), show: { mode: 'explore', select: 'booster-b', flight: null, view: { explode: 0.5, open: 0, cutaway: false }, camera: 'home' } },
        { title: tx('guide.soyuzTour.3.title'), text: tx('guide.soyuzTour.3.text'), show: { mode: 'explore', select: 'interstage', flight: null, view: { explode: 0, cutaway: false }, camera: 'selection' } },
        { title: tx('guide.soyuzTour.4.title'), text: tx('guide.soyuzTour.4.text'), show: { mode: 'explore', select: 'fregat', flight: null, view: { explode: 0, open: 1, cutaway: false }, camera: 'selection' } },
        { title: tx('guide.soyuzTour.5.title'), text: tx('guide.soyuzTour.5.text'), show: { mode: 'explore', select: null, flight: null, view: { explode: 0, open: 0, cutaway: true }, camera: 'cutaway' } },
        { title: tx('guide.soyuzTour.6.title'), text: tx('guide.soyuzTour.6.text'), show: { mode: 'assemble', select: null, flight: null } },
      ],
    };
    return [tour, flight];
  }

  function flight(step: number): FlightState {
    const f = need().content.flight;
    const at = (event: string): boolean => Object.hasOwn(f.events, event) && step >= f.events[event];
    const gone: string[] = [];
    for (const [event, units] of Object.entries(FLIGHT_EVENT_UNITS)) if (event !== 'disposal' && at(event)) gone.push(...units);
    const hiddenItems = at('skirt') ? need().content.items.flatMap((p, i) => (p.leaves?.event === 'skirt' ? [i] : [])) : [];
    const moved: Record<string, readonly [number, number, number]> = at('disposal') ? { fregat: f.disposalMove } : {};
    return { gone, hiddenItems, moved };
  }

  function search(query: string, depth: Depth, limit: number): string[] {
    const q = query.trim().toLowerCase();
    if (!q || !tree) return [];
    const max = TIER_OF_DEPTH[depth], c = need().content;
    const out: string[] = [];
    for (const n of tree.nodes.values()) {
      if (n.tier > max) continue;
      const part = n.tier === 3 ? c.items[n.items[0]] : null;
      const hay = part ? `${part.id} ${part.role ?? ''} ${part.medium ? tx(`medium.${part.medium}`) : ''}` : name(n.id);
      if (hay.toLowerCase().includes(q)) { out.push(n.id); if (out.length >= limit) break; }
    }
    return out;
  }

  // ─── the picture ──────────────────────────────────────────────────────────

  /** A unit turned `steps` of `of` about its own upright axis (none when it is the reference's way round). */
  const turnAbout = (unit: string, steps: number, of: number): Turn[] => {
    if (of <= 1 || steps % of === 0) return [];
    const [x, z] = axes.get(unit) ?? [0, 0];
    return [{ axis: 'y', angle: (2 * Math.PI * steps) / of, pivot: [x, 0, z] }];
  };

  const adapter: ModelAdapter = {
    id: 'soyuz-st31',
    activities: ['explore', 'assemble'],
    spec: SOYUZ_ASSEMBLY,
    relations: SOYUZ_RELATIONS,
    order: SOYUZ_ORDER,
    mounts: SOYUZ_MOUNTS,
    units: SOYUZ_UNITS,
    layers: SOYUZ_LAYERS,
    offers: { cutaway: true, open: true, deploy: false },
    home: { az: 0.85, el: 0.12, margin: 1.06, grid: 80, gridY: 0 },
    opens: { open: 0 },

    ready: () => !!index,
    async load(signal) {
      if (index) return;
      const content = parseSoyuzContent(await fetchStructureJson(SOYUZ_FILES.content, signal));
      index = indexSoyuz(content);
      tree = soyuzTree(index);
      for (const u of SOYUZ_UNITS) {
        axes.set(u, unitAxis(index, u));
        const c = index.units[u].items.map((i) => content.items[i].center);
        const lo = [0, 1, 2].map((a) => Math.min(...c.map((p) => p[a]))), hi = [0, 1, 2].map((a) => Math.max(...c.map((p) => p[a])));
        centres.set(u, [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2]);
      }
    },
    configure: () => false,
    setup(): PictureSetup {
      const s = need();
      return { itemCount: s.content.items.length, units: SOYUZ_UNITS, category: s.category, certainty: s.certainty };
    },
    async meshes(layer, signal): Promise<ViewerMesh[]> {
      const s = need();
      const data = await fetchStructureLayer(SOYUZ_FILES.layers[layer as SoyuzLayer], signal, env.inflate);
      if (data.source.sha256 !== s.content.source.sha256 || data.revision !== s.content.revision) throw new Error(FILES_MISMATCH);
      return data.meshes.map((m) => ({
        unit: m.unit, layer: data.layer, geometry: m.geometry,
        roughness: data.materials[m.material]?.roughness ?? 0.6, metalness: data.materials[m.material]?.metalness ?? 0,
      }));
    },

    tree: () => { need(); return tree!; },
    name,
    note(id) {
      const n = tree?.nodes.get(id);
      return n && n.tier < 3 ? tx('list.parts', { n: n.items.length }) : '';
    },
    place: (slot) => ({ name: tx(`soyuz.place.${slot}`), mark: SOYUZ_MOUNTS.find((m) => m.slot === slot)?.mark ?? 0 }),
    turnWhy: (unit) => tx(unit === 'fregat' ? 'soyuz.turn.fregat' : 'soyuz.turn'),
    unitOfItem: (i) => index?.content.items[i]?.unit ?? '',
    layerOfItem: (i) => index?.content.items[i]?.layer ?? 'outer',

    explorePose(unit, view) {
      const a = need().content.assemblies[unit as SoyuzUnit];
      if (!a) return REST;
      const r = a.reveal ?? [0, 0, 0];
      return { move: [a.move[0] * view.explode + r[0] * view.open, a.move[1] * view.explode + r[1] * view.open, a.move[2] * view.explode + r[2] * view.open], visible: true };
    },
    slotPose(unit, slot, turn) {
      const of = SOYUZ_ASSEMBLY.units.find((u) => u.id === unit)?.orientations ?? 1;
      const own = turnAbout(unit, turn, of);
      if (slot === unit) return { move: [0, 0, 0], turns: own, visible: true };
      // a strap-on shown in another strap-on's place: carried round the vehicle's axis to it
      if (SOYUZ_BOOSTERS.includes(unit as SoyuzUnit) && SOYUZ_BOOSTERS.includes(slot as SoyuzUnit)) {
        const [ux, uz] = axes.get(unit) ?? [0, 0], [sx, sz] = axes.get(slot) ?? [0, 0];
        return { move: [0, 0, 0], turns: [...own, { axis: 'y', angle: azimuth(sx, sz) - azimuth(ux, uz), pivot: [0, 0, 0] }], visible: true };
      }
      // any other unit in a place that is not its own: shown at that place, as near as a different thing can stand there
      const a = centres.get(slot), b = centres.get(unit);
      return { move: a && b ? [a[0] - b[0], a[1] - b[1], a[2] - b[2]] : [0, 0, 0], turns: own, visible: true };
    },
    slotTurn: () => 0,
    slotAnchor(slot) {
      if (!index || !isSoyuzUnit(slot)) return null;
      // at its joint to what carries it, where the page draws one; else at its own middle
      const r = SOYUZ_RELATIONS.find((x) => x.a === slot && x.kind === 'mounts');
      return (r && jointParts(index, r).at) || centres.get(slot) || null;
    },
    trayTurn: (unit) => TRAY_TURN[unit] ?? 0,
    sideBox(unit) {
      if (!index || !isSoyuzUnit(unit)) return null;
      const c = index.units[unit].items.map((i) => index!.content.items[i].center);
      if (!c.length) return null;
      const xs = c.map((p) => p[0]), ys = c.map((p) => p[1]);
      return { x0: Math.min(...xs) - 0.6, x1: Math.max(...xs) + 0.6, y0: Math.min(...ys) - 0.5, y1: Math.max(...ys) + 0.5 };
    },

    coverOf(items) {
      const s = need(), c = s.content;
      const chosen = new Set(items);
      const cover = new Set<number>();
      const units = new Set(items.map((i) => c.items[i].unit));
      for (const unit of units) {
        const all = s.units[unit].items;
        const mine = all.filter((i) => chosen.has(i));
        // a whole assembly shows by its own outside; a selection wholly inside it is hidden by its skins
        if (mine.length < all.length && mine.every((i) => c.items[i].kind !== 'shell')) for (const i of all) if (c.items[i].kind === 'shell') cover.add(i);
        // Fregat and the payload stand under the fairing
        if ((unit === 'fregat' || unit === 'payload') && !SOYUZ_FAIRING.some((f) => units.has(f))) for (const f of SOYUZ_FAIRING) for (const i of s.units[f].items) cover.add(i);
      }
      for (const i of chosen) cover.delete(i);
      return [...cover];
    },
    shell: () => need().content.items.flatMap((p, i) => (p.kind === 'shell' ? [i] : [])),
    cutaway() {
      const c = need().content;
      return { hidden: c.items.flatMap((p, i) => (p.half?.endsWith('front') ? [i] : [])), azimuth: cutawayAzimuth(c) };
    },
    joint: (relation: ModelRelation) => jointParts(need(), relation),
    jointName: (relation) => tx(`soyuz.joint.${relation.joint}`),

    describe(id, depth) {
      if (!index || !tree) return { title: tx('model.soyuz-st31'), path: [], blocks: [] };
      const n = id === null ? null : tree.nodes.get(id);
      if (!n) return introDoc(depth);
      if (n.tier === 1) return unitDoc(n.id as SoyuzUnit, depth);
      if (n.tier === 2) return groupDoc(n.id, depth);
      return partDoc(n.items[0]);
    },
    systems,
    guides,
    search,
    flight,
  };
  return adapter;
}
