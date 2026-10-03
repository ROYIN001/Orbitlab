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
export function bindWorkspaceStorage(storage: RawStorage | null, registerFlush: (flush: () => void | Promise<void>) => () => void,
  ownerToken: (write: boolean) => MediaOwner): void {
  bound = storage; register = registerFlush; owner = ownerToken;
}
