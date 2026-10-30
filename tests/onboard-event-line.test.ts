/**
 * The onboard view's callout under the instrument strip prints the last flight
 * event through `localizeEventParams`, like the timeline, the narration and the
 * event log do. Without it `evt.aeroEnvelopeExceeded` reads "(α {alphaDeg}°,
 * β {betaDeg}°)" in the strip: those two figures are made there from the
 * event's angle pair, not carried by it (src/ui/names.ts).
 *
 * The overlay draws on a 2-D canvas, which Node has not got. A recording
 * context stands in for it and the test reads back the text it was asked to draw.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OnboardOverlay } from '../src/ui/onboard';
import { Simulation } from '../src/physics/simulation';
import { setLang } from '../src/i18n';
import { vehicleById } from '../src/data/vehicles';
import { guidanceForVehicle } from '../src/physics/defaults';
import { watchMissionSettings } from '../src/ui/watch-missions';
import { aeroAngles } from '../src/ui/notation';
import { RAD } from '../src/physics/constants';

/** A canvas whose context remembers every string it was asked to draw. */
function recordingCanvas(): { canvas: HTMLCanvasElement; drawn: string[] } {
  const drawn: string[] = [];
  const g = new Proxy<Record<string, unknown>>({}, {
    get: (target, key: string) => {
      if (key === 'fillText') return (text: string) => { drawn.push(text); };
      if (key === 'measureText') return (text: string) => ({ width: text.length * 5 });
      if (key === 'createRadialGradient' || key === 'createLinearGradient') return () => ({ addColorStop: () => undefined });
      if (key in target) return target[key];
      return () => undefined;
    },
    set: (target, key: string, value) => { target[key] = value; return true; },
  });
  const canvas = { clientWidth: 900, clientHeight: 600, width: 0, height: 0, getContext: () => g } as unknown as HTMLCanvasElement;
  return { canvas, drawn };
}

/** A Mercury-Redstone 3 flight a few seconds in, with an aero-range event just raised. */
function flightWithAeroEvent(): Simulation {
  const s = watchMissionSettings('mr3');
  const sim = new Simulation({
    vehicleId: s.vehicleId, satelliteId: s.satelliteId, siteId: s.siteId, orbit: s.orbit, launchTime: s.launchTime, padId: s.padId,
    payloadMassOverride: s.payloadMass, guidance: guidanceForVehicle(vehicleById(s.vehicleId), undefined, 'pointMass'), guidanceResolved: true,
    failure: s.failure, boosterRecovery: false, dynamics: { model: 'pointMass', wind: 'calm', seed: 1 },
  }, { headless: true });
  for (let i = 0; i < 20; i++) sim.step(sim.suggestedDt());
  sim.events.push({
    t: sim.state.t, key: 'evt.aeroEnvelopeExceeded', severity: 'warn',
    params: { scope: 'vehicle', name: 'Stage 1', angleOfAttackRad: 0.2, sideslipRad: 0.05 },
  });
  return sim;
}

describe('the onboard callout resolves the event it prints', () => {
  afterEach(() => { setLang('en'); vi.unstubAllGlobals(); });

  for (const lang of ['en', 'ru', 'th'] as const) {
    it(`${lang}: the aero-range event shows its angles, not their placeholders`, () => {
      vi.stubGlobal('window', { devicePixelRatio: 1 });
      vi.stubGlobal('document', { documentElement: {} });
      setLang(lang);
      const { canvas, drawn } = recordingCanvas();
      new OnboardOverlay(canvas).draw(flightWithAeroEvent(), false);
      const angles = aeroAngles(0.2, 0.05);
      const line = drawn.find((text) => text.includes('α'));
      expect(line, `no callout drawn: ${JSON.stringify(drawn)}`).toBeDefined();
      expect(line).not.toMatch(/\{\w+\}/);
      expect(line).toContain(`α ${(angles.alpha * RAD).toFixed(1)}°`);
      expect(line).toContain(`β ${(angles.beta * RAD).toFixed(1)}°`);
    });
  }
});
