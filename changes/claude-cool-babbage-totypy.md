## CHANGELOG

- Tooling: three agent skills for Claude Code sessions on OrbitLab, under `.claude/skills/`: rendering and shaders (`orbitlab-threejs-shaders`), verification and testing (`orbitlab-webapp-testing`), and the HUD and telemetry UI (`orbitlab-frontend-hud`). `.gitignore` tracks `.claude/skills/` and keeps the rest of `.claude/` per-machine. No app, test, CI or budget change.

## PROGRESS

| Agent skills (project tooling, not a plan package; authorized in chat, 2026-10-19) | In PR; not merged; not published | Three `SKILL.md` files added under `.claude/skills/`; `.gitignore` `.claude/` → `.claude/*` + `!.claude/skills/`. The skills were reviewed read-only against 1dd8d94 (six reviewers, three adversarial verifiers, a completeness critic, then two verification rounds on the revision) and load in Claude Code 2.1.304 with their full descriptions. Early checks: node verification tests and `tests/repo-hygiene.test.ts`. | this PR |
