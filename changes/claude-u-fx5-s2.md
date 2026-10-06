## CHANGELOG

- Launch (FX-5 PR2, M-LAUNCH-060): the equations panel no longer says "No air to act on at this height" on the pad, after a landing or in a frame without an equation record; it now says the vehicle is at rest in the air, "Before liftoff" when a wind blows over the pad, or that the instant carries no record, in Thai, English and Russian. Where the air is really gone the text is unchanged.

## PROGRESS

| FX-5 PR2 (M-LAUNCH-060 done; M-LAUNCH-031 UI part held; wave K1, lane U) | In PR; not merged; not published | 060: drag and α/β choose their unavailable reason from the frame (`stillAir` on the pad and landed, `prelaunch` for a pad wind, `noRecord` for a flown frame without the record, `noAir` only without air); new keys in TH/EN/RU; 3 of 4 new tests fail on `c1aae45`, 4/4 after; precache code 14709.2 → 14710.2 kB (ceiling 14714). 031 held: flagging from the judged set also flips four `outside: true` assertions of the replay-cursor test outside the owner's approval (card `fx5-031-assert`), and the model is in `src/ui/result-content.ts`, not in the allowed files; work kept on local branch `claude/u-fx5-s2-031-held` | [FX-5 PR2 report](reports/FX-5-pr2-result-basis.md); owner decision needed for 031 |
