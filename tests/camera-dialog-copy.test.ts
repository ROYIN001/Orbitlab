/**
 * CO-4 step 2 (M-LAUNCH-011): what the camera-sequence dialog says about a
 * view the user picks, checked against what the camera does.
 *
 * R2.2 (docs/development/adr/camera-policy.md) made the camera's owner its own
 * value: a view the user picks (a tab, keys 1–4, WebMCP `set_camera`) makes
 * the camera manual, phase changes leave it alone, and only Cinematic (the
 * button, or this dialog's own switch) hands it back to the programme. The
 * dialog's lead (`cam.intro`) still said the pre-R2.2 rule in all three
 * languages: "A manual choice lasts until the next phase begins."
 *
 * The dialog is rendered for real (a few fake DOM nodes) in each language and
 * driven against a real `CameraPolicy`, wired the way `src/main.ts` wires it:
 * the lead must not end a manual choice at a phase change, it must name the
 * control that does end it by that control's own label, and the policy must
 * keep a picked view through every phase the dialog lists until that control
 * is used. The new lead may not be longer than the old one (the i18n chunk
 * has little room).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '../src/i18n/en';
import { ru } from '../src/i18n/ru';
import { th } from '../src/i18n/th';
import { setLang } from '../src/i18n';
import { CameraDialog, DEFAULT_CAMERA_PLAN, FLIGHT_PHASES, type CameraPlan } from '../src/ui/dialogs';
import { CameraPolicy } from '../src/render/camera-policy';

/** The few DOM calls the dialog makes, read back as text. */
class Node {
  readonly tagName: string;
  children: Node[] = [];
  textContent = ''; className = ''; id = ''; type = ''; title = ''; value = ''; htmlFor = '';
  checked = false; selected = false;
  readonly attrs: Record<string, string> = {};
  private readonly listeners: Record<string, Array<() => void>> = {};
  constructor(tag: string) { this.tagName = tag.toUpperCase(); }
  append(...c: Node[]): void { this.children.push(...c); }
  replaceChildren(...c: Node[]): void { this.children = c; }
  setAttribute(k: string, v: unknown): void { this.attrs[k] = String(v); }
  addEventListener(type: string, fn: () => void): void { (this.listeners[type] ??= []).push(fn); }
  fire(type: string): void { for (const fn of this.listeners[type] ?? []) fn(); }
  all(): Node[] { return this.children.flatMap((c) => [c, ...c.all()]); }
}

beforeEach(() => {
  vi.stubGlobal('document', { createElement: (tag: string) => new Node(tag), documentElement: { lang: 'en' } });
});
afterEach(() => {
  setLang('en');
  vi.unstubAllGlobals();
});

const DICTS = { en, th, ru } as const;
type Lang = keyof typeof DICTS;
const LANGS = Object.keys(DICTS) as Lang[];

/** "the next phase" in each language: what the pre-R2.2 copy ended a manual choice with. */
const NEXT_PHASE: Record<Lang, RegExp> = { en: /next phase/i, th: /ช่วงถัดไป/, ru: /следующ\S* этап/i };

/** The lead as it was on main before this fix: characters and UTF-8 bytes. */
const OLD_LEAD: Record<Lang, { chars: number; bytes: number }> = {
  en: { chars: 87, bytes: 87 },
  th: { chars: 77, bytes: 229 },
  ru: { chars: 89, bytes: 164 },
};

/** The dialog rendered in `lang`, its callbacks wired to `policy` as src/main.ts wires them. */
function render(lang: Lang, policy: CameraPolicy, plan: CameraPlan = { ...DEFAULT_CAMERA_PLAN }) {
  setLang(lang);
  const shell = new Node('dialog');
  const dialog = new CameraDialog(shell as unknown as HTMLDialogElement, {
    plan,
    isAuto: () => policy.cinematic,
    setAuto: (on) => { if (on) policy.resume(null, 'exterior'); else policy.setCinematic(false); },
    onChange: (phase, mode) => { plan[phase] = mode; },
  });
  dialog.applyLanguage();
  const nodes = shell.all();
  const lead = nodes.filter((n) => n.tagName === 'P' && n.className === 'lead');
  const box = nodes.find((n) => n.tagName === 'INPUT' && n.type === 'checkbox');
  return { lead, box };
}

describe('M-LAUNCH-011: the camera dialog says what the camera does', () => {
  for (const lang of LANGS) {
    it(`the lead does not end a manual choice at the next phase (${lang})`, () => {
      const { lead } = render(lang, new CameraPolicy());
      expect(lead, 'one lead paragraph').toHaveLength(1);
      expect(lead[0].textContent).not.toMatch(NEXT_PHASE[lang]);
    });

    it(`the lead names the control that ends a manual choice, by its own label (${lang})`, () => {
      const cinematic = DICTS[lang]['ctl.camera.cinematic'];
      expect(cinematic, 'the Cinematic button has a label').toBeTruthy();
      const { lead } = render(lang, new CameraPolicy());
      expect(lead[0].textContent).toContain(cinematic);
    });

    it(`the lead is no longer than it was (${lang})`, () => {
      const text = DICTS[lang]['cam.intro'];
      expect(text.length).toBeLessThanOrEqual(OLD_LEAD[lang].chars);
      expect(new TextEncoder().encode(text).length).toBeLessThanOrEqual(OLD_LEAD[lang].bytes);
    });
  }

  it('a picked view stays through every phase the dialog lists, until Cinematic or the dialog\'s switch', () => {
    const policy = new CameraPolicy();
    const { box } = render('en', policy);
    expect(box, 'the dialog has its switch').toBeDefined();
    expect(box!.checked, 'cinematic at first: the switch is on').toBe(true);

    policy.choose('onboard');
    for (const phase of FLIGHT_PHASES) {
      expect(policy.onPhase(DEFAULT_CAMERA_PLAN[phase]), `${phase}: the picked view stays`).toBeNull();
    }
    expect(policy.owner, 'still manual after the last phase').toBe('manual');
    // reopened while manual, the dialog's switch shows it off
    expect(render('en', policy).box!.checked).toBe(false);

    // the dialog's switch hands the camera back to the programme
    const again = render('en', policy).box!;
    again.checked = true;
    again.fire('change');
    expect(policy.cinematic).toBe(true);
    for (const phase of FLIGHT_PHASES) expect(policy.onPhase(DEFAULT_CAMERA_PLAN[phase]), phase).toBe(DEFAULT_CAMERA_PLAN[phase]);

    // and so does the Cinematic button (`resumeCinematic` → `resume`)
    policy.choose('map');
    expect(policy.onPhase('space')).toBeNull();
    expect(policy.resume('space', 'map')).toBe('space');
    expect(policy.onPhase('exterior')).toBe('exterior');
  });
});
