# Redesign A, step 2, S5 — the Engineer flight wall (mockup F2) / ผนังควบคุมการบินในโหมดวิศวกร

The report for S5 of Redesign A step 2: the Engineer flight wall, in a pull
request of its own. By the owner's answer to row 3 (below), step 2 is two pull
requests. S4, the event-jump menu (R2.6, M-LAUNCH-062), came first, as
[#224](https://github.com/ROYIN001/Orbitlab/pull/224), merged on 2026-11-19,
with its own report, [R2.6-event-jump.md](R2.6-event-jump.md). This one holds the wall
only. It was written stacked on S4's branch, and its branch starts from main
after #224's merge (below, "After #224's merge"). Step 1 (S0–S3) is
[redesign-a.md](redesign-a.md). Its pull request, #223, was squash-merged into
main as `2eb9f0d3` on 2026-11-18 (below, "The owner's later words").

In this report "question N" is one of the nineteen questions sent to the owner
on 2026-11-19, by that day's number, 1 to 19 (below, "The owner's words of
2026-11-19"). "The stacked head" is this PR's head as it was before the
rebase: its three commits on the four commits #224 opened on, as pushed to
`claude/friendly-keller-78iuc9` on 2026-11-19. Where the report gives a local
result, a size or a count of lines, "this PR's head" is the stacked head
(below, "Checks at the S5 head"). By "rule 2's 20 CI runs" the report means
20 runs of each new or changed journey on CI, not 20 CI runs (below, "Rule
2"). "The head the PR opened with" is the last of those three commits after
the rebase onto main. "The reload commit" is the test-only commit made after
the PR opened (the header, "Branch"). Times are UTC.

| Field | Value |
|---|---|
| Package | Redesign A (direction A "Mission Control"), step 2, S5: the flight wall of mockup F2. Change type: feature |
| Branch | `claude/u-redesign-a-s5`, named as [SESSION-PROTOCOL.md](../SESSION-PROTOCOL.md) §5 asks (`<agent>/<lane>-<package>-s<step>`). The name went to the owner as question 8, with `claude/u-redesign-a-wall` as the other option. It is taken as ก of that question, on the owner's answer of 2026-11-19 as the session read it (below, "The owner's words of 2026-11-19"); the owner did not name the branch in words of their own. The branch starts from main after #224's merge: `0f33d9fc`, #224's squash merge, of 2026-11-19 at 18:59:31Z (below, "After #224's merge: the rebase and this pull request"). So it is not stacked on an open PR's branch (rule 1 of the five rules, [HANDOVER-K2](../HANDOVER-K2.md)). Before the rebase its commits sat on the four commits #224 opened on, on `claude/friendly-keller-78iuc9`: the stacked head, which starts from main `2eb9f0d3`, the merge of #223, whose tree is that of step 1's last head `186dbbab`. This PR's first three commits, by subject: "Budget (D-38): index-*.js 2666.5 -> 2669.5, index-*.css 181.5 -> 182.5, i18n-*.js 1737.5 -> 1738.5, precache code 15192 -> 15197 kB for Redesign A step 2's flight wall (S5)", its part of the raise (below, "Budget"); "Redesign A (S5): the Engineer flight wall — system status and ground track", the wall's code; and "Redesign A (S5): records — the flight wall's report, the guide's Flight wall, and the wall's own fragment". The pull request opened on those three. After them, by subject: "Redesign A (S5): r2-flight-wall's reload check can fail — the wall is the choice at the reload", a test-only commit that makes the journey's reload check able to fail (below, "The reload check made able to fail"); "TEMPORARY (rule 2 evidence, reverted before merge): CI's smoke shards run only S5's two journeys, 10 of each a run", rule 2's temporary commit, pushed together with it; that commit's revert, pushed alone (below, "Rule 2"); and then "Redesign A (S5): records — the owner's answer and order of 2026-11-19, the rebase onto #224's merge, and rule 2's CI runs", which brings these records up to date and is the head that merges. Until step 2 was split into two pull requests, the wall sat with S4 on `claude/u-redesign-a-step2`; that branch was rewritten for S4 before #224 opened, so those earlier commits are on no branch |
| Fragment | [`changes/claude-u-redesign-a-s5.md`](https://github.com/ROYIN001/Orbitlab/blob/359cf6be1c9e7569d38b0800bbfcfe51952a6c68/changes/claude-u-redesign-a-s5.md), this PR's one fragment, named for its branch (`changes/README.md`). Step 2's other fragment, `changes/claude-u-redesign-a-step2.md`, is S4's, in #224, and holds S4 and the CI change only (2026-11-19: the records PR after #225 folded both fragments into `CHANGELOG.md` and `docs/development/PROGRESS.md` and deleted them; the link to this PR's fragment now goes to the file as it was on main at `359cf6be`.) |
| Status | Pull request [#225](https://github.com/ROYIN001/Orbitlab/pull/225), opened as a draft on 2026-11-19 at 19:08:41Z, on base main `0f33d9fc`. It opened after #224 merged (rule 1), on the owner's order of 2026-11-19 at 15:57:39Z, "เปิดPR แล้วmerge งานที่เหลือให้เรียบร้อย" (open the PR, then merge the remaining work, all the way to done), as the session read it (below, "The order to open and merge (15:57:39Z)"). By the same reading it merges on that order, without a second question, when it is ready by the repository's rules: rule 2's 20 CI runs of each of its two journeys, the temporary commit reverted, CI green on the head that merges, and these records in the PR. At 16:31:25Z the session told the owner one more condition: a CI run that takes the journey `r2-viewport-matrix` past 17 minutes, or out of time, stops the merge (the same section). Rule 2 is done: each of the two journeys passed 20 of 20 runs on CI, and the temporary commit is reverted (below, "Rule 2"). The result of CI on the reverted head is in that section ("CI on the reverted head"). This records commit comes after that run, and it is the head that merges. As it is made the PR is a draft, not merged and not published. It waits for CI on this commit. Then the session tells the owner the head and what it holds, marks the PR ready, and squash-merges on the owner's order of 15:57:39Z. Until then the owner can stop the merge by a message (2026-11-19, the records PR after #225: #225 was squash-merged at 22:56:13Z as `359cf6be`, a tree identical to its final head `375b850c` (CI run 44629661945, 12 of 12 jobs), on the owner's order of 15:57:39Z as the session read it. Pages run 44633189245 published it at 23:24:56Z, and the live site's `build-info.json` gave the commit `359cf6b` at 23:26:43Z. Lines below that call this PR a draft, not merged or not published describe the time before.) |
| Next | The records PR, which folds the fragments of #223, #224 and this PR into `CHANGELOG.md` and `PROGRESS.md` and writes the rows of `docs/DECISIONS.md` (below, "Follow-ups", 8). At 21:18:11Z the session told the owner that it counts that PR as part of the work to finish, and that a word from the owner drops it. The split of the journey `r2-viewport-matrix` is not next. At 16:31:25Z the session had told the owner that it would be the first work after S5. The owner wrote at 21:17:43Z, "ทำต่อให้จบแล้วยังไม่ต้องเปิดงานใหม่เพิ่มครับ" (carry on to the end, and do not open any more new work for now). At 21:18:11Z the session told the owner that it opens no branch and no PR for the split (below, "After the order: the chat up to this records commit"). Both are the session's reading of that message, not the owner's words: the message names neither the records PR nor the split. The split stays the R2.6 report's follow-up 10 |

## The owner's words (D-65)

The owner's authorization of Redesign A, in chat on **2026-11-05**, is quoted
verbatim in [redesign-a.md](redesign-a.md), "The owner's authorization
(D-65)".

Owner, in chat, **2026-11-14** at 13:58:03Z, verbatim:

> "ได้เลยครับ ทำขั้นถัดไปต่อได้เลย"

(Yes, go ahead with the next step.) It answered the session's proposal of step
2: the Engineer flight wall (mockup F2) and the event-jump buttons (R2.6). The
proposal's own text is not preserved. What it held is known from the
session's own summary of the conversation, written that day at 20:07:04Z, and
not from a chat event.

Owner, the same day at 13:59:20Z, by choosing an option in a question dialog,
verbatim:

> "แยก branch ใหม่ (แนะนำ)"

(A separate new branch (recommended).) The dialog's question is preserved
only in its last words,
"…er-78iuc9 ซึ่งมีงานขั้นที่ 1 อยู่แล้ว"
(…er-78iuc9, which already holds step 1's work), so its full text and the
other option's wording are not known. By the option chosen and those last
words, it asked which branch step 2 should be on, and the other option was to
keep step 2 on the branch that held step 1, `claude/friendly-keller-78iuc9`.
The new branch's name, `claude/u-redesign-a-step2`, was the session's; it is
S4's. This PR's own branch follows from row 3 (two pull requests, below), and
took its name on 2026-11-19 (question 8, below).

Where these words survive. As read on 2026-11-19, the session's transcript
starts at 2026-11-14T19:11:11Z, so the chat events of that afternoon are no
longer in it. What is left is the output of the session's own search of the
transcript, run on 2026-11-14 at 21:12:58Z, when they were still in it. For
each of seven key phrases it printed the first of the owner's messages that
held the phrase: the message's own time and its text, from 40 characters
before the phrase to 200 characters after the phrase's start, with line
breaks printed as spaces. So it printed seven lines. The two quotes above are
its lines for 13:58:03Z and 13:59:20Z. The 40 characters are why the dialog's
question is cut. Neither line reaches the 200 characters, so neither quote is
cut at its end. Three more are of that afternoon: the owner's answer on step
1 at 13:55:16Z, quoted in
[redesign-a.md](redesign-a.md), and two messages, at 14:00:48Z and 14:02:13Z,
about how the session works, not about the product. The other two are of
2026-11-04 and 2026-11-05; the second is the authorization that
[redesign-a.md](redesign-a.md) quotes.

The wall is not an item of the plan: neither the plan's sections nor
`docs/development/registry.tsv` name it. So no wave's authorization covers
it, as the rules review of 2026-11-19 noted (below, "The check after the
answer"). What this report has for D-65 is the authorization of Redesign A of
2026-11-05 and the words of 2026-11-14 above. It records them; how they are
read under D-65 is the owner's.

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

Eight files had gone to the owner just before that message, sent on
2026-11-15 at 00:00:33Z: seven pictures and the table of the new strings.
Pictures 5 and 6 are the wall's. The message described them, verbatim:

> - **ภาพ 5–6:** ผนังควบคุมการบิน แผนที่มีทวีปแล้ว และชื่อรัสเซีย «Пульт полёта» แสดงครบในช่องเลือก

(Pictures 5–6: the flight wall; the map now has its continents, and the
Russian name «Пульт полёта» shows in full in the select.)

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
session did not read the words as covering step 2's pull requests. It
opened #224 on the owner's answer of 2026-11-19, and this one on the owner's
order of that day (next section). #223 was squash-merged into
main as `2eb9f0d3` at 22:07:42Z, and Pages run 44408512731 published it at
22:46:04Z. That commit's tree equals that of step 1's last head `186dbbab`.
S4's branch started from it, and so did the stacked head.

## The owner's words of 2026-11-19

On **2026-11-19** the session sent the owner seven screenshots of step 2 and
nineteen questions on both pull requests. The owner wrote four times that day:
at 11:21:57Z, an answer to the questions; at 15:57:39Z, an order to open the
PR and merge the remaining work; and at 21:16:48Z and 21:17:43Z, a question on
the state of the work and a message to carry on to the end and open no new
work for now. The last two, and what the session told the owner in those
hours, are in "After the order: the chat up to this records commit". This
section has what concerns the wall: its screenshot, its questions as sent, the
owner's four messages, and how the session read or answered each. The
readings are the session's, and are kept apart from the owner's words. The
R2.6 report has the rest: all seven screenshots, both messages of questions
whole, and each of the nineteen ("The owner's answer of 2026-11-19").

### The screenshot of the wall (05:59:57Z)

Screenshot E of the seven, sent in chat at 05:59:57Z. The session's message
of 06:00:35Z described it, verbatim:

> - **E** Engineer ภาษาไทย 1440×900 พร้อมผนังข้อมูลการบินของ S5 มีสถานะระบบ 6 แถว และแผนที่เส้นทางบนพื้นโลก

(E: Engineer in Thai at 1440×900, with S5's flight wall: six system-status
rows and the ground-track map.) It is a replay held at T+02:55, at a device
pixel ratio of 2, with the Cards select on ผนังควบคุมการบิน (Flight wall). It
shows the system-status card with its six rows, and the values the table
below gives for T+2:55 ("Measured in a browser"): engines 100 %, ✓; the
phase, the pitch programme, ●; three separations, the fairing the latest, ✓;
no warning, ✓; 39 % of the active stage's propellant, ●; orbit —, ●. Under
the card are the ground track on its map, with the continents, and the six
items of its legend. At the bottom of the panel the heading and the three
buttons of the comparison are in view; on the build of 2026-11-14 the
comparison began below the panel's first screen (below, "Measured in a
browser"). The playback row has S4's Events ▾ opener.

It was taken on a build of both PRs' code: a build whose `src/` and
`index.html` are the stacked head's.

**The fonts.** The screenshot shows the online look: the page was opened in
online mode, with IBM Plex loaded from the web, which the app does in online
mode only (`src/ui/web-fonts.ts`). Offline is the default
(`DEFAULT_DATA_MODE`, `src/provider/data-mode.ts`), and offline the app uses
the device's own fonts. The wall's own measurements are in the container's
Inter, and its journey ran in DejaVu Sans and Inter (below, "Measured in a
browser" and "Tests"). The message of 06:00:35Z had said that every picture
uses the same font as the real site
("ทุกภาพใช้ฟอนต์เดียวกับเว็บจริง"). The caption the pictures were sent
with at 05:59:57Z, which named the wall, had said the same. That was not
exact, and the session corrected it to the owner at 12:17:16Z (the R2.6
report, "What the session told the owner afterwards").

**One more statement of that message was not exact.** Under the state of the
work it said that the checks had passed for S4 and S5 both, and of the
journeys, verbatim:
"journey ทุกตัวผ่านทั้งในฟอนต์บน CI และฟอนต์ Inter"
(every journey passes in the CI font and in Inter). The session's report of
09:33:57Z said the same. In this PR's local checks all 46 journeys that are
not held ran in the CI runners' font, DejaVu Sans, and 7 of them in Inter:
`r2-flight-wall`, S4's four new journeys and the two viewport journeys
(below, "Checks at the S5 head", row 6). The session corrected this to the
owner on 2026-11-19 at 22:21:11Z, before this records commit, and in no
message before that one (below, "After the order: the chat up to this records
commit").

### The wall's questions (06:00:35Z and 09:12:37Z)

Thirteen questions went at 06:00:35Z, after the screenshots, and six more at
09:12:37Z. Each gives its options and marks one as recommended, with the word
"แนะนำ" in brackets; the recommended option is ก in every one of
the nineteen. Both messages are verbatim in the R2.6 report ("The nineteen
questions (06:00:35Z and 09:12:37Z)").

Two of the nineteen are the wall's alone. Question 8, from the message of
06:00:35Z, verbatim:

> 8. ชื่อ branch ของ PR ผนังข้อมูลการบิน (S5)
>    - ก. `claude/u-redesign-a-s5` ตามรูปแบบใน SESSION-PROTOCOL.md (แนะนำ)
>    - ข. `claude/u-redesign-a-wall`

(8. The branch name of the flight wall's PR (S5). ก: `claude/u-redesign-a-s5`,
by the format in SESSION-PROTOCOL.md (recommended). ข:
`claude/u-redesign-a-wall`.)

Question 19, from the message of 09:12:37Z, verbatim:

> 19. สองเรื่องของผนังข้อมูลการบิน (S5) ที่ตาราง 12 ข้อไม่ได้ถาม
>     - ค่า "ผนังควบคุมการบิน" ที่เลือกไว้ไม่ถูกจำหลังโหลดหน้าใหม่ เพื่อให้เว็บรุ่นเก่ายังอ่านค่าที่บันทึกไว้ได้
>     - แถบแท็บตามภาพต้นแบบยังไม่ได้ทำ ยังใช้ช่องเลือก "การ์ดข้อมูล" ช่องเดียว
>     - ก. แบบนี้ (แนะนำ)
>     - ข. ให้แก้ (ระบุ)

(19. Two things about the flight wall (S5) that the table of twelve rows did
not ask. The "ผนังควบคุมการบิน" (Flight wall) value, once chosen, is not
remembered after the page is loaded again, so that older versions of the site
can still read the stored value. The tab strip of the mockup is not built
yet; the one "การ์ดข้อมูล" (Cards) select is still used. ก: like this
(recommended). ข: change it (say what).) It is this report's fifth question,
which the thirteen had left out (below, "Questions that were open for the
owner").

Four more are on both pull requests and bear on this one. In short, not as
quotes; they are verbatim in the R2.6 report:

| # | The question, in short | ก, the option marked recommended | The other options |
|---|---|---|---|
| 9 | The five browser shards on CI | In S4's PR | ข: in a PR of their own |
| 10 | The precache total's ceiling, 16586 → 16596 kB, following the approved precache-code ceiling. The question said that the number is not among the four of row 2 | Accept | ข: do not accept |
| 11 | How the approved D-38 raise is split | S4 raises to its own real size, rounded up to the next 0.5 kB; then S5 raises up to the approved values | ข: S4 raises all the way to the approved values at once |
| 13 | Opening step 2's PRs | Open S4's PR; run the new journeys and the changed one 20 times on CI under rule 2; then the session reports and waits for the owner's order to merge; S5 the same after S4 has merged | ข: open the PRs and merge once CI has its 20 runs, without asking again. ค: do not open a PR yet |

### The answer (11:21:57Z) and the session's reading

At 09:33:57Z the session reported the push of both branches: S4's four
commits to `claude/u-redesign-a-step2`, and this PR's three, on top of them,
to `claude/friendly-keller-78iuc9` (the stacked head). It listed what waited
for the owner: the answers to questions 1 to 19, question 13 and question 8.

Owner, in chat, **2026-11-19** at 11:21:57Z, verbatim:

> "ลองตรวจสอบดูแล้วเอาตามที่คุณเห็นสมควรเลยครับ"

(Have a look over it, then go with whatever you see fit.) The verb is
"ตรวจสอบ", to check or verify: the rules review (next subsection) judged
"check it over" the closer gloss.

How the session read the words:

- They leave the nineteen choices to the session, which is to check them
  before it acts. The words name no option, no question, no pull request and
  no merge.
- The session takes ก in all nineteen. In each question it had told the owner
  which option it saw fit: the one marked recommended, ก every time. It takes
  each after checking it again (next subsection), and none by silence.
- ก is the session's choice on the owner's delegation. It is not the owner's
  pick of an option, and this report records none of the nineteen as the
  owner's own.
- Question 8 ก: the wall's branch is `claude/u-redesign-a-s5`.
- Question 13 ก: open S4's PR, run rule 2's 20 CI runs of each new or changed
  journey, report, and wait for the owner's own order to merge; the same for
  this PR after S4's has merged. The words are not an order to merge
  anything.

The session told the owner its reading at 11:31:34Z. One line of that message
is the wall's, verbatim:

> ยังไม่ได้ทำ: S5 ยังไม่ย้ายไป `claude/u-redesign-a-s5` จะย้ายพร้อมเปิด PR ของมันหลัง S4 merge แล้ว

(Not done yet: S5 has not moved to `claude/u-redesign-a-s5`; it moves when its
PR opens, after S4 has merged.) The R2.6 report has the message's opening, a
second way to parse the owner's words, and why the session kept the first
("The answer (11:21:57Z) and the session's reading").

### The check after the answer

The reading asks for a check before the session acts. Two independent reviews
were told to argue against taking ก in all nineteen: one from the learner's
and the product's side, one from the repository's rules. Both verdicts:
**go**. The R2.6 report has the whole check ("The check after the answer,
before acting"). What the two said that bears on this PR:

- **Question 8.** The product review: no learner sees a branch name, and
  option ข would cost a rename of the fragment and of the name in both
  reports. The rules review: `claude/u-redesign-a-s5` is SESSION-PROTOCOL.md
  §5's own format, and ข would depart from it; this PR was to wait for S4's
  merge (rule 1).
- **Question 10.** The rules review: the total is derived, since code and
  data/ must fit under it, and it has followed each precache code raise
  without being named in an approval; so the approved 15197 kB carries
  16596 kB. It is never to be written as approved by the owner, as it is not
  one of the four numbers. The product review: option ข cannot work, since
  the budget test holds code plus data to the total.
- **Question 11.** The rules review: D-38 wants each PR's own measured size
  in that PR, and no standing raise. ก is the stricter option; ข would give
  S4's PR room for this PR's code. For this PR it noted that the CSS ceiling
  goes to the approved 182.5 kB where this PR's own size rounded up is
  182.0 kB (181,961 B): inside the approval. It asked that the four notes of
  S4's raise in `budgets.json`, which called the split open for the owner, be
  updated; this PR's notes said the same (below, "Budget"). The product
  review: with the tighter split, main carries no unused room if this PR
  slips.
- **Question 13.** The rules review: only ก fits SESSION-PROTOCOL.md §1, and
  the words of 11:21:57Z are not a merge order. Of #224 it said that the PR
  should claim no approval of the look by the owner, and that the owner's
  merge order is that approval, as it is the approval of that PR's raise,
  the precache total with it.
- **Question 19.** The product review: a build before this one rejects a
  preset it does not know and falls back to all cards, and its next write
  replaces the learner's stored custom list. So not writing the wall protects
  something real when a reverted or a stale cached build reads the storage.
  The price is one change of the select per page load; a custom set of the
  two cards is kept. The select works on phones and by keyboard, and a tab
  strip needs room and bytes this PR does not have: it is 194 B under the
  approved `index-*.js` ceiling and 105 B under precache code's. It found one
  gap: "store it one release later" stood only in a comment in the code, not
  among this report's follow-ups, and the journey's reload check could not
  fail. It asked that, before this PR opened, the first be made a follow-up
  with its trigger and the check be made able to fail. Neither was done
  before the PR opened, and the PR's description said so. Both are done in
  this PR since. The check was made able to fail by a test-only commit of
  2026-11-19, pushed before rule 2's runs (below, "The reload check made
  able to fail"). The follow-up comes with this records commit (below,
  "Follow-ups", 6). The rules review: not keeping the preset
  avoids a change of the stored format, which would need a version, a
  migration and a second reviewer; both points are to be recorded in this
  report, and are (below, "Choices made in the session, not by the owner").
- **The authorization.** The rules review: no wave authorization covers the
  wall, so this report needs the go-ahead of 2026-11-14 verbatim. The review
  had the words from the session's own summary of that day, and asked that
  the original chat event be fetched before they were quoted. That event is
  no longer in the transcript. The quotes in this report are the print of it
  by the session's search of 2026-11-14 (above, "The owner's words (D-65)").

The product review ran no browser, build or test, and read this PR's files
for question 19 only. The rules review did not look at the app's behaviour,
at the screenshots or at any test run.

### The order to open and merge (15:57:39Z)

What stood in the chat before it. At 12:16:31Z S4's pull request, #224, had
opened as a draft, and rule 2's CI runs for it had begun (the R2.6 report,
"Rule 2"). The session's message of 14:39:55Z had told the owner that it
would ask about merging in chat when #224 was ready, since it cannot open the
Merge Desk page (below, "The Merge Desk"). Its messages of 15:34Z to 15:52Z
reported rule 2's eighth and ninth CI runs for #224 as on plan, 16 and then
18 of 20 of each of S4's journeys, and listed as not done yet: the tenth run,
the revert of the temporary commit, rule 2's results in the records, CI on the
final head, and "ยังไม่ merge" (not merged yet). This pull request was not
open.

Owner, in chat, **2026-11-19** at 15:57:39Z, verbatim:

> "เปิดPR แล้วmerge งานที่เหลือให้เรียบร้อย"

(Open the PR, then merge the remaining work, all the way to done.)

How the session read the words. What follows is the session's reading, not
the owner's words:

- "งานที่เหลือ" (the remaining work) is what remained of Redesign A step 2:
  S4, pull request #224, which was open as a draft, and S5, this pull
  request, which was not open yet. "เปิดPR" (open the PR) is this pull
  request, which rule 1 lets open only after #224 merges, from
  `claude/u-redesign-a-s5`.
- The words are the owner's own order to merge both, each when it is ready by
  the repository's rules: rule 2's 20 CI runs of each new or changed journey,
  the temporary commit reverted, CI green on the final head, the records in
  the PR. "ให้เรียบร้อย" (all the way to done, properly) waives none of them.
  The session does not ask again before each merge: by
  [SESSION-PROTOCOL.md](../SESSION-PROTOCOL.md) §1, an approval typed in chat
  is valid at any time and weighs the same as the Merge Desk's button.
- The order names no head. The heads that merge did not exist when it was
  given. For this PR these came after it: the rebase, the branch, the pull
  request, the reload commit, rule 2's two commits and this records commit. Its code and its
  first records were on the stacked head, pushed before the order. So the
  session tells the owner each head and what it holds before it merges, and
  the owner could stop either merge by a message.
- For this PR the session reads the order as the approval of this PR's part of
  the D-38 raise, with the precache total that follows it, and of the wall's
  look. The rules review had written that of a merge order for #224 only
  (above); for this PR the reading is the session's alone. The words name no
  ceiling and no picture. As the session first held the reading, it claimed no
  other approval from them for this PR. At 19:11:39Z it told the owner a wider
  reading, of five things: these two, the one changed assertion, the lines in
  other lanes' files and what this build stores (below, "After the order: the
  chat up to this records commit"). That, too, is the session's reading alone.
  What it reads the words as approving for #224 is in the R2.6 report ("The
  owner's order (15:57:39Z) and the session's reading").
- The session also reads "ให้เรียบร้อย" as covering the last piece of this
  work: the records PR that folds the fragments of #223, #224 and this PR into
  `CHANGELOG.md` and `PROGRESS.md` and adds the rows of `docs/DECISIONS.md`
  for 2026-11-05 to 2026-11-19. It is the weakest part of the reading: the
  words do not name a records PR.

The reading is given as the session held it after the order, when neither pull
request had merged. #224 has merged since (below, "After #224's merge"). The
owner wrote again at 21:17:43Z. That message names neither the records PR nor
the work after this PR; the session read it as bearing on both, and told the
owner how it read it (below, "After the order: the chat up to this records
commit").

At 16:04:00Z the session told the owner its reading of the order, in a
message of three items: #224, this PR and the records PR. Item 2 is this
PR's, verbatim:

> 2. **S5 (ผนังข้อมูลการบิน):** เปิด PR จาก `claude/u-redesign-a-s5` หลัง #224 merge, วิ่งกฎข้อ 2 ของ journey ใหม่ `r2-flight-wall` และ `r2-event-jump` ที่ S5 แก้ (2 รอบ CI), แล้ว merge

(2. S5, the flight wall: open the PR from `claude/u-redesign-a-s5` after #224
merges, run rule 2 for the new journey `r2-flight-wall` and for
`r2-event-jump`, which S5 changes (2 CI runs), then merge.) The R2.6 report
has the rest of the message verbatim and gives this item in English only
("The owner's order (15:57:39Z) and the session's reading"). The rest, in
short: the session would finish #224 and merge it, and make the records PR.
Of the records PR it said that it had read it from "ให้เรียบร้อย" itself, that
the order did not name it, and that the owner could decline. It said that it
would tell the owner each head's SHA and what the head holds before each
merge. For #224 the message also listed what to know before the merge, and
said that the session takes the order as the approval of #224's raise of the
precache total. It said no such thing of this PR's raise or of the wall's
look. The session said it later, at 19:11:39Z, in its message on this PR's
opening (below, "After the order: the chat up to this records commit").

Three later messages bear on this PR. They are told here in English. The
R2.6 report has the first two with the runs they follow ("Rule 2").

- At 16:15:50Z the session reported rule 2's result for #224 and named a risk
  that stays. Every CI run from then on, the Pages run after a merge too,
  runs the journey `r2-viewport-matrix` once, and on a runner about 1.25
  times slower again than that day's it would run out of time. The session
  said that by the rules it can then run the job again once, and that it
  would propose the split of that journey as the next work, right after S5.
  It also said that it had tried this PR's commits on S4's new head, and that
  the two met only in the notes of `budgets.json`.
- At 16:31:25Z it said that it would merge on the owner's order and split the
  journey as the first work after S5. It added a condition: if any CI run
  from then on takes the journey past 17 minutes, or out of time, it stops
  the merge and splits the journey first.
- At 16:32:29Z it told the owner that rule 2's plan for this PR was prepared
  and tried dry: each smoke shard runs `r2-event-jump` twice and
  `r2-flight-wall` twice (below, "Rule 2").

The condition of 16:31:25Z names no pull request: its words are any CI run
from then on. `r2-viewport-matrix` is a smoke journey, so each normal CI run
of this PR runs it once: the first run, the run on the reverted head, and the
run on the head that merges. Rule 2's two runs on the temporary commit did
not run it. The session has since repeated the condition for this PR: at
19:11:39Z, at 19:31:14Z, where it names #225, and at 20:23:27Z, for the two
CI runs that remained (below, "After the order: the chat up to this records
commit"). In this PR's first CI run the journey took 900.7 s, under the
condition's 17 minutes, which are 1020 s (below, "First CI run"). Its seconds
in the run on the reverted head are with that run (below, "Rule 2", "CI on
the reverted head"). Its seconds in the run on the head that merges are later
than these records.

The split is the R2.6 report's follow-up 10, and it is not started. The owner
wrote at 21:17:43Z to open no new work for now, and at 21:18:11Z the session
told the owner that it opens no branch and no PR for the split (below, "After
the order: the chat up to this records commit"): the session's reading of that
message. No message withdraws the condition. At 20:46:41Z the session told the
owner the journey's seconds in the run on the reverted head against it. But
the condition's second half, to split the journey first, was told before the
owner's message. The message of 21:18:11Z does not say what the session does
if the run on the head that merges takes the journey past 17 minutes. The
session said it at 22:21:11Z: it stops the merge and asks the owner, and does
not split the journey itself (below, "After the order: the chat up to this
records commit").

So for this PR the last step of question 13 ก, waiting for the owner's own
order to merge, is met by an order given before the PR opened.
[SESSION-PROTOCOL.md](../SESSION-PROTOCOL.md) §1, step 3, has a PR merge when
the approved head is the current head, and has the owner asked again if the
head changed after the approval. The session reads the order as given ahead
of the head that merges: it tells the owner that head and what it holds
before it merges, and does not ask again. That is the session's reading
against §1, step 3, and the reader can judge it. The session's message on the
head that merges, before the merge, is later than this records commit, so
these records do not hold it.

### After the order: the chat up to this records commit

The session's chat record of the hours after the order was made from its
transcript on 2026-11-19, read up to the transcript's last line then, of
20:23:28Z. It holds every text message of the session in the transcript from
16:32:30Z on, 38 of them, the first at 16:33:32Z and the last at 20:23:27Z,
and no message of the owner: none had come by then. Each of the 38 was
compared with the transcript and is the same text.

The transcript was read again later that day, up to its last line then, of
21:31:00Z. By then it held two messages typed by the owner after the order, at
21:16:48Z and 21:17:43Z, and four more text messages of the session, at
20:46:41Z, 21:17:01Z, 21:18:11Z and 21:30:58Z: 42 from 16:32:30Z on. The
session's own chat note on the owner's two messages was saved at 21:18:05Z. It
holds both verbatim. The two quotes below are copied from it, and each is the
same text as the transcript's.

Up to 21:31:00Z the transcript also holds nine one-line status notes of the
session from 16:32:30Z on, the first at 16:44:43Z and the last at 19:53:09Z. They are
stored as lines of the session's reasoning, not as messages. The chat record
does not hold them, and these records do not know whether the owner's screen
showed them. Each says in a line what the session was doing then. None holds a
reading or a question. Five more such notes lie between the order and
16:32:30Z, from 15:59:05Z to 16:14:34Z. The first of them, at 15:59:05Z, is a
short reading of the order: the session takes the order, finishes #224 and
merges it first, then opens and merges S5's pull request, and keeps every rule
of the repository. The other four say what the session was doing for #224
then, and one of them that it would prepare S5 meanwhile. The transcript holds
no such note after 19:53:09Z, up to 21:31:00Z.

Of the session's messages before 16:32:30Z, those that bear on this PR are
above ("The order to open and merge (15:57:39Z)"). Five more, of 16:04:41Z to
16:12:03Z, are progress notes on rule 2's tenth CI run for #224; two of them
say that this PR's preparation had started.

**What the owner wrote after 15:57:39Z.** Up to 20:23:28Z, nothing. Then two
messages. Both came after the session's message of 20:46:41Z on the CI run on
the reverted head (below), and before this records commit.

Owner, in chat, **2026-11-19** at 21:16:48Z, verbatim:

> "งานใกล้เสร็จยังครับ"

(Is the work nearly done?)

The session answered at 21:17:01Z with the state of the work and a list of
four things left (below).

Owner, in chat, **2026-11-19** at 21:17:43Z, verbatim:

> "ทำต่อให้จบแล้วยังไม่ต้องเปิดงานใหม่เพิ่มครับ"

(Carry on to the end, and do not open any more new work for now.)

This second message came after the session's list of 21:17:01Z. It names no
head, no ceiling and no picture, and none of the five things of 19:11:39Z. It
is not recorded here as the approval of anything in this PR, and the session's
own note on it says the same. Neither message speaks in words of the session's
readings of the order: not of the one of 16:04:00Z, and not of the one of
19:11:39Z (below). How the session read the second message is the session's
own, and is below, at 21:18:11Z. So the owner's messages of that day are four:
the answer of 11:21:57Z, the order of 15:57:39Z, and these two.

The transcript was read once more for this records commit, up to its last
line then, of 22:32:37Z on 2026-11-19: the owner wrote nothing after 21:17:43Z.

**What the session told the owner after 16:32:29Z.** Up to 18:57:05Z the
messages are mostly progress notes on #224's records and on its last CI run,
and each lists this PR under what is not done yet. Some of them also report on
this PR's records drafts and on the checker of its rule 2 logs. Those that
bear on this PR, in order:

- **16:52:19Z, 17:15:51Z and 18:11:48Z, this PR's records drafts.** At
  16:52:19Z the session wrote that this PR's records draft was done and that
  its reviewers had started. At 17:15:51Z: the first two reviewers had found 6
  things to fix in it. The message named two: a claim that S4's report holds
  the session's message whole, which was not true, and the build the sizes
  were measured on, given inexactly. At 18:11:48Z: the reviewers had found
  more to fix, in the draft and in the checker of rule 2's logs, which could
  not tell one shard's log from another's because every shard runs the same
  list. All of it was fixed and under review again.
- **17:36:07Z and 17:36:58Z, the trial of the rebase.** The session wrote
  that it had placed this PR's three commits on S4's head of that time, in a
  trial folder. They met only in `budgets.json`, which a script resolved:
  the ceilings reach the values the owner approved, and this PR's notes no
  longer say "provisional" or "stacked on S4's". The tree differed from the
  earlier one in `budgets.json` only. The second message gave the quick
  checks on that tree: the typecheck passed, the node tests 98 of 98, this
  PR's vitest files 4 files and 36 tests, the build passed, and the budget
  under every ceiling. It named the tightest one, precache code at 15196.9 of
  15197.0 kB, and the risk that follows: work that adds code after this must
  first ask for a raise or do the size work (EQ-8).
- **18:38:35Z.** With #224's final head and what it holds, the session wrote
  that this PR's three commits had been moved onto that head in the trial
  folder and had passed the quick checks, ready to go onto main after the
  merge.
- **19:01:17Z, #224 merged.** The message opens, verbatim:

  > **PR #224 (S4) merge แล้วครับ** ตามคำสั่งของคุณเมื่อ 15:57Z

  (PR #224 (S4) is merged, on your order of 15:57Z.) It gave the squash
  commit on main, `0f33d9fc`, merged at 18:59:31Z, with the same tree as
  #224's head `7d2704f2`, which it had named to the owner at 18:38:35Z. It
  gave the CI run on that head, 44589900402: 12 of 12 jobs passed, 10,871 of
  10,871 unit tests, 25 of 25 browser journeys, and `r2-viewport-matrix` at
  601.2 s. It gave the Pages run, 44593597570, as still running, with the
  live site unchanged until it passes. It told the owner one thing it had
  not said before that merge: #224 changes one line of
  `src/replay/reference.ts`, a file of lane P that is not in the plan item's
  list; #224's description names it, and the message of 16:04:00Z had not.
  Of this PR it said that the three commits had been moved onto the new main
  and pushed as the branch `claude/u-redesign-a-s5`; that on that tree the
  typecheck had passed, the node tests 98 of 98, this PR's vitest files 4
  files and 36 tests, the build, and the budget under every ceiling; that
  the records draft and the rule 2 plan had passed their reviewers; and that
  the PR would open as soon as its description was corrected after the last
  review round.
- **19:11:39Z, the pull request and the reading.** The PR was created at
  19:08:41Z. The session's note on the opening says that a short notice of it
  went to the owner right after, with no reading in it. The transcript holds
  no such message: it has no message of the session between 19:01:24Z and
  19:11:39Z. What it holds, at 19:08:44Z, is one of the status notes named
  above: S5 was opened as a draft PR. That note gives no number and no link
  for the PR, and holds no reading. So this message is the first of the
  session's messages that says the pull request is open, and the first with
  its link. The session's note on it
  was saved at 19:11:23Z; the message is in the transcript at 19:11:39Z. It
  gave the PR's link,
  [#225](https://github.com/ROYIN001/Orbitlab/pull/225), and said that the
  PR had opened as a draft, with three commits on main `0f33d9fc`, which is
  #224 merged, and that #225 was not merged. Then it told the owner, for the
  first time in words, what the session reads the order as approving for
  this PR. That part of the message is quoted here whole, verbatim. The
  first line of the message, before it, and the rest, after it, are told in
  English:

  > **สิ่งที่ผมตีความจากคำสั่งของคุณ** "เปิดPR แล้วmerge งานที่เหลือให้เรียบร้อย" ผมอ่านว่าเป็นการอนุมัติ 5 เรื่องของ #225 ด้วย ซึ่งผมยังไม่เคยบอกคุณเป็นคำพูดมาก่อน:
  >
  > 1. **เพดานขนาดไฟล์ (D-38) ส่วนของ S5** ขึ้นไปถึงค่าที่คุณอนุมัติไว้เมื่อ 2026-11-16 พอดี:
  >
  >    | ไฟล์ | เดิม (kB) | ใหม่ (kB) |
  >    |---|---|---|
  >    | `index-*.js` | 2666.5 | 2669.5 |
  >    | `index-*.css` | 181.5 | 182.5 |
  >    | `i18n-*.js` | 1737.5 | 1738.5 |
  >    | precache code | 15192 | 15197 |
  >    | precache รวม | 16591 | 16596 |
  >
  >    แถว precache รวมไม่อยู่ในสี่ค่าที่คุณอนุมัติ มันขยับตามกลุ่มย่อยของมัน
  > 2. **หน้าตาของผนังควบคุมการบิน** ตามภาพ E ที่ส่งให้เมื่อเช้า ภาพนั้นใช้ฟอนต์แบบออนไลน์ (IBM Plex) ยังไม่มีภาพที่ใช้ฟอนต์ของเครื่องเอง
  > 3. **การทดสอบเดิมที่ถูกแก้ 1 จุด** ใน `tests/telemetry-layout.test.ts`: ค่าเริ่มต้นคือการ์ดทุกใบยกเว้น 2 ใบใหม่ของผนัง ตามคำตอบข้อ 8 ก ของคุณ
  > 4. **บรรทัดในไฟล์ของ lane อื่น**: `src/main.ts` (+8), `src/style.css` (+14), พจนานุกรม 3 ภาษา (ภาษาละ 6 คำ), `change-map.json` และ `budgets.json`
  > 5. **ข้อมูลที่บันทึกในเครื่องผู้ใช้**: ถ้าผู้ใช้ติ๊กการ์ดบนผนังเอง ชุดกำหนดเองที่มีรหัสการ์ดใหม่ 2 ใบจะถูกบันทึก โดยไม่เปลี่ยนเลขรุ่นของรูปแบบข้อมูล ตามโค้ด build รุ่นเก่าจะทิ้งรหัสที่ไม่รู้จัก แต่ยังไม่ได้ลองใน browser จริง
  >
  > ถ้าข้อใดไม่ตรงกับที่คุณต้องการ ส่งข้อความมาได้เลย ผมจะหยุดการ merge

  In English. The heading: what I read from your order, with the order's
  words; I read it as the approval of five things of #225 as well, which I
  had not told you in words before. 1. The file-size ceilings (D-38), S5's
  part, up to exactly the values you approved on 2026-11-16: the table's
  rows are `index-*.js` 2666.5 to 2669.5, `index-*.css` 181.5 to 182.5,
  `i18n-*.js` 1737.5 to 1738.5, precache code 15192 to 15197 and the
  precache total 16591 to 16596 kB; the precache total's row is not among
  the four values you approved, and it moves with its groups. 2. The look
  of the flight wall, by picture E sent that morning; that picture uses the
  online font (IBM Plex), and there is no picture yet in a device's own
  fonts. 3. One changed existing test, in `tests/telemetry-layout.test.ts`:
  the default is every card but the wall's two new ones, by your answer 8 ก.
  4. Lines in other lanes' files: `src/main.ts` (+8), `src/style.css` (+14),
  the three dictionaries (6 words each), `change-map.json` and
  `budgets.json`. 5. Data stored on the user's device: if the user ticks cards
  on the wall themselves, a custom set with the two new card ids is stored,
  with no change of the data format's version number; by the code an older
  build drops the ids it does not know, but this has not been tried in a real
  browser. Last line: if any of these is not what you want, send a message and
  I will stop the merge.

  By "8 ก" the message means row 8 of the table of 2026-11-15, which the
  owner answered on 2026-11-16 (above). Question 8 of 2026-11-19 is the
  branch name.

  The rest of the message, in English. The order of the work left for
  #225: the reload check of `r2-flight-wall` made able to fail, changed and
  not yet committed, with two agents proving it on a build broken on
  purpose; the first CI run of #225, 26 journeys, running; rule 2, 20 runs
  of each of the two journeys on CI, with `browser-smoke` and `verify` red
  by design meanwhile; the revert, the records, and CI on the final head;
  then telling the owner the final head and what it holds, and the squash
  merge. #224's Pages run was still running. Not done: rule 2, the updated
  records, the records PR; the first CI run's result was not seen yet. The
  risk it named: `r2-viewport-matrix` had taken up to 958 s of its 1200 s
  limit, and a run past 17 minutes stops the merge and brings the split of
  that journey first.
- **19:11:51Z.** The session wrote that it was waiting for two things: this
  PR's first CI run, and the agents' result on the reload check. The change to
  the check was not committed, and rule 2 had not started. The risk it named:
  if the reviewer refuted the change, the session would not push it, and would
  record the check as a follow-up, as before.
- **19:31:14Z, #224 on the live site; this PR's first CI run; the reload
  check.** The session wrote that #224 was on the live site: Pages run
  44593597570 had passed, and the live site's build stamp, read at
  19:29:54Z, was the commit `0f33d9f`. Of this PR's first CI run,
  44595245579, it wrote: 12 of 12 jobs green, 10,885 of 10,885 unit tests,
  26 of 26 browser journeys, `r2-flight-wall` 47.4 s on CI of its 180 s
  limit, and `r2-viewport-matrix` 900.7 s, 15.0 minutes, still under the
  17-minute condition but nearer than it would like to see. Of the reload
  check it wrote that the change was not committed yet. The first agent's
  result was as expected: on a build broken on purpose, so that it stores the wall, the
  changed journey fails at this one check, and the journey as it was passes
  on the same build. On the real build the changed journey passed in both
  fonts, in 63.4 and 65.1 s. The second agent was still trying to refute
  it; if the change held, the session would commit it and push it with rule
  2's temporary commit. The message's line on the risk, verbatim:

  > ความเสี่ยง: `r2-viewport-matrix` เหลือระยะห่างจากเงื่อนไข 17 นาทีเพียงราว 2 นาที ถ้ารอบถัดไปเกิน ผมจะหยุด merge #225 และแยก journey นี้ก่อน

  (Risk: `r2-viewport-matrix` is only about 2 minutes from the 17-minute
  condition. If the next run goes past it, I stop the merge of #225 and
  split this journey first.)
- **19:53:13Z to 20:22:15Z, rule 2's runs.** At 19:53:13Z: the first run
  was running, and `browser-smoke` and `verify` would be red by design,
  which the session would check from the raw logs. At 20:02:24Z: shard 1 of
  run 44602209942 had passed 4 of 4, `r2-event-jump` in 171.6 and 171.9 s
  and `r2-flight-wall` in 60.8 and 60.9 s; the job was red as intended; the
  session had posted one comment on the PR on it, as the rules ask, and
  would not repeat it for the other red jobs. At 20:06:29Z: the first run
  had ended on plan, by its six raw logs: 10 of 10 for each journey,
  `r2-event-jump` in 171.6 to 299.8 s and `r2-flight-wall` in 60.8 to
  93.2 s; six jobs red as intended, the other six green, 10,885 of 10,885
  unit tests; `verify`'s 12 issues all from the temporary plan; and the
  second run ordered by hand on the same commit at 20:05:48Z. From 20:17:00Z
  to 20:20:34Z: the second run's shards ending, red on plan. At 20:22:15Z:
  the revert was prepared locally, neither committed nor pushed, and the
  tree after it matched the reload commit's.
- **20:23:27Z, rule 2 done.** The session wrote: 40 of 40, by the twelve
  raw logs of the two runs, 44602209942 and 44605119278: `r2-flight-wall`, with the changed
  reload check, 20 of 20 in 60.8 to 93.2 s of 180 s, and `r2-event-jump` 20
  of 20 in 171.6 to 299.8 s of 600 s. Both runs were red only in the six
  jobs intended; the other jobs were green, with 10,885 of 10,885 unit
  tests; no job was run again. The temporary commit was reverted, the
  revert pushed alone at 20:23:04Z, and the tree after it equals the reload
  commit's. CI on the reverted head was running: the first normal run with
  the changed journey. The update of these records had started. Not done:
  the result of CI on the reverted head, the records commit, CI on the
  final head, telling the owner the final head, and the merge. The risk it
  named: `r2-viewport-matrix` must not go past 17 minutes in the two CI
  runs that remain; the last one took 15.0 minutes; if it does, the session
  stops the merge and splits the journey first.
- **20:46:41Z, CI on the reverted head.** The session wrote that the CI run on
  the head with the temporary commit reverted, run 44608133796, was green, 12
  of 12 jobs, with 10,885 of 10,885 unit tests and 26 of 26 browser journeys.
  As the message gave them: `r2-viewport-matrix` took 860.9 s, 14.3 minutes,
  under the 17-minute condition; `r2-flight-wall`, with the changed reload
  check, passed in its first normal run, in 54.1 s. It named one more thing it
  had seen: shard 2 took 1,117.7 s in all in this run, against 875.0 s in the
  run before, of the job's limit of 25 minutes. It gave the cause as a runner
  that was slow as a whole, not a journey of this PR, and said that this is
  not in the stop condition it had told the owner. The risk it named: a slow
  runner brings shard 2 nearer its limit; if the last run runs out of time,
  the session finds the cause first and can run it again once at most. The run
  itself, from its logs, is below ("Rule 2", "CI on the reverted head").
- **21:17:01Z, the state of the work.** This answers the owner's message of
  21:16:48Z. The session wrote that the work was near its end: S5's code and
  tests were done, and what was left was to bring the records up to date and
  merge, by its estimate about 1.5 to 3 hours more, most of it waiting for
  reviewers and CI. Done: #224 merged and on the live site; #225 open, its
  first CI run green, rule 2 at 40 of 40, the temporary commit reverted, and
  CI on the reverted head 12 of 12. In work: these records, in the fix round
  after their first review. Left, in four items: 1, the review again and the
  final description of the PR; 2, the records commit, pushed, and CI on the
  final head, about 25 minutes; 3, telling the owner what the final head is
  and what it holds, then the squash merge of #225, followed to the live site;
  4, the records PR (`CHANGELOG.md`, `PROGRESS.md`, `docs/DECISIONS.md`). Of
  item 4 it said that it had read it itself from the order's last words,
  glossed above as "all the way to done", and that it skips it if the owner
  does not want it.
- **21:18:11Z, the session's reading of the owner's second message.** The
  session wrote that it would finish the work at hand and start no new work.
  Then it told the owner how it read the message, in three points. To finish:
  #225, through its merge and the live site. Not to start: the split of the
  journey `r2-viewport-matrix`, which it had proposed as the next work; it
  opens no branch and no PR for it. The records PR, item 4 of the list it had
  just sent: it counts it as part of "to the end", because it was in that
  list; if the owner counts it as new work, a word from the owner and the
  session skips it. Not done: the final records, CI on the final head, telling
  the owner the final head, the merge of #225 and the records PR. The risk it
  named: with the journey not split now, it still takes 14 to 15 minutes of
  its 20-minute limit on CI, and has reached 16 minutes, so it may run out of
  time in a run on a very slow runner. All three points are the session's
  reading, not the owner's words: the owner's message names neither the split
  nor the records PR. The session reads no approval of anything in this PR
  from it.
- **21:30:58Z.** A check-in: the first fix round of these records had ended,
  the reviewers were reading them again, and the next check-in was set for
  23:00Z. Not done: the result of that review, the PR's final description, the
  records commit, CI on the final head and the merge of #225.

The message of 20:23:27Z is the report of rule 2's runs that question 13 ก
has the session make.

What these messages do not hold. None of them, up to 21:30:58Z, corrects the
statement of 06:00:35Z that every journey passes in Inter (above, "The
screenshot of the wall (05:59:57Z)"). None after 19:31:14Z says how the second
agent's attempt to refute the changed reload check ended: the later ones name
the changed check and its commit, and not the agent's verdict. None tells the
owner the limit that the second agent found in the check, or that the session
did not add the one more check it proposed (below, "The reload check made able
to fail"). None says what the session does if the CI run on the head that
merges takes `r2-viewport-matrix` past 17 minutes, now that the split of that
journey is not started. The session's message on the head that merges, before
the merge, is later than these records.

The transcript was read once more for this records commit, up to its last line
then, of 22:32:37Z on 2026-11-19. Up to that line two messages of the session
to the owner followed the check-in of 21:30:58Z:

- **22:21:11Z, the four things above, told to the owner.** The session wrote
  that the reviewers of these records had found four things it had not yet
  told the owner plainly, and told them. One, the correction of the statement
  of 06:00:35Z: all 46 journeys ran in the CI runners' font,
  DejaVu Sans, and in Inter only 7 ran, `r2-flight-wall`, S4's four new
  journeys and the two viewport journeys. Two, how the second agent's attempt
  on the changed reload check ended: its verdict was that the change holds,
  with notes, and the changed check fails when a build stores the wall preset
  at the moment it is chosen. Three, the limit that agent found: on a build
  that stores the preset later than the choice (it tried 300 ms) the journey
  still passes, because it reloads at once; the app stores at the choice, so
  this is a limit of the check and not a fault found; the agent proposed one
  more check, and the session decided itself not to add it in this PR and
  records it as a follow-up. Four, the CI run on the head that merges: the
  session had said it would stop the merge and split `r2-viewport-matrix`
  first if a run took the journey past 17 minutes; since, in the message's
  words, the owner ordered that no new work be opened, it now stops the merge
  and asks the owner, and does not split the journey itself. It also wrote that these records had passed their three
  reviews after three rounds of fixes, and that the PR's final description had
  passed its review. The message is told here by its meaning; the session's
  record of the chat holds it whole.
- **22:24:37Z.** The session wrote that it had filled these records and the
  PR's final description, and had sent what it had filled itself to two
  independent reviewers, one for the records and one for the description;
  when they pass, it commits, pushes and waits for the last CI run. Not done:
  the records commit, CI on the final head, telling the owner the final head,
  the merge of #225 and the records PR. The risk it named: if a reviewer
  finds a fault in what the session filled, it is fixed and checked again
  before the commit.

Up to that line the owner had not answered either message. Up to it the
transcript also holds more status notes of the kind named above, kept as lines
of the session's reasoning. The first two are of 22:22:17Z and 22:23:35Z. The
first says that the session was filling the CI run on the reverted head and
the local checks into these records, and would have independent reviewers
look at what it filled; the second, that the local checks had passed (node
98 / 98, vitest 17 / 17) and that it was writing the PR's final description,
to go to an independent reviewer before the commit. Neither holds a reading
or a question.
One more such note follows, at 22:32:10Z: it says in a line what the session
was doing then, the last fixes of these records before the commit, and holds no
reading and no question.

The session's message on the head that merges, before the merge, is later than
these records.

### The Merge Desk

[SESSION-PROTOCOL.md](../SESSION-PROTOCOL.md) §1 has a card for each PR on the
Merge Desk page, with the owner's two buttons. This session could not open
that page. On 2026-11-19 at about 14:37Z the page's database answered "no
such artifact, collection, or document (or no access — the two are
deliberately indistinguishable)", and at about 14:37Z, too, the page was not
among the artifacts the session's account lists. The session told the owner
at 14:39:55Z, verbatim:

> **2. หน้า Merge Desk เปิดจาก session นี้ไม่ได้**
> ลิงก์ในวิธีทำงาน (`SESSION-PROTOCOL` ข้อ 1) ไม่อยู่ในรายการ artifact ของบัญชีนี้ และฐานข้อมูลของหน้านั้นตอบว่าไม่มีหรือไม่มีสิทธิ์ ผมจึงเขียนการ์ดสรุปลงหน้านั้นไม่ได้ เมื่อ PR #224 พร้อม ผมจะส่งสรุปแบบเดียวกัน (ทำอะไรไป, ผลตรวจ, สิ่งที่ควรรู้ก่อนตัดสิน) ในแชตนี้ พร้อมตัวเลือกให้กดว่าจะ merge หรือยัง ซึ่งวิธีทำงานข้อ 1 ขั้นที่ 4 ให้น้ำหนักเท่ากับปุ่มบนหน้า Merge Desk

(2. The Merge Desk page cannot be opened from this session. The link in the
working method (SESSION-PROTOCOL §1) is not in this account's list of
artifacts, and that page's database answers that it does not exist or that
there is no access. So I cannot write the summary card on that page. When
PR #224 is ready I will send the same summary (what was done, the checks,
what to know before deciding) in this chat, with a choice to press on whether
to merge or not yet, which step 4 of §1 gives the same weight as the button
on the Merge Desk page.) So this session wrote no card for this PR either.
After the order of 15:57:39Z it sends no choice to press: before it merges it
tells the owner, in chat, the head and what it holds (above).

## Choices made in the session, not by the owner

The owner did not decide these in words of their own. The first four went to
the owner among the questions of 2026-11-19, and the session read the answer
of that day as leaving them to it: it keeps each as built, ก in each (above,
"The owner's words of 2026-11-19"). Each of the four ends with its question's
number.

- **The branch name** `claude/u-redesign-a-s5`, and the fragment named for it.
  (Question 8.)
- **The split of the one D-38 approval between the two pull requests:** S4
  alone crosses all four ceilings, and S4's PR raises each only to S4's own
  measured size rounded up to the next 0.5 kB (2666.5, 181.5, 1737.5 and
  15192 kB); this PR raises the four from there to the approved values
  (below, "Budget"). (Question 11.)
- **The precache total** follows its two groups: 16586 → 16591 kB in S4's PR,
  16591 → 16596 kB in this one (below, "Budget"). (Question 10.)
- **Two things about the wall that none of the twelve rows asks:** the wall
  preset is not kept after a reload, so builds before this one keep a stored
  custom list (below, "What was built", Storage); and the mockup's tab strip
  is not built, so the Cards select stays the one control. (Question 19.)
- **This PR's lines in other lanes' files.** The branch is lane U's by its
  name. Of the files the code commit changes, `src/ui/hud.ts`,
  `src/ui/telemetry.ts` and `src/ui/telemetry-layout.ts` are in lane U's
  write set (plan S18 §18.2); `src/ui/flight-wall.ts` is new, and
  `src/ui/map.ts` and `src/ui/phase.ts` are in no lane's list. Lane I's are
  `src/main.ts` (+8 lines: the ground track's map), `src/style.css` (+14:
  the wall's rows, marks and legend) and the three dictionaries (six keys
  each); by the plan a hook into those goes through lane I's train (S18
  §18.3.1). Lane T's are `budgets.json` (the raise) and
  `scripts/verification/change-map.json`, and its `tests/browser/shard.mjs`
  reads `tests/browser/shard-seconds.json`, where this PR adds one entry.
  Question 18 asked this of S4's PR only, for `src/main.ts` and `index.html`.
  No question asked it of this PR. The session named them to the owner at
  19:11:39Z, in its message on this PR's opening, among the five things it
  reads the order as approving: `src/main.ts`, `src/style.css`, the three
  dictionaries, `change-map.json` and `budgets.json` (above, "After the order:
  the chat up to this records commit"). That message does not name the entry
  in `tests/browser/shard-seconds.json`.

What each question said, with its outcome, is below ("Questions that were
open for the owner").

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
- **`docs/IMPLEMENTATION-STATUS.md`:** the row "R2.3 telemetry card presets"
  now names the Flight wall: added in Engineer (#225), a system-status card
  and a ground-track map, not kept after a reload. The row changes in this
  records commit. As the PR opened it listed the presets of #74 only, "kept
  with the learner's profile", and the PR's description said so.
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
  out, come back. No check changes. Rule 2 counts it as a changed journey all
  the same (below, "Rule 2").

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
  The journey also reloads and checks that the earlier preset is back. As
  the PR opened, that check could not fail: the leg ended by choosing Orbit
  again, which is stored, before the reload, so Orbit came back whether or
  not the wall was written. It had been so since the wall's review fixes of
  2026-11-14, which added that last choice. The reload commit changes the
  leg. It now chooses Flight wall once more, over the stored Orbit, right
  before the reload, and still expects Orbit after it; its failure text now
  says "not the Orbit stored before the wall". So the wall is the choice at
  the reload, and a build that writes the wall preset when it is chosen
  fails the check (below, "The reload check made able to fail").
  `tests/telemetry-layout.test.ts` covers `storesLayout`.
  `r2-flight-shell.mjs` is not changed.

**Existing assertions this PR changes.** A changed assertion waits for the
owner ([SESSION-PROTOCOL.md](../SESSION-PROTOCOL.md) §1), so it is named in
one place. There is one. In `tests/telemetry-layout.test.ts` the test of the
default layout expected the default to show every card id (`CARD_IDS`). It
now expects every card but the wall's two, of the default and of
`PRESETS.all`. That is row 8 (ก): "All cards" stays without the wall's
cards. The change to `r2-event-jump.mjs` is in comments and changes no
assertion. The session named the changed assertion to the owner at
19:11:39Z, among the five things it reads the order as approving (above,
"After the order: the chat up to this records commit").

`r2-flight-wall` ran on round 3's build: the build of this design's last
round of fixes before it was integrated as the two pull requests (2026-11-18).
That build's `src/` and `index.html` equal this PR's head but for comments (one
line in each of the three dictionaries and one comment in `style.css`), and its
four budget groups measure the same bytes as this PR's head (below, "Budget").
Its `r2-flight-wall.mjs` is the file this PR opened with, before the reload
commit, and the `r2-event-jump.mjs` it imports from differs from this PR's in
comments only. There, with those files, the
journey passed in every run: in the CI runners' font (DejaVu Sans) in 68.5,
75.6 and 68.0 s, in the container's Inter in 73.9, 63.9 and 75.7 s, and in
DejaVu Sans once more, in 137.7 s, in a run of round 3's re-review with
other runs loading the machine (a load average of 7 to 12). The journey
exports no `timeoutMs`, so its limit is the harness's 180 s default: that
run used 76.5 % of it and left 42.3 s. At this PR's head (neither the
journey nor a file it imports is among the journeys' last test changes;
below, "Checks at the S5 head"), it passed alone in 61.7 s in DejaVu Sans
and in 60.6 s in Inter (2026-11-19), about a third of its 180 s limit. Those
two runs, too, ran the file as the PR opened with it. With the reload
commit's change it passed seven times locally (next subsection). Its times on
CI are below ("First CI run" and "Rule 2").

### The reload check made able to fail

The product review of 2026-11-19 had asked that the reload check be made
able to fail before this PR opened (above, "The check after the answer").
The PR opened without it, and its description said so. The change was made
in this PR on the same day, as one test-only commit: "Redesign A (S5):
r2-flight-wall's reload check can fail — the wall is the choice at the
reload". It changes one file, `tests/browser/journeys/r2-flight-wall.mjs`
(+4 / −2 lines). It was pushed at 19:48:48Z together with rule 2's temporary
commit, so rule 2's 20 CI runs of the journey ran the changed file (below,
"Rule 2").

**What was shown, and by whom.** Two agents, a prover and a skeptic, worked on
the changed journey on 2026-11-19, from about 19:12Z to about 19:46Z, before
the commit was made, at 19:48:18Z. The skeptic was told to refute the change.
Each made its own builds and ran the journey alone and locally, one browser at
a time.

- **It fails when the wall is written.** On a build where `storesLayout`
  returns true for every layout, so that the wall preset is stored, the
  changed journey failed with exactly one failure: "(e) after a reload the
  preset is wall, not the Orbit stored before the wall". The prover's run
  took 73.9 s and the skeptic's 72.4 s, both in DejaVu Sans.
- **The check as it was could not fail.** On the same build the journey as
  the PR opened with it passed: in 67.4 s for the prover and in 71.5 s for
  the skeptic.
- **It passes on the real build.** The changed journey passed 7 of 7 runs:
  63.4, 70.2 and 69.6 s in DejaVu Sans, 65.1 and 64.2 s in Inter, and 99.4 s
  and 83.8 s with the machine loaded on purpose, by three busy-loop
  processes beside it and by a loop of vitest runs beside it. Its limit is
  180 s.
- **Other checks, on the tree with the change, before the commit:**
  `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs`
  98 / 98; `npx vitest run tests/telemetry-layout.test.ts
  tests/repo-hygiene.test.ts` 2 / 2 files, 17 / 17 tests.

The skeptic's verdict was "holds-with-notes". By its reading nothing else
had to change with the journey: not the change map, the shard table, the
comments of `r2-event-jump` or the user guide.

**The limit the skeptic found.** The changed check catches a wall written
at the moment it is chosen. It does not catch a wall written later. The
skeptic made a build that writes every layout, the wall too, 300 ms after
the choice, by a timer. On it the changed journey still passed, in 66.7 s:
the journey reloads about 23 ms after the choice, before that write. The
app writes at the choice (`setLayout` in `src/ui/telemetry.ts`), so this is
a limit of the check, not a fault found in the app.

**The extra check, not added.** The skeptic proposed one more check: at the
end of the wall leg, while the wall is still on, read the stored preset and
expect the preset stored before the wall. It tried the check in a copy of the
journey outside the checkout. There the journey passed on the real build, in
69.2 s, and failed on the build that writes 300 ms late, in 70.3 s, with one
failure: "(e) with the wall on, the stored preset is wall, not the Orbit
stored before it". The session did not add the check to this PR: its own
decision. It is a follow-up (below, "Follow-ups", 3).

**Not run.** For this commit: the full vitest run, the build's budget and any
other journey. By anyone: a late write flushed on `pagehide`, and a wall kept
in `sessionStorage`. The skeptic reasoned that the changed check would catch
both, because the wall is the choice at the reload; neither was built or run.
The runs on the build that stores the wall were in DejaVu Sans only. No CI run
has this commit as its head: rule 2's runs, on the temporary commit after it,
are the first CI runs of the changed file, and the run on the reverted head is
the first normal CI run that holds it (below, "Rule 2").

## Checks at the S5 head

These are the local checks, made before the rebase. "This PR's head", "this
head" and "the S5 head", in this section and wherever this report gives a
local result, a size or a count of lines, are the stacked head: this PR's
three commits on the four commits #224 opened on, as pushed to
`claude/friendly-keller-78iuc9` on 2026-11-19. "S4's head" is the head #224
opened on, those four commits. The sizes were measured on 2026-11-18, on
builds of two earlier commits whose `src/` and `index.html` are those two
heads' (below, "Budget"). What the rebase changed between the stacked
head and the head the PR opened with, the local checks after the rebase,
and CI's own runs are below ("After #224's merge", "First CI run" and "Rule
2"). `r2-flight-wall.mjs` in this section's checks is the file as the PR
opened with it: the reload commit came after them (above, "The reload check
made able to fail").

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
| 7 | Rows 2 to 4 at this PR's head | Passed on 2026-11-19 at this head's code and tests, before the last edits these records had at the stacked head: typecheck; 98 / 98; 363 / 363 files, 10,885 / 10,885 tests (1181.1 s). After those edits, the node tests (98 / 98) and eight vitest files (229 tests) passed again at this head, among them `tests/repo-hygiene.test.ts`, the one vitest file that reads these records and the one the change map runs for a Markdown change |

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

The session split that one raise between the two pull requests. The split is
the session's rule, not the owner's. The owner was asked about it on
2026-11-19, as question 11 (above, "The wall's questions (06:00:35Z and
09:12:37Z)"): ก, the split as built, or ข, S4 raising all the way to the
approved values at once. The owner's answer of that day names no option. The
session read it as leaving the choice to the session, and keeps ก (above,
"The answer (11:21:57Z) and the session's reading"). The owner did not
confirm the split in words of their own. S4's pull request raises each
group S4 crosses to S4's own measured size rounded up to the next 0.5 kB,
never above the approved value, and would leave a group S4 fits under at its
old ceiling. S4 alone crosses all four, so S4's pull request raises all four.
This pull request then raises each of the four from the ceiling S4's pull
request sets to the approved value, in its own budget commit before the wall's
code. So this PR's ceilings are the approved values, not its own sizes
rounded up. For three groups the two are the same. For `index-*.css` the
approved 182.5 kB is 0.5 kB above this PR's size rounded up, 182.0 kB
(181,961 B), which the rules review of 2026-11-19 noted as inside the
approval. The precache total follows its two groups.

| Group | On main `2eb9f0d3` | After S4's PR | After this PR | Named offset |
|---|---|---|---|---|
| `index-*.js` | 2665 kB | 2666.5 kB | **2669.5 kB** | EQ-7 M-PLATFORM-034 |
| `index-*.css` | 180.5 kB | 181.5 kB | **182.5 kB** | EQ-13 M-BUILD-027 |
| `i18n-*.js` | 1737 kB | 1737.5 kB | **1738.5 kB** | EQ-6 M-PLATFORM-031 |
| precache code | 15187 kB | 15192 kB | **15197 kB** | EQ-8 M-PLATFORM-033 |
| precache | 16586 kB | 16591 kB | **16596 kB**, its two groups' sum (data/ unchanged at 1399) | — |

Measured with `npx vite build`, then `node scripts/bundle-budget.mjs`, on
2026-11-18, on builds of two earlier commits of the same source: the trees
measured. Their `src/` and `index.html` are those of S4's head and of this
PR's head, so the table names the sizes by those two heads (the paragraph
after it):

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
`src/` or `index.html` between the trees measured and S4's head and the
stacked head: the journeys' last test changes touch only `tests/` and
`scripts/`, and main `2eb9f0d3`, which those two heads start from, has the
tree of `186dbbab`, on which the measured trees were built. So the sizes hold
at S4's head and at the stacked head. Whether the rebase changed any of those
files is below ("After #224's merge").
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
   those values; it is not a standing raise. With this PR the four ceilings
   reach those values and go no further. D-38 asks for the owner's approval
   in the same PR. By the session's reading, the owner's order of 2026-11-19
   at 15:57:39Z to merge the remaining work is that approval for this PR's
   part (above, "The order to open and merge (15:57:39Z)"); the rules review
   of that day had said of #224 that the owner's merge order is the approval
   of that PR's raise. The order names no ceiling.

The precache total is not one of the four numbers the owner approved. It
follows its two groups, 16591 → 16596 kB (code +5, data/ unchanged at
1399 kB), as at every earlier precache code
raise: `tests/bundle-budget.test.ts` holds code and data/ to no more than the
total. It went to the owner as question 10, and the session read the answer
of 2026-11-19 as leaving it to the session, which takes ก. This report does
not record the total as approved by the owner. By the session's reading, the
owner's order to merge is what approves this PR's raise of it. Every other
ceiling is unchanged.

**What the notes in `budgets.json` say.** This PR's budget commit adds a
passage to five `_notes.set` entries: the four groups and the precache
total. At the stacked head each of the five named the branch as "branch
claude/u-redesign-a-s5, provisional, S5's PR, stacked on S4's", and each of
the four group notes gave the split as "the session's rule for sharing the
one approval between the two PRs (open for the owner)". Both were written
before the questions went to the owner. Neither is true now: the branch name
is taken, the branch is not stacked, and the split is not open (above). The
rules review of 2026-11-19 read S4's four notes, which also called the split
open for the owner, and asked that they be updated (above, "The check after
the answer"). It did not read this PR's. A commit of #224 reworded S4's
clause; what it says now is in the R2.6 report ("Budget: the D-38 raise for
this PR"). That report hands one thing on to this PR: at the rebase this
PR's budget commit meets that clause in the same four notes, and must keep
it ("Follow-ups", 16). It was kept. This PR's five notes were reworded when
the budget commit was first placed on S4's later head, on 2026-11-19 (below,
"After #224's merge"). As the five stand at the head the PR opened with:

- **S4's clause stands as main has it.** Each of the five notes begins with
  main's note, whole and unchanged, and this PR's passage follows it. So in
  the four group notes S4's clause on the split reads as #224 merged it: "By
  the session's rule for sharing the one approval between the two PRs (its
  choice; it was question 11 of the nineteen put to the owner in chat on
  2026-11-19; …)", with the owner's answer and order of that day quoted
  inside the brackets.
- **The clause on the split in this PR's own passage,** in the four group
  notes: "by the session's rule for sharing the one approval between the two
  PRs (its choice; what the owner was asked about it on 2026-11-19, and
  answered, is in S4's entry above)". It read "(open for the owner)".
- **The clause on the branch,** in all five: "branch claude/u-redesign-a-s5,
  S5's PR, which opened after S4's PR #224 merged". It read "branch
  claude/u-redesign-a-s5, provisional, S5's PR, stacked on S4's".

None of this PR's five passages says "provisional", "stacked on S4's" or
"open for the owner" now. No number changed: the five ceilings are those of
the stacked head. One wording of the notes is not exact, and was not changed:
each of the five says that its size was measured "on a build of S5's head
(2026-11-18)", and the four group notes add "on a build of S4's head". The
builds were of two earlier commits of the same source (above).

## D-25 size

D-25 asks for about 400 changed source lines per PR at most, or a written
reason the second reviewer agrees with. This PR's changed lines in `src/` and
`index.html`, by `git diff --numstat` from S4's head to this PR's head:
**+209 / −21, 230 lines**, in eleven files of `src/`; `index.html` is not
changed. With `tests/`, `scripts/` and `.github/`: **+482 / −36, 518
lines** (`tests/` +267 / −9, `scripts/` +6 / −6, `.github/` none).
Row 3 put the one-PR count to the owner: 448 source lines for step 2 as it was
then, with the replaced row design. These counts end at the stacked head. The
reload commit, made after the PR opened, changes one file under `tests/`
(+4 / −2 lines) and nothing in `src/` or `index.html`.

## CI shards: this PR's entry

The five browser shards and their table of CI seconds,
`tests/browser/shard-seconds.json`, came with S4's pull request; the R2.6
report has the section ("CI: five browser shards"). A journey without an entry fails
`tests/browser/shard.test.mjs`, so this PR adds `r2-flight-wall` at 90 s. That
is an estimate: half of the harness's 180 s default (`DEFAULT_TIMEOUT_MS` in
`tests/browser/harness.mjs`), because the journey exports no `timeoutMs`. The
table's `_notes.source` names it among the entries CI had not timed when the
table was made. The
CI commit ("Redesign A (step 2): five browser shards in PR CI and Pages,
balanced by recorded CI seconds") modelled S4's journeys as they were then and
this one: PR CI's longest shard at 21.7–23.6 min of 25 with five balanced
shards, against 43.3–47.0 min with three in turn, and Pages' at 30.1–33.0 min
of 45, against 50.3–59.6 (two models: every journey at its slowest time; the
slowest runner seen × 1.25; step 2's journeys, which CI had not timed then,
from their slowest local times on prototype builds of this design,
2026-11-18). Run again (2026-11-19) with step 2's five journeys at their
local times alone as at this PR's head (the slowest of
DejaVu Sans and Inter: `r2-event-jump` 177.2 s, `r2-transport-fit` 84.5 s,
`r2-transport-fit-launch` 182.4 s, `r2-transport-fit-clock` 128.2 s and
`r2-flight-wall` 61.7 s) on the same shard layouts, the models give PR CI's
longest shard 21.4–23.6 min with five balanced shards, against 41.4–45.3
min with three in turn, and Pages' 26.7–33.0 min, against 48.6–58.1.
These are models' minutes, not measured times. The five browser shards first
ran on GitHub in #224's first CI run, 44522372109, on 2026-11-19 (the R2.6
report, "This PR's first CI run"). This PR's own runs are below ("First CI
run" and "Rule 2"). CI has timed `r2-flight-wall` in them: 47.4 s in the first
run, and 60.8 to 93.2 s in rule 2's 20 runs. Its time in the run on the
reverted head, the first normal run of the changed file, is with that run
(below, "Rule 2", "CI on the reverted head"). The 90 s entry is not changed
in this PR: it stays the estimate it entered at. Refreshing the table from
CI's times, with S4's entries, is a follow-up (below, "Follow-ups", 5).

## After #224's merge: the rebase and this pull request

Rule 1 of the five rules ([HANDOVER-K2](../HANDOVER-K2.md)): no PR starts
from another open PR's branch. So this PR's commits stayed on the stacked
head's branch until #224 had merged. Only then were they pushed to their own
branch, rebased onto main. Two steps of the rebase were made locally before
the merge (below).

**#224's merge.** #224 was squash-merged into main as `0f33d9fc` on
2026-11-19 at 18:59:31Z, on the owner's order of 15:57:39Z as the session
read it. Its tree is that of #224's final head. The Pages run for it,
`deploy.yml` run 44593597570, was created at 18:59:34Z and ended in success;
it was read at 19:29Z, and its last update is of 19:25:08Z. The live site's
`build-info.json`, read at 19:29:54Z, gives the commit `0f33d9f`, built at
2026-11-19T19:01:50.273Z. So #224 is published. The session told the owner
of the merge at 19:01:17Z and of the publication at 19:31:14Z (above, "After
the order: the chat up to this records commit").

**The rebase, in three steps.** All three are of 2026-11-19. Their times are
the checkout's own record, its reflog.

1. **A trial, 17:35:49Z to 17:35:51Z,** while #224 was still open. This PR's
   three commits were placed, one by one, on S4's head of that time, its
   budget notes commit. That commit was local then: it was first pushed with
   S4's records commit (step 2). The budget commit conflicted in
   `budgets.json`; the other two applied clean.
2. **Onto #224's final head, 18:38:13Z to 18:38:14Z.** That head is S4's
   records commit, made at 18:38:01Z and pushed at 18:38:03Z. The trial's
   three commits were rebased onto it; the checkout's record shows three plain
   picks.
3. **Onto main, 18:59:52Z,** after the merge. Main `0f33d9fc` has the tree of
   #224's final head, and the record again shows three plain picks. The tree
   of the last commit equals the tree after step 2 (`5ca222f4`). The local
   branch was then renamed `claude/u-redesign-a-s5` and pushed at 19:00:05Z.
   The three commits kept their subjects.

**What conflicted, and how it was resolved.** Only `budgets.json`, in the
budget commit, at the first step. #224 had reworded the clause on the split
in the four notes of S4's raise, and this PR adds its own passage to the
same notes. A scratch script, not committed, made the file. It starts from
this PR's version, gives S4's clause the base's wording, read from the
base's own note, and rewords this PR's five passages (above, "Budget"). It
then checks the result against the base: only the five ceilings and those
five notes differ, each of the five notes begins with the base's note, and
none of this PR's passages holds the words "provisional", "open for the
owner", "has not confirmed it" or "stacked on S4's". `budgets.json` is the
same file at the head of each of the three steps, and S4's notes are the
same at each of the three bases.

**What differs from the stacked head.** Between the stacked head's tree and
the head the PR opened with, three paths differ: `budgets.json`, in note
strings only and in no number; and S4's two record files as #224 merged
them, `changes/claude-u-redesign-a-step2.md` and
`docs/development/reports/R2.6-event-jump.md`. Nothing under `src/`,
`tests/`, `scripts/` or `.github/` differs, and `index.html` does not. So
the local results and the sizes of the stacked head hold for the code and
the tests of the head the PR opened with (above, "Checks at the S5 head").

**The pull request.** Pull request
[#225](https://github.com/ROYIN001/Orbitlab/pull/225) opened on 2026-11-19
at 19:08:41Z, as a draft, on those three commits, with main `0f33d9fc` as
its base. Its title is "Redesign A (S5): the Engineer flight wall, with
system status and a ground track". The report and the fragment in the branch
were then older than the owner's answer and order of 2026-11-19. The PR's
description said where they were behind it, and named itself the later text
until this records commit. It also said that the reload check could not
fail, and that the follow-up on keeping the preset was not among the
report's follow-ups. Both are changed since (above, "The reload check made
able to fail"; below, "Follow-ups", 6).

**Local checks after the rebase.** On the tree the PR opened with
(`5ca222f4`), on 2026-11-19 at about 19:00Z: `npm run -s typecheck` passed;
`node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs`
98 / 98; `npx vitest run tests/flight-wall.test.ts
tests/telemetry-layout.test.ts tests/repo-hygiene.test.ts
tests/bundle-budget.test.ts` 4 / 4 files, 36 / 36 tests; `npx vite build`
passed; `node scripts/bundle-budget.mjs` ok, with `index-*.js` 2669.3 of
2669.5 kB, `index-*.css` 182.0 of 182.5, `i18n-*.js` 1738.2 of 1738.5,
precache code 15196.9 of 15197.0 and precache 16316.1 of 16596.0. No full
vitest run and no browser journey ran on that tree: it differs from the
stacked head's only in the three paths above. The reload commit's own checks
are above ("The reload check made able to fail"), and the temporary
commit's are below ("Rule 2"). The tree after the revert is the reload
commit's (below, "Rule 2"), and this records commit adds Markdown only. On
its tree, the final one:

On 2026-11-19 at about 22:32Z, with the three Markdown files of this commit
in place: `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs`
passed 98 / 98; `npx vitest run tests/repo-hygiene.test.ts` passed
1 / 1 file, 9 / 9 tests; `npx vitest run tests/telemetry-layout.test.ts`
passed 1 / 1 file, 8 / 8 tests. No build, no full vitest run and no
browser journey ran locally on this tree.

## First CI run

The five browser shards came with #224, and first ran on GitHub in its first
CI run (the R2.6 report, "This PR's first CI run"). With this PR the smoke
list is 26 journeys: S4's 25 and `r2-flight-wall` (above, "Checks at the S5
head").

This PR's first CI run is
[44595245579](https://github.com/ROYIN001/Orbitlab/actions/runs/44595245579),
on the `pull_request` event, on the head the PR opened with. It started on
2026-11-19 at 19:08:46Z and ended at 19:28:54Z, by GitHub's times for the
run. All 12 jobs passed: `plan`, `typecheck`, `build`, `test` 1 to 3,
`browser-smoke` 1 to 5 and `verify`. `verify` counted 10,885 of 10,885 unit
tests and 26 of 26 browser journeys, with none missing, unexpected,
duplicate or failing, in Chromium 153.0.8010.12.

Each shard's journeys, from its job's log:

| Shard | Passed | Seconds | Its journeys, each with its seconds |
|---|---|---|---|
| 1 | 3 / 3 | 996.0 | `notation-defaults` 31.4, `r2-shell-smoke` 48.3, `r2-viewport-matrix` 900.7 |
| 2 | 6 / 6 | 875.0 | `launch-explore` 111.1, `mobile-smoke` 21.3, `profile-session-safety` 103.5, `r2-viewport-scene-floor` 350.5, `stage2-preflight` 124.8, `watch-controls` 132.7 |
| 3 | 6 / 6 | 452.5 | `gesture-ownership` 18.3, `r2-event-jump` 178.2, `r2-transport-fit` 78.8, `satellite` 24.4, `structure-entries` 57.9, `workspace-navigation` 60.1 |
| 4 | 5 / 5 | 393.4 | `r2-flight-wall` 47.4, `r2-transport-fit-clock` 106.9, `structure-assembly` 173.3, `teaching-held` 35.1, `webgl-startup` 24.0 |
| 5 | 6 / 6 | 550.3 | `experiment-notebook` 34.6, `learner-profiles` 134.4, `project-backups` 67.9, `r2-chooser-late-frame` 23.7, `r2-transport-fit-launch` 169.3, `structure-failures` 93.4 |

- **`r2-flight-wall`** ran in shard 4 and took 47.4 s of its 180 s limit. It
  is the journey's first time on CI. The shard table's estimate for it is
  90 s.
- **`r2-event-jump`** ran in shard 3 and took 178.2 s of its 600 s limit.
- **`r2-viewport-matrix`** ran in shard 1 and took 900.7 s of its own 1200 s
  limit. The condition told to the owner at 16:31:25Z stops the merge at a
  run past 17 minutes, which are 1020 s: this run is under it. Shard 1's log
  runs from 19:11:23Z to 19:28:31Z. The session gave the owner the journey's
  time at 19:31:14Z, as 15.0 minutes and about 2 minutes from the condition
  (above, "After the order: the chat up to this records commit").

The run tested `r2-flight-wall` as the PR opened with it. The reload commit
came after it.

## Rule 2

Rule 2 of the five rules ([HANDOVER-K2](../HANDOVER-K2.md)): a new or changed
journey runs 20 times on CI before merge. This PR's new journey is
`r2-flight-wall`. The PR also changes the file of S4's `r2-event-jump`: two
comment passages that name `r2-flight-wall`, and no check (above, "What was
built"). The session counts that as a changed journey: the rule makes no
exception for comments, and `r2-flight-wall` imports `liftoffJump`,
`setLanguage` and `shortLabel` from that file. So both journeys got their 20
runs on this PR's branch. The runs of `r2-event-jump` in #224 ran the file as
S4 has it (the R2.6 report, "Rule 2"). Both are smoke journeys, so they run
on PR CI. `r2-event-jump` sets its own limit of 600 s; `r2-flight-wall` sets
none, so its limit is the harness's 180 s. The reload commit changed
`r2-flight-wall`'s file before the runs (above, "The reload check made able
to fail"), so all 20 of its runs ran the changed file.

**Result.** 40 of 40 journey runs passed, in two CI runs on 2026-11-19:
`r2-flight-wall` 20 of 20, in 60.8 to 93.2 s, and `r2-event-jump` 20 of 20,
in 171.6 to 299.8 s. No job was run again.

**The method.** It is step 1's and #224's: a temporary commit makes CI's
smoke shards run only the journeys under rule 2, and is reverted before
merge. The R2.6 report describes its first use with five shards ("Rule 2").
Here the commit is "TEMPORARY (rule 2 evidence, reverted before merge): CI's
smoke shards run only S5's two journeys, 10 of each a run" (`6136e6ef`). It
changed `tests/browser/run.mjs` only (+9 / −1 lines), and only on CI
(`GITHUB_ACTIONS`). There a smoke run with no journey names ran, in each of
the five shards, `r2-event-jump` twice and `r2-flight-wall` twice, in place
of the shard's own list. So one CI run ran each journey 10 times, and two CI
runs gave 20 of each.

Before the push, on the temporary tree: `node --check tests/browser/run.mjs`
passed; with `GITHUB_ACTIONS=true`, `node tests/browser/run.mjs --smoke
--shard=2/5 --list` printed `r2-event-jump` twice and `r2-flight-wall` twice,
and `--shard=2/3` threw; without `GITHUB_ACTIONS`, shard 4/5 listed its own
five journeys; and the node tests passed 98 / 98, both with and without
`GITHUB_ACTIONS=true`.

The temporary commit was pushed at 19:48:48Z, together with the reload
commit before it. So no CI run has the reload commit as its head.

**The two runs.** Both ran on the temporary commit. The first is the PR's own
run on that push. The second is a `workflow_dispatch` run of `ci.yml` on the
branch. The session ordered it at 20:05:50Z, by its own record of the call,
after the first run's last job, `verify`, had ended: CI's concurrency group
cancels a run in progress when another starts. Its message of 20:06:29Z gave
the owner that time as 20:05:48Z. Start and end are GitHub's times for the
run. Each shard's cell is its own summary line, "N/N journeys passed in S s".

| # | Run | Event | Start | End | Shard 1 | Shard 2 | Shard 3 | Shard 4 | Shard 5 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | [44602209942](https://github.com/ROYIN001/Orbitlab/actions/runs/44602209942) | `pull_request` | 19:48:54Z | 20:05:41Z | 4 / 4, 480.2 s | 4 / 4, 658.6 s | 4 / 4, 669.6 s | 4 / 4, 565.0 s | 4 / 4, 789.9 s |
| 2 | [44605119278](https://github.com/ROYIN001/Orbitlab/actions/runs/44605119278) | `workflow_dispatch` | 20:05:51Z | 20:22:20Z | 4 / 4, 486.8 s | 4 / 4, 666.4 s | 4 / 4, 561.5 s | 4 / 4, 671.0 s | 4 / 4, 788.5 s |

Each journey's 20 times, in seconds, in shard order 1 to 5. Each shard ran
the journey twice, and its first run is given first:

| Journey | Run 1 | Run 2 | Passed | Range | Limit |
|---|---|---|---|---|---|
| `r2-event-jump` | 171.6, 171.9, 249.3, 241.5, 248.2, 244.0, 209.0, 204.1, 299.8, 290.7 | 172.7, 177.5, 249.6, 240.5, 202.0, 204.4, 253.5, 245.8, 298.0, 287.6 | 20 of 20 | 171.6 to 299.8 s | 600 s |
| `r2-flight-wall` | 60.8, 60.9, 74.3, 77.2, 80.4, 82.9, 69.2, 68.9, 89.4, 93.2 | 61.7, 62.1, 79.9, 79.4, 72.3, 68.4, 81.7, 74.1, 93.1, 91.3 | 20 of 20 | 60.8 to 93.2 s | 180 s |

None of the 40 journey runs failed. In each of the two runs shard 5 was the
slowest and shard 1 the fastest. The numbers were read by a script from the
twelve raw job logs of the two runs, six a run. Each run was also checked
against the plan from its logs: every shard ran its planned list of four,
and every journey in it passed. The source hash in `verify`'s notice line is
the same in both runs (`12ebde89…`): the same source tree.

**The other jobs.** In both runs `plan`, `typecheck`, `build` and `test` 1
to 3 passed: 6 of each run's 12 jobs. `verify`'s own record of the job
results says so in both: plan, typecheck, test and build success, browser
failure. It counted 10,885 of 10,885 unit tests in each run, with none
failing.

**Red by design.** On the temporary commit CI's five `browser-smoke` jobs and
`verify` failed whatever the journeys did: 6 failed jobs of 12 in each run.
The browser runner and the aggregate compare the journeys that ran with the
plan's list for each shard, and here they differed in every shard. After its
"4/4 journeys passed" line each shard reported "Executed browser journeys
differs from the verification plan" and exited 1. `verify` reported
"Coverage mismatch: 24 missing, 0 unexpected, 18 duplicate": of the 26 smoke
journeys it expected, 2 ran and 24 did not, the repeats of the two count as
18 duplicates, and none was failing. It listed 12 issues in each run, all of
them from the temporary plan. So a red job said nothing about a journey.
What counts is each journey's own line in its shard's log, a tick with its
seconds, and the shard's summary. Neither run ran `r2-viewport-matrix`.

The session posted one comment on the PR on these red checks, at 20:02:13Z
by GitHub's time for the comment, when the first shard had ended red
([comment](https://github.com/ROYIN001/Orbitlab/pull/225#issuecomment-7020697946)).
It says that the red checks on the temporary commit are by design, gives
shard 1's four results, and names what ends them, the revert. It posted no
second comment for the other red jobs.

**How a real failure would have shown.** In three places: a line for the
journey below the shard's "N/N journeys passed"; an error annotation titled
`browser journey <name>`; and "Failed or incomplete browser journeys" in
`verify`. None of the three is in any of the twelve logs. On a failure the
cause is found first, with no longer timeout and no blind re-run
([SESSION-PROTOCOL.md](../SESSION-PROTOCOL.md) §7). None came.

**The revert.** When the second run had been read from its logs and found on
plan, the temporary commit was reverted, by the commit
`Revert "TEMPORARY (rule 2 evidence, reverted before merge): CI's smoke shards run only S5's two journeys, 10 of each a run"`,
made on 2026-11-19 at 20:22:59Z and pushed alone at 20:23:04Z. With it
`tests/browser/run.mjs` is again as it was before the temporary commit. The
tree after the revert equals the tree of the reload commit (`a7b26332`),
which is the commit before the temporary one. So against the head the PR
opened with, the reverted head differs in one file,
`tests/browser/journeys/r2-flight-wall.mjs`.

**CI on the reverted head.** The push of the revert started a normal CI run on
the PR, the first that holds the changed journey file. In a normal run
`browser-smoke` and `verify` must pass like every other job, and
`r2-viewport-matrix` runs once, so the condition of 17 minutes applies to this
run.

The run is
[44608133796](https://github.com/ROYIN001/Orbitlab/actions/runs/44608133796),
on the `pull_request` event, on the reverted head. It started on 2026-11-19
at 20:23:11Z and ended at 20:45:30Z, by GitHub's times for the run. All 12
jobs passed: `plan`, `typecheck`, `build`, `test` 1 to 3, `browser-smoke` 1
to 5 and `verify`. `verify` counted 10,885 of 10,885 unit tests and 26 of 26
browser journeys, with none missing, unexpected, duplicate or failing, in
Chromium 153.0.8010.12.

Each shard's journeys, from its job's log:

| Shard | Passed | Seconds | Its journeys, each with its seconds |
|---|---|---|---|
| 1 | 3 / 3 | 954.4 | `notation-defaults` 32.6, `r2-shell-smoke` 46.2, `r2-viewport-matrix` 860.9 |
| 2 | 6 / 6 | 1117.7 | `launch-explore` 146.5, `mobile-smoke` 24.3, `profile-session-safety` 120.5, `r2-viewport-scene-floor` 457.7, `stage2-preflight` 161.5, `watch-controls` 163.5 |
| 3 | 6 / 6 | 445.3 | `gesture-ownership` 16.6, `r2-event-jump` 172.5, `r2-transport-fit` 75.4, `satellite` 24.9, `structure-entries` 56.7, `workspace-navigation` 57.5 |
| 4 | 5 / 5 | 430.3 | `r2-flight-wall` 54.1, `r2-transport-fit-clock` 110.7, `structure-assembly` 192.0, `teaching-held` 40.1, `webgl-startup` 26.3 |
| 5 | 6 / 6 | 544.5 | `experiment-notebook` 38.9, `learner-profiles` 131.8, `project-backups` 68.3, `r2-chooser-late-frame` 23.7, `r2-transport-fit-launch` 163.5, `structure-failures` 97.3 |

- **`r2-flight-wall`** ran in shard 4 and took 54.1 s of its 180 s limit. It
  is the journey's first normal CI run with the changed reload check.
- **`r2-event-jump`** ran in shard 3 and took 172.5 s of its 600 s limit.
- **`r2-viewport-matrix`** ran in shard 1 and took 860.9 s of its own 1200 s
  limit, under the condition's 1020 s.
- Seen, and not one of the conditions that stop the merge: shard 2 took
  1117.7 s in this run by its own total line, against 875.0 s in the first
  run, and each of its six journeys was slower than in the first run. Its job ran from 20:25:48Z to 20:45:03Z;
  the `browser-smoke` job's limit is 25 minutes (`ci.yml`). No cause was
  looked for beyond that. The session told the owner at 20:46:41Z (above,
  "After the order: the chat up to this records commit").

**After the revert.** This records commit comes after that run, and it is
the head that merges. It changes three Markdown files and nothing else: this
report, the fragment, and one row of `docs/IMPLEMENTATION-STATUS.md`. CI runs
on it too, because the PR holds files that are not Markdown (`ci.yml`'s path
filter). The run on this commit cannot be named in the records it tests: the
PR's description and the session's message to the owner before the merge
give it, with the seconds `r2-viewport-matrix` took in it.

## Questions that were open for the owner

None of these is open now. They were open when this report was first written.
All five went to the owner on 2026-11-19, as questions 8, 11, 10, 9 and 19
(above, "The wall's questions (06:00:35Z and 09:12:37Z)"). On the owner's
answer of that day the session takes ก, its recommended option, in each: its
own choice on the owner's delegation, not the owner's pick of an option. The
owner could reverse any of them until the merge.

On this PR's opening, at 19:11:39Z, the session told the owner in words
what it reads the order of 15:57:39Z as approving for this PR: this PR's
part of the raise, with the precache total; the wall's look; the one changed
assertion; the lines in other lanes' files; and what this build stores. It
asked for a message if any of them is not wanted, and said that it would
then stop the merge (above, "After the order: the chat up to this records
commit"). The owner wrote twice after that, at 21:16:48Z and 21:17:43Z, and
neither message speaks of any of the five (the same section).

Each question keeps its text below, for the record, and ends with its
outcome. "Question N" in an outcome is the chat's number, 1 to 19, not this
list's. Seven screenshots of step 2, one of them of the wall (Engineer in
Thai at 1440×900, taken on a build of this PR's code), were sent to the
owner in chat on 2026-11-19 at 05:59:57Z, and thirteen questions on both PRs
after them at 06:00:35Z, among them 1 to 4 below; 5 followed at 09:12:37Z,
with the rest of S4's.

1. **The branch name.** Proposed: `claude/u-redesign-a-s5`, as
   SESSION-PROTOCOL.md §5 names a step's branch. The other name considered:
   `claude/u-redesign-a-wall`. The fragment's name follows the branch.
   **Outcome:** taken as ก, `claude/u-redesign-a-s5` (question 8).
2. **The split of the D-38 raise:** S4's pull request raises the four groups
   to S4's own measured sizes rounded up to the next 0.5 kB (2666.5, 181.5,
   1737.5 and 15192 kB); this one raises them from there to the approved
   values. The session chose it so that each pull request carries its own
   measured size, as D-38 asks. **Outcome:** taken as ก, the split as built
   (question 11).
3. **The precache total,** 16586 → 16591 kB in S4's pull request and
   16591 → 16596 kB in this one. It follows the approved precache code
   ceiling, as at every earlier precache code raise; it is not one of the four
   numbers in row 2. **Outcome:** taken as ก (question 10). The total is not
   recorded as approved by the owner (above, "Budget").
4. **Where the CI change goes:** whether the five browser shards stay in S4's
   pull request or get one of their own was open in the R2.6 report. This PR's
   one table entry needs the table either way. **Outcome:** taken as ก, in
   S4's pull request (question 9; the R2.6 report, "Questions for the
   owner").
5. **Two things about the wall that no row asked:** the wall preset is not
   kept after a reload (so builds before this one keep a stored custom list),
   and the mockup's tab strip is not built (the Cards select stays the one
   control). **Outcome:** both taken as ก, as built (question 19; below,
   "Follow-ups", 6 and 7).

## Follow-ups

S18 §18.7 asks that every hand-off has an owner, which lane I checks again at
the next gate, and S18 §18.12 that the report lists its hand-offs with their
owners. So each item ends with an owner: a lane, by the write sets of S18
§18.2, and a plan item where one fits. Every owner named here is the
session's proposal. None is agreed with a lane or placed by lane I yet. Items
1 and 2 were named to the owner on 2026-11-15 (above, "Seen, not changed")
and again on 2026-11-19 at 06:00:35Z, among the problems the site already
has. Items 6 and 7 are the two points of question 19. Item 3 is what is left
of an earlier item. When this report was first written, the reload check
that could not fail was a follow-up; it was fixed in this PR (above, "The
reload check made able to fail"), and item 3 is the one more check the
session did not add.

None of the eight is started. The owner wrote at 21:17:43Z to open no new work
for now, and at 21:18:11Z the session told the owner that it starts no new
work (above, "After the order: the chat up to this records commit"). By that
the session starts none of items 1 to 7 now: each would be new work. That is
the session's reading of the owner's message. Item 8, the records PR, the
session counts as part of the work to finish, and it told the owner so in the
same message.

1. Stacked identical lines in `#ticker` (above, "Seen, not changed"); on the
   published site. *Owner (proposal):* lane U, as `updateTicker` is in
   `src/ui/hud.ts`: a bug fix of its own, with a failing test first, or with
   M-LAUNCH-053 (R2.5), which works on the same function. If the lines are
   to be merged where the events are made, lane P (`src/physics/**`).
2. The charts' time-axis end labels overlap (above); on main. *Owner
   (proposal):* lane U, as the label is drawn in `src/ui/charts.ts`: a bug
   fix of its own. No plan item names it.
3. One more check in `r2-flight-wall`'s reload leg: at the end of the wall
   leg, while the wall is still on, read the stored preset and expect the
   preset stored before the wall. The reload check as this PR changed it
   catches a wall written at the choice, and not one written later (above,
   "The reload check made able to fail"). The skeptic proposed the check
   and tried it in a copy of the journey outside the checkout: it passed on
   the real build and failed on a build that writes late. The session did
   not add it. *Trigger:* the write of the layout is ever
   deferred (today `setLayout` writes at the choice), or the wall preset
   becomes stored (item 6), which changes what the leg must expect. *Owner
   (proposal):* this session, as the journey is this PR's: a
   quality-improving PR of its own, whose changed journey then needs rule
   2's 20 CI runs. It is new work, and it is not started (above).
4. The 1 px overflow of `#telemetry` at Russian 320×740, from the heading's
   range toggle (above). *Owner (proposal):* lane I, as the rules are
   `src/style.css`'s (`.telemetry-heading`, `.range-toggle`), with lane U,
   whose `src/ui/telemetry.ts` builds the heading. The fix is a design choice
   first (above). No plan item names it.
5. Refresh `r2-flight-wall`'s entry in `tests/browser/shard-seconds.json`
   from CI's times, with S4's entries. It stays at its 90 s estimate in this
   PR. CI has timed the journey in this PR's runs: 47.4 s in the first run,
   54.1 s on the reverted head, and 60.8 to 93.2 s in rule 2's 20 (above,
   "First CI run" and "Rule 2").
   Rule 2's 20 are not a normal shard's times: there each shard ran only the
   two journeys, twice each. *Owner (proposal):* lane T, whose
   `tests/browser/shard.mjs` reads the table, in the PR that refreshes it
   for S4's journeys (the R2.6 report, "Follow-ups", 11).
6. Keep the wall preset after a reload: "store it one release later". This
   build reads `wall` and never writes it, so that a build before this one,
   which resets the stored custom list on a preset it does not know, never
   meets it (above, "What was built", Storage). *Trigger:* the code's own
   note gives it, "store it one release after this reader has shipped"
   (`storesLayout`, `src/ui/telemetry-layout.ts`). This build is that
   reader. The change then is `storesLayout`, its unit test, the guide's
   sentence, the row of `docs/IMPLEMENTATION-STATUS.md`, and the journey's
   reload leg, which must then expect the wall after the reload. The product
   review of 2026-11-19 asked for this follow-up, with its trigger, before
   the PR opened; it is written with this records commit, after the opening
   (above, "The check after the answer"). *Owner
   (proposal):* lane U, as `src/ui/telemetry-layout.ts` is in its write set,
   with lane S for the stored layout's format (S18 §18.3.5). No plan item
   names it. The card presets were R2.3 step 1 (M-LAUNCH-013); its step 2,
   M-LAUNCH-014, is open.
7. The mockup's tab strip (above, "What was built"). *Owner (proposal):* none
   while it stands as built (question 19 ก). If the owner reverses it: lane
   U for the panel, with the hook and the styles through lane I, and a new
   raise from the owner under D-38, since this PR leaves 194 B under
   `index-*.js`'s ceiling and 105 B under precache code's (above, "Budget").
8. The records PR. This PR's fragment is folded into `CHANGELOG.md` and
   `PROGRESS.md`, and the rows of `docs/DECISIONS.md` for the owner's words
   quoted here are written, in a records PR within one working day of Pages
   ([SESSION-PROTOCOL.md](../SESSION-PROTOCOL.md) §3 and §4). *Owner:* this
   session makes it, unless the owner says no. The files are lane I's, and
   by §3 and §4 the PR is the integration session's work. The session reads
   the owner's order of 2026-11-19 as covering that PR too, the weakest part
   of its reading, and told the owner so at 16:04:00Z (above, "The order to
   open and merge (15:57:39Z)").
   At 17:07:43Z it told the owner that it had looked at the earlier records
   PR, #216, as a model: there the session that had done the work folded its
   own PR's records when the owner ordered it, which the session read as
   agreeing with this. The owner's message of 21:17:43Z, to carry on to the
   end and open no new work for now, does not say whether the records PR is
   part of "to the end" or is new work. At 21:17:01Z the session had listed it
   as item 4 of the work left, as its own reading, to be skipped if the owner
   says so. At 21:18:11Z it told the owner that it counts it as part of the
   listed work, and that a word from the owner drops it (above, "After the
   order: the chat up to this records commit"). That is the session's reading,
   not the owner's words.

## What was not checked

- The owner's own view of the wall's look and of the questions that decide
  this PR. The owner was sent two pictures of the wall on 2026-11-15 (above)
  and screenshot E on 2026-11-19. The answer of 2026-11-19 names no option
  and no picture, and the order of 15:57:39Z names no picture and no
  ceiling. ก in each question is the session's choice on the owner's
  delegation, and the wall's look has no approval in the owner's own words:
  the session relies on the order to merge (above, "The owner's words of
  2026-11-19").
- The owner's answer to the session's reading of the order. The session sent
  the reading at 16:04:00Z. At 19:11:39Z it told the owner in words that it
  reads the order as the approval of five things of this PR: its part of the
  raise, with the precache total; the wall's look; the one changed assertion;
  the lines in other lanes' files; and what this build stores. The owner wrote
  twice after the order, at 21:16:48Z and 21:17:43Z, and neither message
  speaks of the reading or of any of the five (above, "After the order: the
  chat up to this records commit"). The chat was read up to 22:32:37Z on
  2026-11-19; the owner wrote nothing after 21:17:43Z.
- The wall in a device's own fonts, in a picture for the owner: screenshot E
  shows the online look, IBM Plex, only. Offline is the default.
- The twelve-situation browser measurement and the Russian name's widths at
  this PR's head: both are from builds of 2026-11-14, in Inter (above).
  `r2-flight-wall` checks the rows, the legend, the page width and the track's
  name at 390 and 320 px in TH and RU.
- A sabotage of the six rows in the journey (for example a wrong replay cut):
  not known whether one was run; the unit tests cover the cut.
- The reload check against a write made later than the choice. On a build that
  writes every layout 300 ms after the choice the changed journey passes, and
  the check that would catch it was not added (follow-up 3). Not built or run
  by anyone: a late write flushed on `pagehide`, and a wall kept in
  `sessionStorage`; the skeptic reasoned that the changed check would catch
  both. The runs on the build that stores the wall were in DejaVu Sans only
  (above, "The reload check made able to fail").
- For the reload commit: the full vitest run, the build's budget and any
  other journey. No CI run has that commit as its head. The first normal CI
  run that holds it is the one on the reverted head (above, "Rule 2").
- Whether it is acceptable that the comparison and the event log begin below
  the panel's first screen in the wall preset: not judged. That is how the
  build of 2026-11-14 measured in every situation, in Inter (above, "Measured
  in a browser"). In screenshot E, on the stacked head's code at 1440×900 in
  Thai and IBM Plex, the comparison's heading and its three buttons are in
  view at the bottom of the panel. Why the two differ, the build or the font,
  is not known.
- The 1 px overflow at Russian 320 px on main (compared by CSS only).
- Older builds reading a stored layout written by this build, in a real
  browser: covered by the unit test of a stored custom list, not by a journey.
- Screen-reader output of the marks and of the track canvas's label: not
  checked with a screen reader.
- Real phones and tablets, and browsers other than Chromium.
- `npm run test:heavy` and `npm run test:sixdof-fleet`, and the 6 held
  journeys.
- The Pages gate's five shards with this PR's journey. CI on the PR runs the
  smoke journeys only. The Pages workflow runs every journey that is not
  held, and proceeds only at main's tip (`deploy.yml`'s `plan` job), so its
  five lists first run with `r2-flight-wall` after the merge.
- A build, the full vitest run and any browser journey on the tree of this
  records commit, locally. They ran at the stacked head, whose code and tests
  are those of the head the PR opened with (above, "Checks at the S5 head" and
  "After #224's merge"). Outside Markdown, the final tree differs from that
  head in one file, `tests/browser/journeys/r2-flight-wall.mjs`, as the reload
  commit left it. That file ran locally seven times on the real build, on the
  tree with the change before it was committed, and 20 times on CI in rule 2
  (above, "The reload check made able to fail" and "Rule 2"). On the tree the
  PR opened with only the checks of "Local checks after the rebase" ran, a
  build and its budget among them, and on the final tree only the node
  verification tests and two vitest files (above, "After #224's merge", its
  end). The rest is CI's run on the final head, which these records cannot
  name (above, "Rule 2").
- The seconds `r2-viewport-matrix` takes in the CI run on the head that
  merges, against the condition of 17 minutes: later than these records.
