---
package: CO-4
step: s2
items: [M-LAUNCH-011]
priority: P1
change_kind: bug-fix (stale copy that contradicts the shipped camera behaviour)
owner_authorization: 'D-65, owner, 2026-10-05: "เมื่อทำการ merge แล้วตรวจสอบว่าทุกอย่างเรียบร้อยแล้วในระยะ K0 ให้เริ่มทำระยะ K1 ในเซสชั่นใหม่ต่อได้เลยครับ ใช้ model opus5.5 high"'
decisions: []
base: 4de951f (origin/main)
branch: claude/i-co4-s2
wave_lane: K1 / I
status: In PR; not merged; not published
---

# CO-4 step 2 — the camera dialog says what the camera does (M-LAUNCH-011)

## What was wrong on `4de951f`

The camera-sequence dialog (`CameraDialog`, `src/ui/dialogs.ts`) opens with
`cam.intro`:

- en: "Choose a view for each flight phase. A manual choice lasts until the next phase begins."
- th: "เลือกมุมมองสำหรับแต่ละช่วงของการบิน การเลือกเองจะมีผลจนกว่าจะเข้าสู่ช่วงถัดไป"
- ru: "Выберите вид для каждого этапа полёта. Ручной выбор действует до начала следующего этапа."

That was the rule before R2.2. Since R2.2 ([ADR-CameraPolicy](../adr/camera-policy.md))
a view the user picks (a tab, keys 1–4, WebMCP `set_camera`) makes the camera
manual, `CameraPolicy.onPhase` leaves it alone at every phase change, and only
Cinematic (`#btn-cinematic` → `resume`) or the dialog's own switch
(`#auto-camera` → `setAuto(true)`, the same state) hands it back to the
programme.

## The fix

`cam.intro` in the three dictionaries; nothing else changed:

| | before | after | chars | UTF-8 bytes |
|---|---|---|---|---|
| en | … A manual choice lasts until the next phase begins. | … A manual choice lasts until you pick Cinematic. | 87 → 84 | 87 → 84 |
| th | … การเลือกเองจะมีผลจนกว่าจะเข้าสู่ช่วงถัดไป | … การเลือกเองจะมีผลจนกว่าจะกด “อัตโนมัติ” | 77 → 75 | 229 → 221 |
| ru | … Ручной выбор действует до начала следующего этапа. | … Ручной выбор действует, пока не нажмёте «Авто». | 89 → 86 | 164 → 157 |

The first sentence (the per-phase programme the dialog edits) is unchanged.
The control is named by its own label in each language (`ctl.camera.cinematic`:
Cinematic / อัตโนมัติ / Авто). In TH and RU that label also echoes the
dialog's switch ("สลับมุมกล้องอัตโนมัติ", "Переключать камеры автоматически"),
which ends a manual choice too, so the sentence is true of both. No new keys.

## Tests

Written first and committed alone (`ee3bfcf`): `tests/camera-dialog-copy.test.ts`
renders the real `CameraDialog` with a few fake DOM nodes in EN, TH and RU,
wired to a real `CameraPolicy` the way `src/main.ts` wires it. It checks that
the lead does not end a manual choice at the next phase, that it names the
Cinematic control by that control's label, that it is no longer than before
(characters and bytes), and that the policy keeps a picked view through every
phase the dialog lists until the dialog's switch or Cinematic hands it back.

Failing before the fix (`ee3bfcf`, `npx vitest run tests/camera-dialog-copy.test.ts`):

```
× the lead does not end a manual choice at the next phase (en)
× the lead names the control that ends a manual choice, by its own label (en)
× the lead does not end a manual choice at the next phase (th)
× the lead names the control that ends a manual choice, by its own label (th)
× the lead does not end a manual choice at the next phase (ru)
× the lead names the control that ends a manual choice, by its own label (ru)
AssertionError: expected 'Choose a view for each flight phase. …' not to match /next phase/i
AssertionError: expected 'Choose a view for each flight phase. …' to contain 'Cinematic'
AssertionError: expected 'เลือกมุมมองสำหรับแต่ละช่วงของการบิน ก…' not to match /ช่วงถัดไป/
AssertionError: expected 'เลือกมุมมองสำหรับแต่ละช่วงของการบิน ก…' to contain 'อัตโนมัติ'
AssertionError: expected 'Выберите вид для каждого этапа полёта…' not to match /следующ\S* этап/i
AssertionError: expected 'Выберите вид для каждого этапа полёта…' to contain 'Авто'
Tests  6 failed | 4 passed (10)
```

The four passing before are guards: the three length limits and the
behaviour check (the policy already did what the new copy says).

Run on the branch head:

- `npx vitest run tests/camera-dialog-copy.test.ts tests/camera-policy.test.ts tests/i18n.test.ts
  tests/i18n-counts.test.ts tests/architecture.test.ts tests/repo-hygiene.test.ts tests/camera-gestures.test.ts`:
  7 files, 63/63.
- `npm run -s typecheck`: clean.
- `node --test tests/verification/*.test.mjs tests/browser/shard.test.mjs`: 73/73.
- No committed journey opens the camera dialog. Ad-hoc browser check on the
  branch build (not committed; Chromium, Launch Engineer, EN/TH/RU): pick a
  view tab → Cinematic shows `aria-pressed=false`; open the dialog → the lead
  reads the new sentence and contains the Cinematic button's label, the switch
  is off; turn the switch on → Cinematic `aria-pressed=true`. All three
  languages passed, no page errors. The R2.2 behaviour itself is unchanged
  and stays covered by `r2-flight-shell` (CI).

## Size

`npx vite build; node scripts/bundle-budget.mjs`, `origin/main` (`4de951f`) against the branch:

| group | main | branch | delta |
|---|---|---|---|
| i18n-*.js | 1 724 676 B | 1 724 658 B | −18 B |
| index-*.js | 2 633 274 B | 2 633 274 B | 0 |
| index-*.css | 176 994 B | 176 994 B | 0 |
| precache code | 14 693.3 kB | 14 693.3 kB | 0.0 |

Every other file in `dist/` is the same size. Budget: ok. `budgets.json` not edited.

## Records

Not edited: `CHANGELOG.md`, `docs/development/PROGRESS.md`. The fragment is
`changes/claude-i-co4-s2.md`. The package's step-1 report,
[CO-4-r2-fixes.md](CO-4-r2-fixes.md), is left as it is so that parallel CO-4
steps do not edit one file.
