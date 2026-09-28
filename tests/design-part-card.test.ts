/**
 * A part's catalogue card (src/design/part-card.ts), for the Build section.
 *
 * The card's numbers must be the ones the vehicle flies (its spec), exactly;
 * a vacuum-only engine must show no sea-level figures (they are placeholders,
 * not data: src/data/parts.ts); sources must split into their links and the
 * references that are not links. All comparisons are exact except the
 * structural ratio and propellant fraction summing to 1, held to 1e-15; both
 * were fixed before the first run.
 */
import { describe, expect, it } from 'vitest';
import { VEHICLES, vehicleById } from '../src/data/vehicles';
import { UNCITED, enginePart } from '../src/data/parts';
import { explodedView } from '../src/design/exploded';
import { engineDryMass, linkText, partCard, sourceItems } from '../src/design/part-card';

describe('sources', () => {
  it('flags the catalogue\'s "not cited" note, wholly or in part', () => {
    expect(sourceItems(UNCITED)).toEqual({ items: [], uncited: 'all' });
    expect(sourceItems(`https://en.wikipedia.org/wiki/Graphite-Epoxy_Motor (published peak 1 649.6 kN, for peakFactor); mean thrust and Isp ${UNCITED}`))
      .toEqual({ items: [{ kind: 'link', url: 'https://en.wikipedia.org/wiki/Graphite-Epoxy_Motor' }], uncited: 'partly' });
    expect(sourceItems(`${UNCITED}; diameter: audit item B23`)).toEqual({ items: [{ kind: 'text', text: 'diameter: audit item B23' }], uncited: 'partly' });
  });

  it('keeps a bracket that belongs to the address and drops one that belongs to the text', () => {
    expect(sourceItems('https://en.wikipedia.org/wiki/H3_(rocket) (published peak 2 300 kN)').items).toEqual([{ kind: 'link', url: 'https://en.wikipedia.org/wiki/H3_(rocket)' }]);
    expect(sourceItems('see (https://en.wikipedia.org/wiki/Vega_C)').items).toEqual([{ kind: 'link', url: 'https://en.wikipedia.org/wiki/Vega_C' }]);
    expect(sourceItems('https://en.wikipedia.org/wiki/P120C ; https://en.wikipedia.org/wiki/Vega_C (peak 4 323 kN)').items.map((i) => i.kind === 'link' && i.url))
      .toEqual(['https://en.wikipedia.org/wiki/P120C', 'https://en.wikipedia.org/wiki/Vega_C']);
  });

  it('quotes a reference that is not a link as the data records it', () => {
    expect(sourceItems('astronautix.com, the Saturn V Flight Manual SA-503 and the AS-506 launch vehicle flight evaluation report; sea-level Isp = vacuum Isp × sea-level/vacuum thrust').items).toEqual([
      { kind: 'text', text: 'astronautix.com, the Saturn V Flight Manual SA-503 and the AS-506 launch vehicle flight evaluation report' },
      { kind: 'text', text: 'sea-level Isp = vacuum Isp × sea-level/vacuum thrust' },
    ]);
  });

  it('shows a link as a readable address', () => {
    expect(linkText('https://en.wikipedia.org/wiki/H3_(rocket)')).toBe('en.wikipedia.org/wiki/H3 (rocket)');
    expect(linkText('http://www.astronautix.com/s/sputnik8k71ps.html')).toBe('astronautix.com/s/sputnik8k71ps.html');
  });
});

describe('the cards of the 21 vehicles', () => {
  for (const v of VEHICLES) {
    it(`${v.id}: every piece of hardware has a card with the flown numbers`, () => {
      const refs = new Set(explodedView(v).parts.map((p) => p.ref));
      for (const ref of refs) {
        const card = partCard(v, ref);
        expect(card, ref).not.toBeNull();
        if (card!.kind === 'stage' || card!.kind === 'booster') {
          const st = v.stages[card!.stageIndex];
          const hw = card!.kind === 'stage' ? st : st.boosters![card!.group];
          const e = hw.engine;
          expect(card!.body.partId, ref).not.toBeNull();
          expect(card!.engine.partId, ref).not.toBeNull();
          expect(card!.body).toMatchObject({ name: hw.name, stageId: hw.id, dryMass: hw.dryMass, propellantMass: hw.propellantMass, diameter: hw.diameter, length: hw.length });
          expect(Math.abs(card!.body.structuralRatio + card!.body.propellantFraction - 1)).toBeLessThanOrEqual(1e-15);
          expect(card!.engine).toMatchObject({ name: e.name, count: e.count, thrustVac: e.thrustVac, ispVac: e.ispVac, solid: !!e.solid, vacuumOnly: !!e.vacuumOnly });
          // a vacuum engine's sea-level pair is a placeholder, and is not shown
          expect(card!.engine.thrustSL).toBe(e.vacuumOnly ? null : e.thrustSL);
          expect(card!.engine.ispSL).toBe(e.vacuumOnly ? null : e.ispSL);
          expect(card!.engine.peakFactor).toBe(e.solid ? e.peakFactor ?? null : null);
          expect(card!.engine.family).toBe(enginePart(card!.engine.partId!).family);
          if (card!.kind === 'booster') expect(card!.units).toBe(st.boosters![card!.group].count);
          for (const s of [card!.engine.sources, card!.body.sources]) {
            expect(s, ref).not.toBeNull();
            for (const item of s!.items) if (item.kind === 'link') expect(item.url).toMatch(/^https?:\/\/[^\s]+$/);
            expect(s!.items.length > 0 || s!.uncited !== 'none', ref).toBe(true);
          }
        } else if (card!.kind === 'fairing') {
          expect(card).toMatchObject({ mass: v.fairing!.mass, diameter: v.fairing!.diameter, length: v.fairing!.length, sepAltitude: v.fairing!.sepAltitude, sepTime: v.fairing!.sepTime ?? null });
          expect(card!.partId).not.toBeNull();
        } else {
          expect(card!.height).toBeGreaterThan(0);
        }
      }
    });
  }

  it('says which engines are lumped or clustered, and which are historical', () => {
    const cz3 = partCard(vehicleById('longmarch3be'), 'stage:2');
    expect(cz3?.kind === 'stage' && cz3.engine.kind).toBe('lumped');
    const cz1 = partCard(vehicleById('longmarch3be'), 'stage:0');
    expect(cz1?.kind === 'stage' && cz1.engine.kind).toBe('cluster');
    const f1 = partCard(vehicleById('saturnv'), 'stage:0');
    expect(f1?.kind === 'stage' && f1.engine.historical).toBe(true);
    const m1d = partCard(vehicleById('falcon9'), 'stage:0');
    expect(m1d?.kind === 'stage' && m1d.engine.historical).toBe(false);
  });

  it('cards an adapter and a fairing as the stack draws them', () => {
    const adapter = partCard(vehicleById('saturnv'), 'interstage:1');
    expect(adapter).toMatchObject({ kind: 'interstage', lowerDiameter: 10.1, upperDiameter: 6.6, carries: 'sivb' });
    const fairing = partCard(vehicleById('ariane64'), 'fairing');
    expect(fairing).toMatchObject({ kind: 'fairing', mass: 2900, length: 20, sepTime: 200 });
    expect(partCard(vehicleById('starship'), 'fairing')).toBeNull();
    expect(partCard(vehicleById('falcon9'), 'booster:0:0')).toBeNull();
  });

  it('shows an engine\'s own mass from its catalogue part, with how far it can be trusted', () => {
    // RD-107A: Energomash's 1 090 kg dry, published (src/data/parts.ts)
    const soyuz = partCard(vehicleById('soyuz21a'), 'booster:0:0') ?? partCard(vehicleById('soyuz21a'), 'stage:0');
    expect(engineDryMass(enginePart('rd107a'))).toBe(enginePart('rd107a').mass.kg);
    expect(enginePart('rd107a').mass.kg).toBe(1090);
    expect(soyuz).not.toBeNull();
    // every card's mass is its part's, and a part with none shows none
    for (const v of VEHICLES) {
      for (let i = 0; i < v.stages.length; i++) {
        const c = partCard(v, `stage:${i}`);
        if (c?.kind !== 'stage' || !c.engine.partId) continue;
        const kg = enginePart(c.engine.partId).mass.kg;
        expect(c.engine.dryMass, `${v.id} stage ${i}`).toBe(kg && kg > 0 ? kg : null);
        expect(c.engine.massBasis === null, `${v.id} stage ${i}`).toBe(c.engine.dryMass === null);
      }
    }
    expect(engineDryMass({ ...enginePart('rd107a'), mass: { ...enginePart('rd107a').mass, kg: null } } as never)).toBeNull();
  });
});
