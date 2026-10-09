## CHANGELOG

- Privacy (ED-INST-1, M-LEARNING-047): a privacy statement in Thai, English and Russian (`privacy.html`, linked from About, precached so it opens offline) lists everything Orbitlab keeps on the device (learner profiles, added recordings, offline caches) with how long it stays and how to delete it, and every host it contacts; `tests/privacy-inventory.test.ts` fails when the code gains a storage key, store, cache, host or sending API the page does not name. The service worker now opens a precached static page as itself instead of the app.

## PROGRESS

| ED-INST-1 step 1 (M-LEARNING-047, wave K1) | In PR; not merged; not published; text waits for the owner's approval | Static trilingual page `public/privacy.html` (precached, no script), About link, navigation route in `src/pwa/sw-core.ts`; inventory test (7 cases), second-agent review (no blocking finding, 17 of 17 claims confirmed) and journey `privacy-offline` (offline, three languages); budget: no ceiling raised, precache code +20.9 kB (room 26.0 → 5.1 kB), `index-*.js` +81 B, `i18n-*.js` +160 B | [report](docs/development/reports/ED-INST-1-s1-privacy.md) |
