# Redesign A, step 2, S5 — the Engineer flight wall (mockup F2) / ผนังควบคุมการบินในโหมดวิศวกร

The report for S5 of Redesign A step 2: the Engineer flight wall, in a pull
request of its own. By the owner's answer to row 3 (below), step 2 is two pull
requests. S4, the event-jump menu (R2.6, M-LAUNCH-062), comes first, with its
own report, [R2.6-event-jump.md](R2.6-event-jump.md). This one is stacked on
S4's branch and holds the wall only. Step 1 (S0–S3) is
[redesign-a.md](redesign-a.md). Its pull request, #223, was squash-merged into
main as `2eb9f0d3` on 2026-11-18 (below, "The owner's later words").

| Field | Value |
|---|---|
| Package | Redesign A (direction A "Mission Control"), step 2, S5: the flight wall of mockup F2. Change type: feature |
| Branch | `claude/u-redesign-a-s5`, **provisional**: named as [SESSION-PROTOCOL.md](../SESSION-PROTOCOL.md) §5 asks (`<agent>/<lane>-<package>-s<step>`); the owner has not approved it, and the other name considered is `claude/u-redesign-a-wall` (below, "Open for the owner"). Stacked on S4's branch `claude/u-redesign-a-step2`, which starts from main `2eb9f0d3`, the merge of #223, whose tree is that of step 1's last head `186dbbab`. This PR's commits: "Budget (D-38): index-*.js 2666.5 -> 2669.5, index-*.css 181.5 -> 182.5, i18n-*.js 1737.5 -> 1738.5, precache code 15192 -> 15197 kB for Redesign A step 2's flight wall (S5)", its part of the raise (below, "Budget"); "Redesign A (S5): the Engineer flight wall — system status and ground track", the wall's code; and these records. Until step 2 was split into two pull requests, the wall sat with S4 on `claude/u-redesign-a-step2`; once that branch is rewritten for S4, those earlier commits are on no branch |
| Fragment | [`changes/claude-u-redesign-a-s5.md`](../../../changes/claude-u-redesign-a-s5.md), this PR's one fragment, named for its branch (`changes/README.md`); it is renamed with the branch if the owner chooses another name. Step 2's fragment, `changes/claude-u-redesign-a-step2.md`, is S4's and holds S4 and the CI change only |
| Status | Not on its branch yet: until the owner answers on the name, its commits are kept on the session's working branch, `claude/friendly-keller-78iuc9`; no pull request yet: by rule 1 of the five rules ([HANDOVER-K2](../HANDOVER-K2.md)) it opens after S4's pull request merges, and the session opens it only when the owner asks (below, "The owner's later words"); not merged; not published |

## The owner's words (D-65)

The owner's authorization of Redesign A, in chat on **2026-11-05**, is quoted
verbatim in [redesign-a.md](redesign-a.md), "The owner's authorization
(D-65)".

On **2026-11-14**, after step 2 was proposed as the Engineer flight wall
(mockup F2) and the event-jump buttons in Explore (R2.6), the owner answered
in chat that the session could go ahead with the next step. Asked the same
day where step 2 should live, the owner chose a new branch, the recommended
option. The branch's name, `claude/u-redesign-a-step2`, was the session's; it
is now S4's. This PR's own branch follows from row 3 (two pull requests,
below), and its name was put to the owner with the questions of 2026-11-19 at
06:00:35Z (below, "Open for the owner", 1); the owner had not answered when
this record was written. The two answers of
2026-11-14 are given here by their meaning only, not quoted.

## The owner's answers of 2026-11-16 (rows 2, 3, 8, 9 and 12)

Owner, in chat, **2026-11-16** at 20:08:06Z, verbatim:

> "ทั้งหมด ก ครับ ยกเว้น ข้อ 4 5"

(All ก, except rows 4 and 5.) It answers a table of twelve rows the session
sent in chat on 2026-11-15 at 00:03:22Z, whose column ก was the recommended
option in every row. Row 1 is step 1's ([redesign-a.md](redesign-a.md)).
Rows 4 to 7, 10 and 11 are about the jump only and are recorded in the R2.6
report, among them rows 4 and 5, the two answered ข. Rows 2, 3 and 12
concern both pull requests; rows 8 and 9 the wall only. Its header and those
five rows, verbatim:

| # | เรื่อง | ก (แนะนำ) | ข |
|---|---|---|---|
| 2 | งบขนาดไฟล์ของขั้นที่ 2 (ตารางถัดไป) | อนุมัติเพดานใหม่ | ไม่อนุมัติ ต้องตัดโค้ด ซึ่งยังไม่มีทางที่วัดแล้ว |
| 3 | ส่งมอบขั้นที่ 2 | สอง PR: ปุ่มข้าม แล้วผนัง | PR เดียว 448 บรรทัด (เกณฑ์ราว 400) |
| 8 | ชุด "ทุกการ์ด" ไม่รวมการ์ดผนัง 2 ใบ | คงไว้ | รวมเข้าไป |
| 9 | การ์ดสถานะระบบมี 6 แถวจากข้อมูลที่บันทึกจริง ตัดไฟฟ้า สื่อสาร โครงสร้างที่แบบร่างมี | คงไว้ | บอกรายการที่อยากเพิ่ม |
| 12 | ข้อความใหม่ 19 ข้อความ (ไฟล์ที่ 8) | ใช้ตามนี้ | บอกคำที่ต้องแก้ |

None of the five is row 4 or 5, so each answer is **ก**. What each row says,
and what follows for the wall:

- **Row 2** (step 2's file-size budget, in the table after it: ก, approve the
  new ceilings; ข, do not approve, cut code, for which no measured way exists
  yet): **ก**. The approved ceilings and this PR's part of the raise are
  below, "Budget".
- **Row 3** (delivering step 2: ก, two PRs, the jump buttons, then the wall;
  ข, one PR of 448 lines, against a guideline of about 400): **ก**. The wall
  is this pull request of its own, after S4's. Nothing of S4 is in it.
- **Row 8** (the "All cards" set leaves out the two wall cards: ก, keep;
  ข, include them): **ก**. `PRESETS.all` keeps today's cards, so the default
  Engineer panel does not change. Choose cards can still tick the two.
- **Row 9** (the system-status card has six rows from recorded data only,
  without the electrical, comms and structure items the mockup has: ก, keep;
  ข, name the items to add): **ก**. The six rows stand; nothing without
  recorded data is added.
- **Row 12** (the 19 new strings of the eighth file: ก, use them as written;
  ข, name the words to change): **ก**. Six of the 19 are the wall's:
  `tel.cards.wall`, `wall.status`, `wall.separations`, `wall.warnings`,
  `wall.propellant` and `wall.enginesOff`. They stand as written in Thai and
  Russian. The session's message asked the owner to look at the Russian words
  in particular, the wall's name among them, verbatim: "ข้อ 12
  ขอให้ดูคำรัสเซียเป็นพิเศษ: «Аварийное спасение» (ยกเลิกการปล่อย),
  «Приземление СА», «Отказ ИИБ» และ «Пульт полёта»" (row 12: please look
  at the Russian words in particular). The other 13 strings are S4's.

The same message sent two pictures of the wall, verbatim: "ภาพ 5–6:
ผนังควบคุมการบิน แผนที่มีทวีปแล้ว และชื่อรัสเซีย «Пульт полёта»
แสดงครบในช่องเลือก" (pictures 5–6: the flight wall; the map now has its
continents, and the Russian name «Пульт полёта» shows in full in the select).

## The owner's later words

Owner, in chat, **2026-11-16** at 21:21:48Z, verbatim:

> "เอาตามที่คุณเสนอไว้ก่อนครับ ทำงานต่อเนื่องๆยาวไปได้เลยครับ"

(Go with what you proposed, for now; keep working, continuously.) Owner, in
chat, **2026-11-17** at 22:11:38Z, verbatim: "ทำต่อ" (Carry on.) The R2.6
report records both with the jump: the session read the first as taking its
proposal for the jump's new position, the Events ▾ menu.

For the wall: the session's message just before the first one (2026-11-16 at
20:22:47Z) listed the branch name for the wall's pull request among the
questions it would send later with pictures, verbatim "ชื่อ branch สำหรับ PR
ผนังควบคุมการบิน" (the branch name for the flight wall's PR). It proposed no
name, so the session does not read the reply as choosing one. The question
went after the pictures on 2026-11-19, as the eighth at 06:00:35Z.

Owner, in chat, **2026-11-18** at 22:06:03Z, verbatim:

> "งานที่เสร็จแล้ว merge ได้เลย"

(The work that is finished, go ahead and merge it.) The session's message
before it (21:57:43Z) put merging step 1's pull request #223 first among the
steps that are the owner's. The session read the reply as the go-ahead to
merge #223, which was finished and checked. Step 2 was not finished, so the
session does not read the words as covering step 2's pull requests, and it
opens each of them only when the owner asks. #223 was squash-merged into
main as `2eb9f0d3` at 22:07:42Z, and Pages run 44408512731 published it at
22:46:04Z. Main's tree equals that of step 1's last head `186dbbab`. S4's
branch, and so this one, start from it.

## Choices made in the session, not by the owner

- **The branch name** `claude/u-redesign-a-s5`, and the fragment named for it.
- **The split of the one D-38 approval between the two pull requests:** S4
  alone crosses all four ceilings, and S4's PR raises each only to S4's own
  measured size rounded up to the next 0.5 kB (2666.5, 181.5, 1737.5 and
  15192 kB); this PR raises the four from there to the approved values
  (below, "Budget").
- **The precache total** follows its two groups: 16586 → 16591 kB in S4's PR,
  16591 → 16596 kB in this one (below, "Budget").
- **Two things about the wall that none of the twelve rows asks:** the wall
  preset is not kept after a reload, so builds before this one keep a stored
  custom list (below, "What was built", Storage); and the mockup's tab strip
  is not built, so the Cards select stays the one control. Neither was put to
  the owner as a question before 2026-11-19 at 09:12:37Z (below, "Open for
  the owner", 5).

All four are open for the owner (below, "Open for the owner").

## What was built

Engineer's **Cards** select gains **Flight wall**, a preset that shows two new
cards: **System status** and **Ground track**. The comparison with the pinned
reference flight is not a card and stays under them, as today. Engineer then
shows F2's wall inside the existing two-column layout. F2's row of event
buttons under the scene is not built: after the owner's row 4 (ข, a new
position for the row) and the session's proposal that followed, the jump is
an **Events ▾** menu at the end of the playback row, in S4's pull request.
The mockup's tab strip is not built; the preset select stays the one control.

- **`src/ui/flight-wall.ts`** (new, no DOM): `wallChips(frame, events, spec)`
  gives six rows `{ key, level, text }`, levels `ok`, `warn`, `fail`, `idle`.
  It reads the frame at the timeline cursor and only the events with
  `t <= frame.t` (the replay cut); nothing reads the live run. Words and
  numbers come from the house helpers.
  - **Engines** (`hud.engines`): `engineLevels` through `formatEngineLevels`;
    "core" only beside the strap-ons; a no-break space before %. Level: the
    worst of `evt.engineOut` (warn), `evt.fdirEngineShutdown` (warn),
    `evt.thrustLoss` (fail) recorded so far; else `ok` while thrust is produced
    (a destroyed vehicle's 0 % strap-ons are idle); else `idle` with
    `wall.enginesOff` (off / ดับ / выключены; Thai ปิด read like a switched-off
    setting, a fix from the designer review of 2026-11-14).
  - **Phase** (`hud.phase`): the HUD's word for the frame; `fail` when the
    status is failed, else `idle`.
  - **Separations** (`wall.separations`): the count and the latest one's label,
    over fourteen separation keys (launcher, escape and capsule, Apollo; not
    `evt.debrisSeparated`, which repeats each one). Level: the worst of
    `evt.fairingStuck` (warn), `evt.stagingFailure` (fail), `evt.prematureSep`
    (fail); else `ok` if any; else `idle` "0".
  - **Warnings and faults** (`wall.warnings`): the count and latest label of
    warn and fail events; `fail`, `warn`, or `ok` with "none".
  - **Propellant, active stage** (`wall.propellant`): a whole percent in the
    language's number format, or "—"; always `idle`.
  - **Orbit** (`tel.cards.orbit`): in orbit or failed, the HUD's own note and
    level (`hudNote`, moved from `hud.ts` to `phase.ts` so both share it);
    otherwise the latest insertion event with its severity; otherwise `idle`
    "—". After a descent or a landing the row keeps the insertion event, so a
    flight that never reached orbit does not end with a green tick under
    "Orbit" (the same review).
- **Level is never colour alone:** a mark ✓ ▲ ✕ ● goes before the value from
  CSS (`content: '✓ ' / ''`, so screen readers skip it); the value holds the
  word only.
- **`src/ui/telemetry-layout.ts`:** `CARD_IDS` gains `status` and `track`;
  `PRESETS.wall = ['status', 'track']`; `PRESET_IDS` gains `wall` before
  `custom`. `PRESETS.all` stays today's cards, so the default Engineer panel
  does not change (row 8). Custom may tick the two new cards.
- **Storage:** builds before this one treat an unknown preset as unreadable and
  reset the custom list. So this build reads `wall` but never writes it
  (`storesLayout`, marked `shortcut:` in the code: store it one release after
  this reader has shipped). After a reload the earlier preset is back. No
  version bump. New card ids in a stored custom list are safe: older builds
  drop unknown ids.
- **Ground track:** a second `OrbitalMap` on a canvas the telemetry panel owns
  (kept across language rebuilds), made the first time its card has a size,
  drawn in the existing 0.5 s block from the frame-backed view; a hidden card
  is neither made nor drawn. `map.ts` exports `MAP_LEGEND` and takes
  `legend = true`; the main map draws as before. The card writes the legend as
  text under the canvas. The canvas has `role="img"` and an `aria-label`
  (`map.groundTrack`), reset on a language change. A new map drawn before its
  Earth picture loaded kept the bare grid on a page whose frames stop (the
  screenshots for the owner, paused, on a stepped clock); the map now repeats
  its last draw once the picture loads (the same review).
- **Engineer only:** Explore's simple-charts view hides the wall cards; Watch
  never draws them.
- **Strings (TH/EN/RU):** `tel.cards.wall` (Flight wall / ผนังควบคุมการบิน /
  Пульт полёта), `wall.status`, `wall.separations`, `wall.warnings`,
  `wall.propellant`, `wall.enginesOff`. The Russian name was
  'Экран управления полётом' until 2026-11-14, when it was found cut off in
  the closed select (below). Row 12 (ก) takes the six as written.
- **`docs/USER-GUIDE.md`:** the Cards paragraph names **All cards** and
  **Flight wall**, explains the marks, and says the wall is not kept after a
  reload.
- **`scripts/verification/change-map.json`:** `r2-flight-wall` in
  `flight-journeys`, and in `layout-journeys`, the set a style or
  translation change selects (`src/style.css` styles the wall's rows, their
  marks and the legend);
  `tests/flight-wall.test.ts` beside `telemetry-layout.test.ts` in the
  `replay`, `styles-layout` and `launch-ui` rules; the `launch-ui` reason
  names `flight-wall.ts`.
- **`tests/browser/shard-seconds.json`:** `r2-flight-wall` at 90 s (below,
  "CI shards").
- **`tests/browser/journeys/r2-event-jump.mjs`** (S4's journey): the two
  comment passages that name `r2-flight-wall`, which S4's pull request leaves
  out, come back. No check changes.

Not built, on purpose: the mockup items with no recorded data (electrical,
comms, structure and loads, "near plan", totals such as 3/3, predicted times, a
propellant warning level; row 9), the mockup's tab strip, a fix of the
comparison table's "at the end" rows in replay or its live source (known gaps,
unchanged).

## Measured in a browser

A scratch Playwright script (not committed), in the container's Inter, on a
scratch build of the old step-2 branch made on 2026-11-14, after the wall's
first review fixes and before step 2 was moved onto step 1's later commits (so
its step-1 files are older too). The wall's code changed after that build in
four places only, all on 2026-11-14: the idle engines word (the build still
shows `report.off`, ปิด), the Orbit-row rule, the picture redraw (the three
fixes of the designer review) and the short Russian name. It has not changed
since. The build also had the replaced row design under the scene, where S4
now has the menu at the end of the playback row. Engineer, the wall preset,
the guide closed, a stepped clock, the flight the page opens with. Twelve
situations: TH, EN and RU at 1440×900 and 1366×768 at T+2:55; TH on the pad
(T−00:10) and in orbit (T+11:40) at 1440×900; TH and RU at 390 and 320 px at
T+2:55. English was not measured at 390 or 320 px.

| What | Result |
|---|---|
| Status rows | Six in every situation; no label or value clipped; every label and value on one line |
| Values at T+2:55 (EN) | engines 100 %, ✓; phase Pitch programme, ●; separations 3 · Fairing, ✓; warnings none, ✓; propellant 39 %, ●; orbit —, ●. TH and RU the same values in their words |
| On the pad (TH) | engines ปิด (now ดับ), phase นับถอยหลัง, separations 0, warnings ไม่มี ✓, propellant 100 %, orbit — |
| In orbit, T+11:40 (TH) | engines off; phase เคลื่อนที่อิสระ; separations 6 · ปล่อยยานอวกาศ ✓; warnings ▲ 1 · ขอบเขตแบบจำลองอากาศพลศาสตร์; propellant 86 %; orbit วงโคจรจอด ✓ |
| Track canvas | 2 : 1 at the panel's width (296 × 148 px at 1440, 266 × 133 at 1366, 332 × 166 at 390, 262 × 131 at 320), drawn (63 to 274 distinct colours) |
| Legend | No item clipped, in every situation |
| Page width | No horizontal overflow of the page anywhere |
| `#telemetry` width | Overflows by 1 px only at Russian 320×740 (below) |
| Comparison and event log | Below the first screen of the panel in every situation: reached by scrolling |
| Play button and clock | In view at 1440 and 1366 px; at 390 and 320 px not in view at the measured scroll position (the panel scrolled into view) |

Source: the scratch file `scratchpad/step2/wb/rev/results.json`. These
situations were not measured again at this PR's head (below, "What was not
checked"); `r2-flight-wall` checks the rows, the legend, the page width and
the track's name at 390 and 320 px in TH and RU.

### The Russian wall name

Measured on 2026-11-14, in the container's Inter, on scratch builds of the old
step-2 branch. The closed Cards select is 200.6 px wide at 1366×768 and
196.6 px at 320×740 (10 px padding each side, 1 px borders). The old name,
169.6 px of text, needed 191.6 px before the arrow, so it was cut off.
`'tel.cards.wall'` in `src/i18n/ru.ts` is now 'Пульт полёта', 81.2 px of text,
about 103 px plus the arrow; scratch screenshots at both sizes show the whole
name beside the arrow. No other key, user doc or test names the wall in
Russian (the user guide is in English; tests use the value `'wall'`). These
widths are from Inter only, and were not measured again at this PR's head.

### Seen, not changed

- **1 px overflow at Russian 320×740.** The cause is neither the canvas nor
  `.wall-legend`: it is `.telemetry-heading .range-toggle`, the two Russian
  buttons "Вся миссия" (80.8 px) and "Выведение" (78.7 px), 170.5 px in all,
  ending at 308.19 px against the panel's inner right edge at 307 px.
  `#telemetry`'s scrollWidth is 295 against clientWidth 294 in the Orbit
  preset too, so it does not depend on the preset. These are from the same
  build of 2026-11-14, in the container's Inter, and were not measured again
  at this PR's head. The CSS of `.telemetry-heading` and `.range-toggle` on
  main `2eb9f0d3` is the same as at this PR's head. A one-line fix would wrap
  the toggle onto a second row or change the shared padding or gap: a design
  choice, not made here. Main was compared by its CSS only, not measured.
- **Stacked identical lines in `#ticker`.** A screenshot showed four identical
  lines, "T+01:58 แยกตัวสำเร็จ: บูสเตอร์บล็อก B/V/G/D" (Blok B/V/G/D boosters
  separated). `src/physics/sim/debris.ts` makes one debris body per strap-on
  booster, all named after the booster group; `src/physics/simulation.ts`
  gives each its own `evt.debrisSeparated`; `src/ui/hud.ts` `updateTicker`
  lists every event of the last 14 s of mission time, up to 4. So a real
  flight on the wall clock shows the same line several times at once, for about
  14 s of mission time, with the six-DOF (rigid) runtime and a booster group of
  more than one booster (the R-7 family: Soyuz, Vostok, Sputnik; count 4). It
  is on the published site and is not step-2 code (this PR changes only the
  HUD note rule in `hud.ts`). The session reported it and the next item to the
  owner with the table of 2026-11-15, verbatim: "ระหว่างตรวจผมเจอปัญหาสองอย่างที่มีอยู่บนเว็บปัจจุบัน
  ไม่ได้เกิดจากงานนี้และยังไม่ได้แก้: ข้อความ "แยกบูสเตอร์สำเร็จ" ขึ้นซ้ำ 4
  บรรทัดพร้อมกัน และป้ายปลายแกนเวลาของกราฟทับกัน" (while checking I found two
  problems on the current site, not caused by this work and not fixed: the
  line "booster separation complete" shows four times at once, and the end
  labels of the charts' time axis overlap). The message also said the session
  had tried to send both as separate suggested tasks, the tool had timed out,
  and it would send them again if asked.
- **The charts' time-axis end labels overlap.** In Launch, Explore and
  Engineer, on the telemetry panel's charts, the time axis's last tick label is
  drawn over the axis's unit label: "2:09" over "T+ (mm:ss)" in English,
  "(นาที:วินาที)" in Thai, "Т+ (мм:сс)" in Russian. Seen at 1280×720,
  1366×768 and 1440×900, replay paused at T+02:55 of the default Soyuz-2.1a
  flight, on every chart. It is on main too; it is not a step-2 change, and the
  wall preset hides the charts. Reported with the item above.

## Tests

- `tests/flight-wall.test.ts` (new, 11 cases): the pad, every row calm and in
  order; core and strap-ons through the engine-levels helper and the ascent
  phase word; no "core" when only the upper stage burns, 0 % engines idle; the
  replay cut; escape-capsule and Apollo separations; `engineOut` before and
  after its time; a stuck fairing and a fail event; the latest insertion while
  coasting; a failed frame states the HUD note, not the earlier parking orbit;
  after a landing the insertion event or the dash; propellant as a whole
  percent in every language.
- `tests/telemetry-layout.test.ts` (three new cases and one changed): the
  default is every card but the wall's, also as the fall-back for unreadable,
  unknown or newer data (changed); `wall` parses and shows exactly the two
  cards; `wall` is never written, every other layout is; a custom list stored
  by an older build parses unchanged.
- `tests/browser/journeys/r2-flight-wall.mjs` (new, `smoke = true`; leg (e) of
  `r2-event-jump` until that journey was split), Engineer. It starts where
  S4's `r2-event-jump` jumps to liftoff in the menu, and imports
  `liftoffJump`, `setLanguage` and `shortLabel` from it. The wall preset shows
  six status rows and a drawn ground track instead of the charts; the
  comparison, event log, play button and clock stay; TH and RU at 390 and
  320 px with no row, legend or page overflow, and the track named in that
  language; a hidden track canvas is not drawn and a language change keeps the
  same canvas; with the frames held from the track's first draw the canvas
  must not be the flat fill. By the journey's own comment, measured with the
  redraw fix, that last check separates the two versions: the four commonest
  colours are about 72 % of the canvas without the fix and about 14 % with it.
  The journey also reloads and checks that the earlier preset is back. That
  check cannot fail as written: the leg ends by choosing Orbit again, which is
  stored, before the reload, so Orbit comes back whether or not the wall was
  written. It has been so since the wall's review fixes of 2026-11-14, which
  added that last choice (below, "Follow-ups"). `tests/telemetry-layout.test.ts`
  covers `storesLayout`. `r2-flight-shell.mjs` is not changed.

`r2-flight-wall` ran on round 3's build: the build of this design's last
round of fixes before it was integrated as the two pull requests (2026-11-18).
That build's `src/` and `index.html` equal this PR's head but for comments (one
line in each of the three dictionaries and one comment in `style.css`), and its
four budget groups measure the same bytes as this PR's head (below, "Budget").
Its `r2-flight-wall.mjs` is this PR's, and the `r2-event-jump.mjs` it imports
from differs from this PR's in comments only. There, with those files, the
journey passed in every run: in the CI runners' font (DejaVu Sans) in 68.5,
75.6 and 68.0 s, in the container's Inter in 73.9, 63.9 and 75.7 s, and in
DejaVu Sans once more, in 137.7 s, in a run of round 3's re-review with
other runs loading the machine (a load average of 7 to 12). The journey
exports no `timeoutMs`, so its limit is the harness's 180 s default: that
run used 76.5 % of it and left 42.3 s. At this PR's head (neither the
journey nor a file it imports is among the journeys' last test changes;
below, "Checks at the S5 head"), it passed alone in 61.7 s in DejaVu Sans
and in 60.6 s in Inter (2026-11-19), about a third of its 180 s limit.

## Checks at the S5 head

Rows 2, 3, 5a and 5b ran on 2026-11-18, and rows 4 and 6 on 2026-11-19, on
this PR's tree before the journeys' last test changes, one browser at a
time. Those changes are S4's, all carried here (`r2-transport-fit-launch.mjs`,
a check of the room the 4 px gaps give; `r2-transport-fit-clock.mjs`, its
Engineer flight to the hour on the point-mass model; `r2-event-jump` in the
change map's layout set), and this PR's change-map line, `r2-flight-wall` in
that set (the R2.6 report, "Checks at this PR's head"); after them come two
edits to S4's two journeys that change no check, the guard's failure
message and a comment on (m)'s legs. That tree's `src/` and `index.html` are
this head's. The typecheck, the build and the budget read none of those
files, so rows 2, 5a and 5b hold at the head. The full vitest run, row 4,
reads them only through `tests/repo-hygiene.test.ts`: it scans the text of
every tracked script under `tests/` for a focused test (`.only(`) and the
size of every tracked file outside `public/` for one over 1 MB. The two
changed journeys hold no focused test, and the largest of the three files,
`change-map.json`, is 20,227 B, so neither scan trips, and row 4 holds at
the head. Rows 1 and 3 read the change map, row 3 the two journeys as well
(it imports every journey), and row 6 runs them. Row 1 ran at this PR's
head, and row 7 is rows 2 to 4 there. S4's two changed journeys' runs with
the changes follow the table.

| # | Command | Result |
|---|---|---|
| 1 | `select-checks.mjs` over S5's commits | At this PR's head (2026-11-19): 21 changed paths and the full set, as `budgets.json` reaches every gate: the four commands, all 363 unit files, all 52 journeys (the six held ones among them), the 34 heavy and the 6 six-DOF fleet files. A change to `src/style.css` or `src/i18n/en.ts` alone now selects `r2-flight-wall` too, through the layout set |
| 2 | `npm run -s typecheck` | passed |
| 3 | `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs` | 98 / 98. With the journeys' last test changes and this PR's change-map line, before the two later edits, 98 / 98 again |
| 4 | `npx vitest run` | 363 / 363 files, 10,885 / 10,885 tests |
| 5a | `npx vite build` | passed |
| 5b | `node scripts/bundle-budget.mjs` | ok under this PR's ceilings: `index-*.js` 2669.3 of 2669.5 kB, `index-*.css` 182.0 of 182.5, `i18n-*.js` 1738.2 of 1738.5, precache code 15196.9 of 15197, precache 16316.1 of 16596 (below, "Budget") |
| 6 | the browser journeys: all 46 that are not held in the CI runners' font (DejaVu Sans); `r2-flight-wall`, S4's four new journeys, `r2-viewport-matrix` and `r2-viewport-scene-floor` in Inter | All passed: 46 / 46 in DejaVu Sans and 7 / 7 in Inter (times below). The six held journeys were not run |
| 7 | Rows 2 to 4 at this PR's head | Passed on 2026-11-19 at this head's code and tests, before the last edits of these records: typecheck; 98 / 98; 363 / 363 files, 10,885 / 10,885 tests (1181.1 s). After those edits, the node tests (98 / 98) and eight vitest files (229 tests) passed again at this head, among them `tests/repo-hygiene.test.ts`, the one vitest file that reads these records and the one the change map runs for a Markdown change |

An earlier full run on this tree (2026-11-18, at nice 19 under a load average
of 9 to 14) had two tests time out at 5 s, in `tests/propagator.test.ts` and
`tests/watch-picked-speed.test.ts`, files this PR does not change; both files
passed alone (2 files, 32 tests), and both pass in row 4's run. The browser
inventory at this head is 46 journeys, 26 of them smoke (45 and 25 at S4's
head): `r2-flight-wall` is this PR's one new journey.

Row 6, each journey alone (local times, not CI's). In DejaVu Sans:
`r2-flight-wall` 61.7 s; S4's `r2-event-jump` 177.2 s, `r2-transport-fit`
82.8 s, `r2-transport-fit-launch` 187.2 s and `r2-transport-fit-clock`
171.4 s; `r2-viewport-matrix` 670.4 s, which logged the open finding F3
twice, not counted, as at S4's head; `r2-viewport-scene-floor` 286.5 s; and
the other 39 journeys from 11.0 s (`bench-a11y`) to 309.0 s
(`r7-cross-system`). In Inter: `r2-flight-wall` 60.6 s; S4's four 171.4,
84.5, 179.3 and 163.1 s; `r2-viewport-matrix` 661.9 s, no open finding
logged; `r2-viewport-scene-floor` 288.1 s.

With the journeys' last test changes, before the two later edits
(2026-11-19, with this head's checks): `r2-transport-fit-launch` passed
alone in 176.1 s in DejaVu Sans, 180.0 s in Inter and 176.7 s in Liberation
Sans, and `r2-transport-fit-clock` in 122.3 s in DejaVu Sans and 130.5 s in
Inter. Their journey files are this head's but for those two edits and, in
the 122.3 s run, the two flight times in `-clock`'s header comment, which
were filled in after it. After the edits, at this PR's head: `-launch`
passed in 177.5 s in DejaVu Sans and 182.4 s in Inter, and `-clock` in
128.2 and 126.6 s.

The journeys' last test changes were reviewed with their own runs and
probes (2026-11-19): ok, with no must-fix item. Its should items are in
the R2.6 report, "Reviews"; the one on this PR is that putting the change
map's line into both PRs' commits would conflict, as this PR edits the line
beside it: both edits were kept.

## Budget: this PR's part of the D-38 raise

The owner approved step 2's four ceilings once, in row 2 (above). They were
put to the owner in the table after the twelve rows, verbatim:

> เพดานที่เสนอในข้อ 2 (หน่วย kB) ขั้นที่ 2 เพิ่มขนาดรวม 10.3 kB:
>
> | กลุ่มไฟล์ | เพดานเดิม | วัดได้ | เพดานที่เสนอ | งานลดขนาดที่ระบุชื่อเพื่อชดเชย |
> |---|---|---|---|---|
> | index JS | 2665.0 | 2669.2 | 2669.5 | EQ-7 (M-PLATFORM-034) |
> | index CSS | 180.5 | 182.2 | 182.5 | EQ-13 (M-BUILD-027) |
> | i18n | 1737.0 | 1738.1 | 1738.5 | EQ-6 (M-PLATFORM-031) |
> | precache code | 15187.0 | 15196.6 | 15197.0 | EQ-8 (M-PLATFORM-033) |

(The ceilings proposed in row 2, in kB; step 2 adds 10.3 kB in all. Columns:
the file group, its old ceiling, the size measured, the proposed ceiling, the
named work that offsets it. Measured then for step 2 as one change: the
replaced row design, the wall, and a rule for short scenes since withdrawn.)

The session split that one raise between the two pull requests (its choice,
not the owner's; below, "Open for the owner"). S4's pull request raises each
group S4 crosses to S4's own measured size rounded up to the next 0.5 kB,
never above the approved value, and would leave a group S4 fits under at its
old ceiling. S4 alone crosses all four, so S4's pull request raises all four.
This pull request then raises each of the four from the ceiling S4's pull
request sets to the approved value, in its own budget commit before the wall's
code. The precache total follows its two groups.

| Group | On main `2eb9f0d3` | After S4's PR | After this PR | Named offset |
|---|---|---|---|---|
| `index-*.js` | 2665 kB | 2666.5 kB | **2669.5 kB** | EQ-7 M-PLATFORM-034 |
| `index-*.css` | 180.5 kB | 181.5 kB | **182.5 kB** | EQ-13 M-BUILD-027 |
| `i18n-*.js` | 1737 kB | 1737.5 kB | **1738.5 kB** | EQ-6 M-PLATFORM-031 |
| precache code | 15187 kB | 15192 kB | **15197 kB** | EQ-8 M-PLATFORM-033 |
| precache | 16586 kB | 16591 kB | **16596 kB**, its two groups' sum (data/ unchanged at 1399) | — |

Measured with `npx vite build`, then `node scripts/bundle-budget.mjs`, on
builds of S4's head and of this PR's head (2026-11-18):

| Group | S4's head | This PR's head | This PR's growth | Under this PR's ceiling |
|---|---|---|---|---|
| `index-*.js` | 2,666,048 B | 2,669,306 B | +3,258 B | 194 B |
| `index-*.css` | 181,077 B | 181,961 B | +884 B | 539 B |
| `i18n-*.js` | 1,737,353 B | 1,738,232 B | +879 B | 268 B |
| precache code | 15,191,874 B | 15,196,895 B | +5,021 B | 105 B |
| precache | 16,311,075 B | 16,316,096 B | +5,021 B | 279.9 kB |

This PR's head crosses each ceiling S4's pull request sets, by 2,806, 461, 732
and 4,895 B, so each needs this raise. Precache code's growth is the three
groups (3,258 + 884 + 879 = 5,021 B): `index.html` is 16,183 B at both heads.
The build writes the head's short hash, 8 characters, into `index-*.js` and
`recheck.worker-*.js`, so a rewritten commit of the same source, with a hash
of the same length, builds to the same sizes. `git diff` finds no change in
`src/` or `index.html` between the trees measured and the final S4 and S5
heads: the journeys' last test changes touch only `tests/` and `scripts/`,
and main `2eb9f0d3`, which the branches start from, has the tree of
`186dbbab`, on which the measured trees were built.
The build of step 1's code (the code of its last head `186dbbab`, whose tree
main `2eb9f0d3` has) measured 2,663,964 B, 180,416 B, 1,735,015 B and
15,186,254 B, so step 2 in all adds 5,342, 1,545, 3,217 and 10,641 B. The
session had told the owner on 2026-11-16 at 20:22:47Z that if the chosen
design did not fit, it would cut code or ask again, verbatim: "ความเสี่ยง:
ไฟล์ JS หลักเหลือที่ว่างใต้เพดานใหม่แค่ 0.3 kB ถ้าแบบที่เลือกใหญ่กว่านั้น
ผมต้องหาทางลดขนาดหรือขอเพดานเพิ่มจากคุณอีกครั้ง" (risk: the main JS file has
only 0.3 kB left under the new ceiling; if the chosen design is larger, I must
find a cut or ask you for a higher ceiling again). Step 2 fits the approved
values, `index-*.js` with 194 B to spare, so neither was needed.

**Budget line: raise, with D-38's four parts** (`budgets.json`, `_notes.set`
beside each group):

1. **Measured size:** the tables above. Each ceiling after this PR is the
   value the owner approved in row 2, which was the next 0.5 kB above the size
   measured for step 2 at the time (2669.2, 182.2, 1738.1 and 15196.6 kB).
2. **What grew it:** the Engineer flight wall (S5): `src/ui/flight-wall.ts`;
   the status and ground-track cards in `src/ui/telemetry.ts` and
   `src/ui/telemetry-layout.ts`; a second `OrbitalMap` drawn from
   `src/main.ts`, with `MAP_LEGEND` and the picture redraw in `src/ui/map.ts`;
   `hudNote` in `src/ui/phase.ts`; the wall's styles (`.wall`,
   `.wall-status`, `.wall-track`, `.wall-legend`); six keys in each of the
   three dictionaries. Precache code holds the three groups; this PR does not
   change `index.html`. S4's part of the growth is in S4's own part of the
   raise (the R2.6 report).
3. **Named identical-output offsets:** EQ-7 M-PLATFORM-034 (`index-*.js`),
   EQ-13 M-BUILD-027 (`index-*.css`), EQ-6 M-PLATFORM-031 (`i18n-*.js`), EQ-8
   M-PLATFORM-033 (precache code) (plan
   [S09](../plan/S09-eq-identical-output.md)), the ones put to the owner in
   row 2.
4. **Owner's approval:** in chat, **2026-11-16** at 20:08:06Z, "ทั้งหมด ก
   ครับ ยกเว้น ข้อ 4 5" (all ก, except rows 4 and 5), answering the twelve
   rows sent on 2026-11-15; row 2 is step 2's four ceilings with these
   offsets. It covers step 2's two raises, S4's part and this one, up to
   those values; it is not a standing raise.

The precache total follows its two groups, as at every earlier precache code
raise: `tests/bundle-budget.test.ts` holds code and data/ to no more than the
total. Every other ceiling is unchanged.

## D-25 size

D-25 asks for about 400 changed source lines per PR at most, or a written
reason the second reviewer agrees with. This PR's changed lines in `src/` and
`index.html`, by `git diff --numstat` from S4's head to this PR's head:
**+209 / −21, 230 lines**, in eleven files of `src/`; `index.html` is not
changed. With `tests/`, `scripts/` and `.github/`: **+482 / −36, 518
lines** (`tests/` +267 / −9, `scripts/` +6 / −6, `.github/` none).
Row 3 put the one-PR count to the owner: 448 source lines for step 2 as it was
then, with the replaced row design.

## CI shards: this PR's entry

The five browser shards and their table of CI seconds,
`tests/browser/shard-seconds.json`, come with S4's pull request; the R2.6
report has the section. A journey without an entry fails
`tests/browser/shard.test.mjs`, so this PR adds `r2-flight-wall` at 90 s. That
is an estimate: half of the harness's 180 s default (`DEFAULT_TIMEOUT_MS` in
`tests/browser/harness.mjs`), because the journey exports no `timeoutMs`. The
table's `_notes.source` names it among the entries CI has not timed yet. The
CI commit ("Redesign A (step 2): five browser shards in PR CI and Pages,
balanced by recorded CI seconds") modelled S4's journeys as they were then and
this one: PR CI's longest shard at 21.7–23.6 min of 25 with five balanced
shards, against 43.3–47.0 min with three in turn, and Pages' at 30.1–33.0 min
of 45, against 50.3–59.6 (two models: every journey at its slowest time; the
slowest runner seen × 1.25; step 2's journeys, which CI has not timed yet,
from their slowest local times on prototype builds of this design,
2026-11-18). Run again (2026-11-19) with step 2's five journeys at their
local times alone as at this PR's head (the slowest of
DejaVu Sans and Inter: `r2-event-jump` 177.2 s, `r2-transport-fit` 84.5 s,
`r2-transport-fit-launch` 182.4 s, `r2-transport-fit-clock` 128.2 s and
`r2-flight-wall` 61.7 s) on the same shard layouts, the models give PR CI's
longest shard 21.4–23.6 min with five balanced shards, against 41.4–45.3
min with three in turn, and Pages' 26.7–33.0 min, against 48.6–58.1.
No five-shard CI run has happened yet; the first ones run on S4's branch and
on this PR's once they are pushed. The 90 s is replaced by CI's median after
them (below, "Follow-ups").

## Rule 2

Rule 2 of the five rules ([HANDOVER-K2](../HANDOVER-K2.md)): a new or changed
journey runs 20 times on CI before merge. This PR's new journey is
`r2-flight-wall`. Its 20 runs have not run yet: they need CI on the pushed
branch, as step 1's did with a temporary commit, and run on this PR's branch.
The comment-only change to `r2-event-jump.mjs` changes no check; that
journey's 20 runs are S4's.

## Open for the owner

Nothing here is decided for the owner. Seven screenshots of step 2, one of
them of the wall (Engineer in Thai at 1440×900, taken on a build of this PR's
code), were sent to the owner in chat on 2026-11-19 at 05:59:57Z, and
thirteen questions on both PRs after them at 06:00:35Z, among them 1 to 4
below; 5 followed at 09:12:37Z, with the rest of S4's. The owner had not
answered when this record was written.

1. **The branch name.** Proposed: `claude/u-redesign-a-s5`, as
   SESSION-PROTOCOL.md §5 names a step's branch. The other name considered:
   `claude/u-redesign-a-wall`. The fragment's name follows the branch.
2. **The split of the D-38 raise:** S4's pull request raises the four groups
   to S4's own measured sizes rounded up to the next 0.5 kB (2666.5, 181.5,
   1737.5 and 15192 kB); this one raises them from there to the approved
   values. The session chose it so that each pull request carries its own
   measured size, as D-38 asks.
3. **The precache total,** 16586 → 16591 kB in S4's pull request and
   16591 → 16596 kB in this one. It follows the approved precache code
   ceiling, as at every earlier precache code raise; it is not one of the four
   numbers in row 2.
4. **Where the CI change goes:** whether the five browser shards stay in S4's
   pull request or get one of their own is open in the R2.6 report. This PR's
   one table entry needs the table either way.
5. **Two things about the wall that no row asked:** the wall preset is not
   kept after a reload (so builds before this one keep a stored custom list),
   and the mockup's tab strip is not built (the Cards select stays the one
   control).

## Follow-ups (none is fixed in this PR)

1. Stacked identical lines in `#ticker` (above, "Seen, not changed"); on the
   published site.
2. The charts' time-axis end labels overlap (above); on main.
3. `r2-flight-wall`'s reload check cannot fail as written (above, "Tests"). A
   check that can fail reloads while the wall preset is chosen.
4. The 1 px overflow of `#telemetry` at Russian 320×740, from the heading's
   range toggle (above).
5. Replace `r2-flight-wall`'s 90 s estimate in `shard-seconds.json` with CI's
   median after the first five-shard runs, with S4's estimates.

## What was not checked

- The twelve-situation browser measurement and the Russian name's widths at
  this PR's head: both are from builds of 2026-11-14, in Inter (above).
  `r2-flight-wall` checks the rows, the legend, the page width and the track's
  name at 390 and 320 px in TH and RU.
- The 20 CI runs of rule 2 for `r2-flight-wall` (above).
- A sabotage of the six rows in the journey (for example a wrong replay cut):
  not known whether one was run; the unit tests cover the cut.
- A sabotage of the reload check: it cannot fail as written (follow-up 3).
- Whether the comparison and the event log sitting below the first screen of
  the panel in the wall preset is acceptable: not judged.
- The 1 px overflow at Russian 320 px on main (compared by CSS only).
- Older builds reading a stored layout written by this build, in a real
  browser: covered by the unit test of a stored custom list, not by a journey.
- Screenshots: the owner was sent two pictures of the wall on 2026-11-15
  (above), and seven of step 2 on 2026-11-19, one of them of the wall; the
  owner's answers were not in when this record was written.
- Screen-reader output of the marks and of the track canvas's label: not
  checked with a screen reader.
- `npm run test:heavy` and `npm run test:sixdof-fleet`, the 6 held journeys,
  and CI-equivalent runs.
