/**
 * Launch vehicle definitions.
 *
 * Numbers are drawn from public sources (manufacturer user guides, press kits,
 * encyclopedic summaries) and rounded. Solid motors use an average thrust so
 * that propellant mass / mass-flow gives the published burn time; the
 * simulation applies a regressive thrust profile on top of that. Where dry
 * masses are not published they are estimated from stage mass fractions.
 * Treat every figure as approximate (±10 %).
 */
import type { VehicleSpec, EngineSpec, StageSpec, BoosterGroupSpec } from '../types';

const kN = 1000;

// ---------------------------------------------------------------- engines
const RD107A: EngineSpec = { name: 'RD-107A', count: 1, thrustSL: 839.5 * kN, thrustVac: 1019.9 * kN, ispSL: 263.3, ispVac: 320.2, minThrottle: 0.5 };
const RD108A: EngineSpec = { name: 'RD-108A', count: 1, thrustSL: 792.4 * kN, thrustVac: 921.9 * kN, ispSL: 257.7, ispVac: 320.6, minThrottle: 0.5 };
const RD0110: EngineSpec = { name: 'RD-0110', count: 1, thrustSL: 200 * kN, thrustVac: 298 * kN, ispSL: 250, ispVac: 326, minThrottle: 0.5 };
const RD0124: EngineSpec = { name: 'RD-0124', count: 1, thrustSL: 200 * kN, thrustVac: 294.3 * kN, ispSL: 250, ispVac: 359, minThrottle: 0.5 };
const S592: EngineSpec = { name: 'S5.92', count: 1, thrustSL: 15 * kN, thrustVac: 19.85 * kN, ispSL: 250, ispVac: 333.2 };
const RD276: EngineSpec = { name: 'RD-276', count: 6, thrustSL: 1745 * kN, thrustVac: 1915 * kN, ispSL: 288, ispVac: 316, minThrottle: 0.6 };
const RD0210: EngineSpec = { name: 'RD-0210/0211', count: 4, thrustSL: 500 * kN, thrustVac: 582 * kN, ispSL: 280, ispVac: 327 };
const RD0213: EngineSpec = { name: 'RD-0213 + RD-0214', count: 1, thrustSL: 520 * kN, thrustVac: 613.8 * kN, ispSL: 280, ispVac: 325 };
const S598M: EngineSpec = { name: 'S5.98M', count: 1, thrustSL: 15 * kN, thrustVac: 19.62 * kN, ispSL: 250, ispVac: 326 };
const RD191: EngineSpec = { name: 'RD-191', count: 1, thrustSL: 1920 * kN, thrustVac: 2090 * kN, ispSL: 310.7, ispVac: 337.5, minThrottle: 0.3 };
const RD0124A: EngineSpec = { name: 'RD-0124A', count: 1, thrustSL: 200 * kN, thrustVac: 294.3 * kN, ispSL: 250, ispVac: 359 };
const MERLIN1D: EngineSpec = { name: 'Merlin 1D', count: 9, thrustSL: 845 * kN, thrustVac: 914 * kN, ispSL: 282, ispVac: 311, minThrottle: 0.4 };
const MERLIN1D_FH_CORE: EngineSpec = { ...MERLIN1D };
const MVAC: EngineSpec = { name: 'Merlin Vacuum', count: 1, thrustSL: 700 * kN, thrustVac: 981 * kN, ispSL: 250, ispVac: 348, minThrottle: 0.4 };
const RD180: EngineSpec = { name: 'RD-180', count: 1, thrustSL: 3827 * kN, thrustVac: 4152 * kN, ispSL: 311.3, ispVac: 337.8, minThrottle: 0.47 };
const GEM63: EngineSpec = { name: 'GEM-63', count: 1, thrustSL: 1180 * kN, thrustVac: 1300 * kN, ispSL: 254, ispVac: 279, solid: true };
const RL10C1: EngineSpec = { name: 'RL10C-1', count: 1, thrustSL: 60 * kN, thrustVac: 101.8 * kN, ispSL: 280, ispVac: 449.7 };
const BE4: EngineSpec = { name: 'BE-4', count: 2, thrustSL: 2400 * kN, thrustVac: 2600 * kN, ispSL: 310, ispVac: 340, minThrottle: 0.4 };
const GEM63XL: EngineSpec = { name: 'GEM-63XL', count: 1, thrustSL: 1340 * kN, thrustVac: 1460 * kN, ispSL: 254, ispVac: 279, solid: true };
const RL10C11_X2: EngineSpec = { name: 'RL10C-1-1', count: 2, thrustSL: 60 * kN, thrustVac: 106 * kN, ispSL: 280, ispVac: 453.8 };
const VULCAIN21: EngineSpec = { name: 'Vulcain 2.1', count: 1, thrustSL: 960 * kN, thrustVac: 1370 * kN, ispSL: 318, ispVac: 431 };
const P120C: EngineSpec = { name: 'P120C', count: 1, thrustSL: 3200 * kN, thrustVac: 3400 * kN, ispSL: 262, ispVac: 278.5, solid: true };
const VINCI: EngineSpec = { name: 'Vinci', count: 1, thrustSL: 100 * kN, thrustVac: 180 * kN, ispSL: 280, ispVac: 457 };
const YF77: EngineSpec = { name: 'YF-77', count: 2, thrustSL: 510 * kN, thrustVac: 700 * kN, ispSL: 310, ispVac: 430 };
const YF100_X2: EngineSpec = { name: 'YF-100', count: 2, thrustSL: 1200 * kN, thrustVac: 1340 * kN, ispSL: 300, ispVac: 335 };
const YF75D_X2: EngineSpec = { name: 'YF-75D', count: 2, thrustSL: 50 * kN, thrustVac: 88.36 * kN, ispSL: 280, ispVac: 442 };
const LE9_X2: EngineSpec = { name: 'LE-9', count: 2, thrustSL: 1220 * kN, thrustVac: 1471 * kN, ispSL: 352, ispVac: 425, minThrottle: 0.63 };
const SRB3: EngineSpec = { name: 'SRB-3', count: 1, thrustSL: 1650 * kN, thrustVac: 1780 * kN, ispSL: 265, ispVac: 283.6, solid: true };
const LE5B3: EngineSpec = { name: 'LE-5B-3', count: 1, thrustSL: 80 * kN, thrustVac: 137 * kN, ispSL: 280, ispVac: 448 };
const S139: EngineSpec = { name: 'S139', count: 1, thrustSL: 3000 * kN, thrustVac: 3400 * kN, ispSL: 237, ispVac: 269, solid: true };
const PSOM_XL: EngineSpec = { name: 'PSOM-XL', count: 1, thrustSL: 420 * kN, thrustVac: 460 * kN, ispSL: 240, ispVac: 262, solid: true };
const VIKAS: EngineSpec = { name: 'Vikas', count: 1, thrustSL: 725 * kN, thrustVac: 803 * kN, ispSL: 262, ispVac: 293 };
const HPS3: EngineSpec = { name: 'HPS3', count: 1, thrustSL: 200 * kN, thrustVac: 240 * kN, ispSL: 260, ispVac: 295, solid: true };
const PS4_L25: EngineSpec = { name: 'L-2-5', count: 2, thrustSL: 5 * kN, thrustVac: 7.3 * kN, ispSL: 260, ispVac: 308 };
const RUTHERFORD: EngineSpec = { name: 'Rutherford', count: 9, thrustSL: 24.9 * kN, thrustVac: 27.5 * kN, ispSL: 311, ispVac: 343, minThrottle: 0.5 };
const RUTHERFORD_VAC: EngineSpec = { name: 'Rutherford Vacuum', count: 1, thrustSL: 18 * kN, thrustVac: 25.8 * kN, ispSL: 260, ispVac: 343, minThrottle: 0.5 };
const CURIE: EngineSpec = { name: 'Curie', count: 1, thrustSL: 0.1 * kN, thrustVac: 0.12 * kN, ispSL: 250, ispVac: 320 };
const RAPTOR_SL_X33: EngineSpec = { name: 'Raptor 2', count: 33, thrustSL: 2300 * kN, thrustVac: 2500 * kN, ispSL: 327, ispVac: 347, minThrottle: 0.4 };
const RAPTOR_SHIP: EngineSpec = { name: 'Raptor 2 / RVac', count: 6, thrustSL: 2000 * kN, thrustVac: 2400 * kN, ispSL: 320, ispVac: 365, minThrottle: 0.4 };

// ---------------------------------------------------------------- helpers
const f9Booster = (id: string, name: string, count: number): BoosterGroupSpec => ({
  id, name, count, dryMass: 25600, propellantMass: 395700, engine: MERLIN1D,
  diameter: 3.66, length: 42, sepDelay: 2, color: '#f2f2f2',
});
const briz = (): StageSpec => ({
  id: 'brizm', name: 'Briz-M', dryMass: 2370, propellantMass: 19800, engine: S598M,
  diameter: 4.0, length: 2.6, restartable: true, sepDelay: 2, ignitionDelay: 3, color: '#d8d8d8',
});
const f9Stage2 = (): StageSpec => ({
  id: 's2', name: 'Second stage (Merlin Vacuum)', dryMass: 4300, propellantMass: 108000, engine: MVAC,
  diameter: 3.66, length: 15, restartable: true, sepDelay: 3, ignitionDelay: 4, color: '#f2f2f2', accentColor: '#222',
});

// ---------------------------------------------------------------- vehicles
const soyuzCore = (): StageSpec => ({
  id: 'blokA', name: 'Blok A (core)', dryMass: 6545, propellantMass: 87000, engine: RD108A,
  diameter: 2.95, length: 27.8, color: '#c9c7bd', accentColor: '#5a6b4c',
  boosters: [{
    id: 'blokBVGD', name: 'Blok B/V/G/D boosters', count: 4, dryMass: 3784, propellantMass: 39600,
    engine: RD107A, diameter: 2.68, length: 19.6, sepDelay: 1, conicalTop: true, color: '#c9c7bd',
  }],
});

export const VEHICLES: VehicleSpec[] = [
  {
    id: 'soyuz21a', name: 'Soyuz-2.1a', country: 'RU', manufacturer: 'RKTs Progress',
    height: 46.3, payloadLEO: 7020, payloadGTO: 0,
    fairing: { mass: 1000, diameter: 3.7, length: 10.1, sepAltitude: 95e3, color: '#e8e8e8' },
    stages: [
      soyuzCore(),
      { id: 'blokI', name: 'Blok I (3rd stage, RD-0110)', dryMass: 2410, propellantMass: 22900, engine: RD0110, diameter: 2.66, length: 6.7, sepDelay: 0, ignitionDelay: 0, color: '#c9c7bd' },
    ],
    sites: ['baikonur', 'plesetsk', 'vostochny'], maxQ: 40e3, maxAccel: 60,
    crewCapable: true,
    notes: 'The crew/cargo launcher for Soyuz MS and Progress: R-7 boosters and core with the RD-0110 third stage, direct insertion.',
  },
  {
    id: 'soyuz21b', name: 'Soyuz-2.1b / Fregat-M', country: 'RU', manufacturer: 'RKTs Progress',
    height: 46.3, payloadLEO: 8200, payloadGTO: 1900, payloadSSO: 4900,
    fairing: { mass: 1500, diameter: 4.11, length: 11.4, sepAltitude: 95e3, color: '#e8e8e8' },
    stages: [
      soyuzCore(),
      { id: 'blokI', name: 'Blok I (3rd stage)', dryMass: 2355, propellantMass: 23000, engine: RD0124, diameter: 2.66, length: 6.7, sepDelay: 0, ignitionDelay: 0, color: '#c9c7bd' },
      { id: 'fregat', name: 'Fregat-M', dryMass: 1050, propellantMass: 5350, engine: S592, diameter: 3.35, length: 1.5, restartable: true, sepDelay: 2, ignitionDelay: 3, color: '#b8b0a0' },
    ],
    sites: ['baikonur', 'plesetsk', 'vostochny'], maxQ: 40e3, maxAccel: 60,
    notes: 'R-7 family; four conical strap-on boosters, hot-staged third stage, restartable Fregat upper stage.',
  },
  {
    id: 'protonm', name: 'Proton-M / Briz-M', country: 'RU', manufacturer: 'Khrunichev',
    height: 58.2, payloadLEO: 23000, payloadGTO: 6920,
    fairing: { mass: 2000, diameter: 4.35, length: 15, sepAltitude: 120e3, color: '#e8e8e8' },
    stages: [
      { id: 'p1', name: 'First stage (6× RD-276)', dryMass: 30600, propellantMass: 419400, engine: RD276, diameter: 7.4, length: 21.2, color: '#d9d9d9', accentColor: '#7a7a7a' },
      { id: 'p2', name: 'Second stage', dryMass: 11000, propellantMass: 156100, engine: RD0210, diameter: 4.1, length: 17, sepDelay: 0, ignitionDelay: 0, color: '#d9d9d9' },
      { id: 'p3', name: 'Third stage', dryMass: 3500, propellantMass: 46600, engine: RD0213, diameter: 4.1, length: 6.5, sepDelay: 1, ignitionDelay: 1, color: '#d9d9d9' },
      briz(),
    ],
    sites: ['baikonur'], maxQ: 40e3, maxAccel: 55,
    notes: 'Hypergolic heavy-lift launcher; Briz-M performs multi-burn GTO/GEO insertions.',
  },
  {
    id: 'angaraa5', name: 'Angara-A5 / Briz-M', country: 'RU', manufacturer: 'Khrunichev',
    height: 55.4, payloadLEO: 24500, payloadGTO: 5400,
    fairing: { mass: 2000, diameter: 4.35, length: 15, sepAltitude: 120e3, color: '#e8e8e8' },
    stages: [
      {
        id: 'urm1core', name: 'URM-1 core', dryMass: 9000, propellantMass: 128800, engine: RD191,
        diameter: 2.9, length: 25.7, color: '#f0f0f0', accentColor: '#c33', throttleWithBoosters: 0.3,
        boosters: [{ id: 'urm1', name: 'URM-1 boosters', count: 4, dryMass: 9000, propellantMass: 128800, engine: RD191, diameter: 2.9, length: 25.7, sepDelay: 1, color: '#f0f0f0' }],
      },
      { id: 'urm2', name: 'URM-2', dryMass: 4000, propellantMass: 35800, engine: RD0124A, diameter: 3.6, length: 6.9, sepDelay: 1, ignitionDelay: 1, color: '#f0f0f0' },
      briz(),
    ],
    sites: ['plesetsk', 'vostochny'], maxQ: 40e3, maxAccel: 50,
    notes: 'Modular kerolox launcher; core throttles to 30 % while four identical URM-1 boosters burn.',
  },
  {
    id: 'falcon9', name: 'Falcon 9 Block 5', country: 'US', manufacturer: 'SpaceX',
    height: 70, payloadLEO: 22800, payloadGTO: 8300, payloadSSO: 15000,
    fairing: { mass: 1900, diameter: 5.2, length: 13.1, sepAltitude: 110e3, color: '#f4f4f4' },
    stages: [
      { id: 's1', name: 'First stage (9× Merlin 1D)', dryMass: 25600, propellantMass: 395700, engine: MERLIN1D, diameter: 3.66, length: 42, color: '#f2f2f2', accentColor: '#1a1a1a', gridFins: true, legs: true },
      f9Stage2(),
    ],
    sites: ['cape', 'vandenberg'], maxQ: 40e3, maxAccel: 45,
    maxQThrottle: { qStart: 22e3, qEnd: 22e3, throttle: 0.75 },
    recoverable: true, recoveryReserve: 0.12, crewCapable: true,
    notes: 'Partially reusable; enabling booster recovery reserves propellant for the boost-back/landing burns.',
  },
  {
    id: 'falconheavy', name: 'Falcon Heavy', country: 'US', manufacturer: 'SpaceX',
    height: 70, payloadLEO: 63800, payloadGTO: 26700,
    fairing: { mass: 1900, diameter: 5.2, length: 13.1, sepAltitude: 110e3, color: '#f4f4f4' },
    stages: [
      {
        id: 'core', name: 'Center core', dryMass: 28000, propellantMass: 395700, engine: MERLIN1D_FH_CORE,
        diameter: 3.66, length: 42, color: '#f2f2f2', accentColor: '#1a1a1a', gridFins: true, legs: true,
        throttleWithBoosters: 0.55,
        boosters: [f9Booster('side', 'Side boosters', 2)],
      },
      f9Stage2(),
    ],
    sites: ['cape'], maxQ: 40e3, maxAccel: 45,
    recoverable: true, recoveryReserve: 0.12,
    notes: 'Three Falcon 9 cores; the center core throttles down until side-booster separation.',
  },
  {
    id: 'atlasv551', name: 'Atlas V 551', country: 'US', manufacturer: 'ULA',
    height: 62.2, payloadLEO: 18850, payloadGTO: 8900,
    fairing: { mass: 3524, diameter: 5.4, length: 20.7, sepAltitude: 110e3, color: '#f4f4f4' },
    stages: [
      {
        id: 'ccb', name: 'Common Core Booster (RD-180)', dryMass: 21054, propellantMass: 284089, engine: RD180,
        diameter: 3.81, length: 32.5, color: '#c8792a', accentColor: '#7a4a17',
        boosters: [{ id: 'gem63', name: 'GEM-63 solid boosters', count: 5, dryMass: 5000, propellantMass: 44200, engine: GEM63, diameter: 1.6, length: 20, sepDelay: 2, color: '#f4f4f4' }],
      },
      { id: 'centaur3', name: 'Centaur III (RL10C-1)', dryMass: 2243, propellantMass: 20830, engine: RL10C1, diameter: 3.05, length: 12.7, restartable: true, sepDelay: 3, ignitionDelay: 10, color: '#e5e5e5' },
    ],
    sites: ['cape', 'vandenberg'], maxQ: 45e3, maxAccel: 49,
    maxQThrottle: { qStart: 22e3, qEnd: 22e3, throttle: 0.6 },
    notes: 'Five solid boosters, kerolox core and a high-Isp hydrogen Centaur upper stage. The RD-180 throttles down through max-Q.',
  },
  {
    id: 'vulcan', name: 'Vulcan Centaur VC4', country: 'US', manufacturer: 'ULA',
    height: 61.6, payloadLEO: 24400, payloadGTO: 12100,
    fairing: { mass: 3500, diameter: 5.4, length: 15.5, sepAltitude: 110e3, color: '#f4f4f4' },
    stages: [
      {
        id: 'v1', name: 'First stage (2× BE-4)', dryMass: 30000, propellantMass: 430000, engine: BE4,
        diameter: 5.4, length: 33.3, color: '#f4f4f4', accentColor: '#c0392b',
        boosters: [{ id: 'gem63xl', name: 'GEM-63XL solid boosters', count: 4, dryMass: 5600, propellantMass: 47800, engine: GEM63XL, diameter: 1.6, length: 22, sepDelay: 2, color: '#f4f4f4' }],
      },
      { id: 'centaur5', name: 'Centaur V (2× RL10C-1-1)', dryMass: 5000, propellantMass: 54000, engine: RL10C11_X2, diameter: 5.4, length: 11.7, restartable: true, sepDelay: 3, ignitionDelay: 10, color: '#e5e5e5' },
    ],
    sites: ['cape', 'vandenberg'], maxQ: 45e3, maxAccel: 49,
    maxQThrottle: { qStart: 25e3, qEnd: 25e3, throttle: 0.7 },
    notes: 'Methalox first stage with up to six solids; Centaur V is a long-coast hydrogen upper stage.',
  },
  {
    id: 'ariane64', name: 'Ariane 64', country: 'EU', manufacturer: 'ArianeGroup',
    height: 62, payloadLEO: 21600, payloadGTO: 11500, payloadSSO: 15000,
    fairing: { mass: 2900, diameter: 5.4, length: 20, sepAltitude: 115e3, color: '#f4f4f4' },
    stages: [
      {
        id: 'llpm', name: 'Core (Vulcain 2.1)', dryMass: 15700, propellantMass: 145000, engine: VULCAIN21,
        diameter: 5.4, length: 29, color: '#f4f4f4', accentColor: '#1d4f91',
        boosters: [{ id: 'p120c', name: 'P120C solid boosters', count: 4, dryMass: 13000, propellantMass: 142000, engine: P120C, diameter: 3.4, length: 13.5, sepDelay: 2, color: '#f4f4f4' }],
      },
      { id: 'ulpm', name: 'Upper stage (Vinci)', dryMass: 5300, propellantMass: 31000, engine: VINCI, diameter: 5.4, length: 11.6, restartable: true, sepDelay: 3, ignitionDelay: 6, color: '#f4f4f4' },
    ],
    sites: ['kourou'], maxQ: 55e3, maxAccel: 45,
    notes: 'Hydrogen core with four P120C solids; the Vinci upper stage restarts for multi-orbit missions.',
  },
  {
    id: 'longmarch5', name: 'Long March 5', country: 'CN', manufacturer: 'CALT',
    height: 57, payloadLEO: 25000, payloadGTO: 14000,
    fairing: { mass: 3000, diameter: 5.2, length: 12.3, sepAltitude: 120e3, color: '#f4f4f4' },
    stages: [
      {
        id: 'cz5core', name: 'Core (2× YF-77)', dryMass: 17000, propellantMass: 158000, engine: YF77,
        diameter: 5.0, length: 33, color: '#f4f4f4', accentColor: '#1f5fbf',
        boosters: [{ id: 'k3', name: 'Kerolox boosters (2× YF-100 each)', count: 4, dryMass: 12000, propellantMass: 140000, engine: YF100_X2, diameter: 3.35, length: 26.3, sepDelay: 2, color: '#f4f4f4' }],
      },
      { id: 'cz5s2', name: 'Second stage (2× YF-75D)', dryMass: 5500, propellantMass: 25000, engine: YF75D_X2, diameter: 5.0, length: 12, restartable: true, sepDelay: 2, ignitionDelay: 4, color: '#f4f4f4' },
    ],
    sites: ['wenchang'], maxQ: 40e3, maxAccel: 45,
    notes: "China's heavy-lift launcher: hydrogen core with four kerolox boosters.",
  },
  {
    id: 'h3', name: 'H3-22', country: 'JP', manufacturer: 'MHI / JAXA',
    height: 63, payloadLEO: 10000, payloadGTO: 4000, payloadSSO: 4000,
    fairing: { mass: 2400, diameter: 5.2, length: 12, sepAltitude: 120e3, color: '#f4f4f4' },
    stages: [
      {
        id: 'h3s1', name: 'First stage (2× LE-9)', dryMass: 20000, propellantMass: 225000, engine: LE9_X2,
        diameter: 5.2, length: 37, color: '#f4f4f4', accentColor: '#d35400',
        boosters: [{ id: 'srb3', name: 'SRB-3 solid boosters', count: 2, dryMass: 8700, propellantMass: 66800, engine: SRB3, diameter: 2.5, length: 14.6, sepDelay: 2, color: '#f4f4f4' }],
      },
      { id: 'h3s2', name: 'Second stage (LE-5B-3)', dryMass: 3700, propellantMass: 23300, engine: LE5B3, diameter: 5.2, length: 12, restartable: true, sepDelay: 3, ignitionDelay: 5, color: '#f4f4f4' },
    ],
    sites: ['tanegashima'], maxQ: 40e3, maxAccel: 45,
    notes: 'Expander-bleed LE-9 hydrogen engines with two SRB-3 solids.',
  },
  {
    id: 'pslvxl', name: 'PSLV-XL', country: 'IN', manufacturer: 'ISRO',
    height: 44, payloadLEO: 3800, payloadGTO: 1425, payloadSSO: 1750,
    fairing: { mass: 1150, diameter: 3.2, length: 8.3, sepAltitude: 115e3, color: '#f4f4f4' },
    stages: [
      {
        id: 'ps1', name: 'PS1 (S139 solid)', dryMass: 30200, propellantMass: 138200, engine: S139,
        diameter: 2.8, length: 20, color: '#f4f4f4', accentColor: '#e67e22',
        boosters: [
          { id: 'psomg', name: 'PSOM-XL (ground-lit)', count: 4, dryMass: 2010, propellantMass: 12200, engine: PSOM_XL, diameter: 1.0, length: 12, sepDelay: 2, color: '#f4f4f4' },
          { id: 'psoma', name: 'PSOM-XL (air-lit)', count: 2, dryMass: 2010, propellantMass: 12200, engine: PSOM_XL, diameter: 1.0, length: 12, igniteAt: 25, sepDelay: 2, color: '#f4f4f4' },
        ],
      },
      { id: 'ps2', name: 'PS2 (Vikas)', dryMass: 5300, propellantMass: 41000, engine: VIKAS, diameter: 2.8, length: 12.8, sepDelay: 1, ignitionDelay: 1, color: '#f4f4f4' },
      { id: 'ps3', name: 'PS3 (HPS3 solid)', dryMass: 1100, propellantMass: 7600, engine: HPS3, diameter: 2.0, length: 3.6, sepDelay: 2, ignitionDelay: 2, color: '#f4f4f4' },
      { id: 'ps4', name: 'PS4 (2× L-2-5)', dryMass: 920, propellantMass: 2500, engine: PS4_L25, diameter: 1.3, length: 2.6, restartable: true, sepDelay: 2, ignitionDelay: 3, color: '#f4f4f4' },
    ],
    sites: ['sriharikota'], maxQ: 70e3, maxAccel: 60,
    notes: 'Four alternating solid/liquid stages; two of six strap-ons are air-lit at T+25 s.',
  },
  {
    id: 'electron', name: 'Electron', country: 'NZ/US', manufacturer: 'Rocket Lab',
    height: 18, payloadLEO: 300, payloadGTO: 0, payloadSSO: 200,
    fairing: { mass: 50, diameter: 1.2, length: 2.5, sepAltitude: 105e3, color: '#111' },
    stages: [
      { id: 'e1', name: 'First stage (9× Rutherford)', dryMass: 850, propellantMass: 9700, engine: RUTHERFORD, diameter: 1.2, length: 12.1, color: '#111', accentColor: '#333' },
      { id: 'e2', name: 'Second stage (Rutherford Vacuum)', dryMass: 220, propellantMass: 2300, engine: RUTHERFORD_VAC, diameter: 1.2, length: 2.4, sepDelay: 1, ignitionDelay: 2, color: '#111' },
      { id: 'curie', name: 'Curie kick stage', dryMass: 30, propellantMass: 150, engine: CURIE, diameter: 1.2, length: 0.5, restartable: true, sepDelay: 2, ignitionDelay: 3, color: '#222' },
    ],
    sites: ['mahia', 'wallops'], maxQ: 50e3, maxAccel: 60,
    notes: 'Small carbon-composite launcher with electric-pump Rutherford engines and a Curie kick stage.',
  },
  {
    id: 'starship', name: 'Starship (Super Heavy)', country: 'US', manufacturer: 'SpaceX',
    height: 123, payloadLEO: 100000, payloadGTO: 27000,
    fairing: null,
    stages: [
      { id: 'superheavy', name: 'Super Heavy (33× Raptor)', dryMass: 220000, propellantMass: 3500000, engine: RAPTOR_SL_X33, diameter: 9, length: 71, color: '#a8a9ad', accentColor: '#3b3b3b', gridFins: true },
      { id: 'ship', name: 'Ship (3× Raptor + 3× RVac)', dryMass: 130000, propellantMass: 1500000, engine: RAPTOR_SHIP, diameter: 9, length: 52, restartable: true, sepDelay: 0, ignitionDelay: 0, color: '#a8a9ad', accentColor: '#1c1c1c', flaps: true },
    ],
    sites: ['starbase', 'cape'], maxQ: 35e3, maxAccel: 40,
    maxQThrottle: { qStart: 25e3, qEnd: 25e3, throttle: 0.8 },
    recoverable: true, recoveryReserve: 0.07, crewCapable: true,
    notes: 'Fully reusable two-stage methalox system; hot-staged ship, integrated payload bay (no fairing).',
  },
];

export const vehicleById = (id: string): VehicleSpec => {
  const v = VEHICLES.find((x) => x.id === id);
  if (!v) throw new Error(`Unknown vehicle ${id}`);
  return v;
};
