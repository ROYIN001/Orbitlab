/**
 * The web fonts, in online mode only (roadmap S04; the owner, 2026-09-26).
 *
 * DM Sans, Space Grotesk and Noto Sans Thai come from Google Fonts. Offline —
 * the default — the page asks for them no more than for any other outside
 * data, so a closed network sees no request leave at all, and the interface
 * uses the platform's own fonts: every family is declared with a system
 * fallback stack in style.css, and nothing is measured in a way that assumes
 * the web fonts loaded. Switching online adds the stylesheet; switching back
 * removes it, and the page returns to the system fonts.
 */
import type { DataMode } from '../provider/data-mode';

export const WEB_FONTS_URL = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700'
  + '&family=Space+Grotesk:wght@400;500;600;700&family=Noto+Sans+Thai:wght@400;500;600;700&display=swap';
const ID = 'web-fonts';

export function applyWebFonts(mode: DataMode, doc: Document = document): void {
  const present = doc.querySelectorAll(`link[data-web-fonts]`);
  if (mode !== 'online') { present.forEach((node) => node.remove()); return; }
  if (doc.getElementById(ID)) return;
  const link = (rel: string, href: string, crossorigin = false): HTMLLinkElement => {
    const node = doc.createElement('link');
    node.rel = rel;
    node.href = href;
    if (crossorigin) node.crossOrigin = '';
    node.dataset.webFonts = '';
    return node;
  };
  const sheet = link('stylesheet', WEB_FONTS_URL);
  sheet.id = ID;
  doc.head.append(link('preconnect', 'https://fonts.googleapis.com'), link('preconnect', 'https://fonts.gstatic.com', true), sheet);
}
