/**
 * Roadmap D01: the parts catalogue. The engines, stage bodies, strap-on
 * bodies and fairings that the 21 catalogue vehicles in src/data/vehicles.ts
 * are built from: 55 engine parts, 50 stage bodies, 14 strap-on bodies and
 * 17 fairings.
 *
 * UPSTREAM OF THE SPEC, NOT A REPLACEMENT. A vehicle is still a `VehicleSpec`
 * and the physics still only ever sees a spec. The catalogue is where a spec's
 * hardware numbers come from, through the emitters at the end of this file,
 * and `VehicleSpec` carries no reference back to a part. So the validator's
 * field lists (src/config/vehicle-spec.ts), mission files and design files are
 * untouched. The re-expressed fleet emits the very specs the literals did
 * before D01: tests/d01-vehicles-identity.test.ts compares them value for
 * value with a fixture recorded before this file existed, and
 * tests/d01-fleet-fingerprint.test.ts flies 27 fleet cases against hashes
 * recorded at the same point.
 *
 * TypeScript rather than JSON, so every thrust keeps its `X * kN` expression
 * exactly as it was written: `256.4 * kN` is 256399.99999999997, not 256400,
 * and the identity fixture pins that.
 *
 * WHAT IS A PART, AND WHAT IS AN INSTALLATION. A part holds the hardware: an
 * engine's thrust and Isp; a stage or strap-on body's masses, size and engine
 * installation (part and count: the dry mass includes the engines); a
 * fairing's mass, size and own adapter cone. Everything else belongs to where
 * the part is installed and stays in the vehicle's assembly in vehicles.ts:
 * staging delays, restart, the throttle while strap-ons burn, an air-lit
 * strap-on's ignition time, how many strap-ons, livery and drawing hints, and
 * the fairing's jettison altitude and published jettison time (an operator's
 * callout, not hardware; see `FairingSpec.sepTime`).
 *
 * IDS AND NAMES. A body's `stageId` and `name`, and an engine's `name`, are
 * emitted verbatim. They key the side tables (`PROPELLANT_LOADS`,
 * `STAGE_STEERING`, `STAGE_RCS`, the engine layouts), the exhaust colour (the
 * Merlin regex in src/render/exhaust.ts), the localized stage names and the
 * tests' published burn times. A part's own `id` is the
 * catalogue key. It is unique within its list (engines, stage bodies,
 * strap-on bodies, fairings) and never reaches a spec: several bodies emit
 * the same `stageId` (four R-7 cores are all `blokA`).
 *
 * VARIANTS. Two parts are one only when every emitted number agrees: the J-2
 * is one part, installed five times on the S-II and once on the S-IVB. Where
 * the numbers differ the parts are separate and `variantOf` links them: the
 * RD-0124A differs from the RD-0124 only in having no `minThrottle`, and that
 * field is read by the throttle model (src/physics/vehicle.ts).
 *
 * LUMPED ENTRIES, AND WHY `count` IS LOAD-BEARING. Four engine parts are not
 * one real engine (`kind: 'lumped'`): YF-75 (two engines' 167.17 kN total at
 * count 1), YF-24C (main engine and four verniers), RD-0213 + RD-0214 (main
 * engine and vernier block) and Raptor 2 / RVac (a blend of sea-level Raptors
 * and RVacs). They are kept verbatim at the count they have always had,
 * because `count` reaches far beyond thrust: the default nozzle ring and the
 * six-DOF chamber split, engine-out, the recovery engine choice, and the
 * Falcon octaweb gate (`count === 9`). Re-counting one changes that vehicle's
 * flights. Two more are `kind: 'cluster'`: per-engine figures under a cluster
 * name (YF-21C, four YF-20C) or for two models counted as one
 * (RD-0210/0211, three RD-0210 and one RD-0211).
 *
 * INTERSTAGES are not parts with mass. The data has none: an adapter is drawn
 * geometry (`interstageHeight` in src/physics/frame.ts), and the six-DOF model
 * adds no mass for it. Giving a catalogue vehicle an interstage with mass or
 * length would change its six-DOF flights, because the stack layout feeds the
 * geometry, the aero tables and the abort model. src/design/interstages.ts
 * derives them as massless display parts.
 *
 * SOURCES. Every part says where its numbers come from, as far as the file
 * they came from records it. Many figures were never cited there; those parts
 * say so (`UNCITED`) rather than borrow a source that was not used.
 *
 * ENGINE MASSES (roadmap D02, D03) are new data with sources of their own:
 * every engine part carries its published mass, or null with the reason, and
 * how far the figure can be trusted (`EngineMass`). They are never emitted:
 * the specs, and so the flights, are exactly what they were.
 */
import type { BoosterGroupSpec, EngineSpec, FairingSpec, StageSpec } from '../types';
import type { PropellantFamily } from '../physics/rigid/vehicle-data';

const kN = 1000;

/**
 * 'engine': one engine model, figures per engine, `count` counts engines.
 * 'cluster': figures per engine under a cluster's name, or for two models
 * counted as one; `count` still counts engines.
 * 'lumped': not one real engine. The figures total or blend several engines,
 * so `count` does not count engines and must never be changed (see the file
 * comment).
 */
export type EngineKind = 'engine' | 'cluster' | 'lumped';

export interface EnginePart {
  /** catalogue key, unique among engine parts */
  id: string;
  kind: EngineKind;
  /** what it burns. The six-DOF mass model still reads a stage's by stage id (`PROPELLANT_LOADS`); tests/parts.test.ts holds the two to agreement */
  family: PropellantFamily;
  /** emitted verbatim into `EngineSpec.name` */
  name: string;
  /** N per engine, s: the `EngineSpec` fields of the same names */
  thrustSL: number;
  thrustVac: number;
  ispSL: number;
  ispVac: number;
  minThrottle?: number;
  solid?: boolean;
  peakFactor?: number;
  vacuumOnly?: boolean;
  startupS?: number;
  tailoffS?: number;
  /** the part this one is a version of: a derivative, a vacuum or strap-on version, or an older build */
  variantOf?: string;
  /** no vehicle flies it any more, by the repo's own records (the C01 historical vehicles, H-IIA's retirement) */
  historical?: true;
  /** where the numbers come from */
  source: string;
  note?: string;
  /** its own published mass, per `count` unit as the thrust is (roadmap D02, D03): see `EngineMass` */
  mass: EngineMass;
}

/**
 * How far an engine's mass can be trusted, weakest first:
 * - `unpublished`: no source publishes one; `kg` is null and the note says why.
 * - `inferred`: attributed to this part by inference — a sibling engine's
 *   figure standing in, half of a published pair, a figure read off a
 *   photograph.
 * - `wikipediaOnly`: only an encyclopedia (Wikipedia, any language) carries
 *   the number, whatever it cites.
 * - `secondary`: a secondary source that is not an encyclopedia (astronautix,
 *   Spaceflight101), with no maker's or agency figure found.
 * - `published`: the maker's or an agency's own page, data sheet or archived
 *   copy of one, or plain arithmetic on such figures (gross minus propellant,
 *   the sum of two engines).
 */
export type EngineMassBasis = 'unpublished' | 'inferred' | 'wikipediaOnly' | 'secondary' | 'published';

/**
 * An engine part's own mass (roadmap D02, D03): new data, verified figure by
 * figure against its sources by the Phase 3 engine-mass research, with that
 * verifier's notes on where sources disagree and what was inferred kept in
 * `note`.
 *
 * NOT FLOWN. A stage body's `dryMass` already includes its engines, and that
 * lump is what every spec carries; the emitters never put this into an
 * `EngineSpec`, so no built-in flight can see it (tests/d01-vehicles-identity
 * and tests/d01-fleet-fingerprint prove it). It is there for the builders:
 * swapping an engine changes a stage's dry mass by the engines' difference,
 * and stretching a stage scales the rest of the dry mass but not the engines
 * (src/design/remix.ts).
 *
 * PER COUNT UNIT, as `thrustVac` is: one engine for an ordinary part, one of a
 * cluster's engines, and the whole lumped entry for a lumped part (YF-75's
 * 490 kg is the pair its 167.17 kN is).
 *
 * A SOLID MOTOR'S figure is its INERT mass — case, nozzle and hardware, what
 * is left when the grain is gone — and it belongs to the motor's own body,
 * not to an engine a tank is fitted with: a solid stage or strap-on body is
 * the motor, and its `dryMass` is (up to how each source draws the line) this
 * same mass. So it is never added to or taken from a liquid stage's dry mass.
 */
export interface EngineMass {
  /** kg per count unit, or null when no source publishes one */
  kg: number | null;
  basis: EngineMassBasis;
  /** the verifier marked it low confidence: an estimate even where a source prints it */
  lowConfidence?: true;
  /** what the figure includes */
  what: string;
  /** where it is published (http or https) */
  sources: readonly string[];
  /** disagreements between sources, inferences, stand-ins */
  note: string;
}

/** A stage body: one lump, whose dry mass includes its engines. kg, m. */
export interface StageBodyPart {
  /** catalogue key, unique among stage bodies */
  id: string;
  /** emitted as `StageSpec.id` */
  stageId: string;
  /** emitted verbatim as `StageSpec.name` */
  name: string;
  dryMass: number;
  propellantMass: number;
  diameter: number;
  length: number;
  engine: { part: string; count: number };
  variantOf?: string;
  source: string;
  note?: string;
}

/** A strap-on body, masses per unit as in `BoosterGroupSpec`. */
export type BoosterBodyPart = StageBodyPart;

export interface FairingPart {
  /** catalogue key, unique among fairings */
  id: string;
  mass: number;
  diameter: number;
  length: number;
  /** its own lower cone, counted in `length` (`FairingSpec.adapter`) */
  adapter?: number;
  source: string;
  note?: string;
}

/** Figures the pre-D01 data never cited; its header says: public sources (user guides, press kits, encyclopedic summaries), rounded, ±10 %. */
export const UNCITED = 'not cited in the data (public sources, rounded, ±10 %)';

const W = 'https://en.wikipedia.org/wiki/';
const C01 = 'astronautix.com, the Saturn V Flight Manual SA-503 and the AS-506 launch vehicle flight evaluation report; sea-level Isp = vacuum Isp × sea-level/vacuum thrust';

// ---------------------------------------------------------------- engines
//
// VACUUM-ONLY ENGINES. `EngineSpec` requires a sea-level pair, but an upper- or
// kick-stage engine that only ever ignites above ~100 km has no published
// sea-level operating point (an RL10 nozzle would not even flow full at sea
// level). For those engines the `thrustSL` / `ispSL` fields are NOT data: they
// are placeholders, and the recurring 250 / 260 / 280 s values below are where
// they came from. They carry `vacuumOnly: true` (audit item B27), which is
// what stops the model ever using them: `engineThrust` returns the vacuum
// figure at every pressure for such an engine, so a future abort or
// suborbital-hop scenario cannot silently fly invented numbers, and
// tests/data-consistency.test.ts checks the delivered sea-level Isp only for
// the engines that really are ground-lit.
//
// SOLID MOTORS. `thrustVac` is the MEAN thrust (grain mass / published burn
// time); `peakFactor` is the published peak divided by that mean, which
// `solidProfile` flies as a regressive ramp on top of it.
//
// EVERY solid in the fleet carries its own factor, and
// tests/data-consistency.test.ts enforces that (`every solid motor declares its
// published peak/mean thrust ratio`). Until that wave only three did and the
// other seven fell back on a 1.2 default that was nobody's published number —
// which mattered on the pad, because `liftoffThrust` flies the head of the ramp:
// PSLV-XL's S139 peaks at 1.43 x mean and its PSOM-XL at 1.53, so the fleet
// default under-reported that vehicle's liftoff thrust by a fifth.
//
//   motor      published peak        mean (this file)   peak/mean   source
//   P120C      4 323 kN             2 845.6 kN          1.52        Vega C
//   Zefiro 40  1 304 kN             1 122.9 kN          1.16        Vega C
//   Zefiro 9     317 kN               256.4 kN          1.24        Vega C
//   SRB-A3     2 260 kN             1 857.9 kN          1.22        H-IIA
//   SRB-3      2 300 kN             1 780 kN            1.29        H3
//   GEM-63     1 649.6 kN           1 300 kN            1.27        GEM
//   GEM-63XL   2 061 kN             1 460 kN            1.41        GEM
//   S139       4 846.9 kN           3 400 kN            1.43        PSLV
//   PSOM-XL      703.5 kN             460 kN            1.53        PSLV
//   HPS3         250 kN               174 kN            1.44        PSLV
//
// Sources: https://en.wikipedia.org/wiki/Vega_C ,
// https://en.wikipedia.org/wiki/Graphite-Epoxy_Motor ,
// https://en.wikipedia.org/wiki/H3_(rocket) ,
// https://en.wikipedia.org/wiki/Polar_Satellite_Launch_Vehicle ,
// https://en.wikipedia.org/wiki/H-IIA
export const ENGINE_PARTS: readonly EnginePart[] = [
  // --- R-7 (Soyuz-2) and its upper stages
  { id: 'rd107a', kind: 'engine', family: 'kerolox', name: 'RD-107A', thrustSL: 839.5 * kN, thrustVac: 1019.9 * kN, ispSL: 263.3, ispVac: 320.2, minThrottle: 0.5,
    source: UNCITED, note: 'one engine: four chambers and two verniers',
    mass: { kg: 1090, basis: 'published', what: 'dry, one complete engine (four chambers and two verniers); 1 156 kg filled',
      sources: ['https://web.archive.org/web/20190308003032/http://engine.space/dejatelnost/engines/rd-107-108/', 'http://engine.space/dejatelnost/engines/rd-107-108/', 'http://www.lpre.de/energomash/RD-107/index.htm', 'https://ru.wikipedia.org/wiki/РД-107', 'https://en.wikipedia.org/wiki/RD-107'],
      note: 'Energomash (2019 archive), lpre.de and ru.wikipedia agree on 1 090 kg. The en.wikipedia infobox’s 1 190 kg is the base RD-107 of the Vostok era, paired there with RD-107A performance.' } },
  { id: 'rd108a', kind: 'engine', family: 'kerolox', name: 'RD-108A', thrustSL: 792.4 * kN, thrustVac: 921.9 * kN, ispSL: 257.7, ispVac: 320.6, minThrottle: 0.5,
    source: UNCITED, note: 'one engine: four chambers and four verniers',
    mass: { kg: 1075, basis: 'published', what: 'dry, one complete engine (four chambers and four verniers); 1 151 kg filled',
      sources: ['https://web.archive.org/web/20190308003032/http://engine.space/dejatelnost/engines/rd-107-108/', 'http://engine.space/dejatelnost/engines/rd-107-108/', 'http://www.lpre.de/energomash/RD-107/index.htm'],
      note: 'Energomash (2019 archive) and lpre.de agree; no conflicting figure found.' } },
  { id: 'rd0110', kind: 'engine', family: 'kerolox', name: 'RD-0110', thrustSL: 200 * kN, thrustVac: 298 * kN, ispSL: 250, ispVac: 326, minThrottle: 0.5, vacuumOnly: true,
    source: UNCITED,
    mass: { kg: 453.6, basis: 'published', what: 'the maker’s mass “in flight configuration”, one four-chamber engine: more than the bare engine',
      sources: ['https://web.archive.org/web/20151226045520/http://www.kbkha.ru/?p=8&cat=8&prod=37', 'http://www.astronautix.com/r/rd-0110.html', 'https://en.wikipedia.org/wiki/RD-0110'],
      note: 'KBKhA (2015 archive). The bare engine is about 408 kg (astronautix 408; en.wikipedia 408.5, uncited); KBKhA’s 410 kg belongs to the near-identical RD-0107 and RD-0108.' } },
  { id: 'rd0124', kind: 'engine', family: 'kerolox', name: 'RD-0124', thrustSL: 200 * kN, thrustVac: 294.3 * kN, ispSL: 250, ispVac: 359, minThrottle: 0.5, vacuumOnly: true,
    source: UNCITED,
    mass: { kg: 572, basis: 'published', what: 'engine mass, one four-chamber RD-0124 (14D23)',
      sources: ['https://web.archive.org/web/20151226045414/http://www.kbkha.ru/?p=8&cat=8&prod=51', 'https://web.archive.org/web/20191209163513/http://engine.space/dejatelnost/engines/rd-14d23-rd-0124a/', 'https://web.archive.org/web/20170127081022/http://www.kbkha.ru/?p=8&cat=8&prod=51', 'http://www.astronautix.com/r/rd-0124.html', 'http://www.lpre.de/kbkha/RD-0124/index.htm', 'https://en.wikipedia.org/wiki/RD-0124'],
      note: 'KBKhA (2015) and Energomash (2019) agree on 572 kg. Older figures differ: KBKhA’s English page 520 kg, astronautix 480 kg, lpre.de 460 kg.' } },
  { id: 's592', kind: 'engine', family: 'hypergolic', name: 'S5.92', thrustSL: 15 * kN, thrustVac: 19.85 * kN, ispSL: 250, ispVac: 333.2, vacuumOnly: true,
    source: UNCITED,
    mass: { kg: 75, basis: 'published', what: 'unfuelled, one engine',
      sources: ['https://web.archive.org/web/20160320132115/http://kbhmisaeva.ru/main.php?id=53', 'http://www.lpre.de/kbhm/index.htm', 'https://en.wikipedia.org/wiki/S5.92'],
      note: 'KB KhimMash (2016 archive), lpre.de and en.wikipedia agree.' } },
  // --- Proton-M / Briz-M
  { id: 'rd276', kind: 'engine', family: 'hypergolic', name: 'RD-276', thrustSL: 1745 * kN, thrustVac: 1915 * kN, ispSL: 288, ispVac: 316, minThrottle: 0.6,
    source: UNCITED,
    mass: { kg: 1120, basis: 'published', what: 'dry, one engine (six on the stage); 1 360 kg filled',
      sources: ['https://web.archive.org/web/20191209163452/http://engine.space/dejatelnost/engines/rd-276/', 'http://engine.space/dejatelnost/engines/rd-276/', 'http://www.lpre.de/energomash/RD-253/index.htm', 'https://en.wikipedia.org/wiki/RD-253'],
      note: 'Energomash (2019 archive). lpre.de and the en.wikipedia RD-253 infobox give 1 070 kg for the same engine (RD-275M, 14D14M); the maker’s newer figure is used.' } },
  { id: 'rd0210', kind: 'cluster', family: 'hypergolic', name: 'RD-0210/0211', thrustSL: 500 * kN, thrustVac: 582 * kN, ispSL: 280, ispVac: 327,
    source: UNCITED, note: 'three RD-0210 and one RD-0211, flown as four engines with one set of figures',
    mass: { kg: 566, basis: 'published', what: 'engine mass, one RD-0210 or RD-0211 (one figure for both); four on the stage, 2 264 kg',
      sources: ['https://web.archive.org/web/20150815142815/http://www.kbkha.ru/?p=8&cat=8&prod=33', 'https://en.wikipedia.org/wiki/RD-0210'],
      note: 'KBKhA (2015 archive) and en.wikipedia agree.' } },
  { id: 'rd0213', kind: 'lumped', family: 'hypergolic', name: 'RD-0213 + RD-0214', thrustSL: 520 * kN, thrustVac: 613.8 * kN, ispSL: 280, ispVac: 325,
    source: UNCITED, note: 'the RD-0213 main engine and the RD-0214 vernier block as one entry, count 1',
    mass: { kg: 640, basis: 'published', what: 'the RD-0212 block as this lumped entry carries it: one RD-0213 main engine (550 kg) and one four-chamber RD-0214 vernier (90 kg)',
      sources: ['https://web.archive.org/web/20150815142815/http://www.kbkha.ru/?p=8&cat=8&prod=33', 'https://kbkha.ru/deyatel-nost/raketnye-dvigateli-dlya-kosmicheskoy-otrasli/raketnye-dvigateli-ao-kbha/dvigatelnyj-blok-rd0212-osnovnoj-dvigatel-rd0213-rulevoj-dvigatel-rd0214/', 'https://en.wikipedia.org/wiki/RD-0210', 'https://en.wikipedia.org/wiki/RD-0214'],
      note: 'The sum of KBKhA’s two figures (2015 archive); en.wikipedia gives the same 550 and 90 kg. The current kbkha.ru page gives no number.' } },
  { id: 's598m', kind: 'engine', family: 'hypergolic', name: 'S5.98M', thrustSL: 15 * kN, thrustVac: 19.62 * kN, ispSL: 250, ispVac: 326, vacuumOnly: true,
    source: UNCITED,
    mass: { kg: 95, basis: 'published', what: 'unfuelled, one 14D30 (S5.98M)',
      sources: ['https://web.archive.org/web/20160320071500/http://kbhmisaeva.ru/main.php?id=52', 'http://www.lpre.de/kbhm/index.htm', 'https://en.wikipedia.org/wiki/S5.98M'],
      note: 'KB KhimMash (2016 archive), lpre.de and en.wikipedia agree.' } },
  // --- Angara-A5
  { id: 'rd191', kind: 'engine', family: 'kerolox', name: 'RD-191', thrustSL: 1920 * kN, thrustVac: 2090 * kN, ispSL: 310.7, ispVac: 337.5, minThrottle: 0.3,
    source: UNCITED,
    mass: { kg: 2290, basis: 'published', what: 'dry, one engine; 2 520 kg filled',
      sources: ['https://web.archive.org/web/20191209163518/http://engine.space/dejatelnost/engines/rd-191/', 'http://engine.space/dejatelnost/engines/rd-191/', 'https://en.wikipedia.org/wiki/RD-191'],
      note: 'Energomash (2019 archive) and en.wikipedia agree.' } },
  { id: 'rd0124a', kind: 'engine', family: 'kerolox', name: 'RD-0124A', thrustSL: 200 * kN, thrustVac: 294.3 * kN, ispSL: 250, ispVac: 359, vacuumOnly: true,
    variantOf: 'rd0124', source: UNCITED, note: 'as the RD-0124, without its minimum throttle: a fixed-thrust engine in the model',
    mass: { kg: 548, basis: 'published', what: 'engine mass, one RD-0124A (Angara’s URM-2)',
      sources: ['https://web.archive.org/web/20151226045414/http://www.kbkha.ru/?p=8&cat=8&prod=51', 'https://web.archive.org/web/20191209163513/http://engine.space/dejatelnost/engines/rd-14d23-rd-0124a/', 'https://web.archive.org/web/20170127081022/http://www.kbkha.ru/?p=8&cat=8&prod=51', 'https://en.wikipedia.org/wiki/RD-0124'],
      note: 'KBKhA (2015) and Energomash (2019) agree; KBKhA’s older English page gives 500 kg.' } },
  // --- Falcon 9 / Falcon Heavy
  { id: 'merlin1d', kind: 'engine', family: 'kerolox', name: 'Merlin 1D', thrustSL: 845 * kN, thrustVac: 914 * kN, ispSL: 282, ispVac: 311, minThrottle: 0.4,
    source: UNCITED,
    mass: { kg: 467, basis: 'wikipediaOnly', what: 'dry, one sea-level engine with its hydraulic TVC actuators: 1 030 lb',
      sources: ['https://en.wikipedia.org/w/index.php?title=SpaceX_Merlin&action=raw', 'https://en.wikipedia.org/wiki/SpaceX_Merlin', 'https://www.quora.com/Is-SpaceXs-Merlin-1Ds-thrust-to-weight-ratio-of-150+-believable/answer/Thomas-Mueller-11', 'http://www.astronautix.com/m/merlin1d.html'],
      note: 'Tom Mueller’s figure (then SpaceX’s propulsion CTO), readable here only through Wikipedia’s citation of it (the Quora answer returned 403): not a maker’s data sheet. The infobox T/W of 184 at 845 kN gives about 468 kg; astronautix’s 490 kg is the early 716 kN engine.' } },
  { id: 'mvac', kind: 'engine', family: 'kerolox', name: 'Merlin Vacuum', thrustSL: 700 * kN, thrustVac: 981 * kN, ispSL: 250, ispVac: 348, minThrottle: 0.4, vacuumOnly: true,
    variantOf: 'merlin1d', source: UNCITED,
    mass: { kg: 550, basis: 'secondary', lowConfidence: true, what: 'one Merlin 1D Vacuum with its nozzle extension, as astronautix gives it (labelled “Gross mass”)',
      sources: ['http://www.astronautix.com/m/merlin1dvac.html', 'https://www.wikidata.org/wiki/Q18646644', 'https://en.wikipedia.org/wiki/SpaceX_Merlin'],
      note: 'LOW CONFIDENCE, an estimate: astronautix only, and it matches that page’s own T/W of 150 at 801 kN, so it is probably derived rather than measured. Wikidata carries 470 kg with no reference; SpaceX has published no MVac mass.' } },
  // --- Atlas V / Vulcan
  { id: 'rd180', kind: 'engine', family: 'kerolox', name: 'RD-180', thrustSL: 3827 * kN, thrustVac: 4152 * kN, ispSL: 311.3, ispVac: 337.8, minThrottle: 0.47,
    source: UNCITED,
    mass: { kg: 5480, basis: 'published', what: 'dry, one two-chamber engine; 5 950 kg filled',
      sources: ['https://web.archive.org/web/20191209163447/http://engine.space/dejatelnost/engines/rd-180/', 'http://engine.space/dejatelnost/engines/rd-180/', 'https://www.spaceflightnow.com/atlas/ac204/020219rd180.html', 'http://www.astronautix.com/r/rd-180.html', 'https://en.wikipedia.org/wiki/RD-180'],
      note: 'Energomash (2019 archive), astronautix and en.wikipedia agree. The 2002 P&W/Energomash sheet’s 11 889 lb “total system dry weight” is about 5 393 kg.' } },
  { id: 'gem63', kind: 'engine', family: 'solid', name: 'GEM-63', thrustSL: 1180 * kN, thrustVac: 1300 * kN, ispSL: 254, ispVac: 279, solid: true, peakFactor: 1.27,
    source: `${W}Graphite-Epoxy_Motor (published peak 1 649.6 kN, for peakFactor); mean thrust and Isp ${UNCITED}`,
    mass: { kg: 5035, basis: 'published', what: 'INERT mass of one motor, total minus propellant on the maker’s data sheet (108 600 − 97 500 lb = 11 100 lb); a solid motor’s inert mass (case, nozzle, hardware) belongs to the motor’s own body, not to an engine a tank is fitted with',
      sources: ['https://cdn.northropgrumman.com/-/media/wp-content/uploads/GEM-63-GEM-63XL-Datasheet.pdf?v=1.0.0'],
      note: 'Northrop Grumman data sheet (DS-26). Its rounded kg columns give 5 100 kg, the strap-on body’s dry mass, so about ±50 kg; whether the nose cone and attach hardware are included is not said.' } },
  { id: 'rl10c1', kind: 'engine', family: 'hydrolox', name: 'RL10C-1', thrustSL: 60 * kN, thrustVac: 101.8 * kN, ispSL: 280, ispVac: 449.7, vacuumOnly: true,
    source: UNCITED,
    mass: { kg: 190.5, basis: 'published', what: 'one RL10C-1, “Weight: 420 lbs”',
      sources: ['https://web.archive.org/web/20220130111530/https://rocket.com/sites/default/files/documents/Capabilities/PDFs/RL10_data_sheet.pdf', 'https://en.wikipedia.org/wiki/RL10'],
      note: 'Aerojet Rocketdyne data sheet (October 2021, Wayback copy); its Isp column matches the part’s 449.7 s.' } },
  { id: 'be4', kind: 'engine', family: 'methalox', name: 'BE-4', thrustSL: 2400 * kN, thrustVac: 2600 * kN, ispSL: 310, ispVac: 340, minThrottle: 0.4,
    source: UNCITED,
    mass: { kg: 5400, basis: 'inferred', lowConfidence: true, what: 'one BE-4 (original version), read from the stencil on its handling cart: 22 500 − 10 500 lb = 12 000 lb',
      sources: ['https://en.wikipedia.org/w/index.php?title=BE-4&action=raw', 'https://x.com/davill/status/2033945277384823302', 'https://api.fxtwitter.com/davill/status/2033945277384823302', 'https://pbs.twimg.com/media/HDoGb3sbEAEHOc2.jpg?name=orig'],
      note: 'LOW CONFIDENCE, INFERRED: Blue Origin publishes no BE-4 mass. The stencil values are round (±250 lb or more); another reading of it gives 7 711 kg; whether the engine on the cart is in flight configuration is unknown. Wikipedia rounds the reading to 5 400 kg.' } },
  { id: 'gem63xl', kind: 'engine', family: 'solid', name: 'GEM-63XL', thrustSL: 1340 * kN, thrustVac: 1460 * kN, ispSL: 254, ispVac: 279, solid: true, peakFactor: 1.41,
    variantOf: 'gem63', source: `${W}Graphite-Epoxy_Motor (published peak 2 061 kN, for peakFactor); mean thrust and Isp ${UNCITED}`,
    mass: { kg: 5352, basis: 'published', what: 'INERT mass of one motor, total minus propellant on the maker’s data sheet (117 700 − 105 900 lb = 11 800 lb); a solid motor’s inert mass (case, nozzle, hardware) belongs to the motor’s own body, not to an engine a tank is fitted with',
      sources: ['https://cdn.northropgrumman.com/-/media/wp-content/uploads/GEM-63-GEM-63XL-Datasheet.pdf?v=1.0.0', 'https://en.wikipedia.org/wiki/Graphite-Epoxy_Motor'],
      note: 'Northrop Grumman data sheet; its kg columns give 5 400 kg. The strap-on body carries 5 177 kg (Wikipedia’s gross minus grain). Nose cone and attach hardware are not specified.' } },
  { id: 'rl10c11', kind: 'engine', family: 'hydrolox', name: 'RL10C-1-1', thrustSL: 60 * kN, thrustVac: 106 * kN, ispSL: 280, ispVac: 453.8, vacuumOnly: true,
    variantOf: 'rl10c1', source: UNCITED,
    mass: { kg: 188.2, basis: 'published', what: 'one RL10C-1-1, “Weight: 415 lbs”; two on Centaur V',
      sources: ['https://web.archive.org/web/20220130111530/https://rocket.com/sites/default/files/documents/Capabilities/PDFs/RL10_data_sheet.pdf', 'https://en.wikipedia.org/wiki/RL10'],
      note: 'Aerojet Rocketdyne data sheet (October 2021); thrust and Isp match the part.' } },
  // --- Ariane 6
  { id: 'vulcain21', kind: 'engine', family: 'hydrolox', name: 'Vulcain 2.1', thrustSL: 960 * kN, thrustVac: 1370 * kN, ispSL: 318, ispVac: 431,
    source: UNCITED,
    mass: { kg: 1650, basis: 'published', what: 'one Vulcain 2.1, as CNES states it on its Ariane 6 page',
      sources: ['https://cnes.fr/projets/ariane-6/modeles', 'https://web.archive.org/web/20240726002959/https://www.ariane.group/wp-content/uploads/2020/06/VULCAIN2.1_2020_04_PS_EN_Web.pdf', 'https://en.wikipedia.org/w/index.php?title=Vulcain_(rocket_engine)&action=raw', 'https://www.esa.int/esapub/bulletin/bullet102/Coulon102.pdf', 'https://www.esa.int/Enabling_Support/Space_Transportation/Ariane/Ariane_5_Vulcain_engine', 'https://www.esa.int/Enabling_Support/Space_Transportation/Ariane/All_engines_for_Ariane_6_complete_qualification_tests'],
      note: 'Moderate confidence: the sources spread by about 350 kg. The ArianeGroup data sheet gives no mass; Wikipedia gives 2 000 kg (and 1 800 kg for the Vulcain 2), ESA Bulletin 102 1 935 kg for the Vulcain 2. CNES is the only agency figure for the 2.1.' } },
  // P120C: 141.4 t of grain burned in ~135 s means a *mean* mass flow of about
  // 1042 kg/s, i.e. a mean vacuum thrust near 2 846 kN — the 4 323-4 650 kN
  // figures quoted for this motor are the peak of a regressive grain, which the
  // simulation adds on top (see `solidProfile`). The earlier 3 200/3 400 kN pair
  // was the peak used as a mean and burned the grain out about 20 s early.
  { id: 'p120c', kind: 'engine', family: 'solid', name: 'P120C', thrustSL: 2677 * kN, thrustVac: 2845.6 * kN, ispSL: 262, ispVac: 278.5, solid: true, peakFactor: 1.52,
    source: `${W}P120C ; ${W}Vega_C (peak 4 323 kN)`, note: 'Vega-C first stage and Ariane 6 strap-on',
    mass: { kg: 11200, basis: 'published', what: 'INERT (dry) mass of one motor as Avio publishes it; the case alone is 8 200 kg; a solid motor’s inert mass (case, nozzle, hardware) belongs to the motor’s own body, not to an engine a tank is fitted with',
      sources: ['https://www.avio.com/vega-c', 'https://www.esa.int/Enabling_Support/Space_Transportation/Ariane/All_engines_for_Ariane_6_complete_qualification_tests', 'https://www.eoportal.org/other-space-activities/ariane6'],
      note: 'Avio; ESA says 11 t and eoPortal 11 000 kg. Vega-C’s first stage carries 11 200 kg; nothing here supports the 13 000 kg of Ariane 6’s equipped strap-on body.' } },
  { id: 'vinci', kind: 'engine', family: 'hydrolox', name: 'Vinci', thrustSL: 100 * kN, thrustVac: 180 * kN, ispSL: 280, ispVac: 457, vacuumOnly: true,
    source: UNCITED,
    mass: { kg: 550, basis: 'wikipediaOnly', lowConfidence: true, what: 'one Vinci with its nozzle extension, “approx.” 550 kg',
      sources: ['https://en.wikipedia.org/w/index.php?title=Vinci_(rocket_engine)&action=raw', 'https://fr.wikipedia.org/w/index.php?title=Vinci_(moteur-fus%C3%A9e)&action=raw', 'http://www.astronautix.com/v/vinci.html', 'https://web.archive.org/web/20200923091648/https://www.ariane.group/wp-content/uploads/2020/06/VINCI_2020_04_DS_EN_Eng_Web.pdf', 'https://www.esa.int/Enabling_Support/Space_Transportation/Ariane/The_engines_of_Ariane_6'],
      note: 'LOW CONFIDENCE, an encyclopedic estimate: English and French Wikipedia carry it, and the ArianeGroup data sheet they cite gives no mass; ESA and CNES give none. astronautix’s 280 kg is a 2005 design with a deployable nozzle, not the flown engine.' } },
  // --- Long March 5
  { id: 'yf77', kind: 'engine', family: 'hydrolox', name: 'YF-77', thrustSL: 510 * kN, thrustVac: 700 * kN, ispSL: 310, ispVac: 430,
    source: UNCITED,
    mass: { kg: 1375, basis: 'inferred', what: 'half the published twin-engine module (2 750 kg, both engines on their shared frame): 2 × 1 375 kg is the whole core-stage propulsion module, and a bare engine is lighter',
      sources: ['https://zh.wikipedia.org/wiki/YF-77', 'http://www.astronautix.com/y/yf-77.html', 'https://zh.wikipedia.org/zh-hans/YF%E7%B3%BB%E5%88%97%E7%81%AB%E7%AE%AD%E5%8F%91%E5%8A%A8%E6%9C%BA', 'http://tjjs.ijournals.cn/tjjs/ch/reader/view_abstract.aspx?file_no=202107003&flag=1'],
      note: 'INFERRED as half of a pair. zh.wikipedia cites a 2016 paper by Zheng, Wang and Qiao for the twin figure; astronautix describes a dual mount at 2 700 kg. The engine table’s 1 054 kg per engine has no citation. No CASC figure found.' } },
  { id: 'yf100', kind: 'engine', family: 'kerolox', name: 'YF-100', thrustSL: 1200 * kN, thrustVac: 1340 * kN, ispSL: 300, ispVac: 335,
    source: UNCITED,
    mass: { kg: 1920, basis: 'wikipediaOnly', what: 'dry, one YF-100 (the base version, whole-engine gimbal)',
      sources: ['https://zh.wikipedia.org/wiki/YF-100', 'https://zh.wikipedia.org/zh-hans/YF%E7%B3%BB%E5%88%97%E7%81%AB%E7%AE%AD%E5%8F%91%E5%8A%A8%E6%9C%BA', 'https://www.futurephecda.com/news/19060', 'http://www.astronautix.com/y/yf-100.html'],
      note: 'zh.wikipedia’s table, citing a 2014 paper from the maker’s institute that was not read here; a Chinese news table gives 1 900 kg. No maker’s own figure found.' } },
  { id: 'yf75d', kind: 'engine', family: 'hydrolox', name: 'YF-75D', thrustSL: 50 * kN, thrustVac: 88.36 * kN, ispSL: 280, ispVac: 442, vacuumOnly: true,
    variantOf: 'yf75', source: UNCITED, note: 'per engine, unlike the lumped YF-75 part it derives from',
    mass: { kg: 265, basis: 'wikipediaOnly', what: 'dry, one YF-75D',
      sources: ['https://en.wikipedia.org/wiki/YF-75D', 'https://zh.wikipedia.org/wiki/YF-75D', 'https://zh.wikipedia.org/zh-hans/YF%E7%B3%BB%E5%88%97%E7%81%AB%E7%AE%AD%E5%8F%91%E5%8A%A8%E6%9C%BA'],
      note: 'Encyclopedic only (en and zh Wikipedia); consistent with a thrust/weight of 34.0 at 88.36 kN. No maker’s figure found.' } },
  // --- H3
  { id: 'le9', kind: 'engine', family: 'hydrolox', name: 'LE-9', thrustSL: 1220 * kN, thrustVac: 1471 * kN, ispSL: 352, ispVac: 425, minThrottle: 0.63,
    source: UNCITED,
    mass: { kg: 2400, basis: 'published', what: 'dry, one LE-9',
      sources: ['https://www.mhi.com/business/products-services/space-defense/rocket-engines-testing/h3-first-stage-engine-le-9', 'https://www.rocket.jaxa.jp/rocket/engine/le9/', 'https://en.wikipedia.org/wiki/LE-9'],
      note: 'MHI (the maker) and JAXA agree.' } },
  { id: 'srb3', kind: 'engine', family: 'solid', name: 'SRB-3', thrustSL: 1650 * kN, thrustVac: 1780 * kN, ispSL: 265, ispVac: 283.6, solid: true, peakFactor: 1.29,
    variantOf: 'srba3', source: `${W}H3_(rocket) (published peak 2 300 kN, for peakFactor); mean thrust and Isp ${UNCITED}`,
    mass: { kg: 9000, basis: 'published', what: 'INERT mass of one SRB-3 booster with its nose cone and attach hardware, gross minus propellant from JAXA’s H3-F9 launch plan ((152.4 − 134.4 t)/2); a solid motor’s inert mass (case, nozzle, hardware) belongs to the motor’s own body, not to an engine a tank is fitted with',
      sources: ['https://www.jaxa.jp/press/2026/06/files/jaxa20260615-1_01.pdf', 'https://www.rocket.jaxa.jp/rocket/h3/srb3.html', 'https://en.wikipedia.org/wiki/SRB-A'],
      note: 'JAXA’s plan gives the pair, with the propellant labelled a maximum. JAXA’s SRB-3 page gives planning values (75.5 / 66.8 t) that make 8.7 t, the strap-on body’s dry mass.' } },
  { id: 'le5b3', kind: 'engine', family: 'hydrolox', name: 'LE-5B-3', thrustSL: 80 * kN, thrustVac: 137 * kN, ispSL: 280, ispVac: 448, vacuumOnly: true,
    variantOf: 'le5b', source: UNCITED,
    mass: { kg: 303, basis: 'published', what: 'dry, one LE-5B-3',
      sources: ['https://www.eucass.eu/doi/EUCASS2019-0626.pdf', 'https://www.rocket.jaxa.jp/rocket/h3/le5b.html', 'https://www.mhi.com/business/products-services/space-defense/rocket-engines-testing/h3-h2a-h2b-second-stage-engine-le-5b', 'https://en.wikipedia.org/wiki/LE-5'],
      note: 'The JAXA/MHI engine table (EUCASS 2019); JAXA’s web page rounds it to about 300 kg. MHI’s single 285 kg block is not specific to the -3.' } },
  // --- PSLV-XL
  { id: 's139', kind: 'engine', family: 'solid', name: 'S139', thrustSL: 3000 * kN, thrustVac: 3400 * kN, ispSL: 237, ispVac: 269, solid: true, peakFactor: 1.43,
    source: `${W}Polar_Satellite_Launch_Vehicle (published peak 4 846.9 kN, for peakFactor); mean thrust and Isp ${UNCITED}`,
    mass: { kg: 30200, basis: 'secondary', what: 'INERT (empty) mass of the S139 / PS1 stage, probably with its SITVC and RCS hardware and skirts as well as the motor case; a solid motor’s inert mass (case, nozzle, hardware) belongs to the motor’s own body, not to an engine a tank is fitted with',
      sources: ['https://en.wikipedia.org/wiki/S139_Booster', 'https://en.wikipedia.org/wiki/Polar_Satellite_Launch_Vehicle', 'https://web.archive.org/web/20150924115759/http://www.spaceflight101.com/pslv-launch-vehicle-information.html', 'http://www.astronautix.com/p/pslv.html', 'http://www.astronautix.com/p/pslv-1.html', 'https://www.isro.gov.in/PSLV_CON.html'],
      note: 'Spaceflight101 (cited by Wikipedia’s PSLV article) and astronautix’s PSLV page; astronautix’s PSLV-1 page gives 31 200 kg. ISRO publishes only the propellant load. Equal to the PS1 stage body’s dry mass.' } },
  { id: 'psomxl', kind: 'engine', family: 'solid', name: 'PSOM-XL', thrustSL: 420 * kN, thrustVac: 460 * kN, ispSL: 240, ispVac: 262, solid: true, peakFactor: 1.53,
    source: `${W}Polar_Satellite_Launch_Vehicle (published peak 703.5 kN, for peakFactor); mean thrust and Isp ${UNCITED}`,
    mass: { kg: null, basis: 'unpublished', what: 'INERT mass of one PSOM-XL strap-on motor; a solid motor’s inert mass (case, nozzle, hardware) belongs to the motor’s own body, not to an engine a tank is fitted with',
      sources: ['https://www.isro.gov.in/PSLV_CON.html', 'https://www.vssc.gov.in/PSLV.html', 'https://en.wikipedia.org/wiki/Polar_Satellite_Launch_Vehicle', 'https://space.skyrocket.de/doc_lau_det/pslv-xl.htm', 'https://web.archive.org/web/20150924115759/http://www.spaceflight101.com/pslv-launch-vehicle-information.html', 'http://www.astronautix.com/p/pslv.html', 'http://www.astronautix.com/p/pslv-xl.html'],
      note: 'No XL-specific figure is published. The strap-on bodies’ 2 010 kg is the standard 9 t PSOM’s (astronautix, Spaceflight101), not the XL’s; rounded launch masses would imply about 2.0 t (Spaceflight101) or 2.8 t (ISRO), too coarse to publish.' } },
  { id: 'vikas', kind: 'engine', family: 'hypergolic', name: 'Vikas', thrustSL: 725 * kN, thrustVac: 803 * kN, ispSL: 262, ispVac: 293,
    source: UNCITED,
    mass: { kg: 900, basis: 'secondary', what: 'dry, one Vikas (PSLV’s second-stage engine)',
      sources: ['https://web.archive.org/web/20150924115759/http://www.spaceflight101.com/pslv-launch-vehicle-information.html', 'http://www.astronautix.com/v/viking4.html', 'http://www.astronautix.com/p/pslv-2.html', 'https://en.wikipedia.org/wiki/Viking_(rocket_engine)', 'https://en.wikipedia.org/wiki/Vikas_(rocket_engine)', 'https://www.lpsc.gov.in/propulsionsystems.html'],
      note: 'Spaceflight101, a secondary source that Wikipedia’s Vikas and PSLV articles cite. No ISRO, LPSC or Godrej figure exists. The Viking 4’s 850 kg (astronautix) and 826 kg (Wikipedia) are the parent engine’s.' } },
  // HPS3 (PSLV PS3): the 240 kN figure is the peak of the grain. 7 600 kg burned
  // in the published 126.7 s is a 60 kg/s mean flow, i.e. ~174 kN mean vacuum
  // thrust — the same correction as P120C above, and the second half of audit
  // item B22 (docs/history/AUDIT-2026-09-16.md). The old pair burned the grain out in
  // 91.6 s, 27.7 % short.
  { id: 'hps3', kind: 'engine', family: 'solid', name: 'HPS3', thrustSL: 150 * kN, thrustVac: 174 * kN, ispSL: 260, ispVac: 295, solid: true, peakFactor: 1.44,
    source: `${W}Polar_Satellite_Launch_Vehicle`,
    mass: { kg: 1100, basis: 'secondary', what: 'INERT (unfuelled) mass of the PS3 motor and stage: Kevlar-epoxy case, nozzle and stage hardware; a solid motor’s inert mass (case, nozzle, hardware) belongs to the motor’s own body, not to an engine a tank is fitted with',
      sources: ['http://www.astronautix.com/p/pslv-3.html', 'http://www.astronautix.com/p/pslv.html', 'https://web.archive.org/web/20150924115759/http://www.spaceflight101.com/pslv-launch-vehicle-information.html', 'https://www.vssc.gov.in/PSLV.html'],
      note: 'astronautix (two pages) and Spaceflight101 agree on 1 100 kg although their gross masses disagree (8 300, 8 400 and 7 800 kg). ISRO gives only the propellant load. Equal to the PS3 stage body’s dry mass.' } },
  { id: 'l25', kind: 'engine', family: 'hypergolic', name: 'L-2-5', thrustSL: 5 * kN, thrustVac: 7.3 * kN, ispSL: 260, ispVac: 308, vacuumOnly: true,
    source: UNCITED,
    mass: { kg: null, basis: 'unpublished', what: 'one PS4 pressure-fed MMH/MON-3 engine, dry',
      sources: ['https://www.lpsc.gov.in/propulsionsystems.html', 'http://www.astronautix.com/p/pslv-4.html', 'https://web.archive.org/web/20150924115759/http://www.spaceflight101.com/pslv-launch-vehicle-information.html'],
      note: 'Not published: LPSC gives thrust, burn time and propellant load, and astronautix and Spaceflight101 only the stage’s 920 kg inert mass.' } },
  // --- Electron
  // Rutherford: 24 kN sea level / 25.8 kN vacuum, Isp 311 / 343 s. Both numbers
  // are quoted: the infobox gives 24 kN at sea level and 25.8 kN in vacuum for
  // the same engine, and 25.8 kN is what the vacuum variant below has always
  // carried. An earlier draft rounded the vacuum figure down to 25 kN; it is
  // quoted here as published. The file before that wave carried 24.9 / 27.5 kN,
  // which burned the 9.7 t first stage in 132 s against a published MECO near
  // T+152 s; at the published pair the nine-engine mean mass flow is 68.4 kg/s
  // and the stage burns 142 s. This is a correction to an existing vehicle
  // (Electron) made by the fleet-data wave — see the Electron entry in the
  // reference-timeline table.
  { id: 'rutherford', kind: 'engine', family: 'kerolox', name: 'Rutherford', thrustSL: 24 * kN, thrustVac: 25.8 * kN, ispSL: 311, ispVac: 343, minThrottle: 0.5,
    source: `${W}Rutherford_(rocket_engine)`,
    mass: { kg: 35, basis: 'published', what: 'one Rutherford (“Weighing just 35 kg each”); whether the battery is included is not said, taken as the engine alone',
      sources: ['https://web.archive.org/web/20250405081142id_/https://www.rocketlabusa.com/updates/rocket-lab-celebrates-100th-rutherford-engine-build/', 'https://spacenews.com/rocket-lab-celebrates-100th-rutherford-engine-build/', 'https://en.wikipedia.org/w/index.php?title=Rutherford_(rocket_engine)&action=raw'],
      note: 'Rocket Lab’s own release (Wayback copy); SpaceNews and the Wikipedia infobox agree.' } },
  { id: 'rutherford-vac', kind: 'engine', family: 'kerolox', name: 'Rutherford Vacuum', thrustSL: 18 * kN, thrustVac: 25.8 * kN, ispSL: 260, ispVac: 343, minThrottle: 0.5, vacuumOnly: true,
    variantOf: 'rutherford', source: `${W}Rutherford_(rocket_engine)`,
    mass: { kg: 35, basis: 'inferred', what: 'Rocket Lab’s one family-wide Rutherford figure, applied to the vacuum version: a lower bound',
      sources: ['https://web.archive.org/web/20250405081142id_/https://www.rocketlabusa.com/updates/rocket-lab-celebrates-100th-rutherford-engine-build/', 'https://en.wikipedia.org/w/index.php?title=Rutherford_(rocket_engine)&action=raw'],
      note: 'INFERRED: no mass is published for the vacuum version, whose larger nozzle makes it heavier by an unpublished amount.' } },
  { id: 'curie', kind: 'engine', family: 'hypergolic', name: 'Curie', thrustSL: 0.1 * kN, thrustVac: 0.12 * kN, ispSL: 250, ispVac: 320, vacuumOnly: true,
    source: UNCITED,
    mass: { kg: null, basis: 'unpublished', what: 'one Curie kick-stage engine',
      sources: ['https://en.wikipedia.org/w/index.php?title=Curie_(rocket_engine)&action=raw', 'https://en.wikipedia.org/w/index.php?title=Rocket_Lab_Electron&action=raw'],
      note: 'No published mass: the Curie infobox’s dry-weight field is empty and the Electron article gives none. The “35 kg” of web-search summaries confuses Curie with Rutherford.' } },
  // --- Vega-C (Avio / ESA). Solid mean thrusts are derived from grain mass /
  // published burn time, as for P120C above.
  { id: 'zefiro40', kind: 'engine', family: 'solid', name: 'Zefiro 40', thrustSL: 1033 * kN, thrustVac: 1122.9 * kN, ispSL: 270, ispVac: 293.5, solid: true, peakFactor: 1.16,
    source: `${W}Vega_C`,
    mass: { kg: 3230, basis: 'published', what: 'INERT (dry) mass of one motor as Avio publishes it; the case alone is 2 130 kg; a solid motor’s inert mass (case, nozzle, hardware) belongs to the motor’s own body, not to an engine a tank is fitted with',
      sources: ['https://www.avio.com/vega-c'],
      note: 'Avio (“3.230” in Italian notation); equal to the Zefiro 40 stage body’s dry mass.' } },
  { id: 'zefiro9', kind: 'engine', family: 'solid', name: 'Zefiro 9', thrustSL: 234 * kN, thrustVac: 256.4 * kN, ispSL: 270, ispVac: 295.9, solid: true, peakFactor: 1.24,
    source: `${W}Vega_C`,
    mass: { kg: 929, basis: 'published', what: 'INERT (dry) mass of one Zefiro 9 (Z9A) as Avio publishes it; the case alone is 630 kg; a solid motor’s inert mass (case, nozzle, hardware) belongs to the motor’s own body, not to an engine a tank is fitted with',
      sources: ['https://www.avio.com/vega-c'],
      note: 'Avio; equal to the Zefiro 9 stage body’s dry mass.' } },
  { id: 'avum-plus', kind: 'engine', family: 'hypergolic', name: 'AVUM+ (RD-869)', thrustSL: 1.9 * kN, thrustVac: 2.42 * kN, ispSL: 248, ispVac: 315.8, vacuumOnly: true,
    source: `${W}Vega_C`,
    mass: { kg: 15.93, basis: 'published', what: 'one AVUM+ main engine (RD-843), “without plate and gears”: the engine only, not the stage’s 695 kg',
      sources: ['https://yuzhmash.com/en/products/liquid-rocket-engines/liquid-rocket-engine-rd-843/', 'https://www.avio.com/vega-c', 'https://en.wikipedia.org/w/index.php?title=RD-843&action=raw'],
      note: 'Yuzhmash (the maker) gives 15.93 kg and Avio 16 kg. The part is named RD-869; the flown engine is the RD-843, which uses the RD-869’s thrust chamber.' } },
  // --- Long March 2D / 3B (SAST / CALT). N2O4/UDMH.
  // The YF-21C cluster is 4 x YF-20C at 740.4 kN sea level each; vacuum thrust
  // follows from the same mass flow at the published 289 s vacuum Isp.
  { id: 'yf21c', kind: 'cluster', family: 'hypergolic', name: 'YF-21C (4× YF-20C)', thrustSL: 740.4 * kN, thrustVac: 823 * kN, ispSL: 260, ispVac: 289,
    source: `${W}Long_March_2D ; ${W}Long_March_3B`, note: 'figures per YF-20C, installed as four',
    mass: { kg: 712.5, basis: 'inferred', what: 'one YF-20C, this cluster’s per-count unit, taken as the published YF-20/YF-20B single engine; 4 × 712.5 kg is the published 2 850 kg four-engine module',
      sources: ['https://en.wikipedia.org/wiki/YF-20', 'https://zh.wikipedia.org/wiki/YF-20', 'https://zh.wikipedia.org/zh-hans/YF%E7%B3%BB%E5%88%97%E7%81%AB%E7%AE%AD%E5%8F%91%E5%8A%A8%E6%9C%BA', 'https://www.globalsecurity.org/space/library/report/1999/lm3bchapter2.pdf'],
      note: 'INFERRED: a stand-in from the YF-20/20B generation (Wikipedia figures); no YF-20C or YF-21C figure found. The single-engine value may itself be 2 850 / 4.' } },
  // YF-24C/E = YF-22C main (742.04 kN, 300 s) + 4 YF-23C verniers (47.1 kN total, 289 s),
  // lumped into one entry with the combined thrust and the flow-weighted Isp.
  { id: 'yf24c', kind: 'lumped', family: 'hypergolic', name: 'YF-24C (YF-22C + 4× YF-23C)', thrustSL: 700 * kN, thrustVac: 789.14 * kN, ispSL: 265.5, ispVac: 299.4,
    source: `${W}Long_March_2D ; ${W}Long_March_3B`, note: 'main engine and four verniers as one entry, count 1; flies the CZ-3B/E second stage (YF-24E) too',
    mass: { kg: 957, basis: 'inferred', what: 'the whole second-stage propulsion module as this lumped entry carries it (main engine and four verniers), taken as the published YF-24B/24D module',
      sources: ['https://zh.wikipedia.org/zh-hans/YF%E7%B3%BB%E5%88%97%E7%81%AB%E7%AE%AD%E5%8F%91%E5%8A%A8%E6%9C%BA', 'https://www.globalsecurity.org/space/library/report/1999/lm3bchapter2.pdf'],
      note: 'INFERRED: a stand-in. zh.wikipedia’s table (no inline citation) gives 957 kg for the YF-24B/24D at 789 kN, the class of this part’s 789.14 kN; the CALT LM-3B manual (1999) gives the thrusts but no masses.' } },
  // CZ-3B/E strap-on: one YF-25 (the booster variant of the YF-20), 740.4 kN sea level.
  { id: 'yf25', kind: 'engine', family: 'hypergolic', name: 'YF-25', thrustSL: 740.4 * kN, thrustVac: 820.9 * kN, ispSL: 260.66, ispVac: 289,
    variantOf: 'yf21c', source: `${W}Long_March_3B`, note: 'the strap-on version of the YF-20, whose figures the YF-21C part carries per engine',
    mass: { kg: 712.5, basis: 'inferred', what: 'one strap-on engine, taken as the published YF-20B',
      sources: ['https://zh.wikipedia.org/wiki/YF-20', 'https://zh.wikipedia.org/zh-hans/YF%E7%B3%BB%E5%88%97%E7%81%AB%E7%AE%AD%E5%8F%91%E5%8A%A8%E6%9C%BA', 'http://www.astronautix.com/y/yf-25.html', 'https://www.globalsecurity.org/space/library/report/1999/lm3bchapter2.pdf'],
      note: 'INFERRED: a stand-in. The CALT LM-3B manual (1999) says the boosters use the first stage’s engine (DaFY5-1, the YF-20B by zh.wikipedia); no YF-25 mass is published.' } },
  // CZ-3B third stage: 2 x YF-75 at 167.17 kN total, 438 s vacuum.
  { id: 'yf75', kind: 'lumped', family: 'hydrolox', name: 'YF-75', thrustSL: 120 * kN, thrustVac: 167.17 * kN, ispSL: 314.5, ispVac: 438, vacuumOnly: true,
    source: `${W}Long_March_3B`, note: 'two engines’ total thrust at count 1',
    mass: { kg: 490, basis: 'wikipediaOnly', what: 'the two YF-75 this lumped entry carries (its 167.17 kN is the pair), as 2 × 245 kg single-engine dry mass; the dual-mount frame not included',
      sources: ['https://zh.wikipedia.org/wiki/YF-75', 'https://zh.wikipedia.org/zh-hans/YF%E7%B3%BB%E5%88%97%E7%81%AB%E7%AE%AD%E5%8F%91%E5%8A%A8%E6%9C%BA', 'https://en.wikipedia.org/wiki/YF-75', 'http://www.astronautix.com/y/yf-75.html'],
      note: 'zh.wikipedia’s single-engine 245 kg, doubled. en.wikipedia’s 550 kg cannot be traced to the sources it cites. No CASC or CALT figure found.' } },
  // --- H-IIA 202 (MHI / JAXA), retired after flight 50 on 28 June 2025.
  { id: 'le7a', kind: 'engine', family: 'hydrolox', name: 'LE-7A', thrustSL: 843 * kN, thrustVac: 1098 * kN, ispSL: 337.8, ispVac: 440, historical: true,
    source: `${W}H-IIA`,
    mass: { kg: 1780, basis: 'published', what: 'dry, one LE-7A with the long nozzle (3 670 mm)',
      sources: ['https://www.mhi.com/business/products-services/space-defense/rocket-engines-testing/h2a-h2b-first-stage-engine-le-7a', 'https://www.rocket.jaxa.jp/rocket/engine/le7/', 'https://www.rocket.jaxa.jp/rocket/engine/le9/', 'https://en.wikipedia.org/wiki/LE-7'],
      note: 'MHI (1 780 kg, 3 670 mm) matches JAXA’s long-nozzle column (about 1.8 t) and the part’s 1 098 kN.' } },
  // SRB-A3: 66.8 t of grain in ~100 s is a 668 kg/s mean flow, i.e. ~1 858 kN mean
  // vacuum thrust; the 2 260-2 520 kN figures are the peak of the regressive grain.
  { id: 'srba3', kind: 'engine', family: 'solid', name: 'SRB-A3', thrustSL: 1736 * kN, thrustVac: 1857.9 * kN, ispSL: 265, ispVac: 283.6, solid: true, peakFactor: 1.22, historical: true,
    source: `${W}H-IIA`,
    mass: { kg: 10600, basis: 'published', what: 'INERT mass of one SRB-A3, gross minus propellant from JAXA’s table (75.5 − 64.9 t = 76.6 − 66.0 t = 10.6 t); a solid motor’s inert mass (case, nozzle, hardware) belongs to the motor’s own body, not to an engine a tank is fitted with',
      sources: ['https://www.rocket.jaxa.jp/rocket/engine/srba/', 'https://www.rocket.jaxa.jp/rocket/h3/srb3.html'],
      note: 'JAXA; both motor variants give 10.6 t. The H-IIA strap-on body carries 8 700 / 66 800 kg, which are the SRB-3 planning values, not the SRB-A3’s: a finding recorded here, not a change to the flown data.' } },
  { id: 'le5b', kind: 'engine', family: 'hydrolox', name: 'LE-5B', thrustSL: 90 * kN, thrustVac: 137 * kN, ispSL: 293.7, ispVac: 447, vacuumOnly: true, historical: true,
    source: `${W}H-IIA`,
    mass: { kg: 285, basis: 'published', what: 'dry, one LE-5B',
      sources: ['https://www.mhi.com/business/products-services/space-defense/rocket-engines-testing/h3-h2a-h2b-second-stage-engine-le-5b', 'https://www.rocket.jaxa.jp/rocket/engine/le5b/', 'https://en.wikipedia.org/wiki/LE-5', 'https://www.eucass.eu/doi/EUCASS2019-0626.pdf'],
      note: 'MHI gives 285 kg and JAXA’s LE-5 page 290 kg; the part’s 447 s is the original LE-5B, which 285 kg fits. The later LE-5B-2 is 298 kg (JAXA/MHI, EUCASS 2019).' } },
  // --- Starship
  { id: 'raptor2', kind: 'engine', family: 'methalox', name: 'Raptor 2', thrustSL: 2300 * kN, thrustVac: 2500 * kN, ispSL: 327, ispVac: 347, minThrottle: 0.4,
    source: UNCITED,
    mass: { kg: 1630, basis: 'published', what: 'one Raptor 2 sea-level engine, “Engine mass: 1630kg”; 2 875 kg with the vehicle-side commodities and hardware',
      sources: ['https://x.com/SpaceX/status/1819795288116330594', 'https://api.fxtwitter.com/SpaceX/status/1819795288116330594', 'https://en.wikipedia.org/w/index.php?title=SpaceX_Raptor&action=raw'],
      note: 'SpaceX (post of 3 August 2024, read through a mirror); Wikipedia agrees. For installed-mass bookkeeping 2 875 kg per engine is the more complete figure.' } },
  { id: 'raptor2-rvac', kind: 'lumped', family: 'methalox', name: 'Raptor 2 / RVac', thrustSL: 2000 * kN, thrustVac: 2400 * kN, ispSL: 320, ispVac: 365, minThrottle: 0.4,
    variantOf: 'raptor2', source: UNCITED, note: 'three sea-level Raptors and three RVacs blended into one figure, count 6',
    mass: { kg: null, basis: 'unpublished', what: 'this lumped entry: three sea-level Raptor 2 and three Raptor Vacuum, counted as six',
      sources: ['https://api.fxtwitter.com/SpaceX/status/1819795288116330594', 'https://en.wikipedia.org/w/index.php?title=SpaceX_Raptor&action=raw'],
      note: 'No figure: the Raptor Vacuum’s mass is unpublished (SpaceX’s post covers the sea-level engines only). The RVac is heavier for its nozzle extension, so 1 630 kg per unit is a lower bound.' } },
  // --- C01 historical vehicles. Published figures (astronautix.com, the
  // Saturn V Flight Manual SA-503 and the AS-506 launch vehicle flight
  // evaluation report); sea-level Isp taken as vacuum Isp × sea-level/vacuum
  // thrust, the ratio a fixed nozzle delivers.
  { id: 'rd107-8d74ps', kind: 'engine', family: 'kerolox', name: 'RD-107 (8D74PS)', thrustSL: 813 * kN, thrustVac: 1000 * kN, ispSL: 248.8, ispVac: 306, historical: true,
    variantOf: 'rd107a', source: C01, note: 'the 1957 R-7 strap-ons: four chambers plus two verniers, fixed thrust',
    mass: { kg: 1155, basis: 'secondary', what: 'unfuelled, one 8D74PS (four chambers and two verniers), as astronautix gives it',
      sources: ['http://www.astronautix.com/r/rd-107-8d74ps.html', 'https://web.archive.org/web/20190308003032/http://engine.space/dejatelnost/engines/rd-107-108/', 'http://www.lpre.de/energomash/RD-107/index.htm'],
      note: 'astronautix only. Its 8D74PS and 8D75PS masses equal lpre.de’s for the much later 11D512 and 11D511, so they may be carried over rather than the variant’s own; the nearest maker’s figure is the base RD-107 (8D74), 1 190 kg, an equally defensible value.' } },
  { id: 'rd108-8d75ps', kind: 'engine', family: 'kerolox', name: 'RD-108 (8D75PS)', thrustSL: 745 * kN, thrustVac: 941 * kN, ispSL: 243.8, ispVac: 308, historical: true,
    variantOf: 'rd108a', source: C01, note: 'the 1957 R-7 core',
    mass: { kg: 1250, basis: 'secondary', what: 'unfuelled, one 8D75PS (four chambers and four verniers), as astronautix gives it',
      sources: ['http://www.astronautix.com/r/rd-108-8d75ps.html', 'https://web.archive.org/web/20190308003032/http://engine.space/dejatelnost/engines/rd-107-108/', 'http://www.lpre.de/energomash/RD-107/index.htm'],
      note: 'astronautix only, with the same caution as the 8D74PS: 1 250 kg is lpre.de’s figure for the later 11D511. Energomash gives the base RD-108 (8D75) as 1 278 kg.' } },
  { id: 'rd107-8d74k', kind: 'engine', family: 'kerolox', name: 'RD-107 (8D74K)', thrustSL: 821 * kN, thrustVac: 1000 * kN, ispSL: 257, ispVac: 313, historical: true,
    variantOf: 'rd107a', source: C01, note: 'Vostok-K’s strap-ons',
    mass: { kg: 1190, basis: 'inferred', what: 'dry, the base RD-107 (8D74) that Energomash publishes for the Vostok launcher; 1 300 kg filled',
      sources: ['https://web.archive.org/web/20190308003032/http://engine.space/dejatelnost/engines/rd-107-108/', 'http://www.lpre.de/energomash/RD-107/index.htm', 'http://www.astronautix.com/r/rd-107-8d74k.html'],
      note: 'INFERRED: the base engine’s figure, attributed to this part because lpre.de says the Vostok 8K72K flew the base 8D74 and 8D75. For the 8D74K index proper astronautix gives 1 145 kg and lpre.de 1 100 kg (as the re-indexed 8D728); the part’s index label may be what is wrong.' } },
  { id: 'rd108-8d75k', kind: 'engine', family: 'kerolox', name: 'RD-108 (8D75K)', thrustSL: 745 * kN, thrustVac: 941 * kN, ispSL: 249.4, ispVac: 315, historical: true,
    variantOf: 'rd108a', source: C01, note: 'Vostok-K’s core',
    mass: { kg: 1278, basis: 'inferred', what: 'dry, the base RD-108 (8D75) that Energomash publishes for the Vostok launcher; 1 402 kg filled',
      sources: ['https://web.archive.org/web/20190308003032/http://engine.space/dejatelnost/engines/rd-107-108/', 'http://www.lpre.de/energomash/RD-107/index.htm', 'https://ru.wikipedia.org/wiki/РД-108', 'http://www.astronautix.com/r/rd-108-8d75k.html'],
      note: 'INFERRED, as for the 8D74K: the base engine’s figure. astronautix gives 1 252 kg for the 8D75K proper.' } },
  { id: 'rd0109', kind: 'engine', family: 'kerolox', name: 'RD-0109', thrustSL: 40 * kN, thrustVac: 54.5 * kN, ispSL: 240, ispVac: 323.5, vacuumOnly: true, historical: true,
    source: C01, note: 'Blok E: one fixed chamber, steered by four turbine-exhaust nozzles',
    mass: { kg: 121, basis: 'published', what: 'engine mass, one RD-0109 (one fixed chamber, steered by turbine-exhaust nozzles)',
      sources: ['https://web.archive.org/web/20160308170555/http://kbkha.ru/?cat=8&p=8&prod=38', 'http://www.astronautix.com/r/rd-0109.html', 'https://en.wikipedia.org/wiki/RD-0109'],
      note: 'KBKhA (2016 archive), astronautix and en.wikipedia agree.' } },
  { id: 'f1', kind: 'engine', family: 'kerolox', name: 'F-1', thrustSL: 6770 * kN, thrustVac: 7770 * kN, ispSL: 264.9, ispVac: 304, historical: true,
    source: C01, note: 'fixed thrust; five on the S-IC',
    mass: { kg: 8391, basis: 'published', what: 'one F-1, “WEIGHT FLIGHT CONFIGURATION 18,500 lb. maximum”',
      sources: ['http://www.apolloexplorer.co.uk/pdf/saturnv/F-1%20Engine.pdf', 'http://www.astronautix.com/f/f-1.html', 'https://en.wikipedia.org/w/index.php?title=Rocketdyne_F-1&action=raw'],
      note: 'NASA MSFC Saturn V News Reference; astronautix gives 8 391 kg too. The sheet says flight configuration, maximum, rather than dry.' } },
  { id: 'j2', kind: 'engine', family: 'hydrolox', name: 'J-2', thrustSL: 486 * kN, thrustVac: 1033 * kN, ispSL: 200, ispVac: 421, vacuumOnly: true, historical: true,
    source: C01, note: 'five on the S-II, one on the S-IVB, which restarts for the translunar injection',
    mass: { kg: 1578.5, basis: 'published', what: 'one J-2, “WEIGHT, DRY, FLIGHT CONFIGURATION 3,480 lb.”; five on the S-II, one on the S-IVB',
      sources: ['http://www.apolloexplorer.co.uk/pdf/saturnv/J-2%20Engine.pdf', 'http://www.astronautix.com/j/j-2.html', 'https://en.wikipedia.org/w/index.php?title=Rocketdyne_J-2&action=raw'],
      note: 'NASA MSFC Saturn V News Reference (changed December 1968). Sources disagree: astronautix 1 438 kg; Wikipedia’s infobox 1 788 kg and its table 1 438 kg. The agency figure is used.' } },
];

// ---------------------------------------------------------------- stage bodies
export const STAGE_BODIES: readonly StageBodyPart[] = [
  // THE R-7 CORE, IN TWO VARIANTS — and the split is the point, not an accident.
  //
  // Blok A's published masses (https://en.wikipedia.org/wiki/Soyuz-2_(rocket) ):
  // gross 99 765 kg, empty 6 545 kg, propellant 63 800 kg LOX + 26 300 kg RP-1 =
  // 90 100 kg. The dry mass is exactly right here. The propellant was
  // 87 000 kg, 3.4 % light — and note that the published figures do not close
  // among themselves either (99 765 − 6 545 = 93 220 kg, 3 120 kg above the
  // LOX+RP-1 sum), so 90 100 kg is itself a ±3 t number.
  //
  // Soyuz-2.1a and 2.1b fly the SAME core. But 2.1a is the application's
  // default mission and the one vehicle whose whole published timeline is
  // pinned as a regression band (booster separation T+118 s, core cut-off
  // T+287 s, SECO T+528 s — tests/fleet-defaults.test.ts), and 3 100 kg more
  // core propellant moves core cut-off by ~10 s. Ten seconds is inside that
  // band, but it would be spent on a figure that is itself uncertain by more
  // than the change.
  //
  // So the correction lands where it is free: 2.1b, which has no published-clock
  // regression band, takes the audited load, and 2.1a keeps the 87 000 kg that
  // reproduces its callouts. That is a deliberate, documented divergence between
  // two records of the same hardware, not two independent estimates — which is
  // why 2.1b's body is a variant of 2.1a's and both stand on one strap-on body.
  // See docs/history/AUDIT-2026-09-16.md, data proposals, "soyuz Blok A".
  { id: 'blokA-soyuz21a', stageId: 'blokA', name: 'Blok A (core)', dryMass: 6545, propellantMass: 87000, diameter: 2.95, length: 27.8,
    engine: { part: 'rd108a', count: 1 }, source: `${W}Soyuz-2_(rocket) (dry mass); 87 000 kg held to the published 2.1a clock` },
  { id: 'blokA-soyuz21b', stageId: 'blokA', name: 'Blok A (core)', dryMass: 6545, propellantMass: 90100, diameter: 2.95, length: 27.8,
    engine: { part: 'rd108a', count: 1 }, variantOf: 'blokA-soyuz21a', source: `${W}Soyuz-2_(rocket) (63 800 LOX + 26 300 RP-1)` },
  { id: 'blokI-rd0110', stageId: 'blokI', name: 'Blok I (3rd stage, RD-0110)', dryMass: 2410, propellantMass: 22900, diameter: 2.66, length: 6.7,
    engine: { part: 'rd0110', count: 1 }, source: UNCITED },
  { id: 'blokI-rd0124', stageId: 'blokI', name: 'Blok I (3rd stage)', dryMass: 2355, propellantMass: 23000, diameter: 2.66, length: 6.7,
    engine: { part: 'rd0124', count: 1 }, variantOf: 'blokI-rd0110', source: UNCITED },
  { id: 'fregat', stageId: 'fregat', name: 'Fregat-M', dryMass: 1050, propellantMass: 5350, diameter: 3.35, length: 1.5,
    engine: { part: 's592', count: 1 }, source: UNCITED },
  // Proton's first stage is 4.1 m, not 7.4 m: audit item B23. 7.4 m is the SPAN
  // across the six outboard fuel tanks, and `VehicleModel.frontalArea()` turns
  // the widest attached stage diameter into a full circle — pi(7.4/2)^2 =
  // 43.0 m^2 against a real frontal area of about 25 m^2 (the 4.1 m core,
  // 13.2 m^2, plus six ~1.6 m tanks, 12.1 m^2). Proton was flying with 70 % too
  // much drag through the whole atmospheric phase.
  //
  // The tanks are NOT a strap-on body: they feed the six RD-276 through the
  // flight and are jettisoned with the stage, so modelling them as separable
  // boosters would invent a staging event Proton does not have. Instead the
  // stage carries its real diameter and the vehicle carries a `dragArea`
  // override (src/data/vehicles.ts).
  { id: 'p1', stageId: 'p1', name: 'First stage (6× RD-276)', dryMass: 30600, propellantMass: 419400, diameter: 4.1, length: 21.2,
    engine: { part: 'rd276', count: 6 }, source: `${UNCITED}; diameter: audit item B23` },
  { id: 'p2', stageId: 'p2', name: 'Second stage', dryMass: 11000, propellantMass: 156100, diameter: 4.1, length: 17,
    engine: { part: 'rd0210', count: 4 }, source: UNCITED },
  { id: 'p3', stageId: 'p3', name: 'Third stage', dryMass: 3500, propellantMass: 46600, diameter: 4.1, length: 6.5,
    engine: { part: 'rd0213', count: 1 }, source: UNCITED },
  { id: 'brizm', stageId: 'brizm', name: 'Briz-M', dryMass: 2370, propellantMass: 19800, diameter: 4.0, length: 2.6,
    engine: { part: 's598m', count: 1 }, source: UNCITED, note: 'Proton-M and Angara-A5' },
  { id: 'urm1core', stageId: 'urm1core', name: 'URM-1 core', dryMass: 9000, propellantMass: 128800, diameter: 2.9, length: 25.7,
    engine: { part: 'rd191', count: 1 }, source: UNCITED, note: 'the same URM-1 module as the strap-on body urm1' },
  { id: 'urm2', stageId: 'urm2', name: 'URM-2', dryMass: 4000, propellantMass: 35800, diameter: 3.6, length: 6.9,
    engine: { part: 'rd0124a', count: 1 }, source: UNCITED },
  // Published first-stage masses: 287 400 kg LOX + 123 500 kg RP-1 and a
  // 22 200 kg empty stage (Espace & Exploration no. 39, May 2017, as cited by
  // Wikipedia's "Falcon 9 Block 5"). The 395 700 / 25 600 kg flown before cut
  // the burn ~10 % short of five flights' webcast telemetry (docs/VALIDATION.md,
  // F1). Falcon Heavy's three cores carry the same load (F11).
  { id: 's1', stageId: 's1', name: 'First stage (9× Merlin 1D)', dryMass: 22200, propellantMass: 410900, diameter: 3.66, length: 42,
    engine: { part: 'merlin1d', count: 9 }, source: 'Espace & Exploration no. 39 (May 2017), as cited by Wikipedia’s “Falcon 9 Block 5”' },
  { id: 's2', stageId: 's2', name: 'Second stage (Merlin Vacuum)', dryMass: 4300, propellantMass: 108000, diameter: 3.66, length: 15,
    engine: { part: 'mvac', count: 1 }, source: UNCITED, note: 'Falcon 9 and Falcon Heavy' },
  // The centre core's real differences from a side booster are its heavier
  // structure and the throttle-down while the sides burn (an installation
  // field in vehicles.ts); its engines are the same Merlin 1D. Its tanks are a
  // Falcon 9 first stage's and hold its published 410 900 kg (F11). No empty
  // mass is published for the reinforced core: the 28 000 kg is an estimate,
  // 5.8 t over the Falcon 9 stage.
  { id: 'core', stageId: 'core', name: 'Center core', dryMass: 28000, propellantMass: 410900, diameter: 3.66, length: 42,
    engine: { part: 'merlin1d', count: 9 }, variantOf: 's1', source: 'propellant: as the Falcon 9 first stage (s1); dry mass an estimate (not cited in the data)' },
  { id: 'ccb', stageId: 'ccb', name: 'Common Core Booster (RD-180)', dryMass: 21054, propellantMass: 284089, diameter: 3.81, length: 32.5,
    engine: { part: 'rd180', count: 1 }, source: UNCITED },
  { id: 'centaur3', stageId: 'centaur3', name: 'Centaur III (RL10C-1)', dryMass: 2243, propellantMass: 20830, diameter: 3.05, length: 12.7,
    engine: { part: 'rl10c1', count: 1 }, source: UNCITED },
  // AUDIT ITEM B21 — the one finding whose two verifiers pointed in opposite
  // directions, decided from the primary evidence.
  //
  // The candidates were 353 400 kg (Wikipedia's 382 000 kg gross minus
  // 28 600 kg dry) and 481 700 kg (366 500 kg LOX + 115 200 kg LNG). Three
  // independent checks all pick the larger one:
  //
  //  1. ULA's own LNG load is 254 000 lb = 115 200 kg
  //     ( https://www.nasaspaceflight.com/2024/01/vulcan-launch-peregrine-inaugural-flight/ ).
  //     With Wikipedia's gross that leaves 238 200 kg of LOX, a mixture ratio
  //     of 2.07 — methalox runs near 3.4-3.6, and the BE-4 cannot be flown a
  //     third oxidiser-lean.
  //  2. ULA says the core holds "more than a million pounds of liquid
  //     propellant, about 50 percent more propellant mass than the Atlas 5's
  //     first stage"
  //     ( https://spaceflightnow.com/2021/08/25/ula-readies-vulcan-booster-for-cryogenic-tanking-test/ ).
  //     Atlas V's CCB is 284 089 kg here, so 50 % more is 426 000 kg and "more
  //     than a million pounds" is >453 600 kg. 481 700 kg is 1 062 000 lb and
  //     clears both; 353 400 kg is 779 000 lb and clears neither.
  //  3. Burn time. At the model's own mass flow (2 x 2 600 kN / 340 s vac =
  //     1 559 kg/s) the old 430 000 kg burned 275.8 s against a published
  //     299 s, and 353 400 kg would burn 227 s — 24 % short and measurably
  //     WORSE against the published-timeline goal. 481 700 kg burns 309 s,
  //     which the max-Q throttle bucket lengthens further, bracketing 299 s
  //     from the other side.
  //
  // Wikipedia's 382 000 kg gross is simply inconsistent with its own
  // 4 893 kN / 299 s pair (that combination needs ~439 t at full flow), which
  // is probably where the file's 430 000 kg came from in the first place. Both
  // verifiers agreed on the dry mass, and it is taken as published.
  { id: 'v1', stageId: 'v1', name: 'First stage (2× BE-4)', dryMass: 28600, propellantMass: 481700, diameter: 5.4, length: 33.3,
    engine: { part: 'be4', count: 2 }, source: `audit item B21: ${W}Vulcan_Centaur (dry mass); nasaspaceflight.com 2024-01 and spaceflightnow.com 2021-08-25 (propellant)` },
  { id: 'centaur5', stageId: 'centaur5', name: 'Centaur V (2× RL10C-1-1)', dryMass: 5000, propellantMass: 54000, diameter: 5.4, length: 11.7,
    engine: { part: 'rl10c11', count: 2 }, source: UNCITED },
  { id: 'llpm', stageId: 'llpm', name: 'Core (Vulcain 2.1)', dryMass: 15700, propellantMass: 145000, diameter: 5.4, length: 29,
    engine: { part: 'vulcain21', count: 1 }, source: UNCITED },
  { id: 'ulpm', stageId: 'ulpm', name: 'Upper stage (Vinci)', dryMass: 5300, propellantMass: 31000, diameter: 5.4, length: 11.6,
    engine: { part: 'vinci', count: 1 }, source: UNCITED },
  // Vega-C (Avio / ESA): P120C 141 400 kg / 135.7 s, Z40 36 239 kg / 92.9 s,
  // Z9 10 567 kg / 119.6 s, AVUM+ 740 kg / 2.42 kN / 315.8 s.
  { id: 'p120c', stageId: 'p120c', name: 'P120C (first stage)', dryMass: 11200, propellantMass: 141400, diameter: 3.4, length: 13.5,
    engine: { part: 'p120c', count: 1 }, source: `${W}Vega_C`, note: 'the Vega-C casing; Ariane 6’s strap-on is the body p120c among the strap-ons' },
  { id: 'z40', stageId: 'z40', name: 'Zefiro 40 (second stage)', dryMass: 3230, propellantMass: 36239, diameter: 2.3, length: 7.6,
    engine: { part: 'zefiro40', count: 1 }, source: `${W}Vega_C` },
  { id: 'z9', stageId: 'z9', name: 'Zefiro 9 (third stage)', dryMass: 929, propellantMass: 10567, diameter: 1.9, length: 4.12,
    engine: { part: 'zefiro9', count: 1 }, source: `${W}Vega_C` },
  { id: 'avum', stageId: 'avum', name: 'AVUM+ (fourth stage)', dryMass: 695, propellantMass: 740, diameter: 2.18, length: 2.04,
    engine: { part: 'avum-plus', count: 1 }, source: `${W}Vega_C` },
  // Long March 2D: Encyclopedia Astronautica CZ-2D (stage 1 L-180 gross
  // 192 700 / empty 9 500 / 170 s, stage 2 L-35 gross 39 550 / empty 4 000 /
  // 135 s), cross-checked against Wikipedia.
  { id: 'cz2d1', stageId: 'cz2d1', name: 'First stage (YF-21C, 4× YF-20C)', dryMass: 9500, propellantMass: 183200, diameter: 3.35, length: 27.91,
    engine: { part: 'yf21c', count: 4 }, source: `http://www.astronautix.com/c/changzheng2d.html ; ${W}Long_March_2D` },
  { id: 'cz2d2', stageId: 'cz2d2', name: 'Second stage (YF-24C)', dryMass: 4000, propellantMass: 35550, diameter: 3.35, length: 10.9,
    engine: { part: 'yf24c', count: 1 }, source: `http://www.astronautix.com/c/changzheng2d.html ; ${W}Long_March_2D` },
  // Long March 3B/E: first stage 186 200 kg at 2 961.6 kN / 158 s; second stage
  // 49 400 kg at 742 kN, 185 s; third stage 2× YF-75 at 167.17 kN, 478 s.
  { id: 'cz3b1', stageId: 'cz3b1', name: 'First stage (YF-21C, 4× YF-20C)', dryMass: 9800, propellantMass: 186200, diameter: 3.35, length: 24.76,
    engine: { part: 'yf21c', count: 4 }, source: `${W}Long_March_3B` },
  { id: 'cz3b2', stageId: 'cz3b2', name: 'Second stage (YF-24E)', dryMass: 4000, propellantMass: 49400, diameter: 3.35, length: 12.92,
    engine: { part: 'yf24c', count: 1 }, source: `${W}Long_March_3B` },
  { id: 'cz3b3', stageId: 'cz3b3', name: 'Third stage (2× YF-75, cryogenic)', dryMass: 2800, propellantMass: 18200, diameter: 3.0, length: 12.38,
    engine: { part: 'yf75', count: 1 }, source: `${W}Long_March_3B` },
  // H-IIA's first stage: THE PUBLISHED MASSES. Encyclopedia Astronautica
  // H-2A-1: gross 113 600 kg / empty 13 600 kg / propellant 100 000 kg
  // ( http://www.astronautix.com/h/h-2a-1.html , agreeing with
  // https://en.wikipedia.org/wiki/H-IIA ).
  //
  // The file carried 12 000 kg for a year, and the reason was never physical:
  // it was tests/ascent.test.ts's fleet-wide `idealDeltaV > 9 500 m/s` sanity
  // floor, measured at 9 528 m/s with 12 000 / 2 800 kg and 9 390 m/s with the
  // published pair. That measurement was made with the PRE-B13 delta-v
  // accounting, which ignored the parallel boosters and the fairing; with B13's
  // correction the same vehicle measures 12 121 m/s and the published masses
  // clear the floor with 2.5 km/s to spare. The floor did not have to move after
  // all, and the previous wave's hand-off said to re-measure rather than lower
  // it. Re-measured, and the deviation is gone.
  { id: 'h2a1', stageId: 'h2a1', name: 'First stage (LE-7A)', dryMass: 13600, propellantMass: 100000, diameter: 4.0, length: 37.2,
    engine: { part: 'le7a', count: 1 }, source: `http://www.astronautix.com/h/h-2a-1.html ; ${W}H-IIA` },
  // Masses from Encyclopedia Astronautica H-2A-2 (gross 19 600 kg, empty
  // 3 000 kg). The 2 800 kg the file used to carry was the same non-physical
  // deviation as the first stage's 12 000 kg, and it is gone with it.
  { id: 'h2a2', stageId: 'h2a2', name: 'Second stage (LE-5B)', dryMass: 3000, propellantMass: 16600, diameter: 4.0, length: 9.2,
    engine: { part: 'le5b', count: 1 }, source: 'http://www.astronautix.com/h/h-2a-2.html' },
  // Long March 5: core CZ-5-500 gross 186 900 kg / propellant 165 300 kg /
  // 492 s. The tankage was 27 t (3 %) light against the published liftoff mass,
  // which inflated the liftoff thrust-to-weight to 1.29 against a real 1.27.
  // Core and boosters are now the published gross masses: 21 600 + 165 300 and
  // 12 000 + 144 600. Burn times follow at 498 s (published 492) and 177 s
  // (published 173), both inside the file's 10 % convention.
  { id: 'cz5core', stageId: 'cz5core', name: 'Core (2× YF-77)', dryMass: 21600, propellantMass: 165300, diameter: 5.0, length: 33,
    engine: { part: 'yf77', count: 2 }, source: `${W}Long_March_5` },
  { id: 'cz5s2', stageId: 'cz5s2', name: 'Second stage (2× YF-75D)', dryMass: 5500, propellantMass: 25000, diameter: 5.0, length: 12,
    engine: { part: 'yf75d', count: 2 }, source: UNCITED },
  { id: 'h3s1', stageId: 'h3s1', name: 'First stage (2× LE-9)', dryMass: 20000, propellantMass: 225000, diameter: 5.2, length: 37,
    engine: { part: 'le9', count: 2 }, source: UNCITED },
  { id: 'h3s2', stageId: 'h3s2', name: 'Second stage (LE-5B-3)', dryMass: 3700, propellantMass: 23300, diameter: 5.2, length: 12,
    engine: { part: 'le5b3', count: 1 }, source: UNCITED },
  { id: 'ps1', stageId: 'ps1', name: 'PS1 (S139 solid)', dryMass: 30200, propellantMass: 138200, diameter: 2.8, length: 20,
    engine: { part: 's139', count: 1 }, source: UNCITED },
  { id: 'ps2', stageId: 'ps2', name: 'PS2 (Vikas)', dryMass: 5300, propellantMass: 41000, diameter: 2.8, length: 12.8,
    engine: { part: 'vikas', count: 1 }, source: UNCITED },
  { id: 'ps3', stageId: 'ps3', name: 'PS3 (HPS3 solid)', dryMass: 1100, propellantMass: 7600, diameter: 2.0, length: 3.6,
    engine: { part: 'hps3', count: 1 }, source: `${W}Polar_Satellite_Launch_Vehicle (7 600 kg in 126.7 s)` },
  { id: 'ps4', stageId: 'ps4', name: 'PS4 (2× L-2-5)', dryMass: 920, propellantMass: 2500, diameter: 1.3, length: 2.6,
    engine: { part: 'l25', count: 2 }, source: UNCITED },
  { id: 'e1', stageId: 'e1', name: 'First stage (9× Rutherford)', dryMass: 850, propellantMass: 9700, diameter: 1.2, length: 12.1,
    engine: { part: 'rutherford', count: 9 }, source: UNCITED },
  { id: 'e2', stageId: 'e2', name: 'Second stage (Rutherford Vacuum)', dryMass: 220, propellantMass: 2300, diameter: 1.2, length: 2.4,
    engine: { part: 'rutherford-vac', count: 1 }, source: UNCITED },
  { id: 'curie', stageId: 'curie', name: 'Curie kick stage', dryMass: 30, propellantMass: 150, diameter: 1.2, length: 0.5,
    engine: { part: 'curie', count: 1 }, source: UNCITED },
  { id: 'superheavy', stageId: 'superheavy', name: 'Super Heavy (33× Raptor)', dryMass: 220000, propellantMass: 3500000, diameter: 9, length: 71,
    engine: { part: 'raptor2', count: 33 }, source: UNCITED },
  { id: 'ship', stageId: 'ship', name: 'Ship (3× Raptor + 3× RVac)', dryMass: 130000, propellantMass: 1500000, diameter: 9, length: 52,
    engine: { part: 'raptor2-rvac', count: 6 }, source: UNCITED },
  // C01. Sputnik's core: 97.5 t, 90 t of it propellant, the load that puts it on
  // the 215 × 939 km orbit it reached (270 t in all against the 267 t quoted).
  { id: 'blokA-8k71ps', stageId: 'blokA', name: 'Blok A (core, RD-108)', dryMass: 7500, propellantMass: 90000, diameter: 2.95, length: 26,
    engine: { part: 'rd108-8d75ps', count: 1 }, variantOf: 'blokA-soyuz21a', source: 'http://www.astronautix.com/s/sputnik8k71ps.html' },
  { id: 'blokA-8k72k', stageId: 'blokA', name: 'Blok A (core, RD-108)', dryMass: 6800, propellantMass: 93000, diameter: 2.95, length: 28,
    engine: { part: 'rd108-8d75k', count: 1 }, variantOf: 'blokA-soyuz21a', source: 'http://www.astronautix.com/v/vostok8k72k.html' },
  // Blok E: 1.44 t dry, 7.78 t of propellant, RD-0109.
  { id: 'blokE', stageId: 'blokE', name: 'Blok E (RD-0109)', dryMass: 1440, propellantMass: 7780, diameter: 2.56, length: 3.1,
    engine: { part: 'rd0109', count: 1 }, source: 'http://www.astronautix.com/v/vostok8k72k.html' },
  // Saturn V SA-506: S-IC 135 t dry + 2 145 t; S-II 40 t dry (with its aft
  // interstage) + 443 t; S-IVB 15.3 t dry (with the instrument unit) + 109 t.
  { id: 'sic', stageId: 'sic', name: 'S-IC (5× F-1)', dryMass: 135000, propellantMass: 2145000, diameter: 10.1, length: 42,
    engine: { part: 'f1', count: 5 }, source: `${W}Saturn_V ; AS-506 flight evaluation report` },
  { id: 'sii', stageId: 'sii', name: 'S-II (5× J-2)', dryMass: 40000, propellantMass: 443000, diameter: 10.1, length: 24.9,
    engine: { part: 'j2', count: 5 }, source: `${W}Saturn_V ; AS-506 flight evaluation report`, note: 'dry mass includes its aft interstage' },
  { id: 'sivb', stageId: 'sivb', name: 'S-IVB (J-2) + IU', dryMass: 15300, propellantMass: 109000, diameter: 6.6, length: 18.8,
    engine: { part: 'j2', count: 1 }, source: `${W}Saturn_V ; AS-506 flight evaluation report`, note: 'dry mass includes the instrument unit' },
];

// ---------------------------------------------------------------- strap-on bodies
export const BOOSTER_BODIES: readonly BoosterBodyPart[] = [
  { id: 'blokBVGD-soyuz2', stageId: 'blokBVGD', name: 'Blok B/V/G/D boosters', dryMass: 3784, propellantMass: 39600, diameter: 2.68, length: 19.6,
    engine: { part: 'rd107a', count: 1 }, source: UNCITED, note: 'Soyuz-2.1a and 2.1b' },
  { id: 'urm1', stageId: 'urm1', name: 'URM-1 boosters', dryMass: 9000, propellantMass: 128800, diameter: 2.9, length: 25.7,
    engine: { part: 'rd191', count: 1 }, source: UNCITED, note: 'the same URM-1 module as the stage body urm1core' },
  // A Falcon Heavy side booster is a Falcon 9 first stage ("a Falcon 9 first
  // stage or Falcon Heavy side booster", SpaceX via Wikipedia's "Falcon
  // Heavy"), so it carries Falcon 9 Block 5's published masses (F11).
  { id: 'side', stageId: 'side', name: 'Side boosters', dryMass: 22200, propellantMass: 410900, diameter: 3.66, length: 42,
    engine: { part: 'merlin1d', count: 9 }, source: 'Espace & Exploration no. 39 (May 2017), as cited by Wikipedia’s “Falcon 9 Block 5”', note: 'Falcon 9 first stages (the stage body s1’s figures), on Falcon 9 Block 5’s published masses since F11' },
  // GEM-63 inert mass 5 100 kg = the 49 300 kg gross minus the 44 200 kg grain
  // quoted on the same page.
  { id: 'gem63', stageId: 'gem63', name: 'GEM-63 solid boosters', dryMass: 5100, propellantMass: 44200, diameter: 1.6, length: 20,
    engine: { part: 'gem63', count: 1 }, source: `${W}Atlas_V` },
  // GEM-63XL inert mass 5 177 kg, grain 47 853 kg — both published. (The
  // audit's "~4 521 kg" is not on that page; 5 177 kg is the 53 030 kg gross
  // minus the 47 853 kg grain, and the two agree to the kilogram.)
  { id: 'gem63xl', stageId: 'gem63xl', name: 'GEM-63XL solid boosters', dryMass: 5177, propellantMass: 47853, diameter: 1.6, length: 22,
    engine: { part: 'gem63xl', count: 1 }, source: `${W}Graphite-Epoxy_Motor` },
  { id: 'p120c', stageId: 'p120c', name: 'P120C solid boosters', dryMass: 13000, propellantMass: 142000, diameter: 3.4, length: 13.5,
    engine: { part: 'p120c', count: 1 }, source: UNCITED, note: 'the Ariane 6 casing; Vega-C’s first stage is the stage body p120c' },
  // CZ-3B/E: 4 boosters of 41 100 kg at 740.4 kN / 140 s.
  { id: 'cz3bb', stageId: 'cz3bb', name: 'Liquid strap-on boosters (YF-25)', dryMass: 3000, propellantMass: 41100, diameter: 2.25, length: 16.1,
    engine: { part: 'yf25', count: 1 }, source: `${W}Long_March_3B` },
  // SRB-A3 grain and inert masses, burnout ~100 s and separation ~108 s are the
  // audited figures.
  { id: 'srba', stageId: 'srba', name: 'SRB-A3 solid boosters', dryMass: 8700, propellantMass: 66800, diameter: 2.5, length: 15.1,
    engine: { part: 'srba3', count: 1 }, source: `docs/history/AUDIT-2026-09-16.md ; ${W}H-IIA` },
  // Long March 5 booster CZ-5-300: gross 156 600 kg each, 173 s.
  { id: 'k3', stageId: 'k3', name: 'Kerolox boosters (2× YF-100 each)', dryMass: 12000, propellantMass: 144600, diameter: 3.35, length: 26.3,
    engine: { part: 'yf100', count: 2 }, source: `${W}Long_March_5` },
  { id: 'srb3', stageId: 'srb3', name: 'SRB-3 solid boosters', dryMass: 8700, propellantMass: 66800, diameter: 2.5, length: 14.6,
    engine: { part: 'srb3', count: 1 }, source: UNCITED, note: 'the SRB-A3 casing’s masses, 0.5 m shorter' },
  // PSLV-XL's six PSOM-XL are one motor in one casing. They are two bodies
  // because the ground-lit four and the air-lit pair are two strap-on groups
  // with ids of their own, which the side tables key separately.
  { id: 'psomg', stageId: 'psomg', name: 'PSOM-XL (ground-lit)', dryMass: 2010, propellantMass: 12200, diameter: 1.0, length: 12,
    engine: { part: 'psomxl', count: 1 }, source: UNCITED },
  { id: 'psoma', stageId: 'psoma', name: 'PSOM-XL (air-lit)', dryMass: 2010, propellantMass: 12200, diameter: 1.0, length: 12,
    engine: { part: 'psomxl', count: 1 }, variantOf: 'psomg', source: UNCITED, note: 'the ground-lit body, lit in the air: `igniteAt` is its installation' },
  // C01: boosters 43 t each (Sputnik); Vostok-K's from the same page as its Blok E.
  { id: 'blokBVGD-8k71ps', stageId: 'blokBVGD', name: 'Blok B/V/G/D boosters', dryMass: 3500, propellantMass: 39500, diameter: 2.68, length: 19,
    engine: { part: 'rd107-8d74ps', count: 1 }, variantOf: 'blokBVGD-soyuz2', source: 'http://www.astronautix.com/s/sputnik8k71ps.html' },
  { id: 'blokBVGD-8k72k', stageId: 'blokBVGD', name: 'Blok B/V/G/D boosters', dryMass: 3450, propellantMass: 39250, diameter: 2.68, length: 19.8,
    engine: { part: 'rd107-8d74k', count: 1 }, variantOf: 'blokBVGD-soyuz2', source: 'http://www.astronautix.com/v/vostok8k72k.html' },
];

// ---------------------------------------------------------------- fairings
export const FAIRING_PARTS: readonly FairingPart[] = [
  // The 4.11 m fairing, 11.43 m long with its own adapter cone down to Blok I
  // (TASS/RIA: the 4.11 × 11.43 m payload unit), for the crewed and the cargo
  // flights alike; with the escape tower on its nose the head of a crewed stack
  // is 15.59 m (owner's figures, 2026-09-25). It was drawn and flown at
  // 3.7 × 10.1 m on a 1.7 m adapter of its own.
  { id: 'soyuz21a', mass: 1000, diameter: 4.11, length: 11.43, adapter: 2.2, source: 'TASS/RIA (the 4.11 × 11.43 m payload unit); owner’s figures, 2026-09-25' },
  { id: 'soyuz21b', mass: 1500, diameter: 4.11, length: 11.4, source: UNCITED },
  { id: 'protonm', mass: 2000, diameter: 4.35, length: 15, source: UNCITED, note: 'Proton-M and Angara-A5' },
  { id: 'falcon9', mass: 1900, diameter: 5.2, length: 13.1, source: UNCITED, note: 'Falcon 9 and Falcon Heavy' },
  { id: 'atlasv551', mass: 3524, diameter: 5.4, length: 20.7, source: UNCITED },
  { id: 'vulcan', mass: 3500, diameter: 5.4, length: 15.5, source: UNCITED },
  { id: 'ariane64', mass: 2900, diameter: 5.4, length: 20, source: UNCITED },
  { id: 'vegac', mass: 500, diameter: 3.3, length: 9.0, source: `${W}Vega_C (3.3 m)` },
  { id: 'longmarch2d', mass: 800, diameter: 3.35, length: 6.98, source: UNCITED },
  { id: 'longmarch3be', mass: 2000, diameter: 4.2, length: 9.56, source: UNCITED },
  { id: 'h2a202', mass: 1400, diameter: 4.07, length: 12, source: UNCITED, note: 'the 4S fairing' },
  { id: 'longmarch5', mass: 3000, diameter: 5.2, length: 12.3, source: UNCITED },
  { id: 'h3', mass: 2400, diameter: 5.2, length: 12, source: UNCITED },
  { id: 'pslvxl', mass: 1150, diameter: 3.2, length: 8.3, source: UNCITED },
  { id: 'electron', mass: 50, diameter: 1.2, length: 2.5, source: UNCITED },
  { id: 'sputnik8k71ps', mass: 300, diameter: 2.95, length: 2.2, source: 'http://www.astronautix.com/s/sputnik8k71ps.html', note: 'PS-1’s conical nose shroud' },
  { id: 'vostok8k72k', mass: 800, diameter: 2.6, length: 5, source: 'http://www.astronautix.com/v/vostok8k72k.html', note: 'the shroud over the spacecraft’s instrument section' },
];

// ---------------------------------------------------------------- lookups
/**
 * The list by id, each part frozen: the emitters hand out fresh specs, so an
 * edit to a vehicle never reaches the catalogue, and freezing makes sure an
 * edit to a part cannot either (a builder copies a part to change it).
 */
function index<T extends { id: string; engine?: object }>(list: readonly T[], what: string): ReadonlyMap<string, T> {
  const out = new Map<string, T>();
  for (const part of list) {
    if (out.has(part.id)) throw new Error(`Duplicate ${what} ${part.id}`);
    if (part.engine) Object.freeze(part.engine);
    out.set(part.id, Object.freeze(part));
  }
  Object.freeze(list);
  return out;
}
for (const part of ENGINE_PARTS) {
  Object.freeze(part.mass.sources);
  Object.freeze(part.mass);
}
const ENGINES = index(ENGINE_PARTS, 'engine part');
const STAGES = index(STAGE_BODIES, 'stage body');
const BOOSTERS = index(BOOSTER_BODIES, 'strap-on body');
const FAIRINGS = index(FAIRING_PARTS, 'fairing');

function find<T>(map: ReadonlyMap<string, T>, id: string, what: string): T {
  const part = map.get(id);
  if (!part) throw new Error(`Unknown ${what} ${id}`);
  return part;
}
export const enginePart = (id: string): EnginePart => find(ENGINES, id, 'engine part');

/**
 * The one count a lumped or cluster engine part is installed at in the
 * catalogue — the only count it may have (see "count is load-bearing" in the
 * file comment) — or undefined for an ordinary engine, which any count of
 * engines may carry. Roadmap D02, D03: the builders refuse a re-count.
 */
export function lockedEngineCount(partId: string): number | undefined {
  return LOCKED_COUNT.get(partId);
}
const LOCKED_COUNT: ReadonlyMap<string, number> = (() => {
  const out = new Map<string, number>();
  for (const body of [...STAGE_BODIES, ...BOOSTER_BODIES]) {
    if (enginePart(body.engine.part).kind !== 'engine') out.set(body.engine.part, body.engine.count);
  }
  return out;
})();

/**
 * The engine part an `EngineSpec` was emitted from, found by value: the one
 * part whose `engineSpec(part, engine.count)` has the same fields with the same
 * values (roadmap D02: a remix asks which engine a stage carries, and a spec
 * carries no part reference). Null when no part emits it — an engine whose
 * figures a designer changed, or one from a file.
 */
export function enginePartOf(engine: EngineSpec): EnginePart | null {
  const keys = Object.keys(engine);
  for (const part of ENGINE_PARTS) {
    if (part.name !== engine.name) continue;
    const emitted = engineSpec(part, engine.count) as unknown as Record<string, unknown>;
    if (Object.keys(emitted).length === keys.length
      && keys.every((k) => Object.prototype.hasOwnProperty.call(emitted, k) && Object.is(emitted[k], (engine as unknown as Record<string, unknown>)[k]))) return part;
  }
  return null;
}
export const stageBody = (id: string): StageBodyPart => find(STAGES, id, 'stage body');
export const boosterBody = (id: string): BoosterBodyPart => find(BOOSTERS, id, 'strap-on body');
export const fairingPart = (id: string): FairingPart => find(FAIRINGS, id, 'fairing');

// ---------------------------------------------------------------- emitters
//
// One rule for all four: an optional field is copied only when it is defined,
// and no default is ever filled in. A spec's absent field and its zero are
// different things to the code that reads it — Blok I's `sepDelay: 0` is not
// the flight's `?? 2` default — so the emitters must neither drop a zero nor
// invent a value, and must never write an `undefined`-valued key.
// Keys come out in the order the pre-D01 literals wrote them: the hardware
// fields first, then the installation's in the order the assembly gives them.

/** What a vehicle adds to a stage body where it installs it. */
export type StageInstall = Partial<Pick<StageSpec, 'restartable' | 'sepDelay' | 'ignitionDelay' | 'throttleWithBoosters' | 'boosters'
  | 'color' | 'accentColor' | 'profile' | 'fins' | 'gridFins' | 'legs' | 'flaps' | 'nozzleLength'>>;
/** What a vehicle adds to a strap-on body, besides how many. */
export type BoosterInstall = Partial<Pick<BoosterGroupSpec, 'igniteAt' | 'sepDelay' | 'color' | 'conicalTop' | 'baseOffset'>>;
/** What a vehicle adds to a fairing: when it is jettisoned, and its livery. */
export type FairingInstall = Pick<FairingSpec, 'sepAltitude'> & Partial<Pick<FairingSpec, 'sepTime' | 'color'>>;

const STAGE_INSTALL_FIELDS: ReadonlySet<string> = new Set(['restartable', 'sepDelay', 'ignitionDelay', 'throttleWithBoosters', 'boosters',
  'color', 'accentColor', 'profile', 'fins', 'gridFins', 'legs', 'flaps', 'nozzleLength']);
const BOOSTER_INSTALL_FIELDS: ReadonlySet<string> = new Set(['igniteAt', 'sepDelay', 'color', 'conicalTop', 'baseOffset']);
const FAIRING_INSTALL_FIELDS: ReadonlySet<string> = new Set(['sepAltitude', 'sepTime', 'color']);
const ENGINE_OPTIONAL_FIELDS = ['minThrottle', 'solid', 'peakFactor', 'vacuumOnly', 'startupS', 'tailoffS'] as const;

/**
 * The installation's defined fields, in its own order. A hardware field in an
 * installation is refused rather than let it overwrite the part's.
 */
function installed(install: object, allowed: ReadonlySet<string>, what: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(install)) {
    if (!allowed.has(key)) throw new Error(`${key} is not a field of a ${what} installation`);
    if (value !== undefined) out[key] = value;
  }
  return out;
}

/** The `EngineSpec` of `count` of an engine part. */
export function engineSpec(part: EnginePart | string, count: number): EngineSpec {
  const p = typeof part === 'string' ? enginePart(part) : part;
  const out: EngineSpec = { name: p.name, count, thrustSL: p.thrustSL, thrustVac: p.thrustVac, ispSL: p.ispSL, ispVac: p.ispVac };
  for (const key of ENGINE_OPTIONAL_FIELDS) {
    const value = p[key];
    if (value !== undefined) (out as unknown as Record<string, unknown>)[key] = value;
  }
  return out;
}

/** A stage body installed in a vehicle, as the `StageSpec` it flies. */
export function stageSpec(body: StageBodyPart | string, install: StageInstall = {}): StageSpec {
  const b = typeof body === 'string' ? stageBody(body) : body;
  return {
    id: b.stageId, name: b.name, dryMass: b.dryMass, propellantMass: b.propellantMass,
    engine: engineSpec(b.engine.part, b.engine.count), diameter: b.diameter, length: b.length,
    ...installed(install, STAGE_INSTALL_FIELDS, 'stage'),
  };
}

/** `count` of a strap-on body installed around a stage, as the `BoosterGroupSpec` it flies. */
export function boosterSpec(body: BoosterBodyPart | string, count: number, install: BoosterInstall = {}): BoosterGroupSpec {
  const b = typeof body === 'string' ? boosterBody(body) : body;
  return {
    id: b.stageId, name: b.name, count, dryMass: b.dryMass, propellantMass: b.propellantMass,
    engine: engineSpec(b.engine.part, b.engine.count), diameter: b.diameter, length: b.length,
    ...installed(install, BOOSTER_INSTALL_FIELDS, 'strap-on'),
  };
}

/** A fairing installed on a vehicle, as the `FairingSpec` it flies. */
export function fairingSpec(part: FairingPart | string, install: FairingInstall): FairingSpec {
  const f = typeof part === 'string' ? fairingPart(part) : part;
  return {
    mass: f.mass, diameter: f.diameter, length: f.length, ...(f.adapter !== undefined ? { adapter: f.adapter } : {}),
    ...installed(install, FAIRING_INSTALL_FIELDS, 'fairing'),
  } as FairingSpec;
}
