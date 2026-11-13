/**
 * EduSat-3U for the Structure section's screens (`ModelAdapter`): the
 * educational satellite of src/structure/edusat.ts as a design shows it —
 * the reference, or the learner's experiment — drawn from its parts list
 * (src/render/edusat-model.ts), with its words in src/ui/structure/text.ts.
 * A concept for learning, said so wherever it is named; nothing here is
 * OneWeb's or any product's.
 */
import { EDUSAT_LAYER, edusatMeshes } from '../../../render/edusat-model';
import type { ViewerMesh } from '../../../render/structure-viewer';
import {
  BATTERIES, CDS, CELLS_PER_PANEL, EDUSAT_ASSEMBLY, EDUSAT_MOUNTS, EDUSAT_ORDER, EDUSAT_RELATIONS, EDUSAT_SOURCES, EDU_SUBSYSTEMS, EDU_UNITS, ENVELOPE,
  FACE_NORMAL, PANELS, PIECE_KIND, SOLAR_CELL, STACK_SLOTS, isEduUnit, panelTurn, slotOfUnit, subsystemOf,
  type EduFace, type EduPieceKind, type EduUnit, type StackBay,
} from '../../../structure/edusat';
import {
  REFERENCE_DESIGN, bayFit, designKey, eduTree, isEduDesign, itemsOf, partsOf, specChecks, subsystemNode, massOf,
  type EduDesign, type EduItem,
} from '../../../structure/edusat-design';
import { REST, TIER_OF_DEPTH, partnerOf, relationsOf, ruleFor, type ModelRelation, type ModelTree, type Turn } from '../../../structure/model';
import { CERTAINTIES, PART_CATEGORIES, type Depth } from '../../../structure/types';
import type { StructureEnv } from '../env';
import { num, tx } from '../text';
import { edusatExperiment } from './edusat-experiment';
import { provenance, type InfoBlock, type InfoCheck, type InfoDoc, type InfoSource, type ModelAdapter, type ModelGuide, type ModelSystem, type PictureSetup } from './types';

/** Taken apart: each unit's offset at full "take apart", m (the boards drawn out of the frame to one side and spread along the long axis). */
const APART: Readonly<Record<EduUnit, readonly [number, number, number]>> = {
  frame: [0, 0, 0], stack: [0.3, 0, 0], payload: [0.3, -0.07, 0], battery: [0.3, -0.035, 0], eps: [0.3, 0, 0], adcs: [0.3, 0.035, 0],
  obc: [0.3, 0.07, 0], radio: [0.3, 0.105, 0], antenna: [0, 0.1, 0],
  'panel-px': [0.12, 0, 0], 'panel-py': [0, 0, -0.12], 'panel-nx': [-0.12, 0, 0], 'panel-ny': [0, 0, 0.12],
};

/**
 * Opened: the two side panels nearest the opening view swing out on their
 * far rails like doors, so the stack inside is seen with the model whole.
 * Each: the upright axis it swings about (x, z), and which way.
 */
const DOORS: Readonly<Partial<Record<EduUnit, { pivot: readonly [number, number]; sign: 1 | -1 }>>> = {
  'panel-px': { pivot: [ENVELOPE.x / 2, -ENVELOPE.z / 2], sign: 1 },
  'panel-ny': { pivot: [-ENVELOPE.x / 2, ENVELOPE.z / 2], sign: -1 },
};
const DOOR_ANGLE = 1.9;

/** How a unit lies as it is picked up: turned once from the reference, for the ones that can go in two ways round. */
const TRAY_TURN: Readonly<Record<string, number>> = { payload: 1, 'panel-px': 1, 'panel-py': 1, 'panel-nx': 1, 'panel-ny': 1 };

/** The pieces of each side that are a joint (by kind), for the joints that have hardware of their own. */
const JOINT_PIECES: Readonly<Record<string, { a: readonly EduPieceKind[]; b: readonly EduPieceKind[] }>> = {
  stackRods: { a: ['rod'], b: ['endFrame'] },
  basePlate: { a: ['camBody', 'lens'], b: ['basePlate'] },
  rodsAndSpacers: { a: ['board'], b: ['rod', 'spacers'] },
  topFrame: { a: ['antennaBase'], b: ['endFrame'] },
  rails: { a: ['panelBoard'], b: ['rail'] },
  panelHarness: { a: ['panelBoard'], b: ['board', 'converter'] },
  batteryLeads: { a: ['board', 'protection'], b: ['converter'] },
  powerBus: { a: ['board'], b: ['board', 'camBody'] },
  dataBus: { a: ['processor', 'board'], b: ['board', 'camBody'] },
  rfCable: { a: ['rfConnector', 'transceiver'], b: ['tape', 'antennaBase'] },
};

/**
 * The kinds of piece the specification asks something of, and where it asks
 * it. What it asks is said under the piece (text key `edu.piece.<kind>.spec`);
 * the clause numbers are kept with the sources, folded away (the same in
 * every language: the document's own numbering).
 */
const SPEC_REF: Readonly<Partial<Record<EduPieceKind, string>>> = {
  rail: 'CDS Rev. 14.1 — CDS-14-004, §2.2.9, §2.2.13',
  endFrame: 'CDS Rev. 14.1 — §2.2.2, CDS-14-004',
  switch: 'CDS Rev. 14.1 — §2.3.2, §2.3.1',
  rbfPin: 'CDS Rev. 14.1 — §2.3.5',
  tape: 'CDS Rev. 14.1 — §2.4.4',
  cell18650: 'CDS Rev. 14.1 — §2.3.6 · CDS Rev. 13 — §3.1.6',
  panelBoard: 'CDS Rev. 14.1 — §2.2.3',
  transceiver: 'CDS Rev. 14.1 — §2.4.5, §2.3.7',
};
const WITH_SPEC: ReadonlySet<EduPieceKind> = new Set(Object.keys(SPEC_REF) as EduPieceKind[]);

/** The buses' colours: electrical power, data, radio signal. */
const BUS_COLOUR = { power: '#f2c14e', data: '#6ec8ff', rf: '#c792ea' } as const;

const mm = (m: number): string => num(m * 1000, m * 1000 % 1 ? 1 : 0);

export function edusatAdapter(env: StructureEnv): ModelAdapter {
  let design: EduDesign = { ...REFERENCE_DESIGN };
  let deployed = false;
  let items: EduItem[] = itemsOf(design);
  let tree: ModelTree = eduTree(items);

  const partOf = (unit: string) => partsOf(design).find((p) => p.unit === unit)!;
  const centre = (unit: string): readonly [number, number, number] => partOf(unit).box.center;
  const itemsOfUnit = (unit: string, kinds?: readonly EduPieceKind[]): number[] =>
    items.filter((it) => it.unit === unit && (!kinds || kinds.includes(it.piece.kind))).map((it) => it.index);
  const optionOf = (unit: string): string | null => (unit === 'battery' ? design.battery : unit === 'payload' ? design.payload : null);
  const sourceRows = (ids: readonly string[]): InfoSource[] => ids.flatMap((id) => {
    const s = EDUSAT_SOURCES.find((x) => x.id === id);
    return s ? [{ title: s.title, url: s.url, note: tx(`src.${s.id}`), scope: tx(`src.basis.${s.basis}`) }] : [];
  });

  const name = (id: string): string => {
    const n = tree.nodes.get(id);
    if (!n) return id;
    if (n.tier === 1) return tx(`edu.sys.${id.slice('sys:'.length)}`);
    if (n.tier === 2) return tx(`edu.unit.${id}`);
    const it = items[n.items[0]];
    const several = items.filter((x) => x.unit === it.unit && x.piece.kind === it.piece.kind).length > 1;
    return several ? tx('edu.piece.numbered', { name: tx(`edu.piece.${it.piece.kind}`), n: it.piece.n ?? 1 }) : tx(`edu.piece.${it.piece.kind}`);
  };

  // ─── words ────────────────────────────────────────────────────────────────

  function introDoc(depth: Depth): InfoDoc {
    const blocks: InfoBlock[] = [
      { kind: 'text', text: tx('edu.concept'), tone: 'lead' },
      { kind: 'text', text: tx('edu.principles') },
      { kind: 'facts', rows: [
        { label: tx('edu.fact.size'), value: `${num(ENVELOPE.x * 1000, 0)} × ${num(ENVELOPE.z * 1000, 0)} × ${num(ENVELOPE.y * 1000, 1)} ${tx('unit.mm')}`, certainty: 'documented' },
        { label: tx('res.mass'), value: `${num(massOf(design), 2)} ${tx('unit.kg')}`, certainty: 'estimated' },
        { label: tx('edu.fact.limit'), value: `${num(CDS.massKg, 2)} ${tx('unit.kg')}`, certainty: 'documented' },
        { label: tx('edu.fact.cells'), value: tx('edu.fact.cellsValue', { n: 4 * CELLS_PER_PANEL, eff: num(SOLAR_CELL.efficiency * 100, 1) }), certainty: 'documented' },
      ] },
    ];
    // what each figure rests on, and at the deepest the documents themselves: folded away at the card's foot
    const from: InfoBlock[] = [{ kind: 'list', items: [tx('edu.basis.size'), tx('edu.basis.cells'), tx('edu.basis.masses')] }];
    if (depth === 'engineer') from.push({ kind: 'heading', text: tx('info.sources') }, { kind: 'sources', rows: sourceRows(EDUSAT_SOURCES.map((s) => s.id)) });
    blocks.push(...provenance(tx('info.provenance'), '', from));
    return { title: tx('model.edusat'), subtitle: tx('model.edusat.sub'), path: [], blocks };
  }

  function relationBlocks(unit: string): InfoBlock[] {
    const rows = relationsOf(EDUSAT_RELATIONS, unit).map((r) => {
      const rule = r.a === unit ? ruleFor(EDUSAT_ORDER, r.a, r.b) : undefined;
      return { relation: r.id, other: partnerOf(r, unit), text: `${tx(`edu.medium.${r.medium}`)}: ${tx(`edu.link.${r.joint}`)}`, ...(rule ? { why: tx(rule.why) } : {}), hasJoint: true };
    });
    return rows.length ? [{ kind: 'heading', text: tx('info.relations') }, { kind: 'relations', rows }] : [];
  }

  function subsystemDoc(id: string, depth: Depth): InfoDoc {
    const sys = EDU_SUBSYSTEMS.find((s) => subsystemNode(s.id) === id)!;
    const blocks: InfoBlock[] = [
      { kind: 'text', text: tx(`edu.sys.${sys.id}.what`), tone: 'lead' },
      { kind: 'heading', text: tx('info.madeOfUnits') },
      { kind: 'nodes', ids: sys.units.filter((u) => tree.nodes.has(u)) },
    ];
    if (depth !== 'watch') {
      const mass = partsOf(design).filter((p) => sys.units.includes(p.unit)).reduce((s, p) => s + p.massKg, 0);
      blocks.push({ kind: 'facts', rows: [{ label: tx('info.mass'), value: `${num(mass, 2)} ${tx('unit.kg')}`, certainty: 'estimated' }] });
    }
    return { title: tx(`edu.sys.${sys.id}`), subtitle: tx('edu.sys.sub'), path: [], blocks };
  }

  function unitDoc(unit: EduUnit, depth: Depth, placedSlot?: string): InfoDoc {
    const part = partOf(unit);
    const option = optionOf(unit);
    const doesKey = option ? `edu.does.${option}` : PANELS.includes(unit) ? 'edu.does.panel' : `edu.does.${unit}`;
    const blocks: InfoBlock[] = [{ kind: 'text', text: tx(doesKey), tone: 'lead' }, ...relationBlocks(unit)];
    if (depth !== 'watch') {
      const [w, h, d] = part.box.size;
      const fit = bayFit(part);
      blocks.push({ kind: 'heading', text: tx('info.facts') }, { kind: 'facts', rows: [
        { label: tx('info.mass'), value: `${num(part.massKg, 2)} ${tx('unit.kg')}`, certainty: part.massCertainty },
        ...(part.loads.length ? [{
          label: tx('info.power'), certainty: 'assumed' as const,
          value: part.loads.map((l) => `${num(l.watts, 2)} ${tx('unit.W')}${l.minutes ? ` × ${l.minutes} ${tx('unit.min')}` : ''} (${tx(`edu.window.${l.window}`)})`).join(' + '),
        }] : []),
        ...(part.batteryWh ? [{ label: tx('res.capacity'), value: `${num(part.batteryWh, 2)} ${tx('unit.Wh')}`, certainty: 'estimated' as const }] : []),
        { label: tx('info.size'), value: `${mm(w)} × ${mm(d)} × ${mm(h)} ${tx('unit.mm')}` },
        // where it is fitted: assembling, the place it went to (a side panel may be on another face), else the reference's
        { label: tx('info.slot'), value: tx(`edu.place.${placedSlot ?? slotOfUnit(unit)}`) },
        ...(fit ? [{ label: tx('info.fit'), value: tx('info.fitValue', { h: mm(fit.height), limit: mm(fit.limit), w: mm(fit.width), wlimit: mm(fit.widthLimit) }) }] : []),
      ] });
      if (part.solarCells) blocks.push({ kind: 'text', text: tx('edu.cellNote', { n: part.solarCells, area: num(SOLAR_CELL.area * 1e4, 2), eff: num(SOLAR_CELL.efficiency * 100, 1) }), tone: 'small' });
    }
    if (depth === 'engineer') blocks.push({ kind: 'facts', rows: [{ label: tx('info.partId'), value: part.id, mono: true }] });
    const from: InfoBlock[] = [{ kind: 'text', text: tx(`edu.basis.unit.${part.sourceIds.includes('cell-18650') ? 'battery' : part.sourceIds.includes('azur-3g30') ? 'panel' : part.sourceIds.includes('cds14') ? 'spec' : 'pilot'}`), tone: 'small' }];
    if (depth === 'engineer') from.push({ kind: 'sources', rows: sourceRows(part.sourceIds) });
    blocks.push(...provenance(tx('info.provenance'), unit, from));
    return { title: tx(`edu.unit.${unit}`), ...(option ? { subtitle: tx(`edu.option.${option}`) } : {}), path: [subsystemNode(subsystemOf(unit))], blocks };
  }

  function pieceDoc(it: EduItem): InfoDoc {
    const k = it.piece.kind;
    const rows = [
      { label: tx('info.kind'), value: tx(`cat.${PIECE_KIND[k].category}`) },
      { label: tx('info.status'), value: '', certainty: PIECE_KIND[k].certainty },
      { label: tx('info.partId'), value: it.id, mono: true },
    ];
    const blocks: InfoBlock[] = [{ kind: 'text', text: tx(`edu.piece.${k}.does`), tone: 'lead' }];
    // what a document says of this kind of piece, with where it says it
    if (k === 'solarCell') {
      blocks.push({ kind: 'facts', rows: [
        { label: tx('edu.cell.size'), value: `${mm(SOLAR_CELL.width)} × ${mm(SOLAR_CELL.length)} ${tx('unit.mm')} · ${num(SOLAR_CELL.area * 1e4, 2)} ${tx('unit.cm2')}`, certainty: 'documented' },
        { label: tx('edu.cell.eff'), value: `${tx('unit.percent', { n: num(SOLAR_CELL.efficiency * 100, 1) })} (${tx('edu.cell.glassed', { eff: num(SOLAR_CELL.efficiencyGlassed * 100, 1) })})`, certainty: 'documented' },
        { label: tx('edu.cell.mpp'), value: `${num(SOLAR_CELL.vmp, 3)} ${tx('unit.V')} × ${num(SOLAR_CELL.imp, 3)} ${tx('unit.A')} = ${num(SOLAR_CELL.vmp * SOLAR_CELL.imp, 3)} ${tx('unit.W')}`, certainty: 'documented' },
        { label: tx('info.mass'), value: `${num(SOLAR_CELL.massGlassedKg * 1000, 1)} ${tx('unit.g')} (${tx('edu.cell.inUnit')})`, certainty: 'documented' },
      ] });
    }
    if (WITH_SPEC.has(k)) blocks.push({ kind: 'heading', text: tx('info.spec') }, { kind: 'text', text: tx(`edu.piece.${k}.spec`) });
    blocks.push({ kind: 'facts', rows });
    const ids = k === 'solarCell' ? ['azur-3g30', 'nasa-sst-power'] : k === 'cell18650' ? ['cell-18650', 'cds14', 'cds13'] : WITH_SPEC.has(k) ? ['cds14', 'pilot'] : ['pilot'];
    // the conditions a data sheet's figures hold under, the clauses asked of the piece, and the documents: folded away
    const from: InfoBlock[] = [];
    if (k === 'solarCell') from.push({ kind: 'text', text: tx('edu.cell.conditions', { flux: SOLAR_CELL.testFlux }), tone: 'small' });
    if (SPEC_REF[k]) from.push({ kind: 'facts', rows: [{ label: tx('info.specRef'), value: SPEC_REF[k] }] });
    from.push({ kind: 'sources', rows: sourceRows(ids) });
    blocks.push(...provenance(tx('info.provenance'), it.id, from));
    return { title: name(it.id), subtitle: tx('info.partOf', { group: tx(`edu.unit.${it.unit}`) }), path: [subsystemNode(subsystemOf(it.unit)), it.unit], blocks };
  }

  /** The design against the specification's bounds, as rows for a panel (the engineer's depth, and the experiment's details). */
  function checkRows(): InfoCheck[] {
    const parts = partsOf(design);
    return specChecks(parts, massOf(design), BATTERIES[design.battery].batteryWh!).map((c) => ({
      label: tx(`spec.${c.id}`),
      value: `${num(c.value, c.unit === 'kg' ? 2 : 1)} ${tx(`unit.${c.unit}`)}`,
      limit: `${c.atLeast ? '≥' : '≤'} ${num(c.limit, c.unit === 'kg' ? 2 : 1)} ${tx(`unit.${c.unit}`)}`,
      ok: c.ok,
      ref: `${c.sourceId === 'cds13' ? 'CDS Rev. 13' : 'CDS Rev. 14.1'} ${c.ref}`,
    }));
  }

  // ─── what runs through it, and the helpers ────────────────────────────────

  function systems(): ModelSystem[] {
    const of = (unit: EduUnit, kinds?: readonly EduPieceKind[]): number[] => itemsOfUnit(unit, kinds);
    const bus = (id: keyof typeof BUS_COLOUR, steps: { key: string; items: number[] }[]): ModelSystem => ({
      id: `edu-${id}`, group: tx('edu.bus.group'), label: tx(`edu.bus.${id}`), text: tx(`edu.bus.${id}.text`),
      confidence: tx('edu.bus.confidence'), limitation: tx('edu.bus.limitation'), sources: sourceRows(['pilot']),
      items: [...new Set(steps.flatMap((s) => s.items))],
      steps: steps.map((s) => ({ label: tx(`edu.bus.${id}.${s.key}`), text: tx(`edu.bus.${id}.${s.key}.text`), schematic: true, items: s.items })),
      colour: BUS_COLOUR[id],
    });
    return [
      bus('power', [
        { key: 'cells', items: PANELS.flatMap((p) => of(p, ['solarCell'])) },
        { key: 'eps', items: of('eps') },
        { key: 'battery', items: of('battery') },
        { key: 'loads', items: [...of('obc', ['board']), ...of('adcs', ['board']), ...of('radio', ['board']), ...of('payload', ['camBody'])] },
      ]),
      bus('data', [
        { key: 'obc', items: of('obc') },
        { key: 'adcs', items: of('adcs') },
        { key: 'camera', items: of('payload') },
        { key: 'radio', items: of('radio') },
      ]),
      bus('rf', [
        { key: 'radio', items: of('radio', ['transceiver']) },
        { key: 'cable', items: of('radio', ['rfConnector']) },
        { key: 'antenna', items: of('antenna') },
      ]),
    ];
  }

  function guides(): ModelGuide[] {
    const step = (g: string, k: number, show?: ModelGuide['steps'][number]['show']): ModelGuide['steps'][number] =>
      ({ title: tx(`guide.${g}.${k}.title`), text: tx(`guide.${g}.${k}.text`), ...(show ? { show } : {}) });
    return [
      {
        id: 'edusat-tour', title: tx('guide.edusatTour.title'), summary: tx('guide.edusatTour.summary'), mode: 'explore',
        steps: [
          step('edusatTour', 1, { mode: 'explore', select: null, system: null, view: { explode: 0, open: 1, shell: false, deployed: false }, camera: 'home' }),
          step('edusatTour', 2, { mode: 'explore', select: subsystemNode('structure'), system: null, view: { explode: 0, open: 1 }, camera: 'home' }),
          step('edusatTour', 3, { mode: 'explore', select: null, system: { id: 'edu-power', step: null }, view: { explode: 0, open: 1 }, camera: 'home' }),
          step('edusatTour', 4, { mode: 'explore', select: 'payload', system: null, view: { explode: 0, open: 1 }, camera: 'selection' }),
          step('edusatTour', 5, { mode: 'explore', select: 'antenna', system: null, view: { explode: 0, open: 1, deployed: true }, camera: 'home' }),
          step('edusatTour', 6, { mode: 'assemble', select: null, system: null, view: { deployed: false } }),
        ],
      },
      {
        id: 'edusat-energy', title: tx('guide.edusatEnergy.title'), summary: tx('guide.edusatEnergy.summary'), mode: 'experiment',
        // the steps say what to try; the choices stay the learner's own (a guide never changes their design)
        steps: [1, 2, 3, 4].map((k) => step('edusatEnergy', k, k === 1 ? { mode: 'experiment' } : undefined)),
      },
    ];
  }

  function search(query: string, depth: Depth, limit: number): string[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const max = TIER_OF_DEPTH[depth];
    const out: string[] = [];
    for (const n of tree.nodes.values()) {
      if (n.tier > max) continue;
      if (`${name(n.id)} ${n.id}`.toLowerCase().includes(q)) { out.push(n.id); if (out.length >= limit) break; }
    }
    return out;
  }

  // ─── the picture ──────────────────────────────────────────────────────────

  /** A unit turned from the reference's way round (the camera end over end, a panel face about), about its own middle. */
  const ownTurn = (unit: string, turn: number): Turn[] => {
    if (turn % 2 === 0) return [];
    const c = centre(unit);
    return [{ axis: unit === 'payload' ? 'x' : 'y', angle: Math.PI, pivot: c }];
  };

  const adapter: ModelAdapter = {
    id: 'edusat',
    activities: ['explore', 'assemble', 'experiment'],
    spec: EDUSAT_ASSEMBLY,
    relations: EDUSAT_RELATIONS,
    order: EDUSAT_ORDER,
    mounts: EDUSAT_MOUNTS,
    units: EDU_UNITS,
    layers: [EDUSAT_LAYER],
    offers: { cutaway: false, open: true, deploy: true },
    home: { az: 0.72, el: 0.3, margin: 1.22, grid: 0.8, gridY: -0.19 },
    opens: { open: 1 },

    ready: () => true,
    load: () => Promise.resolve(),
    configure(config) {
      const next = isEduDesign(config.design) ? config.design : REFERENCE_DESIGN;
      if (designKey(next) === designKey(design) && config.deployed === deployed) return false;
      design = { battery: next.battery, payload: next.payload };
      deployed = config.deployed;
      items = itemsOf(design);
      tree = eduTree(items);
      return true;
    },
    setup(): PictureSetup {
      return {
        itemCount: items.length, units: EDU_UNITS,
        category: Uint8Array.from(items, (it) => PART_CATEGORIES.indexOf(PIECE_KIND[it.piece.kind].category)),
        certainty: Uint8Array.from(items, (it) => CERTAINTIES.indexOf(PIECE_KIND[it.piece.kind].certainty)),
      };
    },
    meshes: (): Promise<ViewerMesh[]> => Promise.resolve(edusatMeshes(items, { deployed })),

    tree: () => tree,
    name,
    note(id) {
      const n = tree.nodes.get(id);
      if (!n) return '';
      if (n.tier === 2) { const o = optionOf(id); return o ? tx(`edu.option.${o}`) : ''; }
      return '';
    },
    place: (slot) => ({ name: tx(`edu.place.${slot}`), mark: EDUSAT_MOUNTS.find((m) => m.slot === slot)?.mark ?? 0 }),
    turnWhy: (unit) => tx(unit === 'payload' ? 'edu.turn.payload' : 'edu.turn.panel'),
    unitOfItem: (i) => items[i]?.unit ?? '',
    layerOfItem: () => EDUSAT_LAYER,

    explorePose(unit, view) {
      if (!isEduUnit(unit)) return REST;
      const a = APART[unit];
      const door = DOORS[unit];
      const turns: Turn[] = door && view.open > 0 ? [{ axis: 'y', angle: door.sign * DOOR_ANGLE * view.open, pivot: [door.pivot[0], 0, door.pivot[1]] }] : [];
      return { move: [a[0] * view.explode, a[1] * view.explode, a[2] * view.explode], turns, visible: true };
    },
    slotPose(unit, slot, turn) {
      const turns = ownTurn(unit, turn);
      const own = slotOfUnit(unit as EduUnit);
      if (slot === own) return { move: [0, 0, 0], turns, visible: true };
      // a side panel on another face: carried round the long axis to it
      if (PANELS.includes(unit as EduUnit) && Object.hasOwn(FACE_NORMAL, slot)) {
        return { move: [0, 0, 0], turns: [...turns, { axis: 'y', angle: panelTurn(unit, slot), pivot: [0, 0, 0] }], visible: true };
      }
      // anything else in a place that is not its own: shown at that place, as near as a different thing can stand there
      const there = EDUSAT_ASSEMBLY.slots.find((s) => s.id === slot)?.reference;
      if (!there) return { move: [0, 0, 0], turns, visible: true };
      const a = centre(there), b = centre(unit);
      return { move: [a[0] - b[0], a[1] - b[1], a[2] - b[2]], turns, visible: true };
    },
    slotTurn: (unit, slot) => panelTurn(unit, slot),
    slotAnchor(slot) {
      if (Object.hasOwn(FACE_NORMAL, slot)) {
        const n = FACE_NORMAL[slot as EduFace];
        return [n[0] * ENVELOPE.x / 2, 0, n[2] * ENVELOPE.z / 2];
      }
      if (Object.hasOwn(STACK_SLOTS, slot)) {
        const b = STACK_SLOTS[slot as StackBay];
        return [0, -ENVELOPE.y / 2 + b.from + b.height / 2, 0];
      }
      if (slot === 'frame') return [-ENVELOPE.x / 2, -ENVELOPE.y / 2 + 0.02, ENVELOPE.z / 2];
      if (slot === 'stack') return [0, -ENVELOPE.y / 2 + 0.003, 0];
      if (slot === 'antenna') return [0, ENVELOPE.y / 2, 0];
      return null;
    },
    trayTurn: (unit) => TRAY_TURN[unit] ?? 0,
    sideBox(unit) {
      if (!isEduUnit(unit)) return null;
      const { center: [x, y], size: [w, h] } = partOf(unit).box;
      return { x0: x - w / 2, x1: x + w / 2, y0: y - h / 2, y1: y + h / 2 };
    },

    coverOf(chosen) {
      // what stands inside the frame is hidden by the side panels (the rails hide little)
      const inside = chosen.some((i) => { const u = items[i]?.unit; return !!u && u !== 'frame' && u !== 'antenna' && !PANELS.includes(u); });
      const picked = new Set(chosen);
      return inside ? PANELS.flatMap((p) => itemsOfUnit(p)).filter((i) => !picked.has(i)) : [];
    },
    shell: () => [...PANELS.flatMap((p) => itemsOfUnit(p)), ...itemsOfUnit('frame')],
    cutaway: () => null,
    joint(relation: ModelRelation) {
      const rule = JOINT_PIECES[relation.joint];
      const a = itemsOfUnit(relation.a, rule?.a), b = itemsOfUnit(relation.b, rule?.b);
      const ca = centre(relation.a), cb = centre(relation.b);
      // marked between the two, at the edge of the smaller where one contains the other
      return { a, b, at: [(ca[0] + cb[0]) / 2, (ca[1] + cb[1]) / 2, (ca[2] + cb[2]) / 2] };
    },
    jointName: (relation) => tx(`edu.link.${relation.joint}`),

    describe(id, depth, mode, placedSlot) {
      const n = id === null ? null : tree.nodes.get(id);
      let doc: InfoDoc;
      if (!n) doc = introDoc(depth);
      else if (n.tier === 1) doc = subsystemDoc(n.id, depth);
      else if (n.tier === 2) doc = unitDoc(n.id as EduUnit, depth, mode === 'assemble' ? placedSlot : undefined);
      else doc = pieceDoc(items[n.items[0]]);
      // the whole design against the specification's bounds, where the whole design is what is looked at
      // (before the fold that stays at the card's foot)
      if (!n && depth === 'engineer') {
        const at = doc.blocks.findIndex((b) => b.kind === 'fold');
        doc.blocks.splice(at < 0 ? doc.blocks.length : at, 0, { kind: 'heading', text: tx('spec.title') }, { kind: 'checks', rows: checkRows(), note: tx('spec.note') });
      }
      return doc;
    },
    systems,
    guides,
    search,
    experiment: edusatExperiment(env, { checks: checkRows, sources: sourceRows }),
  };
  return adapter;
}
