/**
 * A satellite as the builder designs it (roadmap D06, docs/ROADMAP-PART2-3.md;
 * Phase 4 map §2.3, §2.5 and §2.2 G, step 0.3). Types only: the shape every
 * Phase 4 track compiles against — the satellite model and its checker (B),
 * the cores (A1–A4), the Build → Orbit hand-off (C1), D07's solver and the
 * design lessons (T01, T02) — so none has to edit another's file.
 *
 * Kept out of src/types.ts, which the launch side shares, to keep merges
 * apart. A design is its own thing, not a `SatelliteSpec`: the catalogue's
 * satellite classes (src/data/satellites.ts) feed the launch physics and do
 * not change (Principle 7; tests/d06-satellites-identity.test.ts pins them).
 *
 * UNITS. A design is what a student types and a file keeps, so it is stored
 * like the other specs a user types (src/types.ts): kg, m, N, s, W, Hz, dB,
 * angles in degrees, local times in hours, and the battery in Wh, as
 * batteries are rated. The cores take SI and radians
 * (src/orbit/satellite-cores.ts); the satellite model converts, in one place.
 *
 * DOM-free, and free of the propagator: src/design must not import
 * src/physics/propagator/* (tests/propagator.test.ts), not even a type, so
 * the drag area reaches P07 through `HandoffSpacecraft` (src/orbit/handoff.ts).
 */
import type { SatelliteKind } from '../types';
import type { ArrayMount, PowerRegulation } from '../orbit/satellite-cores';

/** The ADCS's way of holding its attitude. */
export type AttitudeMode = 'gravityGradient' | 'spin' | 'threeAxis';

export interface SatelliteDesign {
  id: string;
  /** what its designer calls it: the designer's text, never translated */
  name: string;
  /** the `SatelliteTemplate` id it started from */
  template: string;
  /** one of the catalogue's eight kinds (src/types.ts): its drawing, and what the S03 hand-off accepts */
  kind: SatelliteKind;
  orbit: {
    /** altitudes above R_EARTH, m */
    perigee: number;
    apogee: number;
    /** deg */
    inclination: number;
    /** the inclination is the sun-synchronous one for the size and shape */
    sso: boolean;
    /** the ascending node's mean local time, h (with `sso`) */
    ltan?: number;
    /** a fixed right ascension of the ascending node, deg */
    raan?: number;
  };
  /** the life it is designed for, years */
  lifeYears: number;
  bus: {
    /** kg, without propellant */
    dryMass: number;
    /** the body's edges, m: its drawing and its drag area */
    size: { width: number; height: number; depth: number };
    /** drag and radiation-pressure coefficients (one area serves both: map risk R8) */
    cd: number;
    cr: number;
  };
  power: {
    /** the payload's and the bus's loads, W */
    payloadW: number;
    busW: number;
    /** the array, m²; cell efficiency and inherent degradation I_d, 0–1; output lost a year, 0–1 */
    arrayArea: number;
    cellEff: number;
    Id: number;
    degPerYear: number;
    mount: ArrayMount;
    regulation: PowerRegulation;
    /** the battery, Wh; depth of discharge allowed and battery-to-load efficiency, 0–1 */
    batteryWh: number;
    dod: number;
    batteryEff: number;
  };
  /** the satellite's own engine and its propellant, or null when it has none */
  propulsion: {
    /** N */
    thrust: number;
    /** s */
    isp: number;
    /** kg */
    propellant: number;
    /**
     * m/s: what the satellite's own engine must give to reach the orbit
     * above after the launcher lets it go — a geostationary satellite's
     * apogee kick from its transfer orbit (TU Delft Fig. 11: 1836.5 m/s
     * from a Proton's). Absent or 0 when the launcher puts it there. The
     * first line of the Δv budget (D06, map §2.2 C; track B).
     */
    insertionDv?: number;
  } | null;
  adcs: {
    mode: AttitudeMode;
    /** principal moments of inertia, kg·m² */
    inertia: [number, number, number];
    /** the pointing accuracy needed, deg */
    pointingDeg: number;
    /** wheel momentum, N·m·s */
    wheelH: number;
    /** residual magnetic dipole, A·m² */
    residualDipole: number;
    /** the centre of pressure's offset from the centre of mass, m (the arm of the drag and sunlight torques) */
    cpOffset: number;
  };
  comms: {
    /** transmitter power, W; carrier, Hz; the satellite's dish, m; line loss, dB */
    txPowerW: number;
    frequency: number;
    txAntennaD: number;
    lineLoss: number;
    /** bit/s, and the E_b/N₀ the coding needs, dB */
    dataRate: number;
    requiredEbN0: number;
    /** a `STATIONS` id (src/orbit/applications-setup.ts), and the lowest elevation it works at, deg */
    station: string;
    minElDeg: number;
    /**
     * The receiving station (track B): its dish, m, and its system noise
     * temperature, K; and the path's other losses, dB — atmosphere,
     * polarisation, modulation and implementation, one figure (positive,
     * subtracted). Optional so a design written before them still reads;
     * absent, the satellite model takes the defaults it names
     * (src/design/satellite-model.ts, `RX_DEFAULTS`).
     */
    rxAntennaD?: number;
    rxNoiseK?: number;
    losses?: number;
  };
  /** the camera, or null for a satellite without one */
  payload: {
    /** m */
    focalLength: number;
    pixelPitch: number;
    /** pixels across the track */
    pixels: number;
    /** the aperture's diameter, m */
    aperture: number;
    /** bits per pixel */
    bits: number;
    /**
     * The wavelength its aperture must resolve, m: the diffraction limit's
     * (D06's camera figure, and D07's aperture for a ground sample). Optional,
     * so a design written before it still reads; absent, 550 nm, the middle
     * of the visible (`DIFFRACTION_WAVELENGTH`, src/design/satellite-link.ts),
     * an estimate and labelled one. The integration of D06 and D07: the
     * requirement solver used to take it as an option of its own.
     */
    wavelength?: number;
  } | null;
  /** where its figures come from, as the designer or the template gave them */
  sources?: string[];
}

/**
 * Where a design starts (map §2.5; src/data/satellite-templates.ts, track B).
 * Templates are a table of their own: an entry drawn from a catalogue class
 * takes that class's mass, propulsion (propellant = fraction × mass) and size
 * from `SATELLITES`, which it never changes, and its orbit from
 * `presetOrbit(typicalOrbit, jd0)` (src/orbit/presets.ts). The cubesats
 * dispenser, the Starlink stack, crew vehicles and the historical payloads are
 * not templates. Names and descriptions are i18n keys, so no text here.
 */
export interface SatelliteTemplate {
  id: string;
  /** the `SATELLITES` id whose mass, propulsion and size it takes, or null for one of its own (a 6U CubeSat from NAPA-2) */
  derivedFrom: string | null;
  kind: SatelliteKind;
  /** an orbit preset id (src/data/orbits.ts) */
  typicalOrbit: string;
  /**
   * An orbit of its own, where the satellite it is drawn from flew one that
   * no preset holds (NAPA-2's 520 × 540 km, THEOS-2's 621 km): it wins over
   * `typicalOrbit`, which then only names the preset nearest to it.
   */
  orbit?: SatelliteDesign['orbit'];
  /** everything else a design starts with */
  design: Omit<SatelliteDesign, 'id' | 'name' | 'template' | 'kind' | 'orbit'>;
  /**
   * Where each figure comes from, by its path in `design` (`'power.cellEff'`):
   * a URL or a citation with its page. A figure with no entry is an estimate,
   * and the screen says so (Principle 4).
   */
  sources: Readonly<Record<string, string>>;
  /**
   * Paths that have a source and are still estimates here (track B): a
   * catalogue class's typical figure standing in for one satellite's, or a
   * published figure the sources disagree on (THEOS-2's mass). The screen
   * labels them estimates, and names the source.
   */
  estimates?: readonly string[];
}

/**
 * G. The drag area P07 flies (src/design/satellite-area.ts, track A4; map
 * §2.2 G). It imports src/orbit/reentry.ts only. Validation: the NAPA-2 6U
 * template reproduces B = 0.0134 m²/kg and the +8.0 % lifetime within 25 %
 * (docs/VALIDATION.md), and TU Delft p. 138's drag force, 142 µN, within 1 µN.
 */
export interface SatelliteAreaCore {
  /**
   * The mean cross-section a tumbling satellite shows the air, m²: the body's
   * `tumblingBoxArea` plus half the one-sided area of any array on wings (a
   * flat plate tumbling at random shows a quarter of its two sides; cells on
   * the body are the body's own faces). An estimate, and labelled one; it is
   * also the area sunlight pressure sees in Cowell mode.
   */
  dragArea: (design: SatelliteDesign) => number;
  /** B = C_D·A/m, m²/kg, with the wet mass (dry + propellant); shown against `B_RANGE` (src/orbit/ballistic-range.ts). */
  ballisticCoefficient: (design: SatelliteDesign) => number;
}
