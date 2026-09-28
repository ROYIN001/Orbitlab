/**
 * A phone (390×844, touch): the Thai placement test and the Russian Orbit
 * engineer page fit the screen — the document never scrolls sideways (a strip
 * of tabs that scrolls inside itself is fine) — and every link of the section
 * and level switches is on the screen and has an accessible name in the page's
 * language even where the switch shows only its icon (audit 2026-09-27,
 * "ภาษาและมือถือ").
 *
 * The names are Chromium's own computed accessible names (the DevTools
 * accessibility tree), not the attributes they might come from.
 */
export const smoke = true;
export const timeoutMs = 240_000;

const PAGES = [
  { hash: '#/lessons/test', lang: 'th', script: /[฀-๿]/, what: 'the Thai placement test',
    isRight: () => document.body.dataset.lessonsPage === 'test' && document.documentElement.lang === 'th' },
  { hash: '#/orbit/engineer', lang: 'ru', script: /[Ѐ-ӿ]/, what: 'the Russian Orbit engineer page',
    isRight: () => location.hash === '#/orbit/engineer' && document.documentElement.lang === 'ru'
      && document.querySelector('#section-nav a[data-section="orbit"]')?.getAttribute('aria-current') === 'page' },
];

export default async function mobileSmoke(t) {
  for (const p of PAGES) {
    const app = await t.open({ hash: p.hash, lang: p.lang, viewport: 'mobile', touch: true });
    const { page } = app;
    const where = `${p.what} (${p.hash}, 390×844)`;
    const right = await page.waitForFunction(p.isRight, null, { timeout: 30_000 }).then(() => true, () => false);
    if (!t.check(right, `${where}: the page did not open (hash ${await page.evaluate(() => location.hash)}, lang ${await page.evaluate(() => document.documentElement.lang)})`)) continue;
    await page.evaluate(() => document.fonts?.ready);
    await page.waitForTimeout(1500); // the layout settles once the page's panels are filled in

    // 1. no horizontal overflow of the document: measured, and tried
    const overflow = await page.evaluate(() => {
      const se = document.scrollingElement;
      const y = scrollY;
      scrollTo(10_000, y);
      const scrolledX = scrollX;
      scrollTo(0, y);
      const vw = document.documentElement.clientWidth;
      // what sticks out, for the failure message: outermost elements past the right edge
      const out = [...document.querySelectorAll('body *')].filter((e) => {
        const r = e.getBoundingClientRect();
        if (r.width === 0 || r.right <= vw + 1) return false;
        for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
          const s = getComputedStyle(a);
          if (s.overflowX !== 'visible' || a.getBoundingClientRect().right > vw + 1) return false;
        }
        return true;
      }).slice(0, 5).map((e) => `${e.tagName.toLowerCase()}${e.id ? `#${e.id}` : ''}${[...e.classList].map((c) => `.${c}`).join('')} (right ${Math.round(e.getBoundingClientRect().right)} px)`);
      return { scrollWidth: se.scrollWidth, clientWidth: se.clientWidth, scrolledX, out };
    });
    t.check(overflow.scrollWidth <= overflow.clientWidth && overflow.scrolledX === 0,
      `${where}: the document scrolls sideways — ${overflow.scrollWidth} px wide in a ${overflow.clientWidth} px viewport, scrolls to x=${overflow.scrolledX}; sticking out: ${overflow.out.join(', ') || 'nothing found outside a clipping box'}`);

    // 2. every section/level link has a name, in the page's language, even with its text hidden
    const cdp = await app.context.newCDPSession(page);
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    for (const nav of ['#section-nav', '#mode-nav']) {
      const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: `${nav} a` });
      if (!t.check(nodeIds.length >= 3, `${where}: ${nav} has ${nodeIds.length} links`)) continue;
      const hrefs = await page.$$eval(`${nav} a`, (as) => as.map((a) => {
        const r = a.getBoundingClientRect();
        return { href: a.getAttribute('href'), textShown: a.innerText.replace(/[^\p{L}]/gu, '') !== '',
          onScreen: r.width > 0 && r.left >= -1 && r.right <= document.documentElement.clientWidth + 1, left: Math.round(r.left), right: Math.round(r.right) };
      }));
      // the page clips what does not fit (#app hides its overflow): a switch pushed past the edge would just vanish
      for (const h of hrefs) t.check(h.onScreen, `${where}: the ${nav} link to ${h.href} is not on the screen (${h.left}–${h.right} px of ${await page.evaluate(() => document.documentElement.clientWidth)})`);
      const names = [];
      for (const [i, nodeId] of nodeIds.entries()) {
        const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
        const ax = nodes[0];
        const name = (ax?.name?.value ?? '').trim();
        const link = `${nav} link to ${hrefs[i]?.href}${hrefs[i]?.textShown ? '' : ' (text hidden)'}`;
        names.push(name);
        if (!t.check(ax && !ax.ignored && ax.role?.value === 'link', `${where}: ${link} is not exposed as a link (role ${ax?.role?.value}, ignored ${ax?.ignored})`)) continue;
        if (!t.check(name !== '', `${where}: ${link} has no accessible name`)) continue;
        t.check(p.script.test(name), `${where}: ${link} is named "${name}", not in the page's language (${p.lang})`);
      }
      t.check(new Set(names).size === names.length, `${where}: ${nav} links share a name: ${names.join(' | ')}`);
      t.log(`${p.lang} ${nav}: ${names.map((n, i) => `${n}${hrefs[i]?.textShown ? '' : '*'}`).join(', ')} (* text hidden)`);
    }
    await app.shot(p.lang);
    app.checkErrors();
    await app.context.close();
  }
}
