# T-offset step 1: lossless re-encode of the progressive Earth textures / บีบอัดภาพพื้นผิวโลกใหม่แบบไม่เสียข้อมูล

A named identical-output offset under D-38: the precache **code** group gets
smaller by 35.1 kB while every decoded pixel stays the same. No app code, no
`budgets.json`, no dependency.

```yaml
envelope: v2
package: T-offset
step: 1
family: EQ (identical-output offset under D-38)
wave: K1
lane: T
items: []            # no assignment.tsv row; a named D-38 offset for the precache code group
priority: P2         # no plan row of its own; as M-PLATFORM-033 (EQ-8), the plan's named precache-code offset
change_kind: identical-output
execution_authorized: true
owner_authorization: {date: 2026-10-05, quote: "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ ใช้ model opus5.5 high", scope: "D-65 K1"}
base_sha_verified_on: {sha: bdbfeff, date: 2026-10-06, recheck: "precache code 14723.0 kB against the 14724 kB ceiling; earth_*_4096.jpg progressive, earth_*_2048.jpg and lessons/vehicles/*.jpg baseline"}
allowed_write_paths: [public/textures/earth_atmos_4096.jpg, public/textures/earth_clouds_4096.jpg, public/textures/earth_lights_4096.jpg, scripts/jpeg-identical.mjs, tests/verification/jpeg-pixels.json, tests/verification/jpeg-pixels.test.mjs, changes/claude-t-tex-offset-s1.md, docs/development/reports/T-offset-s1.md]
oracle: [EO-PR-T-offset-1]   # RGBA SHA-256 (jpeg-js) + metadata SHA-256 recorded on bdbfeff: tests/verification/jpeg-pixels.json
failing_before_fix: none     # identical-output: the oracle is green on the base by design; sabotage below
perf_evidence: decode time per file, libjpeg-turbo 2.1.5 (best of 3 × 10)
rollback: {method: revert, data_compat: "no manifest format, cache-name or stored-data change; the three files get new revisions"}
reviewers: [second-agent, owner]
report: docs/development/reports/T-offset-s1.md
```

## Why

D-38: a ceiling rises only with a named identical-output offset. On `bdbfeff`
the precache code group measures **14723.0 kB** against its **14724 kB**
ceiling, so the next K1 package has about 1 kB of room. The precached
pictures are about 3.8 MB of that group. This step makes three of them
smaller without changing a pixel. The ceiling stays as it is: per S09 rule 9
the T lane lowers ceilings in its next ratchet PR. This PR only frees the room
and names it.

## What was tried, and what changed

Every precached JPEG (6 Earth textures, 11 vehicle photos) was run through
two lossless tools. Neither tool decodes to pixels. Both re-write the file's
own quantised DCT coefficients:

| Tool | Result |
|---|---|
| libjpeg-turbo 2.1.5 `jpegtran -copy all -optimize` | The 3 baseline textures and 11 photos come out **byte-identical**: their Huffman tables are already optimal. The 3 progressive textures come out as baseline and **larger** (+63.4, +54.2, +23.1 kB). Rejected. |
| the same with `-progressive` | The 3 progressive textures come out **byte-identical**: they are already libjpeg-turbo progressive output. |
| MozJPEG lossless optimiser (`mozjpeg-lossless-optimization` 1.3.2, `COPY_MARKERS.ALL`) | Chooses a better progressive scan layout. 3 progressive textures: **−35.1 kB**, still progressive. **Taken.** Making the baseline textures and photos progressive would save another 92.9 kB, but it would slow their decoding (below). **Not taken.** |

**Changed:** `public/textures/earth_atmos_4096.jpg`,
`earth_clouds_4096.jpg`, `earth_lights_4096.jpg`. All three stay progressive
(SOF2). The Huffman tables and the scan script change (10→9, 6→5 and 10→7
scans). The JFIF header, the frame header and the quantisation tables stay
the same. For atmos and lights, MozJPEG writes the two tables in one DQT
segment instead of two; the table values do not change. None of the three files carries Exif, XMP,
ICC or COM data, either before or after.

**Not changed, on purpose:**
- `earth_*_2048.jpg` and `lessons/vehicles/*.jpg` stay baseline. They are
  already Huffman-optimal. Making them progressive keeps the pixels
  identical (checked with jpeg-js, Chromium, djpeg and ImageMagick, 14/14
  files), but decoding gets slower: 2.2–3.2× for the 2048 textures, about
  +47 ms of decode at start-up on this machine, and about 1.3× for the
  photos. That is a speed
  trade-off, not identical output, so it would be a separate change kind
  and needs the owner's choice.
- `public/icons/*.png` are written by `scripts/icons.mjs` (`npm run icons`).
  An out-of-band optimisation would be undone the next time the icons are
  made.
- `public/home/*.webp` and `public/social/preview.jpg` are not precached
  (`ON_DEMAND_PREFIXES` in `src/pwa/manifest.ts`), so they are not part of
  the code group.

**Tools.** Each was a one-off run outside the repository. Nothing was
installed in `package.json`.
- MozJPEG: `pip install --target <scratch> mozjpeg-lossless-optimization==1.3.2`
  (PyPI wheel `cp311 manylinux`, SHA-256 `0e8939c5…e88d88`).
- Cross-checks: `jpegtran` and `djpeg` from the Ubuntu noble package
  `libjpeg-turbo-progs 2.1.5-2ubuntu2` (`apt-get download`, `.deb` SHA-256
  `5b1c4755…c67167a`), extracted with `dpkg -x`, plus the machine's
  ImageMagick 6.9.12.

## Proof that the output is identical

**1. Oracle on the base, checked in CI.** `tests/verification/jpeg-pixels.json`
was written on `bdbfeff` with
`node scripts/jpeg-identical.mjs --base bdbfeff --record <the three paths>`,
before the files changed (commit 1). It holds each file's RGBA SHA-256 from
jpeg-js and a metadata SHA-256: frame header without its SOF type,
quantisation tables, and every APPn, COM and DRI segment byte for byte.
`tests/verification/jpeg-pixels.test.mjs` checks the committed files against
it. It runs in CI's `node --test tests/verification/*.test.mjs`, about 3.5 s.
It was green on the base and is green after the change.

**2. Before and after, two decoders.**
`CHROMIUM=… node scripts/jpeg-identical.mjs --chromium` decodes the
`bdbfeff` bytes and the branch bytes of each changed file and compares the
RGBA buffers:

| file | bytes | scans | jpeg-js RGBA SHA-256 (before = after) | Chromium 141.0.7390.37 RGBA SHA-256 (before = after; `<img>`→2-D canvas = `createImageBitmap` without colour conversion = WebGL texture read back) |
|---|---|---|---|---|
| earth_atmos_4096.jpg | 1 026 393 → 1 015 606 (−10 787) | 10 → 9 | `be527d655f407b3e4a5b72aea42fd9d36dca3b325ad5fd3c57cea4050e060e13` | `a2bdbc03fb65958f2230b7c7907db386cdf07f542dd4c1fac6cd45e2d3c59d51` |
| earth_clouds_4096.jpg | 1 323 416 → 1 315 080 (−8 336) | 6 → 5 | `a0ebfabd1174c54752eddc2e81f457a152d2c639fb458e28101719fbd488dd11` | `8689652ecf9eb889ad5ff3aea1b9e7d1b44066bb205c88566b8af8fa5cec2c83` |
| earth_lights_4096.jpg | 401 947 → 385 947 (−16 000) | 10 → 7 | `117ae0fcd6ec4442f6e945b4c68ce4555002e2cb95dc65b418b93e4585fdcc6f` | `ca0c72693092fa4bc984d6092d91b9d65b536195a906d8f0dd6cb4d07e57ade1` |

The script prints "pixels and metadata identical" and exits with 0. Each
file gives one Chromium hash on all three paths, before and after. jpeg-js
and libjpeg-turbo differ from each other in rounding, so their hashes
differ. Each one is equal to itself before and after.

**3. Independent cross-checks (one-off, libjpeg-turbo 2.1.5).**

| file | coefficients (`jpegtran -copy none -optimize` of before = of after) | `djpeg -pnm` SHA-256 (before = after) | ImageMagick `rgba:` SHA-256 (before = after) |
|---|---|---|---|
| earth_atmos_4096 | equal `c29412ef4c7bf1c0…` | equal `a9b5d8fbd59800ac…` | equal `a2bdbc03fb65958f…` (= Chromium) |
| earth_clouds_4096 | equal `8527ef913a3da76b…` | equal `115395c4bdcdb29c…` | equal `8689652ecf9eb889…` (= Chromium) |
| earth_lights_4096 | equal `255115825c93ddb7…` | equal `3aae093d9fc69dd7…` | equal `ca0c72693092fa4b…` (= Chromium) |

The coefficient check re-writes both files as baseline with Huffman tables
computed from their coefficients. The two outputs are byte-identical, so the
quantised DCT coefficients are the same.

**4. Sabotage: the checks catch what they claim.**
- In the test file, on the smallest photo:
  - one quantisation value changed: the metadata hash and the pixels change;
  - one ICC byte changed: the metadata hash changes and the pixels do not
    (only the metadata check catches it);
  - one coded-data byte changed: the pixels change;
  - two DQT segments written as one: nothing changes (the regrouping
    MozJPEG does).
- By hand, outside the test file: `earth_lights_4096.jpg` re-encoded lossily
  with ImageMagick (`-quality 100 -interlace JPEG`, 729 429 bytes):
  - `jpeg-pixels.test.mjs` fails ("not ok 3", metadata hash
    `cf7a2b91…` ≠ `8b5529a1…`);
  - `jpeg-identical.mjs --chromium` reports 5 differences: metadata, jpeg-js
    `117ae0fc…` → `2f8110ba…`, and all three Chromium paths
    `ca0c7269…` → `d08f7213…`.
  - The file was then restored.

## Decode time (perf evidence; not a KPI claim)

libjpeg-turbo 2.1.5 `djpeg`, ms per decode, best of 3 runs × 10, this shared
4-CPU container:

| file | before | after | |
|---|---|---|---|
| earth_atmos_4096 | 89 | 93 | taken |
| earth_clouds_4096 | 87 | 73 | taken |
| earth_lights_4096 | 59 | 55 | taken |
| **sum of the three** | **235** | **221** | no slower |
| earth_atmos_2048 (baseline → progressive) | 13 | 36 | not taken |
| earth_normal_2048 (baseline → progressive) | 9 | 20 | not taken |
| earth_specular_2048 (baseline → progressive) | 6 | 19 | not taken |

In Chromium, `img.decode()` timings were noisier but showed no consistent
slowdown for the three taken files. Over two runs, each the median of 15:
atmos +9 % and −3 %, clouds −43 % and +8 %, lights −13 % and −27 %. The
rejected 2048 conversions were 2.3–2.7× slower (median of 7), and the photos
about 1.3× slower.

## Effect on installed apps

The three files get new content revisions. An installed app that updates to
this version downloads them once: 2 716 633 bytes. The other files are
copied from its older cache as before (`precache()` in `src/pwa/sw-core.ts`
reuses equal revisions). New installs download 35 123 bytes less.

## Measured (this container, `npx vite build`, committed snapshots)

| | `bdbfeff` (main) | this branch |
|---|---|---|
| `dist/textures/earth_*_4096.jpg` | 2 751 756 B | 2 716 633 B |
| precache code | 14723.0 kB | **14687.9 kB (−35.1)** |
| precache data/ | 1119.2 kB | 1119.2 kB |
| precache (total) | 15842.2 kB | 15807.1 kB |
| `index-*.css` | 177.0 kB | 177.0 kB |
| `index-*.js`, `i18n-*.js`, workers | unchanged | unchanged |
| `node scripts/bundle-budget.mjs` | ok | ok |

Budget line: **lowered** (usage). No ceiling changes; `budgets.json` is not
touched. The named offset is 35.1 kB of precache code.

## Tests run

| Command | Result |
|---|---|
| `node --test tests/verification/jpeg-pixels.test.mjs` on `bdbfeff` files (commit 1) | 7/7 passed |
| `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs` (branch) | 73/73 passed |
| `npx vitest run tests/repo-hygiene.test.ts tests/pwa.test.ts tests/bundle-budget.test.ts` | 37/37 passed |
| `npm run -s typecheck` | passed |
| `CHROMIUM=/opt/pw-browsers/chromium-1194/chrome-linux/chrome node scripts/jpeg-identical.mjs --chromium` | 3 changed, pixels and metadata identical, exit 0 |
| `CHROMIUM=… node tests/browser/run.mjs pwa-offline` | 1/1 passed (69 files precached, offline flight, reload onto the new version) |
| `npx vite build; node scripts/bundle-budget.mjs` | ok; precache code 14687.9 kB |

The full vitest suite was not run locally (shared 4-CPU machine); CI runs it
on push.

## Owner follow-up (not in this PR)

Making the baseline textures and photos progressive would free another
92.9 kB: 75.3 kB from `earth_*_2048.jpg` and 17.6 kB from the 11 photos.
The pixels are proven identical. The cost is slower decoding: about +47 ms
of CPU for the 2048 textures at start-up on this machine, and about +1.4 ms
per photo. That is a perf trade-off. If it is wanted, it would be its own
PR, of another change kind, with the owner's approval.

Docs touched: N/A. README, IMPLEMENTATION-STATUS and USER-GUIDE describe no
asset encoding that this changes.
