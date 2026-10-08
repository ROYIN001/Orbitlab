/**
 * The workspace's mission and the viewer's (audit 2026-09-27 A1): the rules in
 * src/ui/workspace-mission.ts, and the journeys the audit reproduced, played
 * through a page model that calls them the way src/main.ts does — the setup
 * panel's mission, the page's stored copy, start-up, previews and routes.
 */
import { describe, expect, it } from 'vitest';
import { loadStoredMission, missionDocument, parseMissionDocument, saveStoredMission, type MissionState } from '../src/config/mission-file';
import { orbitById } from '../src/data/orbits';
import { vehicleById } from '../src/data/vehicles';
import { DEFAULT_FAILURE } from '../src/physics/defaults';
import { defaultDynamics } from '../src/physics/rigid/config';
import { quickstartMission } from '../src/ui/quickstart';
import { FEATURED_WATCH_MISSION, watchMissionSettings, type WatchMissionId } from '../src/ui/watch-missions';
import { WorkspaceMission, missionSummary, startupMission } from '../src/ui/workspace-mission';
import { missionNotice } from '../src/ui/mission-share';
import { t } from '../src/i18n';

const FROM = new Date('2026-09-25T06:00:00Z');
type Mode = 'home' | 'watch' | 'explore' | 'engineer' | 'orbit' | 'build';
const workspace = (m: Mode) => m === 'explore' || m === 'engineer';
const lean = (m: Mode) => !workspace(m);

/** The user's mission in the audit: a Falcon 9 quick start, then Engineer settings on top. */
function usersMission(): MissionState {
  return {
    ...quickstartMission('leo', FROM),
    guidanceOverrides: { kickAngle: 4.5 },
    failure: { mode: 'thrustLoss', time: 95, stage: 1 },
    boosterRecovery: true, recoveryPlan: { core: { kind: 'droneShip' } },
    dynamics: { ...defaultDynamics('falcon9'), model: 'sixDof', wind: 'shear', seed: 4242 },
  };
}

type Storage = { getItem(k: string): string | null; setItem(k: string, v: string): void };
const memoryStorage = (): Storage & { map: Map<string, string> } => {
  const map = new Map<string, string>();
  return { map, getItem: (k) => map.get(k) ?? null, setItem: (k, v) => { map.set(k, v); } };
};

/** The page, as far as A1 goes: what src/main.ts does with the panel's mission and the stored copy. */
class Page {
  readonly ws = new WorkspaceMission();
  /** the panel's constructor default: the ISS crew launch */
  panel: MissionState = {
    vehicleId: 'soyuz21a', satelliteId: 'crew', siteId: 'baikonur', orbitId: 'iss', orbit: { ...orbitById('iss') },
    launchTime: new Date(FROM), guidanceOverrides: {}, failure: { ...DEFAULT_FAILURE }, boosterRecovery: false,
    payloadMass: 7150, dynamics: defaultDynamics('soyuz21a'),
  };
  underway = false;
  private started = false;
  mode: Mode;

  constructor(readonly storage: Storage, mode: Mode, link: MissionState | null = null) {
    this.mode = mode;
    const stored = loadStoredMission(storage);
    const start = startupMission({ link: !!link, lean: lean(mode), stored: stored !== null });
    if (start === 'link') {
      if (lean(mode)) this.mode = 'explore';
      this.ws.adopt();
      this.panel = parseMissionDocument(JSON.parse(JSON.stringify(missionDocument(link!))), this.panel).state;
      this.preview();
    } else if (start === 'demo') this.loadViewer('demo', FEATURED_WATCH_MISSION);
    else if (start === 'stored') this.applyStored(stored);
    else { this.ws.adopt(); this.preview(); }
    this.started = true;
  }

  private doc(): string {
    return JSON.stringify(missionDocument(this.panel));
  }

  preview(): void {
    if (this.ws.persists(this.doc())) saveStoredMission(this.panel, this.storage);
  }

  private loadViewer(origin: 'demo' | 'watch', id: WatchMissionId): void {
    this.ws.viewing(origin);
    const settings = watchMissionSettings(id, FROM);
    this.panel = { ...settings, dynamics: defaultDynamics(settings.vehicleId) };
    this.preview();
    this.ws.loaded(this.doc());
  }

  private applyStored(stored: unknown): void {
    this.ws.restoring();
    const parsed = parseMissionDocument(stored, this.panel);
    if (parsed.usable) this.panel = parsed.state;
    this.preview();
    if (this.ws.restored(this.doc(), !parsed.issues.length)) saveStoredMission(this.panel, this.storage);
  }

  go(mode: Mode): void {
    this.mode = mode;
    if (!workspace(mode) || !this.started) return;
    const stored = loadStoredMission(this.storage);
    if (this.ws.entering({ doc: this.doc(), stored: stored !== null, underway: this.underway })) this.applyStored(stored);
  }

  /** a panel edit (or a quick start, or a WebMCP edit): previewed */
  edit(change: (m: MissionState) => void): void {
    change(this.panel);
    this.preview();
  }

  /** a launch picked in the viewer: loaded, then flown */
  watch(id: WatchMissionId): void {
    this.go('watch');
    this.loadViewer('watch', id);
    this.underway = true;
    this.preview();
  }

  stored(): MissionState | null {
    const raw = loadStoredMission(this.storage);
    return raw ? parseMissionDocument(raw, this.panel).state : null;
  }
}

/** A storage that already holds the user's mission, as Engineer left it. */
function withUsersMission() {
  const storage = memoryStorage();
  const page = new Page(storage, 'engineer');
  page.edit((m) => Object.assign(m, usersMission()));
  expect(page.stored()).toEqual(usersMission());
  return storage;
}

describe('where the page starts (A1)', () => {
  it('a mission link first, then the viewer\'s launch on a lean page, then the stored mission', () => {
    expect(startupMission({ link: true, lean: true, stored: true })).toBe('link');
    expect(startupMission({ link: true, lean: false, stored: false })).toBe('link');
    expect(startupMission({ link: false, lean: true, stored: true })).toBe('demo');
    expect(startupMission({ link: false, lean: false, stored: true })).toBe('stored');
    expect(startupMission({ link: false, lean: false, stored: false })).toBe('default');
  });
});

describe('the rules (A1)', () => {
  it('stores the user\'s mission, and a viewer\'s only once it is changed', () => {
    const ws = new WorkspaceMission();
    expect(ws.persists('a')).toBe(true);
    ws.viewing('demo');
    expect(ws.persists('a')).toBe(false); // being loaded
    ws.loaded('b');
    expect(ws.persists('b')).toBe(false);
    expect(ws.origin).toBe('demo');
    expect(ws.persists('c')).toBe(true);
    expect(ws.origin).toBe('workspace');
  });

  it('brings the stored mission back over an untouched viewer\'s launch on its pad, and only then', () => {
    const ws = new WorkspaceMission();
    expect(ws.entering({ doc: 'a', stored: true, underway: false })).toBe(false); // the user's already
    ws.viewing('demo'); ws.loaded('d');
    expect(ws.entering({ doc: 'd', stored: false, underway: false })).toBe(false); // nothing to bring back
    expect(ws.entering({ doc: 'd', stored: true, underway: true })).toBe(false); // the flight being watched
    expect(ws.entering({ doc: 'd', stored: true, underway: false })).toBe(true);
    ws.viewing('watch'); ws.loaded('w');
    expect(ws.entering({ doc: 'w', stored: true, underway: false })).toBe(true);
    expect(ws.entering({ doc: 'edited', stored: true, underway: false })).toBe(false); // changed: the user's now
    expect(ws.origin).toBe('workspace');
  });

  it('R3.5: Home\'s first-launch template stores nothing until it is changed, and entering a workspace mode keeps it', () => {
    const ws = new WorkspaceMission();
    ws.viewing('template');
    expect(ws.persists('t')).toBe(false); // being loaded
    ws.loaded('t');
    expect(ws.persists('t')).toBe(false); // opened, not changed: the stored mission is safe
    expect(ws.entering({ doc: 't', stored: true, underway: false })).toBe(false); // asked for: not swapped back
    expect(ws.origin).toBe('template');
    expect(ws.persists('t2')).toBe(true); // the first change makes it the user's
    expect(ws.origin).toBe('workspace');
  });
});

describe('the rules: a stored mission read with issues is held (M-PLAN-031)', () => {
  it('stores nothing while it is read, nothing while it is unchanged, and the first change', () => {
    const ws = new WorkspaceMission();
    ws.restoring();
    expect(ws.persists('s')).toBe(false); // being read
    expect(ws.restored('s', false)).toBe(false);
    expect(ws.persists('s')).toBe(false);
    expect(ws.origin).toBe('workspace');
    expect(ws.persists('s2')).toBe(true);
    expect(ws.persists('s')).toBe(true); // changed once: the user's from then on
  });

  it('a clean read is stored at once, and any other mission the user takes on ends the hold', () => {
    const ws = new WorkspaceMission();
    ws.restoring();
    expect(ws.restored('s', true)).toBe(true);
    expect(ws.persists('s')).toBe(true);
    ws.restoring(); ws.restored('s', false);
    ws.adopt(); // a link, a file, a lesson
    expect(ws.persists('s')).toBe(true);
  });
});

describe('journeys (A1)', () => {
  it('the audit\'s: Falcon 9 in Engineer → Home → reload → Engineer gives the Falcon 9 back, whole', () => {
    const storage = withUsersMission();
    const home = new Page(storage, 'home');
    expect(home.panel.vehicleId).toBe(watchMissionSettings(FEATURED_WATCH_MISSION, FROM).vehicleId);
    home.go('engineer');
    expect(home.panel).toEqual(usersMission());
    // and the next edit is stored on top of it, not on top of the viewer's launch
    home.edit((m) => { m.payloadMass = 1200; });
    expect(home.stored()).toEqual({ ...usersMission(), payloadMass: 1200 });
  });

  it.each(['home', 'watch', 'orbit', 'build'] as const)('reloading on %s leaves the stored mission as it was until the workspace is entered', (mode) => {
    const storage = withUsersMission();
    const before = storage.map.get('orbitlab.mission');
    const page = new Page(storage, mode);
    page.go('home');
    page.go('orbit');
    expect(storage.map.get('orbitlab.mission')).toBe(before);
    page.go('explore');
    expect(page.panel).toEqual(usersMission());
  });

  it('a page that starts in Engineer opens on the stored mission, as before', () => {
    const page = new Page(withUsersMission(), 'engineer');
    expect(page.panel).toEqual(usersMission());
  });

  it('a mission link comes before the stored mission, and becomes the stored one', () => {
    const storage = withUsersMission();
    const linked = { ...quickstartMission('gto', FROM), dynamics: defaultDynamics('falcon9') };
    const page = new Page(storage, 'home', linked);
    expect(page.mode).toBe('explore');
    expect(page.panel).toEqual(linked);
    expect(page.stored()).toEqual(linked);
    page.go('engineer');
    expect(page.panel).toEqual(linked);
  });

  it('a launch watched on the way does not replace the user\'s mission; the workspace shows it while it flies', () => {
    const storage = withUsersMission();
    const page = new Page(storage, 'engineer');
    page.watch('electronSso');
    expect(page.stored()).toEqual(usersMission());
    // "explore this launch": the flight carries on into the workspace, still not stored
    page.go('explore');
    expect(page.panel.vehicleId).toBe('electron');
    page.preview(); // the flight reset on its pad
    expect(page.stored()).toEqual(usersMission());
    // and the next reload opens the workspace on the user's mission
    expect(new Page(storage, 'engineer').panel).toEqual(usersMission());
    // through Home as well
    const home = new Page(storage, 'home');
    home.go('home');
    home.go('engineer');
    expect(home.panel).toEqual(usersMission());
  });

  it('a viewer\'s launch changed before the workspace is entered is the user\'s: kept and stored', () => {
    const storage = withUsersMission();
    const page = new Page(storage, 'home');
    // e.g. WebMCP's configure_mission on the landing page
    page.edit((m) => { m.payloadMass = 5000; });
    const changed = page.panel;
    expect(page.stored()).toEqual(changed);
    page.go('engineer');
    expect(page.panel).toEqual(changed);
  });

  it('a first visit enters the workspace on the viewer\'s launch, and stores it once it is edited', () => {
    const storage = memoryStorage();
    const page = new Page(storage, 'home');
    page.go('explore');
    expect(page.panel.vehicleId).toBe(watchMissionSettings(FEATURED_WATCH_MISSION, FROM).vehicleId);
    expect(storage.map.size).toBe(0);
    page.edit((m) => Object.assign(m, quickstartMission('leo', FROM), { dynamics: defaultDynamics('falcon9') }));
    expect(page.stored()?.vehicleId).toBe('falcon9');
  });
});

/** M-PLAN-031: a stored document this version cannot keep whole, as raw bytes in the page's storage. */
function storedAs(doc: unknown) {
  const storage = memoryStorage();
  const bytes = JSON.stringify(doc);
  storage.setItem('orbitlab.mission', bytes);
  return { storage, bytes };
}
const usersDoc = () => JSON.parse(JSON.stringify(missionDocument(usersMission())));

describe('a stored mission this version cannot keep whole is read, not written over (M-PLAN-031)', () => {
  const newer = () => {
    const doc = usersDoc();
    return { ...doc, version: 99, future: { kept: true }, mission: { ...doc.mission, futureSetting: 7 } };
  };
  const reset = () => {
    const doc = usersDoc();
    return { ...doc, mission: { ...doc.mission, payloadMass: -1 } };
  };

  it('a newer version\'s mission: the page starts on it in Engineer and its bytes stay as they were', () => {
    const { storage, bytes } = storedAs(newer());
    const page = new Page(storage, 'engineer');
    expect(page.panel).toEqual(usersMission()); // read as far as this version understands it
    expect(storage.map.get('orbitlab.mission')).toBe(bytes);
    page.preview(); // a flight reset on its pad, a resize: no edit
    expect(storage.map.get('orbitlab.mission')).toBe(bytes);
  });

  it('a newer version\'s mission brought back on entering the workspace keeps its bytes until the user changes it', () => {
    const { storage, bytes } = storedAs(newer());
    const page = new Page(storage, 'home');
    page.go('explore');
    expect(page.panel).toEqual(usersMission());
    expect(storage.map.get('orbitlab.mission')).toBe(bytes);
    // the user's own edit is what replaces it
    page.edit((m) => { m.payloadMass = 1200; });
    expect(storage.map.get('orbitlab.mission')).not.toBe(bytes);
    expect(page.stored()).toEqual({ ...usersMission(), payloadMass: 1200 });
  });

  it('a mission with settings put back to their defaults is read, and not saved as if valid until it is edited', () => {
    const { storage, bytes } = storedAs(reset());
    expect(parseMissionDocument(reset(), usersMission()).issues.map((i) => i.field)).toContain('setup.payloadMass');
    const page = new Page(storage, 'engineer');
    expect(page.panel.vehicleId).toBe('falcon9');
    expect(storage.map.get('orbitlab.mission')).toBe(bytes);
    page.go('home');
    page.go('engineer');
    expect(storage.map.get('orbitlab.mission')).toBe(bytes);
    page.edit((m) => { m.payloadMass = 900; });
    expect(page.stored()).toEqual({ ...usersMission(), payloadMass: 900 });
  });

  it('a document none of which is usable is not written over by the mission the page falls back to', () => {
    const { storage, bytes } = storedAs({ format: 'orbitlab.mission', version: 99, mission: 'a layout this version cannot read' });
    const page = new Page(storage, 'engineer');
    expect(storage.map.get('orbitlab.mission')).toBe(bytes);
    page.edit((m) => Object.assign(m, usersMission()));
    expect(page.stored()).toEqual(usersMission());
  });

  it('a mission of this version is restored as before', () => {
    const storage = withUsersMission();
    const before = storage.map.get('orbitlab.mission');
    const page = new Page(storage, 'engineer');
    expect(page.panel).toEqual(usersMission());
    expect(storage.map.get('orbitlab.mission')).toBe(before);
    page.edit((m) => { m.payloadMass = 1100; });
    expect(page.stored()).toEqual({ ...usersMission(), payloadMass: 1100 });
  });
});

describe('the "continue" card\'s summary (A1)', () => {
  it('reads the vehicle, the payload and the orbit off a stored document', () => {
    const storage = withUsersMission();
    expect(missionSummary(loadStoredMission(storage))).toEqual({
      vehicleId: 'falcon9', vehicleName: null, payloadKg: 1000,
      perigeeKm: orbitById('leo').perigee / 1000, apogeeKm: orbitById('leo').apogee / 1000,
    });
  });

  it('names a custom vehicle by its own name, and reads nothing out of what is not a mission', () => {
    const spec = { ...structuredClone(vehicleById('falcon9')), id: 'mine', name: 'My Falcon' };
    const doc = missionDocument({ ...usersMission(), vehicleId: 'mine', vehicleSpec: spec });
    expect(missionSummary(JSON.parse(JSON.stringify(doc)))?.vehicleName).toBe('My Falcon');
    expect(missionSummary(null)).toBeNull();
    expect(missionSummary({ format: 'something else', mission: {} })).toBeNull();
    expect(missionSummary({ ...doc, mission: { ...doc.mission, payloadMass: 'heavy' } })).toBeNull();
  });
});

describe('the notice says a held stored mission is kept as stored until changed (r16-2b-notice, M-PLAN-031)', () => {
  const HELD = 'This mission is kept as it was stored until you change it; your first edit saves it in this app\'s format.';
  const newer = () => {
    const doc = usersDoc();
    return { ...doc, version: 99, mission: { ...doc.mission, futureSetting: 7 } };
  };
  const reset = () => {
    const doc = usersDoc();
    return { ...doc, mission: { ...doc.mission, payloadMass: -1 } };
  };
  /** the restore as src/main.ts applyStoredMission does it: whether it is held, and its notice */
  const restore = (doc: unknown) => {
    const ws = new WorkspaceMission();
    ws.restoring();
    const parsed = parseMissionDocument(doc, usersMission());
    ws.restored('s', !parsed.issues.length);
    return { ws, parsed, notice: missionNotice(parsed, 'stored') };
  };

  it('a held restore (newer version, settings reset) carries the line; the first edit ends the hold', () => {
    expect(t('share.notice.held')).toBe(HELD);
    for (const doc of [newer(), reset()]) {
      const { ws, parsed, notice } = restore(doc);
      expect(ws.held).toBe(true);
      expect(notice).toMatchObject({ level: 'warn', held: true });
      // a link or a file is stored at once in this app's format: never held
      expect(missionNotice(parsed, 'link')?.held).toBeFalsy();
      expect(missionNotice(parsed, 'file')?.held).toBeFalsy();
      expect(ws.persists('s')).toBe(false);
      expect(ws.held).toBe(true);
      expect(ws.persists('s2')).toBe(true);
      expect(ws.held).toBe(false);
    }
  });

  it('a clean restore does not carry it, nor a document none of which could be shown', () => {
    const clean = restore(usersDoc());
    expect(clean.ws.held).toBe(false);
    expect(clean.notice).toBeNull();
    const unusable = restore({ format: 'orbitlab.mission', version: 99, mission: 'a layout this version cannot read' });
    expect(unusable.notice).toMatchObject({ level: 'error' });
    expect(unusable.notice?.held).toBeFalsy();
  });
});
