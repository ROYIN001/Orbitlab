/**
 * Who made Orbitlab and where the project lives, for the About dialog and the
 * footer's credit line. The same name and handle as CITATION.cff and
 * NOTICE.md. Proper names only: the words around them are in the dictionaries
 * (`about.*`, `app.footerCredit`).
 */
export const DEVELOPER = {
  name: 'Royin',
  handle: 'ROYIN001',
} as const;

/** The year of the copyright line; NOTICE.md says the same. */
export const COPYRIGHT_YEAR = 2026;

export const REPO_URL = 'https://github.com/ROYIN001/Orbitlab';
export const NOTICE_URL = `${REPO_URL}/blob/main/NOTICE.md`;
export const CITATION_URL = `${REPO_URL}/blob/main/CITATION.cff`;

/** "Royin (ROYIN001)" */
export function developerLabel(): string {
  return `${DEVELOPER.name} (${DEVELOPER.handle})`;
}

/** "v0.1.0" for a build, "dev" on a dev server, whose build stamp has no version. */
export function versionLabel(version: string): string {
  return version === 'dev' ? version : `v${version}`;
}
