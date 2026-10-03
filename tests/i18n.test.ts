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
import { createScanner, SyntaxKind } from 'typescript/unstable/ast';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';
import { th } from '../src/i18n/th';
import { setLang, t } from '../src/i18n';
import { localized, localizeEventParams } from '../src/ui/names';
import { SATELLITES } from '../src/data/satellites';
import { DesignStoreError, type DesignStoreErrorCode } from '../src/design/design-store';
import { ExploreStore, STORE_TEXTS } from '../src/ui/build/explore-store';

// `import.meta.glob` requires its options to be an inline object literal — a
// shared `const RAW = {…}` is rejected by the transform at build time.
const SRC = import.meta.glob('../src/**/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const HTML = import.meta.glob('../index.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const I18N = import.meta.glob('../src/i18n/*.ts', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const I18N_MODULES = import.meta.glob('../src/i18n/*.ts', { eager: true }) as Record<string, Record<string, unknown>>;

interface DictionaryDeclaration {
  path: string;
  name: string;
  members: ({ key: string; value: string } | { spread: string })[];
  imports: Map<string, { path: string; name: string }>;
}
interface DictionaryEntry { key: string; value: string; declaration: string }

/** Read declared objects, not lines: comments, escaped strings, several entries
 * on a line, and EN/RU/TH objects in one file must not confuse duplicate checks.
 * Use the repository's pinned TypeScript scanner; unsupported dictionary syntax
 * fails explicitly rather than silently skipping entries.
 */
function dictionaryDeclarations(files: Record<string, string>): DictionaryDeclaration[] {
  const declarations: DictionaryDeclaration[] = [];
  for (const [path, source] of Object.entries(files)) {
    const scanner = createScanner(true, undefined, source);
    const tokens: { kind: SyntaxKind; text: string; value: string }[] = [];
    while (scanner.scan() !== SyntaxKind.EndOfFile) tokens.push({ kind: scanner.getToken(), text: scanner.getTokenText(), value: scanner.getTokenValue() });
    const imports = new Map<string, { path: string; name: string }>();
    // Comments and string values must not be mistaken for named imports.
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].text !== 'import' || tokens[i + 1]?.kind !== SyntaxKind.OpenBraceToken) continue;
      const names: { name: string; local: string }[] = [];
      let at = i + 2;
      while (tokens[at] && tokens[at].kind !== SyntaxKind.CloseBraceToken) {
        if (tokens[at].kind !== SyntaxKind.Identifier) throw new Error(`${path}: unsupported dictionary import`);
        const name = tokens[at++].text;
        let local = name;
        if (tokens[at]?.text === 'as') {
          if (tokens[++at]?.kind !== SyntaxKind.Identifier) throw new Error(`${path}: unsupported dictionary alias`);
          local = tokens[at++].text;
        }
        names.push({ name, local });
        if (tokens[at]?.kind === SyntaxKind.CommaToken) at++;
        else if (tokens[at]?.kind !== SyntaxKind.CloseBraceToken) throw new Error(`${path}: unsupported dictionary import`);
      }
      const specifier = tokens[at + 2];
      if (tokens[at + 1]?.text !== 'from' || specifier?.kind !== SyntaxKind.StringLiteral || !/^\.\.?\//.test(specifier.value)) throw new Error(`${path}: expected a relative dictionary import`);
      // Helpers outside the dictionary directory (for example profile storage)
      // are not dictionary declarations. A spread of such a binding still fails
      // when the composition resolver cannot find its declared dictionary.
      if (specifier.value.startsWith('../')) continue;
      for (const { name, local } of names) imports.set(local, { path: `${path.slice(0, path.lastIndexOf('/') + 1)}${specifier.value.slice(2)}.ts`, name });
    }
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].text !== 'export' || tokens[i + 1]?.text !== 'const') continue;
      const name = tokens[i + 2]?.text;
      if (!name || !/^(en|ru|th|[A-Za-z_$][\w$]*(En|Ru|Th))$/.test(name)) throw new Error(`${path}: unrecognised exported dictionary ${name}`);
      i += 3;
      while (tokens[i] && tokens[i].kind !== SyntaxKind.EqualsToken) i++;
      i++;
      // The pure IIFE lets language-free workers discard the composed object.
      const wrapped = tokens.slice(i, i + 5).map(token => token.text).join('') === '(()=>(';
      if (wrapped) i += 5;
      if (tokens[i]?.kind !== SyntaxKind.OpenBraceToken) throw new Error(`${path}#${name}: expected an object literal or its pure IIFE`);
      const members: DictionaryDeclaration['members'] = [];
      i++;
      while (tokens[i] && tokens[i].kind !== SyntaxKind.CloseBraceToken) {
        if (tokens[i].kind === SyntaxKind.DotDotDotToken && tokens[i + 1]?.kind === SyntaxKind.Identifier) {
          members.push({ spread: tokens[i + 1].text }); i += 2;
        } else if (tokens[i].kind === SyntaxKind.StringLiteral && tokens[i + 1]?.kind === SyntaxKind.ColonToken
          && [SyntaxKind.StringLiteral, SyntaxKind.NoSubstitutionTemplateLiteral].includes(tokens[i + 2]?.kind)) {
          members.push({ key: tokens[i].value, value: tokens[i + 2].value }); i += 3;
        } else throw new Error(`${path}#${name}: unsupported dictionary entry near ${tokens[i].text}`);
        if (tokens[i]?.kind === SyntaxKind.CommaToken) i++;
        else if (tokens[i]?.kind !== SyntaxKind.CloseBraceToken) throw new Error(`${path}#${name}: unsupported dictionary value`);
      }
      if (!tokens[i]) throw new Error(`${path}#${name}: unterminated dictionary`);
      if (wrapped && tokens.slice(i + 1, i + 5).map(token => token.text).join('') !== '))()') throw new Error(`${path}#${name}: unsupported dictionary wrapper`);
      declarations.push({ path, name, members, imports });
    }
  }
  return declarations;
}

/** Preserve every declaration through spreads: an overwritten key must still
 * be visible to QA even when JavaScript's final object contains it only once.
 */
function dictionaryEntries(declarations: DictionaryDeclaration[], declaration: DictionaryDeclaration, stack: string[] = []): DictionaryEntry[] {
  const id = `${declaration.path}#${declaration.name}`;
  if (stack.includes(id)) throw new Error(`Cyclic dictionary spread: ${[...stack, id].join(' → ')}`);
  return declaration.members.flatMap(member => {
    if ('key' in member) return [{ ...member, declaration: id }];
    const imported = declaration.imports.get(member.spread) ?? { path: declaration.path, name: member.spread };
    const component = declarations.find(row => row.path === imported.path && row.name === imported.name);
    if (!component) throw new Error(`${id}: unresolved dictionary spread ${member.spread}`);
    return dictionaryEntries(declarations, component, [...stack, id]);
  });
}
const DECLARATIONS = dictionaryDeclarations(I18N);

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
  { pattern: /^nav\.level\.(launch|orbit|build)\.(watch|explore|engineer)$/, from: 'ui/section-nav-model.ts levelDescKey: `nav.level.${section}.${level}`' },
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
  { pattern: /^zone\.[a-z0-9]+\.name$/, from: 'ui/names.ts zoneName' },
  { pattern: /^abort\.mode\.[a-z]+$/, from: 'ui/names.ts localizeEventParams (G06)' },
  { pattern: /^stage\.[a-z0-9]+\.[a-zA-Z0-9]+\.name$/, from: 'ui/names.ts stageName' },
  // G07: a flight to the station
  { pattern: /^setup\.rendezvous\.[a-zA-Z]+$/, from: 'ui/panel.ts rendezvousOption: t(`setup.rendezvous.${id}`)' },
  { pattern: /^rv\.port\.[a-zA-Z]+$/, from: 'ui/panel.ts, ui/phase.ts, ui/names.ts: t(`rv.port.${id}`)' },
  { pattern: /^rv\.profile\.[a-zA-Z]+$/, from: 'ui/names.ts localizeEventParams: localized(`rv.profile.${id}`)' },
  { pattern: /^rv\.burn\.[a-z]+$/, from: 'ui/names.ts rendezvousBurnName: localized(`rv.burn.${id}`)' },
  { pattern: /^hud\.rv\.[a-zA-Z]+$/, from: 'ui/phase.ts, ui/hud.ts: t(`hud.rv.${phase}`)' },
  { pattern: /^phase\.detail\.rv\.[a-zA-Z]+$/, from: 'ui/phase.ts phaseInfo: `phase.detail.rv.${phase}`' },
  { pattern: /^hud\.apollo\.[a-zA-Z]+$/, from: 'ui/phase.ts phaseInfo: `hud.apollo.${frame.apollo.phase}` (C01)' },
  { pattern: /^phase\.detail\.apollo\.[a-zA-Z]+$/, from: 'ui/phase.ts phaseInfo: `phase.detail.apollo.${frame.apollo.phase}` (C01)' },
  // G08: the control system's failures, by kind, group and state.
  { pattern: /^fault\.(kind|about)\.[a-zA-Z]+$/, from: 'ui/fault-names.ts faultKindName; ui/panel.ts faultRow: t(`fault.about.${fault.kind}`)' },
  { pattern: /^fault\.group\.(actuator|sensor|computer)$/, from: 'ui/panel.ts faultRow: t(`fault.group.${FAULT_GROUP[k]}`)' },
  { pattern: /^fault\.reason\.(flag|vote)$/, from: 'ui/names.ts: t(`fault.reason.${params.fdirReason}`)' },
  { pattern: /^loop\.fault\.(unit|engine|jet|computer)\.[a-zA-Z]+$/, from: 'ui/loop-inspector.ts markFaults' },
  { pattern: /^setup\.faults\.(preset|presetNote|magnitude)\.[a-zA-Z0-9]+$/, from: 'ui/panel.ts faultsSection / faultRow' },
  // G01: the explicit guidance's laws.
  { pattern: /^setup\.explicit\.about\.(standard|peg|igm)$/, from: 'ui/panel.ts explicitGuidanceSection: t(`setup.explicit.about.${config.law}`)' },
  // --- E03 --- lessons and the placement test
  { pattern: /^lesson\.measure\.[a-zA-Z.]+$/, from: 'ui/lessons/lesson-mode.ts criterionLabel: t(`lesson.measure.${c.measure}`)' },
  { pattern: /^lesson\.outcome\.(target|orbit|survived)$/, from: 'ui/lessons/lesson-mode.ts criterionLabel: t(`lesson.outcome.${c.is}`)' },
  { pattern: /^lesson\.advice\.(start|skip|do|review)$/, from: 'ui/lessons/lesson-mode.ts, assessment-view.ts: t(`lesson.advice.${a}`)' },
  { pattern: /^assess\.kind\.(pre|post)$/, from: 'ui/lessons/assessment-view.ts: t(`assess.kind.${kind}`)' },
  { pattern: /^assess\.domain(Short)?\.[1-6]$/, from: 'ui/lessons/assessment-view.ts: t(`assess.domain.${d}`)' },
  { pattern: /^assess\.flight\.[a-z0-9-]+$/, from: 'ui/lessons/assessment-view.ts figure: t(`assess.flight.${id}`)' },
  { pattern: /^assess\.series\.[a-zA-Z]+$/, from: 'ui/lessons/assessment-view.ts figure: t(`assess.series.${f.series}`)' },
  { pattern: /^assess\.confidence\.(guess|unsure|sure)$/, from: 'ui/lessons/assessment-view.ts: t(`assess.confidence.${c}`)' },
  { pattern: /^assess\.level\.(beginner|basic|strong)$/, from: 'ui/lessons/assessment-view.ts: t(`assess.level.${s.level}`)' },
  { pattern: /^ws\.format\.(html|docx)$/, from: 'ui/lessons/worksheet-view.ts: t(`ws.format.${k}`)' },
  // Stage 3/4: feature dictionaries compose into each language; these are the
  // exact runtime unions/registries used by their cited renderers.
  { pattern: /^work\.(notebook|validation|classroom|backups)$/, from: 'ui/workspace-content.ts TABS / applyLanguage: t(`work.${tab}`)' },
  { pattern: /^projects\.section\.(mission|designs|progress|notebook)$/, from: 'ui/projects/projects-panel.ts render: t(`projects.section.${section}`); projects/archive.ts PROJECT_SECTIONS' },
  { pattern: /^projects\.error\.(invalid|oversize|newer|storage|changed|pending|rollback|recoveryConflict)$/, from: 'ui/projects/projects-panel.ts failure: `projects.error.${error.code}`; projects/archive.ts ProjectErrorCode' },
  { pattern: /^lesson\.review\.(pending|reviewed)$/, from: 'ui/lessons/review-details.ts: t(`lesson.review.${packReviewStatus(review)}`)' },
  { pattern: /^lesson\.review\.language\.(en|ru|th)$/, from: 'ui/lessons/review-details.ts: t(`lesson.review.language.${language}`)' },
  { pattern: /^lesson\.review\.(bookPages|pdfPages|section)$/, from: 'ui/lessons/review-details.ts: t(`lesson.review.${source.locator.kind}`); lessons/review.ts CurriculumSource' },
  { pattern: /^lesson\.review\.source\.(ipst|earthGuide|physics1|physics3|nkrafa|aero2025|aero2020|electrical2025|mechanical2020|fgos06|fgos04|mai|bauman)$/, from: 'lessons/review.ts source(): `lesson.review.source.${title}`; PACK_REVIEWS source calls' },
  { pattern: /^exp\.notice\.(missingTrial|noChange|multipleChanges|wrongVariable|differentBuild|differentActions|incomplete|differentHorizon|differentStatus|windInactive)$/, from: 'ui/experiments/notebook.ts: t(`exp.notice.${notice}`); experiments/notebook.ts ComparisonNotice' },
  { pattern: /^classroom\.pack\.(ipst-basic|ipst-earth-space|ipst-physics|rtaf-academy|ru-24-05-06)$/, from: 'ui/classroom/classroom-panel.ts: t(`classroom.pack.${id}`); lessons/packs.ts BUNDLED_PACKS' },
  { pattern: /^classroom\.data\.(space-weather|satellites|earth-orientation)$/, from: 'ui/classroom/classroom-panel.ts DATASETS: t(`classroom.data.${id}`)' },
  { pattern: /^classroom\.error\.(unsupported|uncontrolled|timeout|storage|download|version)$/, from: 'ui/classroom/classroom-panel.ts: t(`classroom.error.${result.error}`); classroom/readiness.ts ClassroomError and pwa/offline-protocol.ts OfflineFailure' },
  { pattern: /^validation\.issue\.(SCI-01|SCI-02|SCI-03|CONTENT-01)$/, from: 'ui/validation/validation-panel.ts: t(`validation.issue.${issue.id}`); validation/report.ts KNOWN_SCIENTIFIC_DISCREPANCIES' },
  { pattern: /^validation\.(yes|no)$/, from: 'ui/validation/validation-panel.ts reportView: t(`validation.${p.workingTreeDirty ? "yes" : "no"}`) and sourceStable' },
  { pattern: /^validation\.runner\.(passed|failed|incomplete)$/, from: 'ui/validation/validation-panel.ts runnerView: t(`validation.runner.${runner.status}`)' },
  { pattern: /^validation\.reference\.(met|missed|inconclusive)$/, from: 'ui/validation/validation-panel.ts reportView: t(`validation.reference.${row.status}`)' },
  { pattern: /^validation\.error\.(size|json|structure)$/, from: 'ui/validation/validation-panel.ts openFile: `validation.error.${error.code}`; validation/read-report.ts ReportReadErrorCode' },
  // G05: the Monte Carlo window's dispersions and states.
  { pattern: /^mc\.q\.(thrust|isp|propellant|dryMass|density|wind|imu)(\.about)?$/, from: 'ui/monte-carlo.ts chrome: t(`mc.q.${key}`), t(`mc.q.${key}.about`)' },
  { pattern: /^mc\.(progress|state)\.(running|done|stopped|failed)$/, from: 'ui/monte-carlo.ts render: t(`mc.progress.${job.state}`), t(`mc.state.${job.state}`)' },
  { pattern: /^mc\.(point|point\.about|table\.caption|target)\.(final|cutoff)$/, from: 'ui/monte-carlo.ts: t(`mc.point.${point}`), t(`mc.table.caption.${this.point}`), t(`mc.target.${this.point}`)' },
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
  // it. Raised as an open item by the wave-3 translation pass. ('u.kN' left
  // the list when the Build section's part card became its first call site.)
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

  it('declares each key exactly once per language object, including composed spreads', () => {
    for (const declaration of DECLARATIONS) {
      const entries = dictionaryEntries(DECLARATIONS, declaration);
      const seen = new Map<string, string>();
      const dupes: string[] = [];
      for (const entry of entries) {
        if (seen.has(entry.key)) dupes.push(`${entry.key}: ${seen.get(entry.key)} + ${entry.declaration}`);
        seen.set(entry.key, entry.declaration);
      }
      expect({ dictionary: `${declaration.path}#${declaration.name}`, dupes }).toEqual({ dictionary: `${declaration.path}#${declaration.name}`, dupes: [] });
    }
  });

  it('parses every component and composed dictionary exactly as its module exports it', () => {
    for (const declaration of DECLARATIONS) {
      const entries = dictionaryEntries(DECLARATIONS, declaration);
      const runtime = I18N_MODULES[declaration.path][declaration.name];
      expect(runtime, `${declaration.path}#${declaration.name}`).toBeTypeOf('object');
      expect(entries.length, `${declaration.path}#${declaration.name}`).toBe(Object.keys(runtime as object).length);
      expect(Object.fromEntries(entries.map(entry => [entry.key, entry.value]))).toEqual(runtime);
    }
  });

  it('keeps scanner coverage for inline keys, escaped values, language objects and spread collisions', () => {
    const declarations = dictionaryDeclarations({
      '../src/i18n/feature.ts': `export const featureEn = { 'a': 'first', 'b': 'it\\'s fine' }; // 'ignored': 'comment'
        export const featureRu = { 'a': 'первый', 'b': 'хорошо' };`,
      '../src/i18n/en.ts': `import { featureEn as shared } from './feature';
        // import { missing as shared } from './fake';
        export const en = /* @__PURE__ */ (() => ({ ...shared, 'a': 'overwritten', 'c': 'third' }))();`,
    });
    const component = declarations.find(row => row.name === 'featureEn')!;
    expect(dictionaryEntries(declarations, component).map(row => row.key)).toEqual(['a', 'b']);
    expect(dictionaryEntries(declarations, component)[1].value).toBe("it's fine");
    const composed = dictionaryEntries(declarations, declarations.find(row => row.name === 'en')!);
    expect(composed.map(row => row.key)).toEqual(['a', 'b', 'a', 'c']);
    expect(composed.filter(row => row.key === 'a').map(row => row.declaration)).toEqual(['../src/i18n/feature.ts#featureEn', '../src/i18n/en.ts#en']);
    expect(() => dictionaryDeclarations({ 'bad.ts': `export const en = { 'key': 'one' + 'two' };` })).toThrow('unsupported dictionary value');
    expect(() => dictionaryEntries(dictionaryDeclarations({ 'bad.ts': `export const en = { ...missing };` }),
      dictionaryDeclarations({ 'bad.ts': `export const en = { ...missing };` })[0])).toThrow('unresolved dictionary spread');
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
  it('qualifies the omitted heating model as detailed in all three languages', () => {
    // staging.ts still evaluates approximate heat flux for fairing release;
    // the limitations must not claim that all heating is absent.
    expect(en['dlg.physics.limitsText']).toMatch(/detailed heating/);
    expect(ru['dlg.physics.limitsText']).toMatch(/детальн\p{L}* нагрев/u);
    expect(th['dlg.physics.limitsText']).toContain('ความร้อนโดยละเอียด');
  });

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
  it('renders every design-store error code through the runtime mapping in all languages', () => {
    // Read the public error union, not a duplicate list of the UI's mappings:
    // adding a new error must bring its runtime message and all dictionaries.
    const definition = /export type DesignStoreErrorCode\s*=\s*([^;]+);/.exec(SRC['../src/design/design-store.ts']);
    expect(definition).not.toBeNull();
    const codes = [...definition![1].matchAll(/'([^']+)'/g)].map((m) => m[1] as DesignStoreErrorCode);
    expect(codes.length).toBeGreaterThan(0);
    // each designer's store (D06: rockets and satellites) names a refused design by its kind
    const renderings = Object.values(STORE_TEXTS).map((texts) =>
      Object.assign(Object.create(ExploreStore.prototype), { texts }) as { failure(error: unknown): { level: string; text: string } });
    try {
      for (const [lang, dict] of Object.entries({ en, ru, th })) {
        withLang(lang as 'en' | 'ru' | 'th');
        for (const code of codes) for (const rendering of renderings) {
          const message = rendering.failure(new DesignStoreError(code, 'Raw internal detail'));
          expect(message.level).toBe('error');
          expect(Object.values(dict), `${lang}/${code}`).toContain(message.text);
          expect(message.text).not.toBe('Raw internal detail');
          if (lang !== 'en') expect(message.text).toMatch(SCRIPT[lang as Target]);
        }
      }
    } finally { withLang('en'); }
  });

  it('localizes recorded aerodynamic limits while preserving raw angles and scope', () => {
    const params = { scope: 'debris', name: 'Falcon 9', angleOfAttackRad: Math.PI / 6, sideslipRad: -Math.PI / 60 };
    for (const lang of ['en', 'ru', 'th'] as const) {
      withLang(lang);
      const display = localizeEventParams(null, params)!;
      expect(display.scope).toBe(t('aero.scope.debris'));
      // The recorded pair is the simulator's own (30° in its x–z plane, −3° in x–y);
      // shown are the standard α and β, alike in ISO 1151 and ГОСТ 20058-80 (U07).
      expect(display.alphaDeg).toBe('-3.5'); expect(display.betaDeg).toBe('-30.0');
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
    expect(Object.keys(I18N).sort()).toEqual(Object.keys(I18N_MODULES).sort());
    expect(Object.keys(I18N).sort()).toEqual([...new Set(['../src/i18n/index.ts', ...DECLARATIONS.map(row => row.path)])].sort());
    for (const name of ['en', 'ru', 'th']) {
      expect(DECLARATIONS.filter(row => row.path === `../src/i18n/${name}.ts` && row.name === name)).toHaveLength(1);
    }
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
