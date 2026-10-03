/** Literal unfinished number text is work too; keep it separately from JSON's NaN → null encoding. */
import { workspaceStorage, registerWorkspaceFlush } from './storage';
import type { RawStorage } from './registry';
const KEY = 'orbitlab.numeric-drafts.v1';
interface NumericText { text: string; value: number | null }
interface NumericDrafts { v: 1; fields: Record<string, NumericText> }
interface CachedDrafts { data: NumericDrafts; pending: boolean }
const caches = new WeakMap<RawStorage, CachedDrafts>();
function cached(storage: RawStorage): CachedDrafts {
  const old = caches.get(storage); if (old) return old;
  let data: NumericDrafts = { v: 1, fields: {} };
  try {
    const raw: unknown = JSON.parse(storage.getItem(KEY) ?? 'null');
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const value = raw as Partial<NumericDrafts>;
      if (value.v === 1 && value.fields && typeof value.fields === 'object' && !Array.isArray(value.fields)) {
        const fields = Object.entries(value.fields).filter(([key, field]) => key.length <= 400 && field && typeof field.text === 'string'
          && field.text.length <= 1000 && (field.value === null || typeof field.value === 'number' && Number.isFinite(field.value)));
        if (fields.length <= 1000) data = { v: 1, fields: Object.fromEntries(fields) };
      }
    }
  } catch { /* malformed original bytes are preserved by the profile adapter on the next overwrite */ }
  const cache = { data, pending: false };
  caches.set(storage, cache);
  registerWorkspaceFlush(() => {
    if (!cache.pending) return;
    storage.setItem(KEY, JSON.stringify(cache.data)); cache.pending = false;
  });
  return cache;
}
const fieldKey = (scope: string, key: string): string => `${scope}\u0000${key}`;
export function rememberedNumericText(scope: string | undefined, key: string, value: number): string | null {
  if (!scope) return null;
  try {
    const saved = cached(workspaceStorage()).data.fields[fieldKey(scope, key)];
    return saved && (Number.isFinite(value) ? saved.value === value : saved.value === null) ? saved.text : null;
  } catch { return null; }
}
export function rememberNumericText(scope: string | undefined, key: string, text: string, value: number): void {
  if (!scope) return;
  const storage = workspaceStorage(), cache = cached(storage), data = cache.data, id = fieldKey(scope, key);
  if (id.length > 400 || text.length > 1000 || (!Object.hasOwn(data.fields, id) && Object.keys(data.fields).length >= 1000)) throw new Error('Numeric draft text limit reached');
  data.fields[id] = { text, value: Number.isFinite(value) ? value : null };
  cache.pending = true;
  try { storage.setItem(KEY, JSON.stringify(data)); cache.pending = false; } catch { /* transition hook retries strictly and keeps this visit open on failure */ }
}
