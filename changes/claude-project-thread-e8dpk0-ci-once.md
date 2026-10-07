## CHANGELOG

- Repository: CI runs once per PR instead of twice; the branch push trigger is gone (it was always cancelled by the PR run and left red "(push)" checks), and CI can be started by hand from the Actions tab.

## PROGRESS

| CI single run per PR (owner request, 2026-10-07) | In PR; not merged | `.github/workflows/ci.yml`: `push` trigger replaced by `workflow_dispatch`; `pull_request` trigger, path filter, jobs and check names unchanged; no site, test or physics change | this PR |
