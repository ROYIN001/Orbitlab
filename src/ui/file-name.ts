/**
 * A student's or a class's name as part of a file name (task W, Phase 4's
 * last check). Letters keep their marks: a Thai name's vowels and tones are
 * combining marks, not letters, and «สมชาย ใจดี» came out as
 * "orbitlab-สมชาย-ใจด-…" on a results file, «วิชัย» as "ว-ชัย". Letters,
 * their marks and digits stay; anything else between them becomes `sep`,
 * and none is left at either end.
 */
export function nameForFile(s: string, sep = '-'): string {
  const joined = s.normalize('NFC').replace(/[^\p{L}\p{M}\p{N}]+/gu, sep);
  return sep ? joined.split(sep).filter(Boolean).join(sep) : joined;
}
