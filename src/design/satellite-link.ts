/**
 * A designed satellite's downlink and its camera's wavelength, read from the
 * design one way for D06 and D07 (roadmap D06, D07, docs/ROADMAP-PART2-3.md;
 * the integration of Phase 4 stage 3, D07's contract gaps).
 *
 * D07's requirement solver took the satellite's antenna gain, the ground
 * receiver and the wavelength its aperture must resolve as options of its
 * own, while the D06 bench worked the same three out of the design — so the
 * two could give one downlink two ways. Both now read them from here:
 * - the satellite's dish gain (`dishGain` at `TX_DISH_EFFICIENCY`, or 0 dBi
 *   for an antenna of no size), its half-power beamwidth, and the pointing
 *   loss its attitude accuracy costs inside that beam;
 * - the ground receiver the design carries (`comms.rxAntennaD`, `rxNoiseK`,
 *   `losses`), else Palo et al.'s NEN station (`RX_DEFAULTS`), its gain at
 *   `RX_DISH_EFFICIENCY`, no separate implementation loss (it is in
 *   `losses`);
 * - the camera's wavelength (`payload.wavelength`), else 550 nm, the middle
 *   of the visible (`DIFFRACTION_WAVELENGTH`), an estimate and labelled one.
 *
 * ONE STATION. A design names the one station it downlinks to
 * (`comms.station`), and this reads that one; D07's rows count the contact of
 * every station asked, heard together, and hand the design the first
 * (src/design/requirement-trades.ts `designFromRow`), so with several
 * stations the D06 bench counts less contact than the row did. Kept so: more
 * stations in a design would change its file and its checker for a figure
 * only D07 uses today.
 *
 * DOM-free, src/orbit only (tests/propagator.test.ts). The design's units:
 * m, Hz, W, dB, degrees; out in dB, dBi, dBW, K, rad and m.
 */
import { DEG } from '../physics/constants';
import { dishGain } from '../orbit/applications';
import { pointingLoss } from '../orbit/attitude';
import { eirp } from '../orbit/link';
import type { SatelliteDesign } from './satellite-spec';

/** The wavelength a camera's diffraction limit is read at when the design gives none, m: 550 nm, the middle of the visible (an estimate). */
export const DIFFRACTION_WAVELENGTH = 550e-9;
/** A transmitting dish's aperture efficiency: 0.55, a textbook value, and an estimate. */
export const TX_DISH_EFFICIENCY = 0.55;
/** The receiving dish's efficiency: Palo et al.'s NEN dish, 57 % (NTRS 20150000169, Table 1). */
export const RX_DISH_EFFICIENCY = 0.57;
/** The receiving station a design without its own figures is read with: Palo et al.'s NEN 11.28 m dish, 189.7 K, 2 dB (src/data/satellite-templates.ts). */
export const RX_DEFAULTS = { rxAntennaD: 11.28, rxNoiseK: 189.7, losses: 2 } as const;
/**
 * The half-power beamwidth of a dish, rad ≈ 21 / (f in GHz · D in m) degrees
 * (MIT OCW 16.851, L21, slide 23): the angle the pointing loss is measured against.
 */
export const beamwidthOf = (frequency: number, diameter: number): number => (21 / ((frequency / 1e9) * diameter)) * DEG;

/** The wavelength the camera's aperture must resolve, m: the design's, else `DIFFRACTION_WAVELENGTH`. */
export const cameraWavelength = (payload: SatelliteDesign['payload']): number => payload?.wavelength ?? DIFFRACTION_WAVELENGTH;

/** The downlink a design gives, everything but the range and the rate (the design control table's inputs, `designControlTable`). */
export interface DesignDownlink {
  /** the satellite's transmitter, W, its line loss, dB, its antenna's gain, dBi, its beamwidth (null for no dish), rad, and the pointing loss, dB */
  txPowerW: number;
  lineLoss: number;
  txGain: number;
  beamwidth: number | null;
  pointingLoss: number;
  /** dBW */
  eirp: number;
  /** Hz */
  frequency: number;
  /** the ground receiver: its gain, dBi, its system noise temperature, K, and the path's other losses, dB */
  rxGain: number;
  systemTemperature: number;
  losses: number;
  /** modulation and implementation losses beyond `losses`, dB: none (Palo's 2 dB take them in) */
  implementationLoss: number;
  /** the E_b/N₀ the coding needs, dB */
  requiredEbN0: number;
}

/** The design's downlink, read as the D06 bench and D07 both read it (see the module's note). */
export function designDownlink(design: Pick<SatelliteDesign, 'comms' | 'adcs'>): DesignDownlink {
  const c = design.comms;
  const txGain = c.txAntennaD > 0 ? dishGain(c.txAntennaD, c.frequency, TX_DISH_EFFICIENCY) : 0;
  const beamwidth = c.txAntennaD > 0 ? beamwidthOf(c.frequency, c.txAntennaD) : null;
  const pLoss = beamwidth !== null ? pointingLoss(design.adcs.pointingDeg * DEG, beamwidth) : 0;
  return {
    txPowerW: c.txPowerW, lineLoss: c.lineLoss, txGain, beamwidth, pointingLoss: pLoss,
    eirp: eirp(c.txPowerW, c.lineLoss, txGain, pLoss),
    frequency: c.frequency,
    rxGain: dishGain(c.rxAntennaD ?? RX_DEFAULTS.rxAntennaD, c.frequency, RX_DISH_EFFICIENCY),
    systemTemperature: c.rxNoiseK ?? RX_DEFAULTS.rxNoiseK,
    losses: c.losses ?? RX_DEFAULTS.losses,
    implementationLoss: 0,
    requiredEbN0: c.requiredEbN0,
  };
}
