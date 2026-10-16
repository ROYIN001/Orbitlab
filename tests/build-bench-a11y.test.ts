/**
 * M-PLAN-027 (R3.4r, P1 a11y regression): the Engineer bench's drawing names
 * a strap-on group by its role alone ("2 strap-ons"), where Watch and Explore
 * name the part ("2 strap-ons: <the booster's name>"), so a screen reader
 * hears another name for the same label on another level.
 *
 * Every part of every catalogue vehicle, drawn as the Engineer bench draws it,
 * must carry the accessible name Watch gives it. Vitest runs in `node`: the
 * levels' label methods are run on objects made from their prototypes. The
 * focus and reduced-motion parts of the item are driven in the browser
 * (tests/browser/journeys/bench-a11y.mjs).
 */
import { describe, expect, it } from 'vitest';
import { VEHICLES } from '../src/data/vehicles';
import { explodedView, type DrawnPart } from '../src/design/exploded';
import { EngineerLevel } from '../src/ui/build/engineer-level';
import { BuildScreen } from '../src/ui/build/build-screen';
import { ExploreLevel } from '../src/ui/build/explore-level';
import type { StackLabel } from '../src/ui/build/stack-svg';
import type { VehicleSpec } from '../src/types';

const engineerName = (spec: VehicleSpec, p: DrawnPart): string =>
  (Object.assign(Object.create(EngineerLevel.prototype), { bench: { spec } }) as { partLabel(p: DrawnPart): StackLabel }).partLabel(p).name;
const watchName = (spec: VehicleSpec, p: DrawnPart): string =>
  (Object.assign(Object.create(BuildScreen.prototype), { spec }) as { label(p: DrawnPart): StackLabel }).label(p).name;
const exploreName = (spec: VehicleSpec, p: DrawnPart): string =>
  (Object.create(ExploreLevel.prototype) as { label(spec: VehicleSpec, p: DrawnPart): StackLabel }).label(spec, p).name;

describe('M-PLAN-027: the Engineer bench names each drawn part as Watch and Explore do', () => {
  it('every part of every catalogue vehicle, strap-ons included', () => {
    let boosters = 0;
    const differ: string[] = [];
    for (const spec of VEHICLES) {
      for (const p of explodedView(spec).parts) {
        if (p.kind === 'booster') boosters++;
        const e = engineerName(spec, p), w = watchName(spec, p), x = exploreName(spec, p);
        if (e !== w || x !== w) differ.push(`${spec.id} ${p.key}: Engineer "${e}", Explore "${x}", Watch "${w}"`);
      }
    }
    expect(boosters, 'no vehicle with strap-ons was drawn').toBeGreaterThan(0);
    expect(differ).toEqual([]);
  });
});
