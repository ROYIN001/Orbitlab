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

/** Mark the document with the build and put the commit in the top bar's version tag. */
export function stampDocument(doc: Document = document): void {
  doc.documentElement.dataset.build = BUILD.commit;
  const tag = doc.querySelector<HTMLElement>('#topbar .version');
  if (tag) tag.textContent = BUILD.commit;
}
