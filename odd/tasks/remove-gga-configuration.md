# Remove GGA Configuration

## Objective

Remove only active Gentleman Guardian Angel (GGA) configuration and invocation from the app repository.

## Scope

- Delete the tracked `.gga` configuration file.
- Remove the `gga run` invocation block from `scripts/pre-commit.sh`.
- Record validation and commit evidence for this work unit.

## Exclusions

- Preserve `.atl`, `.git/gentle-ai`, application code, and unrelated local changes.
- Do not use GGA/RDD, push, open a PR, merge, or make remote changes.
- Do not alter non-GGA hook behavior.

## Checks

- Focused search for active `.gga`, `gga run`, and `Gentleman Guardian Angel` references.
- `bash -n scripts/pre-commit.sh`.
- Review the staged diff and commit only this task's tracked files.

## Route and Delegation Evidence

- Target repository selected explicitly by the user: `myquota-app`.
- Local `AGENTS.md`, current Git state, `.gga`, and `scripts/pre-commit.sh` were inspected before the first write.
- This is an explicitly authorized local configuration-removal task; no remote operation is authorized or performed.

## Stable Tasks

1. [completed] Create and persist this task record before removals.
2. [completed] Remove confirmed app GGA configuration and invocation only.
3. [completed] Run focused validation and syntax checks.
4. [in_progress] Commit only tracked app changes for this work unit.

## Status and Progress

- Initial state: branch `fix/harden-oauth-web`; unrelated staged OAuth changes and `odd/tasks/harden-oauth-web.md` are present and must remain untouched.
- Confirmed GGA elements: tracked `.gga`; non-blocking `gga run` block in `scripts/pre-commit.sh`.
- Strategy: `ask-on-risk`. Stop and report if a removal would affect non-GGA behavior.

## Evidence Log

- 2026-10-10: Task record created and verified in Engram before GGA removal. Engram mirror: `odd/remove-gga-configuration/tasks` (observation 669).
- 2026-10-10: Deleted `.gga` and the isolated non-blocking `gga run` block. No other pre-commit behavior changed.
- 2026-10-10: `bash -n scripts/pre-commit.sh` and `git diff --check` passed. `git grep` found no active tracked GGA invocation outside `odd/`; the focused repository search found only this historical task record. `rg` is unavailable in this environment, so the dedicated search tool was used as the fallback.

## Next Step

Stage only `.gga`, `scripts/pre-commit.sh`, and this task record; commit after reviewing the focused diff.
