/**
 * A stand-in for the app the Structure section runs in (`StructureEnv`,
 * src/ui/structure/env.ts) and the section's models with their content read
 * from public/structure, so the section's state, its pictures and what it
 * says of each thing can be tested without a browser
 * (tests/structure-store.test.ts, structure-picture.test.ts,
 * structure-content.test.ts).
 */
import { vi } from 'vitest';
import { inflateAnatomy } from '../src/render/anatomy';
import type { ViewerGl } from '../src/render/structure-viewer';
import { POWER_ENV } from '../src/structure-host/power-env';
import type { HandoffPreview, HandoffTarget, SatelliteRecord, SendResult } from '../src/structure/handoff';
import type { StructureMode } from '../src/structure/progress';
import type { Depth, StructureModelId } from '../src/structure/types';
import type { StructureEnv } from '../src/ui/structure/env';
import { makeAdapters, pageOf } from '../src/ui/structure/models/index';
import type { ModelAdapter } from '../src/ui/structure/models/types';
import { StructureStore } from '../src/ui/structure/store';

const load = (id: string): Promise<unknown> => import(/* @vite-ignore */ id);
const { readFileSync } = (await load('node:fs')) as { readFileSync(path: URL): { buffer: ArrayBuffer; byteOffset: number; byteLength: number } };
const bytesOf = (path: URL): ArrayBuffer => { const b = readFileSync(path); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };

export interface FakeApp {
  env: StructureEnv;
  /** the profile's one record for the section */
  stored: { text: string | null };
  /** how the profile answers a write, and how many it took */
  writes: { answer: 'ok' | 'readonly' | 'failed'; count: number };
  /** the addresses gone to, as `<level>/<page>` */
  went: string[];
  /** what was handed on */
  sent: { where: HandoffTarget; record: SatelliteRecord; level: Depth }[];
  /** what a send answers: a refusal, or handed over with (or without) a receipt of what was sent */
  send: { refuse: (SendResult & { ok: false }) | null; receipt: boolean };
  restore: { can: boolean; ok: boolean; count: number };
  /** the app flushing a learner's work (a profile switch, the page closing) */
  flush(): void;
  /** how many times the section asked for the page to be loaded again */
  reloads: number;
}

/** What the app's satellite model would make of a record, near enough for the section's own rules. */
export const previewOf = (r: SatelliteRecord): HandoffPreview => ({
  name: r.name, massKg: r.massKg, size: r.size, dragArea: r.size.width * r.size.depth, cd: 2.2, cr: 1.3,
  perigee: r.orbit.altitude, apogee: r.orbit.altitude, inclination: 97.4, sso: true,
});

export function fakeApp(stored: string | null = null): FakeApp {
  const flushers: (() => void)[] = [];
  const app: FakeApp = {
    stored: { text: stored }, writes: { answer: 'ok', count: 0 }, went: [], sent: [],
    send: { refuse: null, receipt: true }, restore: { can: false, ok: true, count: 0 }, reloads: 0,
    flush: () => { for (const f of flushers) f(); },
    env: {
      power: POWER_ENV,
      handoff: {
        preview: previewOf,
        send(where, record, level) {
          if (app.send.refuse) return app.send.refuse;
          app.sent.push({ where, record, level });
          const sent = previewOf(record);
          return { ok: true, sent, receipt: app.send.receipt ? { mass: sent.massKg, perigeeAlt: sent.perigee, apogeeAlt: sent.apogee, inclination: where === 'launch' ? 'sso' : sent.inclination, replaced: 0 } : null };
        },
        canRestoreLaunch: () => app.restore.can,
        restoreLaunch: () => { app.restore.count++; return app.restore.ok; },
      },
      storage: {
        read: () => app.stored.text,
        write(text) { app.writes.count++; if (app.writes.answer === 'ok') app.stored.text = text; return app.writes.answer; },
        onFlush(save) { flushers.push(save); },
      },
      gl: {} as ViewerGl,
      inflate: inflateAnatomy,
      lang: () => 'th',
      words: { loadFailed: () => 'the page could not be loaded', reload: () => 'reload' },
      reload: () => { app.reloads++; },
      href: (level: Depth, model: StructureModelId, mode: StructureMode) => `#/structure/${level}/${pageOf(model, mode)}`,
      go(level, model, mode) { app.went.push(`${level}/${pageOf(model, mode)}`); },
    },
  };
  return app;
}

/** The section's models with their content here: the rocket's read from public/structure as the browser would fetch it. */
export async function loadedAdapters(env: StructureEnv): Promise<Record<StructureModelId, ModelAdapter>> {
  vi.stubGlobal('document', { baseURI: 'http://structure.test/' });
  vi.stubGlobal('fetch', (url: URL | string) => Promise.resolve(new Response(bytesOf(new URL(`../public${new URL(String(url)).pathname}`, import.meta.url)))));
  try {
    const adapters = makeAdapters(env);
    for (const a of Object.values(adapters)) if (!a.ready()) await a.load(new AbortController().signal);
    return adapters;
  } finally {
    vi.unstubAllGlobals();
  }
}

/** A store on a fake app, its models loaded, opened at an address. */
export async function openStore(at: { level?: Depth; model?: StructureModelId; mode?: StructureMode } = {}, app: FakeApp = fakeApp()): Promise<{ store: StructureStore; app: FakeApp }> {
  const store = new StructureStore(app.env, await loadedAdapters(app.env));
  store.open(at.level ?? 'explore', at.model ?? 'soyuz-st31', at.mode ?? 'explore');
  return { store, app };
}
