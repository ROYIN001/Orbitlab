/**
 * EO-PHY-6, the bitwise characterisation harness of R0.4 step 4
 * (M-PHYSICS-002; plan S07 §07.4 step 4 and §07.5). It writes down what the
 * physics computes today, bit for bit, so that an identical-output change
 * (EQ-9 Cowell allocations, EQ-10/EQ-11 throughput) can show it changes
 * nothing:
 *
 * - (a) `propagate()` cases, every number as its Float64 bit pattern in hex
 *   (tests/eo-phy-6/propagator.test.ts);
 * - (b) Apollo 11 point-mass from the TLI ignition to the entry interface:
 *   SHA-256 of `[t, r, v]` every second and of the event log, and the
 *   targeting results bit for bit (tests/eo-phy-6/apollo11.test.ts);
 * - (c) the number of `deriv` calls each propagator case makes — a measure
 *   for KPI-11, never an equality gate;
 * - (d) NRLMSISE-00 gives the same density for the same input whatever was
 *   called before it (tests/eo-phy-6/msis-order.test.ts).
 *
 * RECORDED on the CO-6 frozen base 5f9aa2e with Node 22.23.3, in a worktree
 * of that commit with this directory copied in (`EO_PHY_6_RECORD=1`, below),
 * and unchanged on main 007b039 (src/physics differs there only in
 * monte-carlo.ts's CSV helper, #123). Report:
 * docs/development/reports/R0.4-s4-physics-harness.md. Re-recording is not
 * an EQ change's to make: only R4.5's one validated re-baseline may (§07.5,
 * EO-PHY-6 row), and a re-record says why in this header, as D01's does.
 *
 * Hex, not decimal: it tells +0 from −0 (as `Object.is` does) and never
 * rounds. NaN is written `NaN`, by position, because its payload is not
 * specified (§07.4 step 4(a)).
 */

/** A Float64 as 16 hex digits of its bit pattern (big-endian); NaN as `NaN`. */
export function hex(x: number): string {
  if (Number.isNaN(x)) return 'NaN';
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, x);
  return view.getBigUint64(0).toString(16).padStart(16, '0');
}

/** Every number in `value`, however deep, as `hex`; strings, booleans and null as they are. */
export function hexDeep(value: unknown): unknown {
  if (typeof value === 'number') return hex(value);
  if (Array.isArray(value)) return value.map(hexDeep);
  if (value instanceof Float64Array) return [...value].map(hex);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, hexDeep(v)]));
  }
  return value;
}

/** SHA-256 of a text, 64 hex digits. */
export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Record mode: `EO_PHY_6_RECORD=1` writes the reference instead of comparing with it. */
export const RECORDING = import.meta.env.EO_PHY_6_RECORD === '1';

/** Writes a reference file (record mode only); node:fs by a dynamic import, since tsconfig types only vite/client. */
export async function writeReference(name: string, data: unknown): Promise<void> {
  const fs = (await import(/* @vite-ignore */ 'node:fs' as string)) as { writeFileSync(path: string, text: string): void };
  const path = new URL(`./ref/${name}`, import.meta.url);
  fs.writeFileSync(path.pathname, `${JSON.stringify(data, null, 1)}\n`);
}
