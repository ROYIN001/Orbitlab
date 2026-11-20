import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VEHICLES } from '../src/data/vehicles';
import { setLang, t } from '../src/i18n';
import type { Simulation, SimEvent } from '../src/physics/simulation';
import { localizeEventParams } from '../src/ui/names';
import { setNotationPreference } from '../src/ui/notation';
import { OnboardOverlay } from '../src/ui/onboard';

/** A 2-D context that records the text drawn and measures every glyph at 6 px. */
function recorder() {
  const drawn: string[] = [];
  const noop = () => {};
  const g = {
    font: '', fillStyle: '', strokeStyle: '', lineWidth: 1, textAlign: 'left', textBaseline: 'alphabetic',
    setTransform: noop, clearRect: noop, fillRect: noop, beginPath: noop, rect: noop, arc: noop, fill: noop, stroke: noop,
    moveTo: noop, lineTo: noop, save: noop, restore: noop, clip: noop, closePath: noop, roundRect: noop, strokeRect: noop, strokeText: noop,
    createRadialGradient: () => ({ addColorStop: noop }),
    measureText: (text: string) => ({ width: text.length * 6 }),
    fillText: (text: string) => { drawn.push(text); },
  };
  const canvas = { clientWidth: 900, clientHeight: 600, width: 0, height: 0, getContext: () => g };
  return { overlay: new OnboardOverlay(canvas as unknown as HTMLCanvasElement), drawn };
}

/** The flight view the overlay reads, with `event` as the latest callout. */
function flight(event: SimEvent, vehicleSpec: unknown = null): Simulation {
  return {
    state: { t: event.t + 1, altitude: 48_000, speed: 1_400, throttle: 1, gLoad: 2.1, r: { x: 6_419_000, y: 0, z: 0 }, dir: { x: 0.6, y: 0.8, z: 0 } },
    vehicle: { active: { index: 0 } },
    vehicleSpec,
    events: [event],
  } as unknown as Simulation;
}

const memory = { setItem: () => {} };

beforeEach(() => {
  vi.stubGlobal('window', { devicePixelRatio: 1 });
  vi.stubGlobal('document', { documentElement: {} }); // setLang marks the page's language
  setNotationPreference('auto', memory);
});
afterEach(() => { setLang('en'); setNotationPreference('auto', memory); vi.unstubAllGlobals(); });

describe('the cabin view\'s latest callout', () => {
  // An attached vehicle past the aerodynamic model's envelope, as AeroEnvelopeEvents raises it:
  // the angles in radians and the scope as an id, which the dictionary's line cannot print as they are.
  const envelope: SimEvent = {
    t: 61.2, key: 'evt.aeroEnvelopeExceeded', severity: 'warn',
    params: { scope: 'vehicle', name: 'Blok I', bodyId: 'vehicle', configurationId: '', modelVersion: 1, angleOfAttackRad: 0.21, sideslipRad: -0.04 },
  };

  for (const lang of ['en', 'ru', 'th'] as const) {
    it(`reads as the event log reads it, values filled in (${lang})`, () => {
      setLang(lang);
      const { overlay, drawn } = recorder();
      overlay.draw(flight(envelope), true);
      const callout = drawn.find(text => text.includes('Blok I'));
      expect(callout, drawn.join(' | ')).toBe(t(envelope.key, localizeEventParams(null, envelope.params)));
      expect(callout).not.toMatch(/[{}]/);
      expect(callout).not.toContain(': vehicle,'); // the scope's id, not its words
    });
  }

  it('names the part in the reader\'s language, from the flight\'s own vehicle', () => {
    setLang('th');
    const soyuz = VEHICLES.find(v => v.id === 'soyuz21a')!;
    const thirdStage = { ...envelope, params: { ...envelope.params, name: 'Blok I (3rd stage, RD-0110)' } };
    const { overlay, drawn } = recorder();
    overlay.draw(flight(thirdStage, soyuz), true);
    expect(drawn.some(text => text.includes(t('stage.soyuz21a.blokI.name'))), drawn.join(' | ')).toBe(true);
    expect(drawn.some(text => text.includes('3rd stage'))).toBe(false);
  });

  it('follows a change of notation for the event on screen', () => {
    setLang('en');
    setNotationPreference('iso', memory);
    const command: SimEvent = {
      t: 40, key: 'evt.controlCommand', severity: 'info',
      params: { mode: 'manual', rollRateRadS: 0, pitchRateRadS: 0.01, yawRateRadS: 0.02, throttle: 1 },
    };
    const { overlay, drawn } = recorder();
    const sim = flight(command);
    overlay.draw(sim, true);
    expect(drawn.some(text => text.includes('/ 0.020 rad/s'))).toBe(true);
    drawn.length = 0;
    setNotationPreference('gost', memory);
    overlay.draw(sim, true);
    // ГОСТ's yaw axis is ISO's reversed, as the event log prints it
    expect(drawn.some(text => text.includes('/ -0.020 rad/s')), drawn.join(' | ')).toBe(true);
  });
});
