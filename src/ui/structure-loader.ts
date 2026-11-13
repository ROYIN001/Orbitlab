/**
 * The Structure & Assembly section as the app holds it (owner, 2026-11-09;
 * docs/development/reports/structure-assembly-pilot.md): loaded the first
 * time it opens, as a chunk of its own, and given what it needs of the app
 * (`StructureEnv`) rather than importing it — so the app opens as before,
 * and the section's code arrives with the section.
 *
 * While the chunk loads the section's place says so; when it cannot be
 * loaded (offline before its first opening, a build replaced under an open
 * page) it says that, with a button to try again. A `show` asked meanwhile
 * is kept and done when the section arrives; a `hide` drops it.
 *
 * This file and src/structure-host are the app's side: they import the
 * section's files as types only (tests/structure-boundary.test.ts), apart
 * from the one dynamic import below.
 */
import { getLang, t } from '../i18n';
import { inflateAnatomy } from '../render/anatomy';
import { isCameraInputTarget, wheelZoomFactor } from '../render/gestures';
import { createWebGLRenderer } from '../render/webgl-renderer';
import { structureHandoff, type StructureAppHost } from '../structure-host/handoff';
import { POWER_ENV } from '../structure-host/power-env';
import type { StructureMode } from '../structure/progress';
import type { StructureModelId } from '../structure/types';
import { WorkspaceError } from '../workspace/repository';
import { registerWorkspaceFlush, workspaceStorage } from '../workspace/storage';
import { hashForRoute, route, type AppLevel, type AppPage, type AppRoute } from './app-mode';
import type { StructureEnv, StructureSection } from './structure/env';

/** The profile key of the section's one record (src/structure/progress.ts `STRUCTURE_STORE_KEY`; src/workspace/registry.ts lists it). */
export const STRUCTURE_PROFILE_KEY = 'orbitlab.structure.v1';

/** A model's activity as a page of the section: `<model>` for exploring, `<model>/<activity>` for the others (`pageOf`, src/ui/structure/models/index.ts). */
/** The catalogue vehicle the section has a model of (src/data/anatomy.ts: the Anatomy page it is made from is this vehicle's). */
export const STRUCTURE_VEHICLE = 'soyuz21b';
/** The address of that model in the section, at the depth nearest a level of the app (a plain link: the app is routed by its hash). */
export const structureHref = (mode: string, activity = ''): string =>
  `#/structure/${mode === 'explore' || mode === 'engineer' ? mode : 'watch'}/soyuz-st31${activity ? `/${activity}` : ''}`;

export const pageOf = (model: StructureModelId, mode: StructureMode): AppPage => (mode === 'explore' ? model : `${model}/${mode}`) as AppPage;

/** The model and activity a page of the section names (the app's router lets only the section's own pages reach here). */
export function fromPage(page: string | undefined): { model?: StructureModelId; mode?: StructureMode } {
  if (!page) return {};
  const [model, mode = 'explore'] = page.split('/');
  return { model: model as StructureModelId, mode: mode as StructureMode };
}

/** What the loader needs of the app: its navigation, and the doors the hand-off goes through. */
export interface StructureLoaderHost extends StructureAppHost {
  go(route: AppRoute): void;
}

/** The section's environment, from the app's own modules. */
export function structureEnv(host: StructureLoaderHost): StructureEnv {
  return {
    power: POWER_ENV,
    handoff: structureHandoff(host),
    storage: {
      read: () => {
        try { return workspaceStorage().getItem(STRUCTURE_PROFILE_KEY); } catch { return null; }
      },
      write: (text) => {
        try { workspaceStorage().setItem(STRUCTURE_PROFILE_KEY, text); return 'ok'; } catch (error) {
          // the profile refusing this tab's writes (the unavailable storage's own words, src/workspace/storage.ts, when no
          // learner is chosen), or the browser refusing the write
          const byProfile = (error instanceof WorkspaceError && (error.code === 'locked' || error.code === 'stale'))
            || (error instanceof Error && error.message === 'No learner profile selected');
          return byProfile ? 'readonly' : 'failed';
        }
      },
      onFlush: (save) => { registerWorkspaceFlush(save); },
    },
    gl: { createRenderer: createWebGLRenderer, isCameraInput: isCameraInputTarget, wheelZoom: wheelZoomFactor },
    inflate: inflateAnatomy,
    lang: getLang,
    words: { loadFailed: () => t('lesson.page.loadFailed'), reload: () => t('pwa.reload') },
    reload: () => location.reload(),
    href: (level, model, mode) => hashForRoute(route('structure', level, pageOf(model, mode))),
    go: (level, model, mode) => host.go(route('structure', level, pageOf(model, mode))),
  };
}

type Loaded = typeof import('./structure/structure');

/**
 * The page at this address can be had now: the browser says it is online, or
 * a worker stands ready to answer for the page from its own copy. (Asked of
 * the browser, not tried with a request of this file's own: the app fetches
 * only from the places its privacy page lists, tests/privacy-inventory.test.ts.)
 */
function pageReachable(): Promise<boolean> {
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false && !navigator.serviceWorker?.controller;
  return Promise.resolve(!offline);
}

export class StructureLoader {
  /** the section once its code has arrived (read by the browser journeys; null until then) */
  section: StructureSection | null = null;
  private loading = false;
  private failed = false;
  /** what to show once the section has arrived; null while it is off screen */
  private want: { level: AppLevel; model?: StructureModelId; mode?: StructureMode } | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly host: StructureLoaderHost,
    /** the section's chunk (a test gives its own) */
    private readonly load: () => Promise<Loaded> = () => import('./structure/structure'),
    /** load the page again, at the address it is on */
    private readonly reload: () => void = () => location.reload(),
    /** whether the page itself can be had now (a reload that cannot be answered would put the browser's error page in the app's place) */
    private readonly reachable: () => Promise<boolean> = pageReachable,
  ) {}

  /** Show the section at a level, on the page the address names (a model, or a model's activity), if it names one. */
  show(level: AppLevel, page?: string): void {
    const { model, mode } = fromPage(page);
    this.want = { level, model, mode };
    if (this.section) { this.section.show(level, model, mode); return; }
    if (this.failed) { this.note(); return; }
    this.bring();
  }

  hide(): void {
    this.want = null;
    this.section?.hide();
  }

  applyLanguage(): void {
    if (this.section) this.section.applyLanguage();
    else if (this.want) this.note();
  }

  onKey(e: KeyboardEvent): void { this.section?.onKey(e); }

  /**
   * Fetch the section's code and start it. `again`: a retry after a failure —
   * a browser keeps a module's failed fetch for the life of the page and
   * answers the same import with the same failure, so a retry that fails too
   * loads the page again, at this address (what the note asks for, and what
   * the lesson pages' own retry does) — but only when the page can be had:
   * with the network still down and no worker to answer, a reload would
   * replace the running app with the browser's error page, so the note
   * stays and the rest of the app goes on working.
   */
  private bring(again = false): void {
    if (this.loading) return;
    this.loading = true;
    this.failed = false;
    this.note();
    this.load().then((m) => {
      this.loading = false;
      // the section draws itself into its place (the note goes)
      this.section = m.createStructureSection(this.root, structureEnv(this.host));
      if (this.want) this.section.show(this.want.level, this.want.model, this.want.mode);
    }, () => {
      this.loading = false;
      this.failed = true;
      if (!again) { if (this.want) this.note(); return; }
      void this.reachable().then((yes) => {
        if (yes) this.reload();
        else if (this.want && this.failed) this.note();
      });
    });
  }

  /** The section's place while its code is on its way, or could not be had: over the scene, as the section is. */
  private note(): void {
    const box = document.createElement('div');
    box.style.cssText = 'position:absolute;inset:0;z-index:5;display:grid;place-content:center;justify-items:center;gap:12px;padding:24px;text-align:center;background:var(--bg);color:var(--muted)';
    const p = document.createElement('p');
    p.setAttribute('role', 'status');
    p.style.margin = '0';
    p.textContent = this.failed ? t('lesson.page.loadFailed') : `${t('section.structure')}: ${t('data.loading')}`;
    box.append(p);
    if (this.failed) {
      const again = document.createElement('button');
      again.type = 'button';
      again.className = 'btn';
      again.dataset.k = 'structure-retry';
      again.textContent = t('sky.retry');
      again.addEventListener('click', () => { this.failed = false; this.bring(true); });
      box.append(again);
    }
    this.root.replaceChildren(box);
  }
}
