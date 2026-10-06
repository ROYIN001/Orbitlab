# G2 hold: a short scene is compact / ฉากเตี้ย ป้ายเหลือบรรทัดเดียว

```yaml
envelope: v2
package: G2 hold, follow-up to F5 — the overlays inside a short scene
step: 1
wave: K1
lane: U (+Q for the journeys)
items: [M-LAUNCH-002 (short-viewport case), M-LAUNCH-018 (G2 evidence)]
change_kind: layout (CSS + minimal JS); tests added first
owner_instruction: {date: 2026-10-06, where: "G2 card, question 'labels overlaid inside the scene when the scene is short'", option: compact, quote: "ฉากเตี้ยกว่า 380 px: ย่อป้ายให้เหลือบรรทัดเดียว และพับการ์ดเทเลเมทรีเป็นปุ่ม"}
base: claude/u-r2.1r-f5-s1 at a4ecb09 (PR #101, not merged)
depends_on: "#101 (G2/F5 scene floor; `data-short` on #viewport)"
```

## What was wrong

PR #101 gives the scene `--scene-min` and marks it `#viewport[data-short='true']`
when it is under 380 px (`SHORT_SCENE_PX`), where the narration keeps its
phase name only. The other overlays stayed as they are in a tall scene. At
1100×650 they were:

- the mission title block on three lines (eyebrow, vehicle / payload, the
  Build › Check › Launch › Result › Orbit steps), 65 px tall;
- the camera tabs, and the four tool buttons in a 152 px column;
- the floating telemetry card, 176×148 px;
- the phase name in 22 px type, on its own line under its eyebrow.

## What changed

Only under `#viewport[data-short='true']` (`src/style.css`, the block after
the narration rules):

- the mission title is one line: eyebrow and vehicle / payload side by side,
  cut with an ellipsis; the step chips are hidden;
- the narration's eyebrow and phase name are one line, the name at 80 %;
- the event ticker keeps its newest callout; the scene hint is hidden;
- the tool buttons go into a row beside the camera tabs, at 80 %, so a
  714 px Russian scene still has its tabs on one line;
- the floating telemetry card folds into a new tool button `.hud-fold`
  (`index.html`): `aria-controls="hud"`, `aria-expanded`, accessible name
  `hud.card` (Telemetry card / การ์ดเทเลเมทรี / Панель телеметрии), no new
  i18n keys. A press, Enter or Space opens the card over the scene
  (`#viewport[data-hud]`, `foldHud` in `src/main.ts`) until it is pressed
  again. Any change of the scene's size folds it again (`resize`), so it is
  never left open after a resize. A docked card is not over the scene, so the
  button shows only while `#hud` is inside the scene.

Nothing changes when the scene is 380 px or taller. The card's own behaviour
(`H`, `D`, drag, size) is unchanged. A card the user opens from the fold keeps
the size and place it had.

## Tests (failing first)

New check S6 in `tests/browser/scene-floor.mjs` (`checkSceneFloor`). It runs
in `r2-viewport-matrix` (Engineer) and `r2-viewport-scene-floor` (Explore)
whenever the scene is under 380 px:

- **S6a:** the union of the overlay boxes (`OVERLAYS`: title block, state
  badge, camera tabs, each tool button, ticker rows, narration, scene hint,
  card), each clipped to the scene, covers at most 25 % of the scene's area.
  The limit is a third for a scene under 700 px wide;
- **S6b:** the mission title block's text is on one line;
- **S6c:** a floating card is not drawn. A named button with
  `aria-controls="hud"` and `aria-expanded="false"` opens it by mouse, closes
  it by mouse, opens it with Enter and closes it with Space. The check leaves
  the card open, so the next short size checks that the resize folded it.

| Run | Result |
|---|---|
| `r2-viewport-scene-floor`, S6 on the base `a4ecb09` | **97 failures**: 24 S6a, 24 S6b, 48 S6c, 1 S1 (477.5 s) |
| `r2-viewport-matrix`, S6 on the base `a4ecb09` | **137 failures**: 22 S6a, 42 S6b, 72 S6c, 1 S1 (611.1 s) |
| `r2-viewport-scene-floor`, this branch | 1 failure, the same S1 as on the base (458.0 s) |
| `r2-viewport-matrix`, this branch | 1 failure, the same S1 as on the base (691.1 s) |
| `r2-shell-smoke`, this branch | passed (43.7 s) |

The S1 failure fails on the base in both journeys too. It is not from this
change: at 911×512 (150 % zoom on 1366×768), in Russian with the first-use
guide open, the scene starts at y 226 and 250 px of it is on the first screen,
against a minimum of 256 px. It is an open question for #101.

## Overlay share in short scenes

The union of the overlay boxes as a share of the scene, min–max over TH/EN/RU
and guide open/closed, from the journey logs. Before is the base `a4ecb09`,
after is this branch:

| Level and size | Before % | After % |
|---|---|---|
| Explore 1100×650 | 25.7–30.1 | 12.5–16.2 |
| Explore 1024×640 (125 % on 1280×800) | 28.8–33.8 | 14.1–17.9 |
| Explore 1093×614 (125 % on 1366×768) | 27.3–32.0 | 13.3–17.2 |
| Explore 911×512 (150 % on 1366×768), scene 601 px wide | 40.5–52.6 | 19.8–29.2 |
| Engineer 1100×650 | 20.3–23.8 | 9.9–12.8 |
| Engineer 1280×720 | 18.2–21.9 | 10.2–13.2 |
| Engineer 1024×640 | 22.2–26.0 | 10.9–14.0 |
| Engineer 1093×614 | 21.7–25.4 | 10.6–13.6 |
| Engineer 853×533 (150 % on 1280×800) | 26.9–30.5 | 13.3–17.1 |
| Engineer 911×512 | 28.3–33.7 | 15.3–19.7 |
| Engineer phone 320×740 (card docked) | 37.6–49.0 | 24.9–30.8 |

The boxes are what is drawn, not the bands they sit in. The owner's "about
half" of a 325 px scene at 1100×650 counts the bands: two rows of chrome at the
top, the card down the right, the narration at the foot. In a scene at least
700 px wide, every short case is at or under 18 % after the change. The two
narrower ones are the 601 px Explore scene and the 320 px phone. In the
601 px scene the Russian camera tabs wrap to two rows beside the tools. On
the phone the tabs wrap in every language (138×151 px in Russian). So they
are held to a third.

## Budget line

`node scripts/bundle-budget.mjs`, committed snapshots:

| Group | Base `a4ecb09` | This branch | Ceiling |
|---|---|---|---|
| precache code | 14 703.0 kB (14 703 016 B) | 14 703.9 kB (14 703 854 B) | 14 704 kB, unchanged |
| `index-*.css` | 176.6 kB (176 575 B) | 177.0 kB (176 984 B) | 177 kB |
| `index-*.js` | 2 621.5 kB (2 621 545 B) | 2 621.8 kB (2 621 806 B) | 2 622 kB |

That is +838 B in all (CSS +409 B, JS +261 B, `index.html` +168 B).
No ceiling is raised. The room left is 146 B of precache code and 16 B of
`index-*.css`. The next layout change to the CSS will need an offset (D-38).
To fit, the change reuses `hud.card` for the button's name instead of adding
keys. It also merges #101's narration rule into the new hide rule, and uses
`zoom: 0.8` for the tool buttons and the phase name.

## Screenshots

Not committed. Taken with a temporary journey (`zz-compact-shots.mjs`, git-
ignored), TH, guide closed, paused at T+40 s:
`/tmp/claude-0/-home-user-Orbitlab/f85185d5-f797-55c3-9547-d6ec255e7662/scratchpad/g2/compact/`.
Each file is `before-` or `after-`, then the level, the size preset and the
scene's size, at 1100×650 and at 911×512 (150 % zoom on 1366×768).
`after-…-card-open.png` shows the card opened from its button.

## Open questions

- The S1 failure above (Russian, guide open, 911×512) is on the base as well,
  for #101.
- `H` still cycles the card's mode while it is folded, and nothing is seen
  until the button opens it. Should `H` open the fold in a short scene?
- The tool buttons are in a row as asked. In a 601 px scene, a column would
  leave the Russian tabs on one line, at the cost of 160 px of the scene's
  right edge.
