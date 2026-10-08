## CHANGELOG

- Repository: a manual "Clean up failed and cancelled runs" workflow deletes failed and cancelled Actions runs (keeping those on an open PR's head commit); it defaults to a dry run.

## PROGRESS

| Actions cleanup workflow (owner request, 2026-10-06) | In PR; not merged | New `.github/workflows/cleanup-runs.yml`, `workflow_dispatch` only, `dry_run` input defaults to true; uses the run's own token with `actions: write`; no site, test or physics change | this PR |
