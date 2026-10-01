/**
 * The fairing-fit note in words (roadmap D06, Phase 4 map §2.6 c): whether a
 * custom satellite fits the vehicle's fairing, an estimate, and said to be
 * one (`fairingFit`, src/config/satellite-spec.ts). One sentence for two
 * places: the Launch panel under the payload of a mission that carries its
 * own satellite (C2), and the satellite designer's "Fly it", before the
 * design is flown (the integration of D06).
 *
 * A size and a share stay on one line each, however narrow the page:
 * "4,4 × 10,5 м" never ends a line at "10,5" (`unbroken`). A size under a
 * metre keeps two decimals, so a CubeSat's 0.22 m is not shown as 0.2.
 */
import { t } from '../i18n';
import { FAIRING_ENVELOPE, fairingFit, type FairingFitSatellite, type FairingFitVehicle, type FairingFitVerdict } from '../config/satellite-spec';
import { unbroken } from './build/figures';
import { num } from './orbit/dom';

export interface FairingFitText {
  verdict: FairingFitVerdict;
  text: string;
  /** "may not fit" or "does not fit": shown as a warning */
  warn: boolean;
}

export function fairingFitText(vehicle: FairingFitVehicle, satellite: FairingFitSatellite): FairingFitText {
  const fit = fairingFit(vehicle, satellite);
  const digits = (x: number): number => (x < 1 ? 2 : 1);
  const size = (b?: { diameter: number; length: number }): string =>
    (b ? unbroken(`${num(b.diameter, digits(b.diameter))} × ${num(b.length, digits(b.length))} ${t('u.m')}`) : '');
  const params = { payload: size(fit.payload), envelope: size(fit.envelope), shell: size(fit.shell) };
  const estimate = t('setup.customSat.estimate', { d: num(FAIRING_ENVELOPE.diameter * 100), l: num(FAIRING_ENVELOPE.length * 100) })
    .replace(/(\d) %/g, '$1 %');
  let text: string;
  switch (fit.verdict) {
    case 'fits': text = `${t('setup.customSat.fits', params)} ${estimate}`; break;
    case 'tight': text = `${t('setup.customSat.tight', params)} ${estimate}`; break;
    case 'tooBig': text = t('setup.customSat.tooBig', params); break;
    case 'noFairing': text = t('setup.customSat.noFairing'); break;
    case 'noSize': text = t('setup.customSat.noSize'); break;
  }
  return { verdict: fit.verdict, text, warn: fit.verdict === 'tight' || fit.verdict === 'tooBig' };
}
