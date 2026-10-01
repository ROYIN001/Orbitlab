/**
 * The build stamp (plan S5): which version and commit this page is, shown in
 * the About dialog and the footer and as `<html data-build="…">` for a browser
 * harness. The build time and the data dates are in `build-info.json` beside
 * the page, not here, so the bundle of one commit is the same on every build.
 */
export interface BuildStamp {
  readonly version: string;
  readonly commit: string;
}

export const BUILD: BuildStamp = typeof __ORBITLAB_BUILD__ === 'undefined'
  ? { version: 'dev', commit: 'dev' }
  : __ORBITLAB_BUILD__;

/**
 * The build as one id, `<version>+<commit>` (roadmap T02; owner decision
 * 2026-09-29): what a lesson's record carries (`LessonRecord.app`), so the
 * instructor's re-check can tell a flight flown on another version of the
 * physics from one that was edited. It is the stamp above, from Vite's
 * `define`; `dev+dev` where the code runs without it.
 */
export function appBuildId(stamp: BuildStamp = BUILD): string {
  return `${stamp.version}+${stamp.commit}`;
}

/** Mark the document with the build (the About dialog and the footer show it). */
export function stampDocument(doc: Document = document): void {
  doc.documentElement.dataset.build = BUILD.commit;
}
