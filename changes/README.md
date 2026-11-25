# Change fragments

Each work PR adds one file here instead of editing `CHANGELOG.md` and `docs/development/PROGRESS.md`. Because each file is new, two PRs never conflict over it. The rule and the owner's decision are in [SESSION-PROTOCOL.md §4](../docs/development/SESSION-PROTOCOL.md), decided on 2026-10-06.

**File name:** the branch name, with `/` replaced by `-`. For example, `claude/u-fx5-s3` becomes `changes/claude-u-fx5-s3.md`.

**Format:** two headed sections, each holding exactly what will be copied:

```markdown
## CHANGELOG

- Launch (FX-5, M-LAUNCH-031): one line, in the style of CHANGELOG.md's Unreleased list.

## PROGRESS

| FX-5 step 3 (M-LAUNCH-031, wave K1) | Merged, waiting for publish (PR #N, CI run N on <sha>) | What changed and how it was checked | report link |
```

The row says what is true the moment the PR merges, as [SESSION-PROTOCOL.md §3](../docs/development/SESSION-PROTOCOL.md) step 1 asks: "merged, waiting for publish", with the PR number and its CI run. Which run: the one on the last head tested before the fragment's own update, with that head's SHA, as #203's and #204's fragments did. Fixing this template in K2 (it said "In PR; not merged; not published") is part of the option the owner chose for S8's KPI-31 question, "ก variance รายงานสองแบบ (แนะนำ)" (2026-10-28T03:03:21Z; [DECISIONS](../docs/DECISIONS.md), "Decided 2026-10-28 (the GK1 sign-off questions S1–S12, K2's plan sections and authorization, and the S7 card; GK1 not yet signed; chat)").

The integration session's records PR does three things:
- copies the CHANGELOG line to the top of "Unreleased";
- puts the row into PROGRESS with the merge SHA and the Pages run;
- deletes the fragment.
