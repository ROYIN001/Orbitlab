# Change fragments

Each work PR adds one file here instead of editing `CHANGELOG.md` and `docs/development/PROGRESS.md`. Because each file is new, two PRs never conflict over it. The rule and the owner's decision are in [SESSION-PROTOCOL.md §4](../docs/development/SESSION-PROTOCOL.md), decided on 2026-10-06.

**File name:** the branch name, with `/` replaced by `-`. For example, `claude/u-fx5-s3` becomes `changes/claude-u-fx5-s3.md`.

**Format:** two headed sections, each holding exactly what will be copied:

```markdown
## CHANGELOG

- Launch (FX-5, M-LAUNCH-031): one line, in the style of CHANGELOG.md's Unreleased list.

## PROGRESS

| FX-5 step 3 (M-LAUNCH-031, wave K1) | In PR; not merged; not published | What changed and how it was checked | report link |
```

The integration session's records PR does three things:
- copies the CHANGELOG line to the top of "Unreleased";
- puts the row into PROGRESS with the merge SHA and the Pages run;
- deletes the fragment.
