/**
 * Translation QA gate (wave 3).
 *
 * The architecture contract says every user-visible string goes through
 * `src/i18n` in en, ru and th. Three things rot silently under that rule: a key
 * added to one dictionary and not the others, a value left in English because
 * nobody read the file end to end, and a `t('…')` call whose key was renamed in
 * the dictionary but not at the call site. The first two are caught by
 * comparing the dictionaries against each other; the third needs the source
 * tree, so this suite reads `src/**` and `index.html` as text.
 *
 * It reads them through `import.meta.glob(..., { query: '?raw' })` rather than
 * `node:fs`, because `tsconfig.json` types only `vite/client` — there is no
 * `@types/node` in this project and adding one is not this wave's call.
 *
 * The suite deliberately does NOT judge translation quality. It pins the
 * mechanical half — parity, placeholders, script coverage, live call sites —
 * so that the terminology pass in docs/PHYSICS.md has a stable floor. The
 * glossary at the end of that file is the source of truth for the wording.
 */
import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';
import { th } from '../src/i18n/th';
import { setLang, t } from '../src/i18n';
import { localized, localizeEventParams } from '../src/ui/names';
import { SATELLITES } from '../src/data/satellites';

// `import.meta.glob` requires its options to be an inline object literal — a
// shared `const RAW = {…}` is rejected by the transform at build time.
const SRC = import.meta.glob('../src/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const HTML = import.meta.glob('../index.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const I18N = import.meta.glob('../src/i18n/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

/** Everything that can hold a call site: the app source plus the markup. */
const SOURCES: ReadonlyArray<readonly [string, string]> = [
  ...Object.entries(SRC).filter(([path]) => !path.startsWith('../src/i18n/')),
  ...Object.entries(HTML),
];

const DICTS = { ru, th } as const;
type Target = keyof typeof DICTS;

const SCRIPT: Record<Target, RegExp> = {
  ru: /\p{Script=Cyrillic}/u,
  th: /\p{Script=Thai}/u,
};

/**
 * Keys whose value is a proper name — a company, a piece of hardware, or the
 * product itself. Russian and Thai technical writing prints these in Latin
 * exactly as English does, so an identical value is correct here and only
 * here. Everything else must carry its own script.
 */
const PROPER_NAMES = [
  /^app\.title$/, // the product name
  /\.manufacturer$/, // SpaceX, ULA, ISRO, ArianeGroup, …
  // Stage names that are a hardware designation with no descriptive word in them.
  /^stage\.atlasv551\.centaur3\.name$/,
  /^stage\.vulcan\.centaur5\.name$/,
  /^stage\.angaraa5\.urm2\.name$/,
  /^stage\.pslvxl\.ps2\.name$/,
  /^stage\.pslvxl\.ps4\.name$/,
  /^stage\.starship\.superheavy\.name$/,
  /^stage\.starship\.ship\.name$/,
];
const isProperName = (key: string): boolean => PROPER_NAMES.some((re) => re.test(key));

/**
 * Switch the live dictionary. `setLang` also writes `document.documentElement
 * .lang`, and this suite runs under `environment: 'node'`, so a document stub
 * is installed for the call — the smallest surface that lets the *rendering*
 * path be tested rather than the dictionaries alone.
 */
function withLang(lang: 'en' | 'ru' | 'th'): void {
  const g = globalThis as { document?: unknown };
  if (!g.document) g.document = { documentElement: {} };
  setLang(lang);
}

/** English prose, as opposed to an acronym, a unit symbol or a designation. */
const hasProse = (value: string): boolean => /[a-z]{3,}/.test(value);

const placeholders = (value: string): string => (value.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).sort().join(',');

// ─── source scan ───────────────────────────────────────────────────────────

/** Every `t('key')` call and every `data-i18n` / `data-i18n-title` attribute. */
function literalCallSites(): Map<string, string> {
  const found = new Map<string, string>();
  for (const [path, text] of SOURCES) {
    for (const m of text.matchAll(/\bt\(\s*'([a-zA-Z0-9._-]+)'/g)) found.set(m[1], path);
    for (const m of text.matchAll(/data-i18n(?:-title|-aria-label)?="([^"]+)"/g)) found.set(m[1], path);
  }
  return found;
}

/**
 * Any string literal at all, which is how a key reaches `t()` through a helper:
 * `this.select('setup.site', …)` never spells the call out.
 *
 * Two passes, because many keys sit inside a template literal's interpolation
 * (`` `${t('app.title')} — …` ``). Scanning quote-first swallows the whole
 * backtick string and hides the key inside it, so the second pass neutralises
 * the backticks and looks again.
 */
function literalStrings(): Set<string> {
  const found = new Set<string>();
  const scan = (text: string): void => {
    for (const m of text.matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`\n]*)`/g)) {
      found.add(m[1] ?? m[2] ?? m[3] ?? '');
    }
  };
  for (const [, text] of SOURCES) {
    scan(text);
    scan(text.replace(/`/g, ' '));
  }
  return found;
}

/**
 * Key families assembled at run time from an id, so no literal ever appears in
 * the source. Each entry names the call site that composes it, and the suite
 * asserts every family still matches at least one key — a family deleted
 * upstream must not go on excusing orphaned entries here.
 */
const DYNAMIC_FAMILIES: ReadonlyArray<{ pattern: RegExp; from: string }> = [
  { pattern: /^hud\.[a-z][a-zA-Z0-9]*$/, from: 'ui/hud.ts applyLabels: t(`hud.${k}`)' },
  { pattern: /^hud\.status\.[a-zA-Z]+$/, from: 'ui/hud.ts: t(`hud.status.${frame.status}`)' },
  { pattern: /^hud\.phase\.[a-zA-Z]+$/, from: 'ui/hud.ts: t(`hud.phase.${frame.ascentPhase}`)' },
  { pattern: /^hud\.note\.[a-zA-Z]+$/, from: 'ui/hud.ts: t(`hud.note.${frame.note}`)' },
  { pattern: /^ctl\.hint\.[a-zA-Z]+$/, from: 'main.ts: t(`ctl.hint.${this.camMode}`)' },
  { pattern: /^ctl\.camera\.[a-zA-Z]+$/, from: 'ui/dialogs.ts: t(`ctl.camera.${mode}`)' },
  { pattern: /^cam\.phase\.[a-zA-Z]+$/, from: 'ui/dialogs.ts: t(`cam.phase.${phase}`)' },
  { pattern: /^orbit\.class\.[a-z]+$/, from: 'ui/panel.ts: t(`orbit.class.${cls}`)' },
  { pattern: /^setup\.fail\.[a-zA-Z]+$/, from: 'ui/panel.ts: t(`setup.fail.${m}`)' },
  { pattern: /^tel\.range\.[a-zA-Z]+$/, from: 'ui/telemetry.ts: t(`tel.range.${mode}`)' },
  { pattern: /^tel\.burn\.[a-zA-Z]+$/, from: 'ui/telemetry.ts: t(`tel.burn.${b.kind}`)' },
  { pattern: /^control\.mode\.(auto|manual)$/, from: 'ui/names.ts: localized(`control.mode.${params.mode}`)' },
  { pattern: /^tel\.debris\.[a-zA-Z]+$/, from: 'ui/telemetry.ts: t(`tel.debris.${d.outcome}`)' },
  { pattern: /^evt\.[a-zA-Z]+$/, from: 'SimEvent.key, rendered by ui/narration.ts and ui/timeline.ts' },
  { pattern: /^tl\.evt\.[a-zA-Z]+$/, from: 'ui/phase.ts eventLabel: t(`tl.${key}`)' },
  { pattern: /^phase\.detail\.[a-zA-Z]+$/, from: 'ui/phase.ts phaseInfo detailKey' },
  { pattern: /^orbit\.[a-z0-9]+\.(name|desc|short)$/, from: 'ui/panel.ts: localized(`orbit.${o.id}.…`)' },
  { pattern: /^vehicle\.[a-z0-9]+\.(notes|manufacturer)$/, from: 'ui/names.ts vehicleNotes / vehicleManufacturer' },
  { pattern: /^sat\.[a-zA-Z0-9]+\.name$/, from: 'ui/names.ts satelliteName' },
  { pattern: /^site\.[a-z0-9]+\.name$/, from: 'ui/names.ts siteName' },
  { pattern: /^stage\.[a-z0-9]+\.[a-zA-Z0-9]+\.name$/, from: 'ui/names.ts stageName' },
];

/**
 * Keys with no call site that are kept on purpose, each with its reason. A key
 * that is merely unused is a bug: it means a string the user should be reading
 * is hard-coded somewhere instead.
 */
const RESERVED: Record<string, string> = {
  // The unit symbols are translated, but the HUD, the telemetry list and the
  // setup panel still format 'km', 'm/s', 'kPa' as English literals
  // (ui/hud.ts:186-198, ui/telemetry.ts:200-229, ui/panel.ts:697-702). Wiring
  // those call sites is the fix; deleting the keys would be the wrong half of
  // it. Raised as an open item by the wave-3 translation pass.
  'u.km': 'unit symbols are not wired to their call sites yet',
  'u.m': 'unit symbols are not wired to their call sites yet',
  'u.ms': 'unit symbols are not wired to their call sites yet',
  'u.kg': 'unit symbols are not wired to their call sites yet',
  'u.t': 'unit symbols are not wired to their call sites yet',
  'u.kN': 'unit symbols are not wired to their call sites yet',
  'u.s': 'unit symbols are not wired to their call sites yet',
  'u.min': 'unit symbols are not wired to their call sites yet',
  'u.kPa': 'unit symbols are not wired to their call sites yet',
  'u.deg': 'unit symbols are not wired to their call sites yet',
  // The setup aside is announced with a11y.setupPanel and headed with
  // app.missionControl + app.buildMission; the old caption has no call site.
  'setup.title': 'superseded by a11y.setupPanel + app.buildMission',
};

// ─── the suite ─────────────────────────────────────────────────────────────

describe('dictionary parity', () => {
  const enKeys = Object.keys(en);

  it('declares the same keys in en, ru and th', () => {
    for (const [name, dict] of Object.entries(DICTS)) {
      expect({ [`${name} has keys en does not`]: Object.keys(dict).filter((k) => !(k in en)) })
        .toEqual({ [`${name} has keys en does not`]: [] });
      expect({ [`${name} is missing`]: enKeys.filter((k) => !(k in dict)) })
        .toEqual({ [`${name} is missing`]: [] });
    }
  });

  it('declares each key exactly once per file', () => {
    for (const [path, text] of Object.entries(I18N)) {
      const seen = new Set<string>();
      const dupes: string[] = [];
      for (const m of text.matchAll(/^ {2}'([^']+)':/gm)) {
        if (seen.has(m[1])) dupes.push(m[1]);
        seen.add(m[1]);
      }
      expect({ path, dupes }).toEqual({ path, dupes: [] });
    }
  });

  it('parses the same number of entries out of each file as the module exports', () => {
    // Guards the regex the duplicate check relies on: if a value ever spans
    // two lines the scan above would quietly stop seeing keys.
    for (const [name, dict] of Object.entries({ en, ru, th })) {
      const text = I18N[`../src/i18n/${name}.ts`];
      expect({ name, n: [...text.matchAll(/^ {2}'([^']+)':/gm)].length })
        .toEqual({ name, n: Object.keys(dict).length });
    }
  });

  it('has no empty, padded or double-spaced values', () => {
    for (const [name, dict] of Object.entries({ en, ru, th })) {
      const bad = Object.entries(dict)
        .filter(([, v]) => v.trim() === '' || v !== v.trim() || v.includes('  '))
        .map(([k]) => k);
      expect({ [name]: bad }).toEqual({ [name]: [] });
    }
  });

  it('keeps every {param} placeholder intact', () => {
    for (const [name, dict] of Object.entries(DICTS)) {
      const bad = enKeys
        .filter((k) => placeholders(en[k]) !== placeholders(dict[k] ?? ''))
        .map((k) => `${k}: [${placeholders(en[k])}] → [${placeholders(dict[k] ?? '')}]`);
      expect({ [name]: bad }).toEqual({ [name]: [] });
    }
  });
});

describe('translation coverage', () => {
  it('writes every prose value in the target script', () => {
    for (const name of Object.keys(DICTS) as Target[]) {
      const bad = Object.keys(en)
        .filter((k) => hasProse(en[k]) && !isProperName(k) && !SCRIPT[name].test(DICTS[name][k]))
        .map((k) => `${k}: ${DICTS[name][k]}`);
      expect({ [name]: bad }).toEqual({ [name]: [] });
    }
  });

  it('never leaves a prose value identical to English', () => {
    for (const name of Object.keys(DICTS) as Target[]) {
      const bad = Object.keys(en)
        .filter((k) => hasProse(en[k]) && !isProperName(k) && DICTS[name][k] === en[k])
        .map((k) => `${k}: ${en[k]}`);
      expect({ [name]: bad }).toEqual({ [name]: [] });
    }
  });

  it('writes Thai numbers with Arabic numerals, as the rest of the app does', () => {
    const bad = Object.entries(th).filter(([, v]) => /[๐-๙]/.test(v)).map(([k]) => k);
    expect(bad).toEqual([]);
  });
});

describe('call sites', () => {
  it('localizes recorded aerodynamic limits while preserving raw angles and scope', () => {
    const params = { scope: 'debris', name: 'Falcon 9', angleOfAttackRad: Math.PI / 6, sideslipRad: -Math.PI / 60 };
    for (const lang of ['en', 'ru', 'th'] as const) {
      withLang(lang);
      const display = localizeEventParams(null, params)!;
      expect(display.scope).toBe(t('aero.scope.debris'));
      expect(display.alphaDeg).toBe('30.0'); expect(display.betaDeg).toBe('-3.0');
      expect(t('evt.aeroEnvelopeExceeded', display)).not.toMatch(/\{[a-zA-Z]+\}/);
      expect(params.scope).toBe('debris'); expect(params.angleOfAttackRad).toBe(Math.PI / 6);
    }
    withLang('en');
  });

  it('localizes command events without changing their SI replay/export metadata', () => {
    const params = { mode: 'manual', rollRateRadS: 0.01, pitchRateRadS: -0.02, yawRateRadS: 0.03, throttle: 0.6 };
    for (const lang of ['en', 'ru', 'th'] as const) {
      withLang(lang);
      const display = localizeEventParams(null, params)!;
      expect(display.mode).toBe(t('control.mode.manual'));
      expect(display.rollRateRadS).toBe('0.010'); expect(display.pitchRateRadS).toBe('-0.020');
      expect(display.throttle).toBe('60.0');
      const text = t('evt.controlCommand', display);
      expect(text).toContain('60.0%'); expect(text).not.toMatch(/\{[a-zA-Z]+\}/);
      expect(params).toEqual({ mode: 'manual', rollRateRadS: 0.01, pitchRateRadS: -0.02, yawRateRadS: 0.03, throttle: 0.6 });
    }
    withLang('en');
  });

  it('reads the source tree it is supposed to scan', () => {
    // A glob that silently matches nothing would make every check below pass.
    expect(SOURCES.length).toBeGreaterThan(20);
    expect(Object.keys(I18N).sort()).toEqual([
      '../src/i18n/en.ts',
      '../src/i18n/index.ts',
      '../src/i18n/ru.ts',
      '../src/i18n/th.ts',
    ]);
  });

  it('resolves every t() key and data-i18n attribute in the source', () => {
    const missing = [...literalCallSites().entries()]
      .filter(([key]) => !(key in en))
      .map(([key, path]) => `${key} (${path})`);
    expect(missing).toEqual([]);
  });

  it('still has a key for every dynamic call-site family', () => {
    const enKeys = Object.keys(en);
    const stale = DYNAMIC_FAMILIES.filter((f) => !enKeys.some((k) => f.pattern.test(k))).map((f) => f.from);
    expect(stale).toEqual([]);
  });

  it('has a call site for every key', () => {
    const literals = literalStrings();
    const orphans = Object.keys(en).filter(
      (k) => !literals.has(k) && !(k in RESERVED) && !DYNAMIC_FAMILIES.some((f) => f.pattern.test(k)),
    );
    expect(orphans).toEqual([]);
  });

  /**
   * Release review 2, major #1: the one `this.event(...)` call site whose
   * `{name}` was not a stage.
   *
   * `localizeEventParams` routed `{name}` through the vehicle's stage list
   * only, which can never match a satellite, so `evt.payloadSep` printed
   * "CubeSat rideshare dispenser" inside the Russian and Thai sentence — in the
   * HUD ticker, the telemetry event log, the narration callout and the timeline
   * tooltip. The dictionary entries existed all along and were already used by
   * the mission title. Nothing in this file could catch it: the key HAS a call
   * site and the dictionaries ARE in parity; what was wrong was the parameter.
   *
   * So this renders the event the way the app does and asserts there is no
   * Latin word left in it. `satId` is what makes that possible, and the
   * assertion covers every satellite in the data file rather than the one that
   * was reported.
   */
  it('renders evt.payloadSep with no English left in it', () => {
    for (const lang of ['ru', 'th'] as const) {
      withLang(lang);
      for (const sat of SATELLITES) {
        const name = localized(`sat.${sat.id}.name`, sat.name);
        const text = t('evt.payloadSep', localizeEventParams(null, { name: sat.name, satId: sat.id }));
        expect(text, `${lang}/${sat.id}`).toContain(name);
        expect(text, `${lang}/${sat.id}`).not.toContain(sat.name);
        // …and nothing English came with it: outside the translated name itself
        // — which may legitimately carry a Latin proper noun, "Партия Starlink"
        // — no Latin word of three letters or more is left in the sentence.
        expect(text.replace(name, '').match(/[A-Za-z]{3,}/g) ?? [], `${lang}/${sat.id}: ${text}`).toEqual([]);
      }
    }
    withLang('en');
    expect(t('evt.payloadSep', localizeEventParams(null, { name: 'CubeSat rideshare dispenser', satId: 'cubesats' })))
      .toContain('CubeSat rideshare dispenser');
  });

  it('keeps the reserved list honest', () => {
    // A reserved key that HAS acquired a call site should leave the list.
    const literals = literalStrings();
    const nowUsed = Object.keys(RESERVED).filter((k) => literals.has(k));
    expect(nowUsed).toEqual([]);
    expect(Object.keys(RESERVED).every((k) => k in en)).toBe(true);
  });
});
