# R1 small UI changes / งานเล็กที่ผู้ใช้อนุญาต

Date: 2026-10-03. Starting main: `523b44e`. Implementation authorization: R1 plus small changes; no authorization inferred for the whole R2/R4 programme.

## Implemented

- **U08:** Removed the visible reset-camera button from `index.html` and its `main.ts` binding. Internal mission/framing camera resets remain functional. Gesture owner verified absence in the production browser journey.
- **U09:** Engineer notation selector contains only ISO / GOST. The effective selection follows the existing implicit EN/TH→ISO, RU→GOST default until a deliberate override; legacy stored `auto` remains an internal compatible preference. Manual overrides still survive language changes/reload. Removed obsolete translation keys for the removed controls and clarified the default/override explanation in EN/TH/RU.
- **U16 display labels:** Full/compact HUD and onboard percentage labels explicitly describe throttle command. Actual thrust in kN is unchanged. This does not change a vehicle throttle programme or claim validation of the reported Soyuz flight.
- **R1.4 support:** Added fuel-depletion event/note translations and generalized aborted-docking details so fuel depletion is not falsely described as a second failed contact.

## Verification actually run

- `npx vitest run tests/notation.test.ts tests/i18n.test.ts`: 2 files / 28 tests passed after removing orphan keys and teaching the dictionary scanner to distinguish helper imports outside the dictionary directory. Dictionary composition, key/placeholder parity and source call-site checks are retained.
- Production `notation-defaults` browser journey: passed using actual EN/RU/TH language controls, implicit defaults, explicit GOST override and reload. No flight simulation or Max-Q correctness is inferred from this UI test.
- R1.3 production browser journey verified that the reset-camera button is absent and canvas controls continue to work. See [R1.3 report](R1.3-gestures.md).
- Overall final source build/budget/CI remains part of the integration report. Bootstrap/chunk grouping growth was accounted for explicitly in budgets; the corrected-physics production build and all bundle gates now pass. Current-candidate CI/release acceptance remains pending.

## Handoff: still planned

Full R2.1 Engineer layout/lifecycle/telemetry presentation remains pending. Full R2.2 Watch CameraPolicy remains pending. U16 actual per-engine readouts, command-vs-actual schema across all exports, and source-supported Max-Q/throttle profile physics remain R2/R4 tasks. Do not implement those again under the assumption that labels completed the whole requirement.
