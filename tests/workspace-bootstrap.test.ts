import { afterEach, describe, expect, it, vi } from 'vitest';
import { initializeWorkspace } from '../src/workspace/session';
import { workspaceStorage } from '../src/workspace/storage';
import { PROFILE_CATALOG_KEY } from '../src/workspace/repository';
let restore: (() => void) | null = null;
afterEach(() => { restore?.(); restore = null; vi.unstubAllGlobals(); });
function rejectGetter(name: 'localStorage' | 'sessionStorage') {
  const original = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, { configurable: true, get() { throw new Error('Storage getter denied'); } });
  restore = () => { if (original) Object.defineProperty(globalThis, name, original); else Reflect.deleteProperty(globalThis, name); };
}
function memory() {
  const values = new Map<string, string>();
  return { values, getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); } };
}
describe('browser workspace bootstrap fallback', () => {
  it('labels memory storage temporary even when navigator exposes Web Locks', async () => {
    rejectGetter('localStorage'); vi.stubGlobal('sessionStorage', memory());
    const request = vi.fn(); vi.stubGlobal('navigator', { locks: { request } });
    const repo = await initializeWorkspace();
    expect(repo.status).toBe('ephemeral'); expect(request).not.toHaveBeenCalled(); repo.close();
  });
  it('retains readable disk work in a temporary copy when session storage is blocked', async () => {
    const disk = memory(); disk.values.set('orbitlab.mission', 'readable original'); vi.stubGlobal('localStorage', disk);
    rejectGetter('sessionStorage'); vi.stubGlobal('navigator', { locks: { request: vi.fn() } });
    const repo = await initializeWorkspace(); expect(repo.status).toBe('ephemeral');
    expect(workspaceStorage().getItem('orbitlab.mission')).toBe('readable original');
    workspaceStorage().setItem('orbitlab.mission', 'visit-only edit');
    expect(disk.values.get('orbitlab.mission')).toBe('readable original'); expect(disk.values.has(PROFILE_CATALOG_KEY)).toBe(false); repo.close();
  });
});
