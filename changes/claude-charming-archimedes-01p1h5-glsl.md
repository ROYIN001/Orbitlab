## CHANGELOG

- Render (identical output; Argon4 follow-up, workstream 4, step 1): the text of the render shaders is compacted — the comments inside the `/* glsl */` strings of entry-glow, orbit-view, plume, smoke, stars, trails and vapour move word for word into JS comments above each shader, and every GLSL line in src/render loses its leading indentation; the GLSL token streams of all 32 shaders and the frames of 8 views are identical; the index chunk 4.9 kB smaller (2643.2 → 2638.3 kB), the room the aerial perspective (step 2) needs.

## PROGRESS

| Argon4 follow-up, workstream 4 step 1: shader text compacted (owner's answer 7 of 2026-10-17, "ทำให้ดูดีและสมจริงขึ้น", needs the room) | In PR; not merged; not published | Identical output, proven three ways: each changed file's AST compared with every glsl template replaced by its GLSL token stream (11 files, 32 shaders, 7 878 tokens; negative controls fail on a changed number and a joined #include), pixel-identical frames of SceneManager with the app's Earth textures in headless Chromium at 8 views, and both second-agent reviewers of the sky work re-proving it independently on the new base. Render tests pass. Budget lowered: index 2643.2 → 2638.3 kB of 2645; no ceiling touched. The offset budgets.json names for the index chunk. Docs N/A. | [report](reports/argon4-fu-sky.md) (D-25 section) |
