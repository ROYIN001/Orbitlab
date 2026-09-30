/**
 * Who made Orbitlab and where the project lives, for the About dialog, the
 * footer's credit line and the landing page's signature. The same name and
 * handle as CITATION.cff and NOTICE.md. Proper names only: the words around
 * them are in the dictionaries (`about.*`, `app.footerCredit`, `home.credit*`).
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

/** The reference line CITATION.cff describes: author, title, version, year, repository; no version on a dev server. */
export function citation(version: string): string {
  const v = version === 'dev' ? '' : `, v${version}`;
  return `${developerLabel()}. Orbitlab${v}, ${COPYRIGHT_YEAR}. ${REPO_URL.replace(/^https:\/\//, '')}`;
}
