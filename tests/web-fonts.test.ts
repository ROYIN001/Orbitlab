/**
 * The web fonts load in online mode only (roadmap S04; the owner,
 * 2026-09-26): offline, the page sends no request outside, fonts included.
 */
import { describe, expect, it } from 'vitest';
import { WEB_FONTS_URL, applyWebFonts } from '../src/ui/web-fonts';

/** Just enough of a document for the links in <head>. */
function fakeDocument() {
  const head: FakeNode[] = [];
  class FakeNode {
    rel = ''; href = ''; id = ''; crossOrigin: string | null = null; dataset: Record<string, string> = {};
    remove() { head.splice(head.indexOf(this), 1); }
  }
  const doc = {
    head: { append: (...nodes: FakeNode[]) => head.push(...nodes) },
    createElement: () => new FakeNode(),
    getElementById: (id: string) => head.find((n) => n.id === id) ?? null,
    querySelectorAll: () => head.filter((n) => 'webFonts' in n.dataset),
  };
  return { doc: doc as unknown as Document, head };
}

describe('web fonts (S04)', () => {
  it('are asked for online only, once, and dropped again offline', () => {
    const { doc, head } = fakeDocument();
    applyWebFonts('offline', doc);
    expect(head).toEqual([]);
    applyWebFonts('online', doc);
    applyWebFonts('online', doc);
    expect(head.map((n) => `${n.rel} ${n.href}`)).toEqual([
      'preconnect https://fonts.googleapis.com', 'preconnect https://fonts.gstatic.com', `stylesheet ${WEB_FONTS_URL}`]);
    applyWebFonts('offline', doc);
    expect(head).toEqual([]);
  });

  it('are not in the page itself', () => {
    const html = Object.values(import.meta.glob('../index.html', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)[0];
    expect(html).not.toMatch(/fonts\.(googleapis|gstatic)\.com/);
  });
});
