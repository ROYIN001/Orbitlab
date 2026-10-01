/**
 * C01: Vostok-1's return as the HUD, the narration panel and the telemetry
 * list put it: a return from orbit and not a launch abort, a landing on the
 * steppe and not a splashdown, the sphere waiting on the ground with Gagarin
 * still in the air, his own row, and the instrument module's pieces on one
 * line. The viewer's beats and its end are in tests/watch-logic.test.ts.
 */
import { describe, expect, it } from 'vitest';
import { phaseInfo, statusKey } from '../src/ui/phase';
import { pieceTally } from '../src/ui/telemetry';
import { stageNameByLabel } from '../src/ui/names';
import { tFor } from '../src/i18n';
import { en } from '../src/i18n/en';
import { R_EARTH } from '../src/physics/constants';
import { WGS84_A } from '../src/physics/geodesy';
import type { DebrisFrame, VisualFrame } from '../src/physics/frame';
import type { SimEvent } from '../src/physics/simulation';

const ev = (t: number, key: string, params?: SimEvent['params']): SimEvent => ({ t, key, severity: 'info', params });

/** Gagarin `h` m above the ellipsoid at the equator. */
const pilot = (h: number, alive = true): DebrisFrame => ({
  id: 18, name: 'pilot', r: { x: WGS84_A + h, y: 0, z: 0 }, v: { x: 0, y: 0, z: 0 }, dir: { x: 1, y: 0, z: 0 }, alive, burning: false, createdAt: 5843.6,
  visual: { kind: 'pilot', length: 1.8, diameter: 0.6, color: '#e8641e' }, outcome: alive ? undefined : 'landed',
  crew: { phase: alive ? 'main' : 'landed', stabiliser: 0, main: 1, reserve: 0.6, seat: false, naz: false },
} as DebrisFrame);

function capsule(t: number, o: { id?: 'vostok' | 'mercury'; status?: VisualFrame['status']; phase?: string; retro?: number; joint?: string; note?: string; altitude?: number; debris?: DebrisFrame[] } = {}): VisualFrame {
  const altitude = o.altitude ?? 100e3;
  return {
    t, status: o.status ?? 'abort', note: o.note ?? 'capsuleReturn', liftoff: true, liftoffT: 0.8, destroyed: false,
    r: { x: R_EARTH + altitude, y: 0, z: 0 }, v: { x: 0, y: 0, z: 0 }, dir: { x: 1, y: 0, z: 0 },
    altitude, altitudeAGL: altitude, airspeed: 100, gLoad: 1, downrange: 1.5e6, lat: 49.93, lon: 44.65, nextBurnTime: -1,
    elements: { period: 5400 }, debris: o.debris ?? [],
    abort: {
      kind: 'return', capsule: o.id ?? 'vostok', mode: 'separation', phase: o.phase ?? 'fall', body: 'capsule', t0: 4684.2, maxG: 9.1, maxGT: 5733,
      motors: { main: 0, control: 0, fairing: 0, softLanding: 0, retro: o.retro ?? 0 }, finsOpen: false, drogue: 0, main: 0, heatShield: false,
      ...(o.id === 'mercury' ? {} : { joint: o.joint ?? 'free' }), cause: 'evt.deorbitPlanned',
    },
  } as unknown as VisualFrame;
}

describe('Vostok-1 on the HUD', () => {
  it('is a return from orbit, not a launch abort; Mercury-Redstone keeps its own words', () => {
    expect(statusKey(capsule(5000))).toBe('hud.status.vostokReturn');
    expect(statusKey(capsule(400, { id: 'mercury' }))).toBe('hud.status.abort');
    expect(statusKey(capsule(7000, { status: 'landed', phase: 'landed' }))).toBe('hud.status.landed');
  });

  it('names the retro-fire from its pressurising command, then the ten minutes joined, then the arc', () => {
    expect(phaseInfo(capsule(4685, { joint: 'joined' }), []).titleKey).toBe('hud.vostok.retro');
    expect(phaseInfo(capsule(4720, { joint: 'joined', retro: 1 }), []).titleKey).toBe('hud.vostok.retro');
    expect(phaseInfo(capsule(4800, { joint: 'joined' }), []).titleKey).toBe('hud.vostok.joined');
    expect(phaseInfo(capsule(5342, { joint: 'tethered' }), []).titleKey).toBe('hud.vostok.joined');
    expect(phaseInfo(capsule(5400), []).titleKey).toBe('hud.capsule.fall');
  });

  it('says the sphere is down with Gagarin still in the air, and his height above the ground', () => {
    const f = { ...capsule(6200, { phase: 'landed', note: 'vostokSphereDown', debris: [pilot(2150)] }), altitude: 120, altitudeAGL: 0 };
    const info = phaseInfo(f, []);
    expect(info.titleKey).toBe('hud.vostok.sphereDown');
    expect(info.detailKey).toBe('phase.detail.vostokSphereDown');
    expect(info.params.alt).toBe('2030');
  });

  it('lands Vostok on the steppe, with the sphere and the pilot apart; Mercury still splashes down', () => {
    const events = [ev(6091.9, 'evt.capsuleLanding'), ev(6615.4, 'evt.pilotLanding', { speed: 4.7, km: 0.23, lat: 49.925, lon: 44.647 })];
    const landed = capsule(6620, { status: 'landed', phase: 'landed', note: 'vostokLanded', debris: [pilot(0, false)] });
    const info = phaseInfo(landed, events);
    expect(info).toMatchObject({ titleKey: 'hud.vostok.landed', detailKey: 'phase.detail.vostokLanded', params: { km: '0.23', g: '9.1' } });
    for (const key of [info.titleKey, info.detailKey, 'hud.note.vostokLanded']) expect(en[key]).not.toMatch(/splash|sea/i);
    expect([tFor('en', 'hud.vostok.landed'), tFor('ru', 'hud.vostok.landed'), tFor('th', 'hud.vostok.landed')]).toEqual(['Landed', 'Приземление', 'ลงจอด']);
    // a recording with no landing of his own: the sphere alone
    expect(phaseInfo(landed, events.slice(0, 1)).detailKey).toBe('phase.detail.vostokSphereLanded');
    const mercury = phaseInfo(capsule(900, { id: 'mercury', status: 'landed', phase: 'landed', note: 'capsuleLanded' }), []);
    expect(mercury.titleKey).toBe('hud.capsule.landed');
  });
});

describe('Vostok-1 in the telemetry list', () => {
  it('counts the instrument module\'s pieces by piece, not by record', () => {
    const rec = (name: string, alive: boolean, outcome?: 'burnup' | 'impact') => ({ name, alive, outcome, fragmentOf: 9 });
    // the engine down, the eight frame members burned up, the eight shell panels still falling; the module itself and the seat not counted
    expect(pieceTally([rec('im.tdu', false, 'impact'), rec('im.frame', false, 'burnup'), rec('im.shell', true),
      { name: 'instrumentModule', alive: false, outcome: 'burnup', fragmentOf: undefined }, { name: 'seat', alive: false, outcome: 'impact', fragmentOf: undefined }]))
      .toEqual({ n: 17, falling: 8, burnt: 8, down: 1 });
    expect(pieceTally([])).toEqual({ n: 0, falling: 0, burnt: 0, down: 0 });
  });

  it('names what the return leaves behind in every language, Gagarin by name', () => {
    for (const name of ['instrumentModule', 'im.tdu', 'im.shell', 'hatch', 'seat', 'pilot']) {
      const key = { instrumentModule: 'abort.part.instrumentModule', 'im.tdu': 'abort.part.imTdu', 'im.shell': 'abort.part.imShell', hatch: 'abort.part.hatch', seat: 'abort.part.seat', pilot: 'abort.part.pilot' }[name]!;
      expect(stageNameByLabel(null, name)).toBe(en[key]);
      for (const lang of ['ru', 'th'] as const) expect(tFor(lang, key)).not.toBe(en[key]);
    }
    expect([tFor('en', 'abort.part.pilot'), tFor('ru', 'abort.part.pilot'), tFor('th', 'abort.part.pilot')]).toEqual(['Yuri Gagarin', 'Юрий Гагарин', 'ยูริ กาการิน']);
    expect(tFor('th', 'abort.part.seat')).toBe('เก้าอี้ดีดตัว');
  });

  it('says the module broke up, and leaves "burned up" to the pieces that did', () => {
    // the module's own record ends 'burnup' at its break-up, while its 57 pieces still fall and most reach the ground
    // (src/physics/sim/module-entry.ts): its row says it broke up; the pieces' row counts what burned up
    const burnt = { en: /burn/i, ru: /сгор/, th: /ไหม้/ };
    for (const lang of ['en', 'ru', 'th'] as const) {
      expect(tFor(lang, 'tel.debris.burnup'), lang).not.toMatch(burnt[lang]);
      expect(tFor(lang, 'tel.debris.piecesState'), lang).toMatch(burnt[lang]);
    }
    expect(tFor('en', 'tel.debris.burnup')).toBe('broke up in the air');
  });

  it('says in Russian how a body ended in words that fit any part\'s gender and number', () => {
    // the list sets these after 'Приборный отсек' (m.), 'Люк № 1' (m.), 'Катапультное кресло' (n.), 'Боковые блоки' (pl.):
    // no verb, past or present, that would have to agree with them
    for (const k of ['falling', 'landed', 'impact', 'orbit', 'burnup']) {
      expect(tFor('ru', `tel.debris.${k}`), k).not.toMatch(/(ла|ло|ли|ет|ют)(\s|$)/);
    }
  });
});

describe('Vostok-1 in the event log', () => {
  it('tells the over-burn as the core\'s cut-off command lost, and the whole excess, not a backup on Blok E (§13.6)', () => {
    expect(tFor('en', 'evt.backupCutoff', { dv: 25.4 })).toMatch(/^The radio command to shut the core down did not get through .* 25\.4 m\/s fast$/);
    expect(tFor('ru', 'evt.backupCutoff')).toMatch(/центрального блока не прошла.*блок Е проработал дольше/);
    expect(tFor('th', 'evt.backupCutoff')).toMatch(/ท่อนแกนกลาง.*บล็อก E ทำงานนานกว่า/);
    expect(tFor('en', 'tl.evt.backupCutoff')).toBe('Over-burn');
  });

  it('names the TDU-1 as the one braking engine it was, never Mercury\'s numbered retro-rockets', () => {
    expect([tFor('en', 'evt.tduFire'), tFor('ru', 'evt.tduFire'), tFor('th', 'evt.tduFire')])
      .toEqual(['The TDU-1 braking engine fires', 'Включение тормозной двигательной установки ТДУ-1', 'จุดเครื่องยนต์เบรก TDU-1']);
    for (const lang of ['en', 'ru', 'th'] as const) expect(tFor(lang, 'tl.evt.tduFire'), lang).not.toMatch(/\{n\}|\d$/);
  });

  it('gives the sphere its pilot chute, and Gagarin his parachute opening', () => {
    expect(tFor('en', 'evt.pilotChute', { alt: 6998, speed: 199 })).toBe('The sphere\'s pilot chute comes out at 6998 m, 199 m/s');
    expect(tFor('ru', 'evt.pilotChute')).toMatch(/спускаемого аппарата/);
    expect(tFor('th', 'evt.pilotChute')).toMatch(/ของแคปซูล/);
    expect(tFor('en', 'evt.pilotMain', { alt: 3935, g: 8.7 })).toBe('The pilot\'s main parachute opens at 3935 m; opening shock 8.7 g');
  });

  it('calls hatch No. 1 by one Thai word, the one the docking already uses', () => {
    for (const key of ['abort.part.hatch', 'evt.hatchOff', 'tl.evt.hatchOff', 'watch.say.vostokEjection']) {
      expect(tFor('th', key), key).toMatch(/ประตู/);
      expect(tFor('th', key), key).not.toMatch(/ฝาช่องทาง/);
    }
    expect(tFor('th', 'watch.say.rvDocked')).toMatch(/ประตู/);
    // the backup system parts the modules: no person (ผู้) doing it
    expect(tFor('th', 'watch.say.vostokCoast')).not.toMatch(/ผู้แยก/);
  });
});

describe('the orbit on the HUD', () => {
  // the spacecraft deployed in orbit, its conic of the instant 168 × 296 km
  const inOrbit = { ...capsule(3000, { status: 'orbit' }), abort: undefined, payloadSeparated: true,
    elements: { period: 5361, apoapsisAlt: 296.4e3, periapsisAlt: 168.0e3, i: 64.956 * Math.PI / 180 } } as unknown as VisualFrame;
  it('gives the orbit the flight was judged on, not the conic of the instant', () => {
    const judged = [ev(672.3, 'evt.targetOrbit', { ap: 315, pe: 168, inc: 64.96, apAltM: 314.8e3, peAltM: 168.0e3 })];
    const info = phaseInfo(inOrbit, judged);
    expect(info.detailKey).toBe('phase.detail.deployed');
    expect(String(info.params.ap)).toContain('315');
    expect(String(info.params.pe)).toContain('168');
  });
  it('keeps the conic where the verdict gave no judged apsides (a point-mass flight on its conic)', () => {
    const info = phaseInfo(inOrbit, [ev(672.3, 'evt.targetOrbit', { ap: 296, pe: 168, inc: 64.96 })]);
    expect(String(info.params.ap)).toContain('296');
  });
});
