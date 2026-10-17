/**
 * The parts the owner has held back from the page (src/ui/held.ts), read from the
 * source so the journeys follow the switch: a journey that exports `held` (its
 * reason) is listed as held and not run (tests/browser/run.mjs), and journeys that
 * only touch a held part on the way skip that step while it is held.
 */
import { readFileSync } from 'node:fs';

export const TEACHER_TOOLS = /export const TEACHER_TOOLS = true\b/.test(readFileSync(new URL('../../src/ui/held.ts', import.meta.url), 'utf8'));
/** The reason a journey of the teaching tools is held, or null while they are shown. */
export const HELD_TEACHER = TEACHER_TOOLS ? null : 'the teaching tools are held back (owner, 2026-10-17; src/ui/held.ts)';
