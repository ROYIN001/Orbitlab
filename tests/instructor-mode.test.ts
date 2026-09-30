/**
 * Instructor mode (roadmap T01/T02, Phase 4 map §4.1–4.2), the parts that are
 * not the re-check itself (tests/recheck.test.ts): a lesson on a rocket or a
 * satellite of the class's own, the command journal a flight keeps, and what
 * a lesson's record now carries.
 */
import { describe, expect, it } from 'vitest';
import { Simulation } from '../src/physics/simulation';
import { BUILTIN_CASE_LESSONS, BUILTIN_LESSONS } from '../src/lessons/catalog';
import { lessonConfig, missionConfigFromState, missionStateOf, defaultMissionState } from '../src/lessons/config';
import { brokenLocks, flightEnded } from '../src/lessons/grader';
import { flownMission } from '../src/lessons/progress';
import { missionDocument, parseMissionDocument } from '../src/config/mission-file';
import { guidanceForVehicle } from '../src/physics/defaults';
import type { Lesson } from '../src/lessons/types';
import { LESSON_FORMAT_VERSION, lessonFileText, lessonFileVersion, parseLessonFile } from '../src/lessons/lesson-file';
import { copyOf } from './custom-vehicle-harness';
import { satelliteCopyOf } from './custom-satellite-harness';

const lesson = (id: string): Lesson => {
  const l = BUILTIN_LESSONS.find((x) => x.id === id);
  if (!l) throw new Error(`no lesson ${id}`);
  return l;
};

/** Lesson 1.1 flown on a copy of its Falcon 9 under an id of its own, the guidance locked too. */
function customLesson(): Lesson {
  const base = lesson('orbit-first');
  const state = missionStateOf(base.mission);
  state.vehicleSpec = copyOf(state.vehicleId);
  state.vehicleId = state.vehicleSpec.id;
  return { ...base, id: 'custom-first', mission: missionDocument(state), locked: [...base.locked, 'setup.guidance'] };
}

/** Lesson 1.1 with a copy of its CubeSats under an id of their own (D06's inline satellite, C2). */
function customSatelliteLesson(): Lesson {
  const base = lesson('orbit-first');
  const state = missionStateOf(base.mission);
  state.satelliteSpec = satelliteCopyOf(state.satelliteId);
  state.satelliteId = state.satelliteSpec.id;
  return { ...base, id: 'custom-sat-first', mission: missionDocument(state) };
}

describe('a lesson on a rocket of the class\'s own (T01, map §4.1)', () => {
  it('builds the configuration the setup panel builds, the custom vehicle kept, and flies it as the catalogue rocket', () => {
    const custom = customLesson();
    const cfg = lessonConfig(custom.mission);
    expect(cfg.vehicleId).toBe('falcon9-copy');
    expect(cfg.vehicleSpec).toEqual(copyOf('falcon9'));
    // the guidance is the custom vehicle's own programme, as `SetupPanel.guidance` resolves it
    expect(cfg.guidance).toEqual(guidanceForVehicle(copyOf('falcon9'), undefined, 'pointMass'));
    // a copy of a catalogue rocket flies that rocket's flight (S02), so the lesson's flight is lesson 1.1's
    const fly = (c: typeof cfg) => {
      const sim = new Simulation(c, { headless: true });
      while (!flightEnded(custom, sim) && sim.state.t < 4000) sim.step(sim.suggestedDt());
      return structuredClone({ t: sim.state.t, elements: sim.state.elements, events: sim.events.map((e) => [e.t, e.key]) });
    };
    expect(fly(cfg)).toEqual(fly(lessonConfig(lesson('orbit-first').mission)));
  }, 60_000);

  it('holds the guidance lock to the lesson\'s own vehicle instead of throwing for it', () => {
    const custom = customLesson();
    const kept = new Simulation(lessonConfig(custom.mission), { headless: true });
    expect(brokenLocks(custom, kept)).toEqual([]);
    const edited = new Simulation(lessonConfig(custom.mission, (s) => { s.guidanceOverrides = { ...s.guidanceOverrides, kickAngle: 3.1 }; }), { headless: true });
    expect(brokenLocks(custom, edited)).toEqual(['setup.guidance']);
  });

  it('reads the mission as flown back to the same configuration, custom vehicle and all (audit A11)', () => {
    const cfg = new Simulation(lessonConfig(customLesson().mission), { headless: true }).cfg;
    const doc = JSON.parse(JSON.stringify(flownMission(cfg)));
    expect(doc.mission.vehicleSpec).toEqual(copyOf('falcon9'));
    const parsed = parseMissionDocument(doc, defaultMissionState());
    expect(parsed.issues).toEqual([]);
    expect(missionConfigFromState(parsed.state)).toEqual(cfg);
  });
});

describe('a lesson on a satellite of the class\'s own (T01 with D06\'s inline satellite)', () => {
  it('keeps the satellite spec with the rocket\'s, and flies it as the catalogue satellite', () => {
    const custom = customSatelliteLesson();
    const cfg = lessonConfig(custom.mission);
    expect(cfg.satelliteId).toBe('cubesats-copy');
    expect(cfg.satelliteSpec).toEqual(satelliteCopyOf('cubesats'));
    expect(cfg.vehicleSpec).toBeUndefined();
    const fly = (c: typeof cfg) => {
      const sim = new Simulation(c, { headless: true });
      while (!flightEnded(custom, sim) && sim.state.t < 4000) sim.step(sim.suggestedDt());
      return structuredClone({ t: sim.state.t, elements: sim.state.elements, events: sim.events.map((e) => [e.t, e.key]) });
    };
    expect(fly(cfg)).toEqual(fly(lessonConfig(lesson('orbit-first').mission)));
    // both specs at once, as a class's rocket carrying a class's satellite
    const both = lessonConfig(customLesson().mission, (s) => { s.satelliteSpec = satelliteCopyOf('cubesats'); s.satelliteId = 'cubesats-copy'; });
    expect(both.vehicleSpec?.id).toBe('falcon9-copy');
    expect(both.satelliteSpec?.id).toBe('cubesats-copy');
  }, 60_000);

  it('refuses a mission whose satellite id is not its spec\'s where it is read, not at launch', () => {
    const state = missionStateOf(customSatelliteLesson().mission);
    state.satelliteId = 'cubesats';
    expect(() => missionConfigFromState(state)).toThrow(/not its custom satellite/);
  });

  it('holds the vehicle lock to the custom rocket\'s spec, not only its id', () => {
    const custom = { ...customLesson(), locked: ['setup.vehicle' as const] };
    const kept = new Simulation(lessonConfig(custom.mission), { headless: true });
    expect(brokenLocks(custom, kept)).toEqual([]);
    // the same id, another rocket: a file could keep the id and change the design
    const edited = new Simulation(lessonConfig(custom.mission, (s) => { s.vehicleSpec = copyOf('falcon9', { name: 'Heavier' }); }), { headless: true });
    expect(brokenLocks(custom, edited)).toEqual(['setup.vehicle']);
  });
});

describe('the lesson file a custom rocket or satellite is written in (T01; C2\'s open question)', () => {
  const caseLesson = () => BUILTIN_CASE_LESSONS[0];

  it('is the lowest version whose every reader flies each lesson', () => {
    expect(LESSON_FORMAT_VERSION).toBe(3);
    expect(lessonFileVersion([lesson('orbit-first')])).toBe(1);
    expect(lessonFileVersion([])).toBe(1);
    // a custom rocket (mission v2, S02): every reader of version 2 flies it
    expect(lessonFileVersion([lesson('orbit-first'), customLesson()])).toBe(2);
    expect(lessonFileVersion([caseLesson(), customLesson()])).toBe(2);
    // a custom satellite (mission v3, D06): a reader older than D06 cannot
    expect(lessonFileVersion([lesson('orbit-first'), customSatelliteLesson()])).toBe(3);
    expect(lessonFileVersion([caseLesson(), customSatelliteLesson(), customLesson()])).toBe(3);
  });

  it('reads a version-3 file back to the same lessons and writes it again byte for byte', () => {
    const text = lessonFileText([customSatelliteLesson(), customLesson()]);
    const doc = JSON.parse(text);
    expect(doc.version).toBe(3);
    expect(doc.lessons[0].mission.version).toBe(3);
    expect(doc.lessons[1].mission.version).toBe(2);
    const parsed = parseLessonFile(doc, new Set());
    expect(parsed.issues).toEqual([]);
    expect(parsed.lessons.map((l) => l.id)).toEqual(['custom-sat-first', 'custom-first']);
    expect(lessonFileText(parsed.lessons)).toBe(text);
    // and the lesson flies its own satellite
    expect(lessonConfig((parsed.lessons[0] as Lesson).mission).satelliteSpec).toEqual(satelliteCopyOf('cubesats'));
  });
});
