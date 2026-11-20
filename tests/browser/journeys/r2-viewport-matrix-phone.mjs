/**
 * CO-3 (M-LAUNCH-019): r2-viewport-matrix's phone sizes, 390×844 and 320×740,
 * in phone contexts (touch, mobile viewport) booted in Russian, both missions,
 * every language and guide state. The checks and their open findings (F3 is a
 * phone one) are r2-viewport-matrix's: see that file.
 */
import { viewportMatrix } from './r2-viewport-matrix.mjs';

export const smoke = true;
// 160–345 s on CI before the split (26 runs of the whole journey, 2026-11-19): about 2× its slowest
export const timeoutMs = 720_000;

export default async function r2ViewportMatrixPhone(t) {
  await viewportMatrix(t, 'phone');
}
