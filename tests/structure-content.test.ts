/**
 * What the Structure section says of each thing of its two models
 * (`ModelAdapter.describe`, `systems`, `guides`, `search`, `flight`;
 * src/ui/structure/models): every thing at every depth has words, in the
 * section's own text and nowhere a bare text key; what the depths show
 * differs as the brief asks; and everything a panel links to is there.
 */
import { describe, expect, it } from 'vitest';
import { PAYLOAD_OPTIONS, BATTERY_OPTIONS, CDS } from '../src/structure/edusat';
import type { Depth, StructureModelId } from '../src/structure/types';
import { STRUCTURE_MODELS } from '../src/structure/types';
import type { InfoBlock, InfoDoc, ModelAdapter } from '../src/ui/structure/models/types';
import { openStore } from './structure-harness';

const DEPTHS: readonly Depth[] = ['watch', 'explore', 'engineer'];
const { store } = await openStore();
const adapters = store.adapters;

/** Every string a document shows. */
function strings(doc: InfoDoc): string[] {
  const out = [doc.title, doc.subtitle ?? ''];
  const of = (b: InfoBlock): string[] => {
    switch (b.kind) {
      case 'text': case 'heading': return [b.text];
      case 'facts': return b.rows.flatMap((r) => [r.label, r.value]);
      case 'relations': return b.rows.flatMap((r) => [r.text, r.why ?? '']);
      case 'list': return b.items;
      case 'sources': return b.rows.flatMap((r) => [r.title, r.note ?? '', r.scope ?? '']);
      case 'systems': return b.rows.flatMap((r) => [r.label, r.step ?? '']);
      case 'checks': return [b.note, ...b.rows.flatMap((r) => [r.label, r.value, r.limit, r.ref])];
      default: return [];
    }
  };
  for (const b of doc.blocks) out.push(...of(b));
  return out;
}
/** A text key shown bare: what `tx` gives back for a key the section has no words for. */
const BARE_KEY = /^(?:asm|bom|cat|cert|depth|edu|exp|flight|flow|go|guide|info|list|load|medium|mode|model|phase|rel|res|side|soyuz|spec|src|store|sys|unit|view)\.[\w.-]+$/;
const kinds = (doc: InfoDoc): string[] => doc.blocks.map((b) => b.kind);
const headings = (doc: InfoDoc): string[] => doc.blocks.flatMap((b) => (b.kind === 'heading' ? [b.text] : []));

function everyDoc(adapter: ModelAdapter, visit: (doc: InfoDoc, id: string | null, depth: Depth) => void): number {
  let n = 0;
  for (const depth of DEPTHS) {
    for (const id of [null, ...adapter.tree().nodes.keys()]) {
      for (const mode of adapter.activities) { visit(adapter.describe(id, depth, mode), id, depth); n++; }
    }
  }
  return n;
}

describe('what is said of each thing', () => {
  for (const m of STRUCTURE_MODELS) {
    it(`${m}: every thing at every depth has a name and words, none a bare text key, and every link leads somewhere`, () => {
      const adapter = adapters[m], tree = adapter.tree();
      const systems = new Set(adapter.systems().map((s) => s.id));
      const relations = new Set(adapter.relations.map((r) => r.id));
      // thousands of documents: what is wrong is gathered and held up once (an `expect` for each string would take minutes)
      const wrong: string[] = [];
      const seen = everyDoc(adapter, (doc, id, depth) => {
        const where = `${m} ${id} @${depth}`;
        if (!doc.title.length) wrong.push(`${where}: no title`);
        if (!doc.blocks.length) wrong.push(`${where}: nothing said`);
        for (const s of strings(doc)) {
          if (BARE_KEY.test(s)) wrong.push(`${where}: a bare key “${s}”`);
          if (/undefined|NaN|\[object/.test(s)) wrong.push(`${where}: “${s}”`);
        }
        for (const p of doc.path) if (!tree.nodes.has(p)) wrong.push(`${where}: path ${p}`);
        for (const b of doc.blocks) {
          if (b.kind === 'relations') for (const r of b.rows) { if (!tree.nodes.has(r.other)) wrong.push(`${where}: relation to ${r.other}`); if (!relations.has(r.relation)) wrong.push(`${where}: relation ${r.relation}`); }
          if (b.kind === 'nodes') for (const n of b.ids) if (!tree.nodes.has(n)) wrong.push(`${where}: node ${n}`);
          if (b.kind === 'systems') for (const r of b.rows) if (!systems.has(r.id)) wrong.push(`${where}: system ${r.id}`);
          if (b.kind === 'sources') for (const r of b.rows) if (r.url && !/^https:\/\//.test(r.url)) wrong.push(`${where}: source ${r.url}`);
        }
      });
      expect(wrong.slice(0, 20)).toEqual([]);
      expect(seen).toBeGreaterThan(tree.nodes.size * 3);
      // and every node has a name of its own words
      expect([...tree.nodes.keys()].filter((id) => BARE_KEY.test(adapter.name(id))).slice(0, 20)).toEqual([]);
    }, 30_000);
  }
});

describe('what each depth shows of the rocket', () => {
  const a = adapters['soyuz-st31'];

  it('a first look: what an assembly is, what it does and what it meets, in this section\'s plain words; no figures, no sources', () => {
    const doc = a.describe('core', 'watch', 'explore');
    expect(kinds(doc)).toEqual(['text', 'heading', 'text', 'heading', 'relations']);
    expect(doc.blocks[0]).toMatchObject({ kind: 'text', tone: 'lead', text: 'ลำกลางของจรวด ตั้งแต่ฐานขึ้นไปถึงโครงถัก นับเป็นขั้นที่ 2' });
    const relations = doc.blocks[4] as Extract<InfoBlock, { kind: 'relations' }>;
    expect(relations.rows.map((r) => r.other).sort()).toEqual(['booster-b', 'booster-d', 'booster-g', 'booster-v', 'interstage']);
    expect(relations.rows.every((r) => r.hasJoint)).toBe(true);
  });

  it('the middle depth: the page\'s own account, its facts, what to look for, and the systems that pass through', () => {
    const doc = a.describe('core', 'explore', 'explore');
    expect(kinds(doc)).toEqual(expect.arrayContaining(['relations', 'facts', 'list', 'systems']));
    expect(kinds(doc)).not.toContain('sources');
    const facts = doc.blocks.find((b) => b.kind === 'facts') as Extract<InfoBlock, { kind: 'facts' }>;
    expect(facts.rows.length).toBeGreaterThan(2);
    for (const r of facts.rows) expect(r.certainty, r.label).toBeDefined();
  });

  it('the deepest: the same, with the page\'s note on how real it is and its sources', () => {
    const doc = a.describe('core', 'engineer', 'explore');
    expect(kinds(doc)).toContain('sources');
    const sources = doc.blocks.find((b) => b.kind === 'sources') as Extract<InfoBlock, { kind: 'sources' }>;
    expect(sources.rows.length).toBeGreaterThan(0);
    expect(kinds(a.describe('core', 'explore', 'explore')).length).toBeLessThan(kinds(doc).length);
  });

  it('a group of the page\'s: a sentence of what it is, what it is made of, and whose it is', () => {
    const doc = a.describe('core/tanks', 'explore', 'explore');
    expect(doc.path).toEqual(['core']);
    expect(doc.blocks[0]).toMatchObject({ kind: 'text', tone: 'lead' });
    expect(kinds(doc)).toContain('kinds');
    // the page uses one id for different things below and above: each has its own sentence
    const lower = (a.describe('core/tanks', 'explore', 'explore').blocks[0] as { text: string }).text;
    const upper = (a.describe('fregat/tanks', 'explore', 'explore').blocks[0] as { text: string }).text;
    expect(lower).toContain('ถังออกซิเจนเหลวและถังเคโรซีน');
    expect(upper).not.toBe(lower);
    // and no group of the page is left with the words for "grouped nowhere"
    const other = (a.describe('core/other', 'explore', 'explore').blocks[0] as { text: string } | undefined)?.text;
    for (const [id, node] of a.tree().nodes) {
      if (node.tier !== 2 || id.endsWith('/other')) continue;
      expect((a.describe(id, 'explore', 'explore').blocks[0] as { text: string }).text, id).not.toBe(other ?? 'ชิ้นส่วนของชุดนี้ที่หน้า Anatomy ไม่ได้จัดเข้ากลุ่มใด Orbitlab รวมไว้ให้เลือกได้');
    }
  });

  it('a single part: its kind, how its shape is known, its own id and place, and where it belongs', () => {
    const tree = a.tree();
    const id = tree.leafOf[tree.nodes.get('core/engine-feed')!.items[0]];
    const doc = a.describe(id, 'engineer', 'explore');
    expect(doc.path).toEqual(['core', 'core/engine-feed']);
    const facts = doc.blocks[0] as Extract<InfoBlock, { kind: 'facts' }>;
    expect(facts.kind).toBe('facts');
    expect(facts.rows.map((r) => r.label)).toEqual(expect.arrayContaining(['ชนิดชิ้นส่วน', 'สถานะข้อมูล', 'รหัสชิ้นส่วน', 'ตำแหน่งศูนย์กลาง (ม.)']));
    expect(facts.rows.find((r) => r.label === 'รหัสชิ้นส่วน')!.value).toBe(id);
  });
});

describe('what each depth shows of the satellite', () => {
  const a = adapters.edusat;

  it('says on the model\'s own page that it is a concept, apart from OneWeb, and what its figures rest on', () => {
    const doc = a.describe(null, 'watch', 'explore');
    expect(strings(doc).join(' ')).toContain('ไม่เกี่ยวข้องกับดาวเทียม OneWeb');
    const facts = doc.blocks.find((b) => b.kind === 'facts') as Extract<InfoBlock, { kind: 'facts' }>;
    expect(facts.rows.find((r) => r.value.includes(CDS.massKg.toFixed(2)))?.certainty).toBe('documented');
    expect(headings(doc)).toContain('ที่มาและสมมติฐาน');
  });

  it('a subsystem at a first look: what it is for and its units; a unit at the middle depth: what it meets and its figures; at the deepest its sources', () => {
    const sys = a.describe('sys:power', 'watch', 'explore');
    expect(kinds(sys)).toEqual(['text', 'heading', 'nodes']);
    expect((sys.blocks[2] as Extract<InfoBlock, { kind: 'nodes' }>).ids.sort()).toEqual(['battery', 'eps', 'panel-nx', 'panel-ny', 'panel-px', 'panel-py']);
    const mid = a.describe('battery', 'explore', 'explore');
    expect(mid.path).toEqual(['sys:power']);
    expect(mid.subtitle).toBe('แบตเตอรี่ 1 เซลล์');
    expect(kinds(mid)).toEqual(expect.arrayContaining(['relations', 'facts']));
    expect(kinds(mid)).not.toContain('sources');
    const deep = a.describe('battery', 'engineer', 'explore');
    expect(kinds(deep)).toContain('sources');
    expect(strings(deep).join(' ')).toContain('18650');
  });

  it('a piece the CubeSat specification speaks of quotes it, with the document', () => {
    const tree = a.tree();
    const rail = [...tree.nodes.keys()].find((id) => id.includes('/rail-'))!;
    const doc = a.describe(rail, 'engineer', 'explore');
    expect(headings(doc)).toContain('ข้อกำหนด CubeSat ที่เกี่ยวข้อง');
    expect(strings(doc).join(' ')).toContain('8.5 มม.');
    const sources = doc.blocks.find((b) => b.kind === 'sources') as Extract<InfoBlock, { kind: 'sources' }>;
    expect(sources.rows[0].title).toContain('CubeSat Design Specification Rev. 14.1');
  });

  it('names the option fitted, for every option of the design', () => {
    for (const battery of BATTERY_OPTIONS) for (const payload of PAYLOAD_OPTIONS) {
      a.configure({ design: { battery, payload }, deployed: false });
      const b = a.describe('battery', 'explore', 'experiment'), p = a.describe('payload', 'explore', 'experiment');
      for (const s of [...strings(b), ...strings(p)]) expect(BARE_KEY.test(s), s).toBe(false);
      expect(a.note('battery')).not.toBe('');
      expect(b.subtitle).toBe(a.note('battery'));
      expect(p.subtitle).toBe(a.note('payload'));
    }
    a.configure({ design: null, deployed: false });
    expect(a.describe('payload', 'explore', 'explore').subtitle).toBe('กล้องถ่ายภาพกลางวัน');
  });
});

describe('what runs through the models', () => {
  for (const m of STRUCTURE_MODELS) {
    it(`${m}: every system has parts on the picture, steps inside it, and words`, () => {
      const adapter = adapters[m], n = adapter.setup().itemCount;
      const systems = adapter.systems();
      expect(systems.length).toBeGreaterThan(0);
      expect(new Set(systems.map((s) => s.id)).size).toBe(systems.length);
      for (const s of systems) {
        expect(s.items.length, s.id).toBeGreaterThan(0);
        expect(s.colour, s.id).toMatch(/^#[0-9a-f]{6}$/);
        for (const text of [s.group, s.label, s.text, s.confidence, s.limitation]) { expect(text.length, s.id).toBeGreaterThan(0); expect(BARE_KEY.test(text), `${s.id}: ${text}`).toBe(false); }
        const own = new Set(s.items);
        for (const i of s.items) expect(i >= 0 && i < n, s.id).toBe(true);
        for (const step of s.steps) {
          expect(step.label.length, s.id).toBeGreaterThan(0);
          expect(BARE_KEY.test(step.label) || BARE_KEY.test(step.text), `${s.id}: ${step.label}`).toBe(false);
          for (const i of step.items) expect(own.has(i), `${s.id} / ${step.label}: part ${i} is not the system's`).toBe(true);
        }
      }
    });
  }

  it('the rocket\'s fifteen circuits are the page\'s, in its three engines\' groups; the satellite\'s three paths are marked as illustrations', () => {
    const soyuz = adapters['soyuz-st31'].systems();
    expect(soyuz).toHaveLength(15);
    expect([...new Set(soyuz.map((s) => s.group))]).toHaveLength(3);
    const edu = adapters.edusat.systems();
    expect(edu.map((s) => s.id)).toEqual(['edu-power', 'edu-data', 'edu-rf']);
    for (const s of edu) { expect(s.group).toContain('ภาพอธิบาย'); expect(s.steps.every((x) => x.schematic)).toBe(true); }
  });
});

describe('the optional helper\'s guides', () => {
  for (const m of STRUCTURE_MODELS) {
    it(`${m}: each step has words, and shows only what is there`, () => {
      const adapter = adapters[m], tree = adapter.tree();
      const systems = new Map(adapter.systems().map((s) => [s.id, s]));
      const guides = adapter.guides();
      expect(guides.length).toBeGreaterThan(0);
      for (const g of guides) {
        expect(adapter.activities, g.id).toContain(g.mode);
        expect(g.steps.length, g.id).toBeGreaterThan(1);
        for (const text of [g.title, g.summary]) { expect(text.length).toBeGreaterThan(0); expect(BARE_KEY.test(text), text).toBe(false); }
        g.steps.forEach((s, k) => {
          const where = `${g.id} step ${k + 1}`;
          expect(s.title.length, where).toBeGreaterThan(0);
          expect(s.text.length, where).toBeGreaterThan(0);
          expect(BARE_KEY.test(s.title) || BARE_KEY.test(s.text), where).toBe(false);
          const show = s.show;
          if (!show) return;
          if (show.mode) expect(adapter.activities, where).toContain(show.mode);
          if (show.select) expect(tree.nodes.has(show.select), `${where}: ${show.select}`).toBe(true);
          if (show.system) {
            const sys = systems.get(show.system.id);
            expect(sys, `${where}: ${show.system.id}`).toBeDefined();
            if (show.system.step !== null) expect(show.system.step < sys!.steps.length, where).toBe(true);
          }
          if (show.flight !== undefined && show.flight !== null) expect(adapter.flight, where).toBeDefined();
          if (show.view?.cutaway) expect(adapter.offers.cutaway, where).toBe(true);
          if (show.view?.deployed) expect(adapter.offers.deploy, where).toBe(true);
        });
      }
    });
  }

  it('the rocket\'s flight guide is the page\'s own sequence: what each step leaves is never more than the step before', () => {
    const a = adapters['soyuz-st31'];
    const flight = a.guides().find((g) => g.id === 'soyuz-flight')!;
    expect(flight.steps).toHaveLength(10);
    let before = new Set<string>();
    flight.steps.forEach((s, k) => {
      expect(s.show?.flight).toBe(k);
      const gone = new Set(a.flight!(k).gone);
      for (const u of gone) expect(a.units, u).toContain(u);
      for (const u of before) expect(gone.has(u), `step ${k + 1}: ${u} came back`).toBe(true);
      before = gone;
    });
    expect([...a.flight!(0).gone]).toEqual([]);
    // at the end only Fregat is left, moved off for its disposal
    expect(a.units.filter((u) => !before.has(u))).toEqual(['fregat']);
    expect(Object.keys(a.flight!(9).moved)).toEqual(['fregat']);
  });
});

describe('finding a thing by its name', () => {
  it('searches at the depth on screen, by the words shown and by the page\'s ids', () => {
    const s = adapters['soyuz-st31'], e = adapters.edusat;
    expect(s.search('บูส', 'watch', 9)).toEqual(['booster-b', 'booster-v', 'booster-g', 'booster-d']);
    expect(s.search('ถัง', 'explore', 3)).toEqual(['core/tanks', 'booster-b/tanks', 'booster-v/tanks']);
    expect(s.search('RD0124', 'engineer', 50).every((id) => id.toLowerCase().includes('rd0124'))).toBe(true);
    expect(s.search('rd0124', 'engineer', 4)).toHaveLength(4);
    expect(s.search('no such thing', 'engineer', 9)).toEqual([]);
    expect(s.search('', 'engineer', 9)).toEqual([]);
    expect(e.search('แบต', 'explore', 9)).toEqual(['battery']);
    expect(e.search('18650', 'engineer', 9).length).toBeGreaterThan(0);
    // a model's every node can be found by its own name, at the depth that shows it
    for (const m of STRUCTURE_MODELS as readonly StructureModelId[]) {
      const a = adapters[m];
      for (const [id, node] of a.tree().nodes) {
        if (node.tier === 3 && m === 'soyuz-st31') continue; // 2,069 parts: by id, above
        const depth: Depth = node.tier === 1 ? 'watch' : node.tier === 2 ? 'explore' : 'engineer';
        expect(a.search(a.name(id), depth, 400), `${m}: ${id}`).toContain(id);
      }
    }
  });
});
