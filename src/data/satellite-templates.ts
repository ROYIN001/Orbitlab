/**
 * Where a designed satellite starts (roadmap D06, docs/ROADMAP-PART2-3.md;
 * Phase 4 map §2.5, track B): seven templates, each a whole
 * `SatelliteDesign` but for its id, name and orbit.
 *
 * FIVE FROM THE CATALOGUE'S CLASSES — comsat and weather in GEO, earthObs on
 * the sun-synchronous preset, navigation on GLONASS's, science on the polar
 * one. Each takes its class's mass, engine (propellant = fraction × mass) and
 * size from `SATELLITES` (src/data/satellites.ts), which it reads and never
 * changes (Principle 7; tests/d06-satellites-identity.test.ts), and its orbit
 * from the class's preset (src/data/orbits.ts), as `presetOrbit` places it.
 * The class's figures are the catalogue's own, typical of the class and not
 * any one satellite's, so they are estimates, and said so. The cubesats
 * dispenser (it is "the dispenser, not the satellites it releases",
 * src/physics/propagator/spacecraft.ts), the Starlink stack, the crewed
 * vehicles and the three historical payloads are not templates.
 *
 * TWO OF THEIR OWN, both Thai (the owner's decision, 2026-09-29):
 * - NAPA-2, the Royal Thai Air Force's 6U CubeSat (src/data/napa2.ts): its
 *   published 10 kg (GCAT) and 20 × 10 × 34.05 cm (Janes), the orbit it flew
 *   (src/data/thai-satellites.ts), no engine, cells on its body. Kind
 *   `science`, so it is drawn as the catalogue's science bus scaled to its
 *   size (map §2.5). This template is the design the drag area is validated
 *   on: B = 0.0134 m²/kg and its re-entry within 25 % (docs/VALIDATION.md §7;
 *   tests/d06-satellite-area.test.ts).
 * - A THEOS-2-class imager: GISTDA's THEOS-2 as eoPortal publishes it —
 *   621 km, the descending node at 10:00–10:30, a ten-year life, X-band at
 *   about 140 Mbit/s — with eoPortal's 425 kg LABELLED AN ESTIMATE: another
 *   report gives 417 kg, which is why src/data/thai-satellites.ts shows
 *   neither. Its camera is O04's example that gives the published 0.5 m and
 *   10.3 km (src/ui/orbit/applications-panel.ts), not its real design.
 *
 * EVERY POWER, ATTITUDE, RADIO AND PAYLOAD FIGURE (Principle 4) is either in
 * the template's `sources`, by its path in the design, with where it comes
 * from, or it is an estimate, which the builder labels on screen. `estimates`
 * lists the figures that have a source and are still estimates here (a
 * class's typical figure standing in for this satellite's). The sourced
 * defaults are the cores' own (src/orbit/power.ts, link.ts): a cell of
 * 29.5 % (NASA's state-of-the-art report, Table 3-1), SMAD's I_d and path
 * efficiencies (MIT 16.851), the depths of discharge flown (Britton & Miller
 * via TU Delft Table 42) or allowed in GEO (TU Delft p. 125), and the
 * coding's threshold E_b/N₀ (Palo et al.).
 *
 * Units as the design stores them (src/design/satellite-spec.ts): SI, degrees,
 * hours, and the battery in Wh. Names and descriptions are i18n keys
 * (src/design/satellite-model.ts `TEMPLATE_TEXT`), so no text here.
 * tests/d06-satellite-templates.test.ts holds each template to its sources.
 */
import type { SatelliteSpec } from '../types';
import type { SatelliteTemplate } from '../design/satellite-spec';
import { SATELLITES } from './satellites';
import { NAPA2 } from './napa2';
import { DIFFRACTION_WAVELENGTH } from '../design/satellite-link';

// ─── the sources, once each ─────────────────────────────────────────────────

const TUD = 'B.T.C. Zandbergen, Spacecraft bus design and sizing, TU Delft 2020 (https://repository.tudelft.nl/file/File_124a068a-158f-4b40-a44f-9ba407a14845)';
export const SOURCE = {
  cell: 'NASA, State-of-the-Art of Small Spacecraft Technology, ch. 3 Power (2026 edition), Table 3-1: AZUR Space 3G30-Adv triple-junction cell, 29.5 % at beginning of life (https://www.nasa.gov/smallsat-institute/sst-soa/power-subsystems)',
  smad: 'MIT OCW 16.851 Satellite Engineering (2003), Problem Set 4 solution, Table 1, SMAD\'s sizing values: I_d 0.77, multijunction cells lose 0.5 % a year, peak-power tracking X_d 0.80 / X_e 0.60, battery-to-load efficiency 0.9 (https://ocw.mit.edu/courses/16-851-satellite-engineering-fall-2003/81f80cdc5f01208a496a412a52b00a71_ps4_cg_solution.pdf)',
  dodLeo: `D.L. Britton and T.B. Miller, Battery Fundamentals and Operations, NASA Glenn 2000, as Table 42 of ${TUD}, p. 125: EOS Terra and Aqua flew 30 % in low orbit`,
  dodGeo: `${TUD}, p. 125: in GEO, with some 90 eclipses a year, "much higher values (80%)"`,
  apogeeKick: `${TUD}, Fig. 11, book p. 26: a GEO communications satellite's apogee kick from a Proton's transfer orbit, 1836.5 m/s, in a 15-year budget`,
  geoLife: `${TUD}, Fig. 11, book p. 26: the 15-year GEO budget`,
  cr: 'IADC Space Debris Mitigation Guidelines, IADC-02-01 Rev. 4 (2025), §5.3.1.1, doc p. 13: C_R "typically in the range of about 1.2 to 1.5" (https://www.unoosa.org/res/oosadoc/data/documents/2025/aac_105c_12025crp/aac_105c_12025crp_9_0_html/AC105_C1_2025_CRP09E.pdf)',
  palo: 'S. Palo et al., Expanding CubeSat Capabilities with a Low Cost Transceiver, 28th AIAA/USU SmallSat (2014), Table 1: X-band at 8380 MHz, 1 W, 0.4 dB line loss, a 0 dBic antenna, 12.5 Mbit/s, OQPSK with convolutional coding at E_b/N₀ 5.52 dB for a bit error rate of 1e-6 (NTRS 20150000169, https://ntrs.nasa.gov/api/citations/20150000169/downloads/20150000169.pdf)',
  paloStation: 'S. Palo et al. 2014, Table 1: NASA Near Earth Network\'s 11.28 m dish; the system noise temperature 189.7 K and the 2.0 dB of atmosphere are derived from its gain less its G/T and from its flux line, as tests/link.test.ts does (https://ntrs.nasa.gov/api/citations/20150000169/downloads/20150000169.pdf)',
  ebN0: 'S. Palo et al. 2014, Table 1: OQPSK with convolutional coding, E_b/N₀ 5.52 dB at a bit error rate of 1e-6 (https://ntrs.nasa.gov/api/citations/20150000169/downloads/20150000169.pdf)',
  starinDipole: 'S.R. Starin and J. Eterno, Attitude Determination and Control Systems, NTRS 20110007070, Table 19-4: FireSat\'s residual dipole of 1 A·m² (https://ntrs.nasa.gov/api/citations/20110007070/downloads/20110007070.pdf)',
  napa2Mass: 'GCAT, J. McDowell (https://planet4589.org/space/gcat/), satcat.tsv of 2026-09-24, NORAD 48963: 10 kg',
  napa2Size: 'Janes, "SpaceX launches Royal Thai Air Force\'s second Earth-observation satellite", 2021: 20 × 10 × 34.05 cm (https://www.janes.com/defence-intelligence-insights/defence-news/spacex-launches-royal-thai-air-forces-second-earth-observation-satellite)',
  napa2Orbit: 'The orbit NAPA-2 flew a month after launch, 520 × 540 km at 97.5°, sun-synchronous (SatTrackCam Leiden, M. Langbroek, August 2021, https://sattrackcam.blogspot.com/2021/08/; src/data/thai-satellites.ts)',
  theos2: 'eoPortal, THEOS-2 (https://www.eoportal.org/satellite-missions/theos-2): 621 km sun-synchronous, descending node at 10:00–10:30, a ten-year design life, X-band at about 140 Mbit/s, 425 kg',
  theos2Camera: 'O04\'s example camera, 16.1 m, 13 µm and 20 600 pixels (src/ui/orbit/applications-panel.ts), which gives THEOS-2\'s published 0.5 m and 10.3 km from 621 km (eoPortal) — an example, not its real design',
  hydrazine: 'M.J. Patterson and S.R. Oleson, NASA TM-113111 (1997), Table III: a hydrazine thruster at 223 s (https://ntrs.nasa.gov/api/citations/19980017819/downloads/19980017819.pdf)',
  catalogue: 'The Launch section\'s satellite class (src/data/satellites.ts): the class\'s typical mass, engine and size, not any one satellite\'s',
} as const;

// ─── how a template is put together ─────────────────────────────────────────

/** Figures every template takes from the power core's sourced defaults (src/orbit/power.ts). */
const CELL = { cellEff: 0.295, Id: 0.77, degPerYear: 0.005, regulation: 'PPT' as const, batteryEff: 0.9 };
const CELL_SOURCES = {
  'power.cellEff': SOURCE.cell, 'power.Id': SOURCE.smad, 'power.degPerYear': SOURCE.smad, 'power.regulation': SOURCE.smad, 'power.batteryEff': SOURCE.smad,
};

/**
 * The principal moments of inertia of a uniform box of the bus's mass and
 * edges, kg·m²: m(b² + c²)/12 about each axis. An estimate (a real bus is not
 * uniform, and its wings add to two of the three), and labelled one.
 */
export function boxInertia(mass: number, size: { width: number; height: number; depth: number }): [number, number, number] {
  const { width: w, height: h, depth: d } = size;
  const round = (x: number): number => Number(x.toPrecision(3));
  return [round((mass * (h * h + d * d)) / 12), round((mass * (w * w + d * d)) / 12), round((mass * (w * w + h * h)) / 12)];
}

/** A catalogue class's mass split into dry mass and propellant, its engine and its size (map §2.5). */
function fromClass(id: string): { spec: SatelliteSpec; dryMass: number; propellant: number; size: { width: number; height: number; depth: number } } {
  const spec = SATELLITES.find((s) => s.id === id);
  if (!spec?.propulsion || !spec.size) throw new Error(`the catalogue class ${id} has no engine or no size`);
  const propellant = spec.mass * spec.propulsion.propellantFraction;
  return { spec, dryMass: spec.mass - propellant, propellant, size: { ...spec.size } };
}

const CLASS_SOURCES = {
  'bus.dryMass': SOURCE.catalogue, 'bus.size.width': SOURCE.catalogue, 'bus.size.height': SOURCE.catalogue, 'bus.size.depth': SOURCE.catalogue,
  'propulsion.thrust': SOURCE.catalogue, 'propulsion.isp': SOURCE.catalogue, 'propulsion.propellant': SOURCE.catalogue,
};
/** A class's figures are its own and typical of it, not a satellite's: sourced to the catalogue, and estimates still. */
const CLASS_ESTIMATES = Object.keys(CLASS_SOURCES);

type Design = SatelliteTemplate['design'];

function classTemplate(id: string, typicalOrbit: string, rest: (c: ReturnType<typeof fromClass>) => Omit<Design, 'bus' | 'propulsion'> & {
  cd?: number; insertionDv?: number;
}, sources: Record<string, string>): SatelliteTemplate {
  const c = fromClass(id);
  const r = rest(c);
  const { cd, insertionDv, ...design } = r;
  const p = c.spec.propulsion!;
  return {
    id, derivedFrom: id, kind: c.spec.kind, typicalOrbit,
    design: {
      ...design,
      bus: { dryMass: c.dryMass, size: c.size, cd: cd ?? 2.2, cr: 1.3 },
      propulsion: { thrust: p.thrust, isp: p.isp, propellant: c.propellant, ...(insertionDv !== undefined ? { insertionDv } : {}) },
    },
    sources: { ...CLASS_SOURCES, ...CELL_SOURCES, 'bus.cr': SOURCE.cr, ...sources },
    estimates: CLASS_ESTIMATES,
  };
}

/**
 * The wavelength each camera's aperture is read at: 550 nm, the middle of
 * the visible, with no source — an estimate, and the screen says so (the
 * integration of D06 and D07, which reads the same number).
 */
const VISIBLE = DIFFRACTION_WAVELENGTH;

/** A receiving station on the ground: NASA NEN's 11.28 m dish as Palo et al. give it, and the path's other losses (all sourced to them). */
const NEN_STATION = { rxAntennaD: 11.28, rxNoiseK: 189.7, losses: 2 };
const NEN_SOURCES = { 'comms.rxAntennaD': SOURCE.paloStation, 'comms.rxNoiseK': SOURCE.paloStation, 'comms.losses': SOURCE.paloStation };

// ─── the templates ──────────────────────────────────────────────────────────

const comsat = classTemplate('comsat', 'geo', (c) => ({
  lifeYears: 15,
  insertionDv: 1836.5,
  power: { payloadW: 8000, busW: 1000, arrayArea: 45, mount: 'tracking', batteryWh: 15_000, dod: 0.8, ...CELL },
  adcs: { mode: 'threeAxis', inertia: boxInertia(c.spec.mass, c.size), pointingDeg: 0.1, wheelH: 50, residualDipole: 10, cpOffset: 0.5 },
  comms: { txPowerW: 100, frequency: 12e9, txAntennaD: 2.5, lineLoss: 1, dataRate: 30e6, requiredEbN0: 5.52, station: 'bangkok', minElDeg: 10, ...NEN_STATION },
  payload: null,
}), {
  lifeYears: SOURCE.geoLife, 'propulsion.insertionDv': SOURCE.apogeeKick, 'power.dod': SOURCE.dodGeo, 'comms.requiredEbN0': SOURCE.ebN0, ...NEN_SOURCES,
});

const earthObs = classTemplate('earthObs', 'sso', (c) => ({
  lifeYears: 7,
  power: { payloadW: 800, busW: 600, arrayArea: 12, mount: 'tracking', batteryWh: 3500, dod: 0.3, ...CELL },
  adcs: { mode: 'threeAxis', inertia: boxInertia(c.spec.mass, c.size), pointingDeg: 0.05, wheelH: 25, residualDipole: 5, cpOffset: 0.3 },
  comms: { txPowerW: 20, frequency: 8.2e9, txAntennaD: 0.3, lineLoss: 1, dataRate: 300e6, requiredEbN0: 5.52, station: 'bangkok', minElDeg: 10, ...NEN_STATION },
  payload: { focalLength: 6.9, pixelPitch: 8e-6, pixels: 35_000, aperture: 1.1, bits: 11, wavelength: VISIBLE },
}), { 'power.dod': SOURCE.dodLeo, 'comms.requiredEbN0': SOURCE.ebN0, ...NEN_SOURCES });

const weather = classTemplate('weather', 'geo', (c) => ({
  lifeYears: 10,
  insertionDv: 1836.5,
  power: { payloadW: 1500, busW: 600, arrayArea: 12, mount: 'tracking', batteryWh: 4000, dod: 0.8, ...CELL },
  adcs: { mode: 'threeAxis', inertia: boxInertia(c.spec.mass, c.size), pointingDeg: 0.05, wheelH: 30, residualDipole: 5, cpOffset: 0.4 },
  comms: { txPowerW: 20, frequency: 1.7e9, txAntennaD: 1.2, lineLoss: 1, dataRate: 31e6, requiredEbN0: 5.52, station: 'bangkok', minElDeg: 10, ...NEN_STATION },
  payload: null,
}), { 'propulsion.insertionDv': SOURCE.apogeeKick, 'power.dod': SOURCE.dodGeo, 'comms.requiredEbN0': SOURCE.ebN0, ...NEN_SOURCES });

const navigation = classTemplate('navigation', 'glonass', (c) => ({
  lifeYears: 10,
  power: { payloadW: 1000, busW: 600, arrayArea: 12, mount: 'tracking', batteryWh: 3500, dod: 0.5, ...CELL },
  adcs: { mode: 'threeAxis', inertia: boxInertia(c.spec.mass, c.size), pointingDeg: 0.5, wheelH: 20, residualDipole: 5, cpOffset: 0.3 },
  comms: { txPowerW: 50, frequency: 1.6e9, txAntennaD: 1.2, lineLoss: 1, dataRate: 50, requiredEbN0: 5.52, station: 'bangkok', minElDeg: 10, ...NEN_STATION },
  payload: null,
}), { 'comms.requiredEbN0': SOURCE.ebN0, ...NEN_SOURCES });

const science = classTemplate('science', 'polar', (c) => ({
  lifeYears: 5,
  power: { payloadW: 1000, busW: 800, arrayArea: 16, mount: 'tracking', batteryWh: 4500, dod: 0.3, ...CELL },
  adcs: { mode: 'threeAxis', inertia: boxInertia(c.spec.mass, c.size), pointingDeg: 0.01, wheelH: 30, residualDipole: 5, cpOffset: 0.3 },
  comms: { txPowerW: 10, frequency: 2.2e9, txAntennaD: 0.5, lineLoss: 1, dataRate: 2e6, requiredEbN0: 5.52, station: 'bangkok', minElDeg: 10, ...NEN_STATION },
  payload: null,
}), { 'power.dod': SOURCE.dodLeo, 'comms.requiredEbN0': SOURCE.ebN0, ...NEN_SOURCES });

const napa2Size = { width: NAPA2.size[0], height: NAPA2.size[1], depth: NAPA2.size[2] };
const napa2: SatelliteTemplate = {
  id: 'napa2', derivedFrom: null, kind: 'science', typicalOrbit: 'sso',
  orbit: { perigee: 520e3, apogee: 540e3, inclination: 97.5, sso: true, ltan: 22.5 },
  design: {
    lifeYears: 3,
    bus: { dryMass: NAPA2.mass, size: napa2Size, cd: 2.2, cr: 1.3 },
    // cells on the body's faces, so no wings to add drag (the design the drag area is validated on)
    power: { payloadW: 4, busW: 4, arrayArea: 0.068, mount: 'body', batteryWh: 40, dod: 0.3, ...CELL },
    propulsion: null,
    adcs: { mode: 'threeAxis', inertia: boxInertia(NAPA2.mass, napa2Size), pointingDeg: 1, wheelH: 0.015, residualDipole: 0.02, cpOffset: 0.02 },
    comms: {
      txPowerW: 1, frequency: 8.38e9, txAntennaD: 0, lineLoss: 0.4, dataRate: 12.5e6, requiredEbN0: 5.52, station: 'bangkok', minElDeg: 10, ...NEN_STATION,
    },
    // a camera that gives NAPA-2's published 5 m from 530 km (src/data/thai-satellites.ts): not its real design
    payload: { focalLength: 0.58, pixelPitch: 5.5e-6, pixels: 4096, aperture: 0.095, bits: 10, wavelength: VISIBLE },
  },
  sources: {
    'bus.dryMass': SOURCE.napa2Mass, 'bus.size.width': SOURCE.napa2Size, 'bus.size.height': SOURCE.napa2Size, 'bus.size.depth': SOURCE.napa2Size,
    'bus.cr': SOURCE.cr, ...CELL_SOURCES, 'power.dod': SOURCE.dodLeo,
    'comms.txPowerW': SOURCE.palo, 'comms.frequency': SOURCE.palo, 'comms.txAntennaD': SOURCE.palo, 'comms.lineLoss': SOURCE.palo,
    'comms.dataRate': SOURCE.palo, 'comms.requiredEbN0': SOURCE.palo, ...NEN_SOURCES,
    'orbit.perigee': SOURCE.napa2Orbit, 'orbit.apogee': SOURCE.napa2Orbit, 'orbit.inclination': SOURCE.napa2Orbit, 'orbit.sso': SOURCE.napa2Orbit,
  },
  // Palo's transceiver is a 6U-class X-band radio, not NAPA-2's own
  estimates: ['comms.txPowerW', 'comms.frequency', 'comms.txAntennaD', 'comms.lineLoss', 'comms.dataRate'],
};

const THEOS2_MASS = 425;
const THEOS2_PROPELLANT = 40;
const theos2Size = { width: 1, height: 1.6, depth: 1 };
const theos2: SatelliteTemplate = {
  id: 'theos2', derivedFrom: null, kind: 'earthObs', typicalOrbit: 'sso',
  // the descending node at 10:00–10:30, so the ascending at 22:15, the middle of it
  orbit: { perigee: 621e3, apogee: 621e3, inclination: 97.91, sso: true, ltan: 22.25 },
  design: {
    lifeYears: 10,
    bus: { dryMass: THEOS2_MASS - THEOS2_PROPELLANT, size: theos2Size, cd: 2.2, cr: 1.3 },
    power: { payloadW: 150, busW: 250, arrayArea: 3.5, mount: 'tracking', batteryWh: 1200, dod: 0.3, ...CELL },
    propulsion: { thrust: 4, isp: 223, propellant: THEOS2_PROPELLANT },
    adcs: { mode: 'threeAxis', inertia: boxInertia(THEOS2_MASS, theos2Size), pointingDeg: 0.05, wheelH: 12, residualDipole: 1, cpOffset: 0.1 },
    comms: { txPowerW: 10, frequency: 8.2e9, txAntennaD: 0.15, lineLoss: 1, dataRate: 140e6, requiredEbN0: 5.52, station: 'bangkok', minElDeg: 10, ...NEN_STATION },
    payload: { focalLength: 16.1, pixelPitch: 13e-6, pixels: 20_600, aperture: 0.9, bits: 12, wavelength: VISIBLE },
  },
  sources: {
    // the 425 kg, less a propellant load that is an estimate: both labelled estimates below
    'bus.dryMass': SOURCE.theos2, lifeYears: SOURCE.theos2, 'comms.dataRate': SOURCE.theos2,
    'orbit.perigee': SOURCE.theos2, 'orbit.apogee': SOURCE.theos2, 'orbit.inclination': SOURCE.theos2, 'orbit.sso': SOURCE.theos2, 'orbit.ltan': SOURCE.theos2,
    'bus.cr': SOURCE.cr, ...CELL_SOURCES, 'power.dod': SOURCE.dodLeo, 'propulsion.isp': SOURCE.hydrazine,
    'payload.focalLength': SOURCE.theos2Camera, 'payload.pixelPitch': SOURCE.theos2Camera, 'payload.pixels': SOURCE.theos2Camera,
    'adcs.residualDipole': SOURCE.starinDipole, 'comms.requiredEbN0': SOURCE.ebN0, ...NEN_SOURCES,
  },
  estimates: [
    'bus.dryMass', 'propulsion.isp', 'adcs.residualDipole',
    'payload.focalLength', 'payload.pixelPitch', 'payload.pixels',
  ],
};

/** The templates, in the order the picker lists them: Thailand's own first, then the catalogue's classes. */
export const SATELLITE_TEMPLATES: readonly SatelliteTemplate[] = [napa2, theos2, earthObs, comsat, weather, navigation, science];

export const satelliteTemplateById = (id: string): SatelliteTemplate | undefined => SATELLITE_TEMPLATES.find((t) => t.id === id);

/** The THEOS-2-class template's wet mass, kg: eoPortal's 425, an estimate (see the header). */
export const THEOS2_CLASS_MASS = THEOS2_MASS;
