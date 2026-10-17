# Sky harness (not in the repo)

Run: `WT=<checkout> LABEL=<name> node node_modules/vite/bin/vite.js build --config vite.config.mjs` (builds `main.ts` against `<checkout>/src` into `out/<name>/`), then `node shoot.mjs <name> <checkout> <png-dir> [view …]` for the PNGs, or `node shoot.mjs --time <name> <checkout> <out.json> <frames> [view …]` for ms per frame of `SceneManager.render()`; `node app-time.mjs <name> <dist-dir> <checkout> <out.json> [frames]` times the production build (`npm run build`'s `dist/`) at four moments of a Falcon 9 flight, with the scattering sky and with `?sky=gradient`.

- `main.ts`: the app's `SceneManager` (and, near a pad, its `LaunchPadView`) with the app's Earth textures (`<checkout>/public/textures`), posed at the views in `VIEWS` (camera height, look direction, the sun over the camera's horizon); `window.shoot(view)` and `window.time(view, n)`.
- `shoot.mjs`: a static server and headless Chromium (SwiftShader, `/opt/pw-browsers/chromium` or `CHROMIUM`), 1280 × 720 at device pixel ratio 1.
- `pair.py`, `crop.py`, `diff.py`, `speckle.py`: before/after stacks, crops, pixel differences and isolated-pixel counts (`python3 -I`).
- `pair-time.mjs <A> <ckA> <B> <ckB> <out.json> <pairs> [view …]`: both builds in one browser, frames alternating A, B on the same view (the shared machine's load falls on both); `first-frame.mjs <A> <ckA> <B> <ckB> <rounds>`: a fresh page's first frame (programs compiled, tables filled).
- Probe fields of a view, not app states: `illum` forces the sky's and the haze's illuminance, `skyIllum` the sky pass's alone, `hazeIllum` the haze's alone; a build with `NOAERIAL=1` draws the globe and the clouds without the haze (the sky pass as it is).
- Numbers and logs of the runs: `../probes/sky/` (`timing/*.log`, `shoot-*.log`, `journeys*.log`).

Review round (fixes after the review):

- Views added in `main.ts`: `sun-space`, `sun-limb` (the sun from orbit), `pole-400` (white ice under a 20° sun), `alt-30km-nopad`, `alt-12km-nopad` (the climb views with no pad, so the globe itself fills the lower part), their `-haze33` probes, `ples-pad-dusk` (Plesetsk). `main.ts.v1` is the first round's.
- Builds used: `out/base` (WT = the base worktree), `out/fix2` (the final branch), `out/v1` (the branch before the review's fixes, from `git archive` into `../probes/sky/fix/v1-src`), `out/blend` (a probe: `../probes/sky/fix/blend-src`, the branch with the haze's light E·(1 − T) + 3.3·T, the climb's option (ค)).
- Shots: `../probes/sky/fix/shoot-all.sh`, `shoot-2.sh`; pixel figures: `python3 -I ../probes/sky/fix/measure.py`, `climb-metrics.py`; timing: `node pair-time.mjs base <base> fix2 <branch> out.json 16 <views>`, `node first-frame.mjs base <base> fix2 <branch> 4`. Logs in `../probes/sky/fix/`.

Question 2's option (ค) as a commit (`ws/sky-q2c`):

- Views added in `main.ts`: `alt-20km-nopad`, `alt-45km-nopad` (the 30 km no-pad view's place, look and sun at 20 and 45 km, the look tipped down by the horizon's dip).
- Builds: `out/q2c` (WT = the `ws/sky-q2c` worktree), `out/q2c-built` (`35dadab`, from `git archive` into `../probes/sky/q2c/built-src`), `out/q2c-before` (`7f991f9`, `../probes/sky/q2c/before-src`).
- Shots: `../probes/sky/q2c/shoot.sh`; side-by-side images and figures: `python3 -I ../probes/sky/q2c/compare.py` (log `compare.log`), row profiles `horizon-profile.log`. Output: `../sky-shots/q2c/`.
