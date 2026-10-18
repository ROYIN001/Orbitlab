## CHANGELOG

- Tests (LUI-01 journey): the paused flight is taken as settled only across frames the page has drawn, so a slow software GPU no longer fails Pages with the live cursor catching up to the recording's head (run 39082600280).

## PROGRESS

| LUI-01 journey settle (Pages run 39082600280, browser shard 1) | In PR; not merged; not published | `lui01-held-tuning` read the paused flight twice a second apart and took equal reads as settled; the live cursor follows the head only when a frame is drawn, and SwiftShader can take over a second per frame, so the cursor later caught up (T+32.02 → T+32.94 s) and the check failed. Each read now waits for two of the page's frames. Reproduced by holding the page's frames 4 s after the pause: the old journey fails with the same three messages, the new one passes; the plain journey passed 5 of 5 locally. | — |
