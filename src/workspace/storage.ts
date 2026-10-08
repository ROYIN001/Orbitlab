/** Lightweight adapter entrypoint: persistence modules do not import application bootstrap. */
import type { RawStorage } from './registry';
let bound: RawStorage | null | undefined;
let register: ((flush: () => void | Promise<void>) => () => void) | undefined;
export interface MediaOwner { profileId: string; epoch: number; durable: boolean; assert: () => void }
let owner: ((write: boolean) => MediaOwner) | undefined;
const unavailable: RawStorage = {
  getItem: () => null,
  setItem: () => { throw new Error('No learner profile selected'); },
  removeItem: () => { throw new Error('No learner profile selected'); },
};
export function workspaceStorage(): RawStorage { return bound === undefined ? localStorage : bound ?? unavailable; }
export function registerWorkspaceFlush(flush: () => void | Promise<void>): () => void { return register?.(flush) ?? (() => {}); }
export function workspaceOwner(write = true): MediaOwner | null { return owner?.(write) ?? null; }
const kept = new WeakMap<object, Map<object, unknown>>();
/**
 * M-LEARNING-004: the one view a page keeps for this document's workspace, made at its first opening (with its one
 * flusher) and given back at every later one, so an edit whose save failed is never left in an older copy to be
 * flushed over a newer edit. Keyed by the bound storage: a new binding starts afresh.
 */
export function keptForWorkspace<T>(page: object, make: () => T): T {
  let storage: object;
  try { storage = workspaceStorage(); } catch { storage = kept; }
  let pages = kept.get(storage);
  if (!pages) kept.set(storage, pages = new Map());
  if (!pages.has(page)) pages.set(page, make());
  return pages.get(page) as T;
}
export function bindWorkspaceStorage(storage: RawStorage | null, registerFlush: (flush: () => void | Promise<void>) => () => void,
  ownerToken: (write: boolean) => MediaOwner): void {
  bound = storage; register = registerFlush; owner = ownerToken;
}
