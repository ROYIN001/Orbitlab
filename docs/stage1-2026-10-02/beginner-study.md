# Orbitlab Stage 1: beginner journey review and novice study protocol

Date: 2026-10-02. Repository: `/workspace/Orbitlab`, commit `91ee372e222e3c0496c57f6590e1ccece03a9079`.

## Evidence boundary

This is a **read-only source and existing-test review**, not an observation of novice users. No people were contacted, no usability sessions were conducted, no browser processes or tests were started for this review, and no repository files were changed. Code facts below establish what the implementation is designed to do. Whether learners notice or understand it remains a hypothesis until observed. Browser checks in this document are proposed procedures, not claimed results. Any separately executed browser findings should be recorded beside, not substituted for, human study results.

## Existing beginner support to preserve

Orbitlab already has guided launch setup, plain-language help and terminology, coherent Quick start presets, preflight warnings and corrective buttons, flight narration, replay, a result comparison table, an Explore debrief, cross-section handoffs, local mission/design storage, and lesson workflows. The opportunity is to evaluate how these existing pieces fit together; it would be inaccurate to describe them as missing features.

| Support | Source evidence |
| --- | --- |
| Home offers one-click featured launch and a lessons entry point | `src/ui/home.ts:140`, `src/ui/home.ts:157` |
| Three-step first mission guide, replay explanation, terminology and keyboard help | `src/ui/help-content.ts:25`, `src/ui/help-content.ts:35`, `src/ui/help-content.ts:43` |
| Guide is optional, nonmodal and reopenable; Build handoff advances it past mission selection | `src/ui/help.ts:53`, `src/ui/help.ts:112`, `src/ui/help-state.ts:31`, `src/main.ts:543` |
| Explore has rocket/payload/orbit setup tabs with Back/Next and direct tab navigation | `src/ui/panel.ts:985`, `src/ui/panel.ts:1003` |
| LEO Quick start uses Falcon 9, Cape, CubeSat payload, 1,000 kg and a coherent preset | `src/ui/quickstart.ts:12` |
| Preflight uses text, a title, a colored indicator and cause-specific corrective actions | `src/ui/panel.ts:928`, `src/ui/panel.ts:1078` |
| Outcome compares target and actual values, separates booster recovery, and explains the ISS preset | `src/ui/mission-result.ts:84`, `src/ui/mission-result.ts:103`, `src/ui/mission-result.ts:117` |
| Explore debrief offers retry, continued watching, Orbit, and Engineer | `src/ui/explore-debrief.ts:104`, `src/ui/explore-debrief.ts:146` |
| Designed satellite can be sent directly to Orbit or loaded into Launch; flight can continue in Orbit | `src/main.ts:543`, `src/main.ts:559`, `src/main.ts:904` |
| Local satellite draft, saved designs and workspace mission are distinct existing storage mechanisms | `src/ui/build/satellite-workspace.ts:7`, `src/ui/workspace-mission.ts:1`, `tests/browser/journeys/satellite.mjs:59` |

## Task walkthrough derived from the implementation

### A. First successful launch

1. On a fresh Home visit, decide between the featured Watch mission, lessons, or setting up a mission. The hero offers Watch and lessons; Launch → Explore is in the section menu or the Home Explore feature farther down (`home.ts:157`, `home.ts:224`).
2. Enter Launch → Explore. Read or skip the optional first mission guide. Use a Quick start preset in the setup panel. The Quick start fills the mission; it does not launch (`quickstart.ts:1`).
3. Inspect the three setup tabs: rocket, payload, orbit. Read the preflight verdict beside Launch. A valid but infeasible experiment can still be launched; invalid fields are a separate restriction (`panel.ts:277`, `panel.ts:947`).
4. Launch. Observe narration and flight controls. Pause or change speed; select an event or use the timeline to inspect the recording. Recognize that replay and live flight have different clocks (`help-content.ts:33`, `help-content.ts:37`).
5. Read the outcome, achieved versus target orbit, and any next-step recommendation. Explore automatically shows its debrief 2.5 seconds after an outcome is observed, once per flight, while live and outside lessons (`explore-debrief.ts:29`, `explore-debrief.ts:65`).
6. Continue in Orbit or change one setting and fly again. The transition is already implemented (`explore-debrief.ts:153`).

### B. Design → launch → orbit

1. Open Build → Explore and select Satellite (`tests/browser/journeys/satellite.mjs:28`).
2. Start from NAPA-2, name the design and alter one parameter. Figures update after typing pauses; draft and explicitly saved design have existing persistence (`satellite-workspace.ts:12`, `satellite-workspace.ts:38`).
3. Read the Fly it panel. It names vehicle/site/target/mass and shows Launch's feasibility verdict before transition. Existing alternative-rocket buttons address infeasible combinations (`src/ui/build/satellite-fly.ts:9`, `satellite-fly.ts:19`).
4. Choose a suitable rocket and use Fly it. Build loads the design as a mission and advances the first-use guide past Quick start, avoiding accidental replacement (`main.ts:543`).
5. Launch, inspect the result and Continue in Orbit. Distinguish this flight-derived orbit from Build's direct Send to Orbit action, which skips launch (`main.ts:559`, `main.ts:904`).
6. Revisit or reload and check which items survive. Saved mission settings and satellite drafts exist, while the Launch-to-Orbit handoff is explicitly described as held in memory (`main.ts:904`). This is a recovery and expectation task, not a claim that all work is lost.

## Ranked usability hypotheses and objective verification

Ranking is provisional: impact on the first mission × breadth of exposure × strength of source evidence. No frequency or severity is inferred from unobserved user behavior. P1 means investigate in the first round; P2 means investigate after or alongside P1.

### UX-01 — P1: the two independent three-step sequences may mislead first-time users

**Code fact:** The guide's three stages are Choose a mission, Read the preflight check, and Launch/watch/replay (`help-content.ts:30`). Clicking its Next changes only `GuideProgress` (`help.ts:96`, `help-state.ts:19`). Setup has a different three-stage sequence: vehicle, payload, orbit (`panel.ts:985`). Its Next changes only the displayed setup pane (`panel.ts:1013`, `panel.ts:1022`). Selecting a Quick start does not inherently advance the help guide.

**Hypothesis:** A learner may interpret the prominent guide Next as completing or advancing mission setup, or may expect actual actions to advance the guide automatically.

**Browser verification:** Fresh storage, open `#/launch/explore`. Record visible guide step and `.explore-step-tab[aria-current]`. Click `.help-guide-next`; verify only the help copy advances. Choose `[data-quickstart="leo"]`; record both states again. Click setup's Next; verify the separate panel state. Repeat at 390×844 and with keyboard input.

**Human measure:** Incorrect Next clicks, backtracking, requests for help, and time from Explore entry to a deliberately chosen mission. **Candidate response if confirmed:** distinguish the two progress indicators and tie optional guidance to meaningful actions without blocking advanced users. Retain skip/restart and Build's mission-given behavior.

### UX-02 — P1: a long preflight explanation may be hard to access on touch

**Code fact:** Explore clamps `.status-text` to four lines and hides overflow (`src/style.css:372`). The full sentence is copied to a native `title` tooltip (`panel.ts:2331`). Text labels and corrective buttons already exist; this is not a color-only warning.

**Hypothesis:** A long warning may hide its cause or qualification on a narrow phone, while a native hover tooltip provides no dependable touch interaction.

**Browser verification:** On `#/launch/explore` at 390×844, create an infeasible but syntactically valid mission using visible controls (for example, excessive payload or an unsuitable site/orbit). For `#mission-note .status-text`, record full `textContent`, `clientHeight`, `scrollHeight`, computed line clamp, and screenshot. Repeat for English/Russian/Thai. If `scrollHeight > clientHeight`, attempt to reveal the complete explanation with touch and keyboard; record whether a visible disclosure exists. Also verify corrective buttons explain and apply their changes.

**Human measure:** Ability to explain why the mission is flagged, find a repair, and predict whether Launch remains available. **Candidate response if confirmed:** a visible expandable explanation usable by touch and keyboard. Keep concise titles and existing corrective actions.

### UX-03 — P1: section/level choice may be less understandable on phones

**Code fact:** Desktop section menus show explanatory text for each level (`section-nav.ts:158` calling `levelLink(..., true)`). The phone table shows names only (`section-nav.ts:202` calling `levelLink(..., false)`). It offers three levels in each of Launch, Orbit and Build, plus an explicitly marked Campaign section in development (`section-nav-model.ts:34`). Accessible names already include section and level (`section-nav.ts:97`).

**Hypothesis:** Nine working destinations with repeating level names may require novices to guess which choice lets them make their first mission or design a satellite; phone users have fewer explanations at the choice point.

**Browser verification:** Capture Home menu at 1280×800 and 390×844. Compare visible descriptions and link destinations. Use only touch on phone and keyboard on desktop to reach Launch Explore, Build Satellite, and return Home. Check Back navigation. Separate semantics/functionality failures from decision difficulty.

**Human measure:** Correct first destination, menu reopenings, wrong-level visits, and explanation of Explore versus Engineer in their own words. **Candidate response if confirmed:** provide short task descriptions on mobile or a task-oriented entry. Preserve direct routes, Back, keyboard use and current-page semantics.

### UX-04 — P1: persistence boundaries may conflict with “Continue” expectations

**Code fact:** Home says “Continue your last mission” (`src/i18n/en.ts:1918`) and summarizes vehicle, payload and target (`home.ts:180`). The action restores stored mission configuration (`main.ts:997`). Workspace and viewer missions are explicitly separated to protect saved work (`workspace-mission.ts:1`). Launch-to-Orbit handoff is memory-held (`main.ts:904`), while satellite drafts and saved designs already persist (`satellite-workspace.ts:7`).

**Hypothesis:** Learners may expect a recording, achieved orbit, replay cursor, or an Orbit handoff to survive a reload because the mission settings survive and “Continue” does not specify its scope.

**Browser verification:** Create a uniquely named satellite and mission, run to an identifiable flight time, enter Orbit, note object name and orbital values, then reload. Record which of design, settings, flight recording, cursor and orbit remain. Repeat Home's Continue within the same session and after reload. Confirm actual outcomes before recommending changes.

**Human measure:** Ask participants what they expect to return before reloading; compare with what returns. Record recoverability and surprise, without treating an unexpected behavior as data corruption. **Candidate response if confirmed:** clarify what is saved and provide explicit resume/re-run/export choices; assess project archive scope separately.

### UX-05 — P2: the Home entry path may underrepresent making a satellite

**Code fact:** The hero actions are Watch and lessons (`home.ts:157`). The Home feature list includes Watch, Explore, Engineer, Lessons and Orbit, but no Build feature (`home-logic.ts:15`). Build is nevertheless present in the top navigation (`section-nav-model.ts:37`).

**Hypothesis:** A visitor whose goal is to design a satellite may not recognize that the site supports it until opening the navigation menu.

**Browser verification:** From fresh Home, inventory the visible hero actions and all feature sections; confirm Build exists in navigation. On desktop and phone, follow a natural visible path to Satellite without direct URL entry. Record clicks and scrolling, not an invented success rate.

**Human measure:** Unaided discovery within 90 seconds; first-click destination; whether participants can name the three main activities after a short Home visit. **Candidate response if confirmed:** improve Home's representation of existing Build functionality and compare task-focused entry choices.

### UX-06 — P2: replay controls may lead to incorrect beliefs about live flight

**Code fact:** Help explicitly explains that rewinding does not pause live flight and documents Shift+Space for the live flight (`help-content.ts:37`, `help-content.ts:41`). This is an intentional two-clock design, not evidence of a simulation error.

**Hypothesis:** A novice may pause a replay and assume the ongoing mission is paused, or interpret a later result while viewing an earlier moment incorrectly.

**Browser verification:** Launch a preset, seek backwards, press play/pause, inspect displayed and live-head times, then use Live. Check whether visible labels and result timestamps make both states apparent. The result panel already displays assessed and displayed times (`mission-result.ts:103`); include these in the check.

**Human measure:** Before pressing Live, ask “What do you expect to happen next?” Record predictions, unnoticed time advancement and successful return to the current flight. **Candidate response if confirmed:** strengthen the current/replay state indication and clarify which clock each control changes.

### UX-07 — P2: automatic debrief may be easy to miss with keyboard or at a transition

**Code fact:** Explore's card appears once per flight after an outcome, only while live and outside lessons (`explore-debrief.ts:65`). It has `role="dialog"` and a labelled heading (`explore-debrief.ts:108`); its render method does not explicitly focus a control or announce the card. The inline result separately has a polite status (`mission-result.ts:35`). Closing for another level does not offer the card again that flight (`explore-debrief.ts:83`). Existing debrief and inline result content should both be considered.

**Hypothesis:** A keyboard or screen-reader learner may not notice the new card or its next actions promptly, or may return from another section expecting the same debrief.

**Browser verification:** Start with keyboard focus on flight controls as the outcome occurs. Record focus before/after, accessibility-tree exposure, tab order and announcement behavior with an actual screen reader if available. Switch sections and return after the debrief first appears; compare availability of debrief and inline result. Do not infer screen-reader behavior from ARIA attributes alone.

**Human measure:** Time to find outcome and next action, assisted versus unaided discovery, and ability to explain target versus achieved orbit. **Candidate response if confirmed:** explicit, non-disruptive announcement and an enduring results entry; choose focus behavior based on the card's intended modality.

## Existing automation and its limits

- `tests/browser/journeys/launch-explore.mjs:14` begins directly in Explore and configures/launches through WebMCP. It is meaningful flight/export regression coverage, but does not observe a novice discovering or completing setup controls.
- `tests/browser/journeys/satellite.mjs:27` uses actual controls for the satellite design, saving, Orbit transition and Fly it. Launch/playback are then driven through WebMCP (`satellite.mjs:120`). It protects important handoff behavior, not novice comprehension.
- `tests/browser/journeys/mobile-smoke.mjs:18` checks selected Thai/Russian pages, overflow and mobile navigation accessibility names. It does not measure a complete phone first-mission journey or user decision difficulty.
- `tests/help-state.test.ts:13` covers guide state/persistence, including mission handoff. Source review is not a report that these tests were rerun in this subtask.

## Five-novice study ready to run

**Status:** protocol prepared; recruitment and sessions remain unperformed. Five learners produce directional qualitative evidence, not a statistically representative completion rate. No external messages are needed for preparing this protocol. Invitations and recordings require the user's separate participation arrangements.

**Participants:** five adults unfamiliar with Orbitlab, with a mix of low/moderate familiarity with orbital concepts. Capture prior experience and preferred language before starting; do not treat mixed-language results as comparable translation validation. Use three desktop and two phone primary sessions if the intended audience spans both; report each individually rather than claiming device superiority from tiny groups. Add focused assistive-technology sessions later if this group does not include such users.

**Session:** approximately 30–40 minutes. Use a production build, record build SHA, device, viewport, browser, language, data mode and network condition. Give each participant a new browser profile. Screen/audio capture only with informed consent; otherwise take anonymized timestamped notes. Avoid collecting names or school records in the app. Provide a neutral facilitator and observer where possible.

**Opening prompt:** “We are evaluating the website, not you. Please say what you are looking for and what you expect to happen. You can stop or skip any task. I will generally let you work without instructions so we can see where the website needs to explain itself.”

| Task | Neutral task wording | Success definition | Stop/assistance rule |
| --- | --- | --- | --- |
| 1. Find a way to make a mission | “You want to choose what goes into orbit. Show where you would start.” | Reaches a relevant setup path and identifies where vehicle, payload and destination are chosen | 90 s; then record failure/assistance and place them in Explore so later tasks still yield evidence |
| 2. Prepare and fly | “Use a provided example to send a payload into low Earth orbit. Check whether it looks possible before you launch.” | Deliberately selects a suitable Quick start, recognizes preflight state and starts the flight using visible controls | 5 min of interaction, excluding simulation wait; allow one neutral prompt before revealing a location |
| 3. Explain and revisit | “Tell me what happened and whether it met the requested orbit. Show me an earlier event, then return to the current flight.” | Distinguishes target/achieved orbit, successfully enters replay and returns Live, describes what happened to the live clock | 4 min; record unprompted explanation before any correction |
| 4. Carry a design through sections | “Start with a small satellite design, give it a name, and find how to send that design on a launch. Then find how you would inspect its orbit.” | Finds Build Satellite, names design, uses Fly it with understood verdict, identifies the same design in Launch and an Orbit continuation path | 7 min; a full second launch is optional if simulation runtime is long—record whether the handoff was actually flown |
| 5. Return to work | “Before reloading, tell me what you expect to be here when the page returns. Now reload and return to your work.” | Expectation stated first; can identify restored design/settings and any missing transient state; finds a usable recovery path | 3 min; distinguish persistence outcome from expectation mismatch |

For Task 4, alternate whether the participant explores direct Send to Orbit before or after Fly it. Avoid demonstrating the navigation menu before Task 1. Keep the central launch task consistent; change task order only where learning effects can be identified and documented.

**Facilitator prompts:** “What are you looking for?”, “What do you expect that to do?”, “What tells you that?”, and “What would you try next?” Avoid “Click Next,” “Use Explore,” or naming the correct control before recording unaided performance. At the stop time, record the outcome first, then provide the minimum help necessary to continue.

**Record per task:** start/end time; interaction time versus loading/simulation wait; complete/partial/failed; independent/neutral prompt/directed help; wrong destination or control; backtrack; repeated action; visibility or comprehension issue; exact participant quotation; confidence 1–5; post-task ease 1–7. Record browser failures separately from misunderstanding. Do not count slower reading alone as an error.

**Results sheet:** one row per participant × task: `participant_id, device, language, task_id, outcome, assistance, interaction_s, waiting_s, errors, backtracks, confidence_1_5, ease_1_7, evidence_note, issue_id`. Keep identifiers P1–P5 and mark skipped tasks explicitly. No fabricated rows should be filled before sessions.

**Decision rules:** promote a reproducible functional or accessibility blocker even if only one participant encounters it. For UX hypotheses, require a repeated failure/confusion pattern (for example, at least two independent participants with supporting observations) or a high-impact single case, then reproduce it in the browser. Rank by task impact, affected audience, recurrence in this small sample and effort. Treat these as project triage rules, not statistical significance. A provisional goal for the next iteration is at least four of five participants completing Tasks 1–3 without directed help and correctly distinguishing target from achieved orbit; measure the baseline before asserting improvement.

## Immediate Stage 1 next actions

1. Execute UX-01 and UX-02 browser procedures first: they have precise source-grounded mechanisms and low verification cost.
2. Capture desktop/phone section menus and the persistence boundary for UX-03/04; add actual screenshots and reproduction notes if confirmed.
3. Combine browser facts with loading and scientific-validation measurements into a ranked backlog with issue ID, impact, evidence confidence, reproduction, owner and acceptance criterion.
4. Run the five-person study when participants are available. Until then, explicitly label the beginner-observation portion of Stage 1 as pending. Do not claim this source review or automated browser use represents observed beginners.
