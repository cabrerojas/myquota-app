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
4. [completed] Commit only tracked app changes for this work unit.

## Status and Progress

- Initial state: branch `fix/harden-oauth-web`; unrelated staged OAuth changes and `odd/tasks/harden-oauth-web.md` are present and must remain untouched.
- Confirmed GGA elements: tracked `.gga`; non-blocking `gga run` block in `scripts/pre-commit.sh`.
- Strategy: `ask-on-risk`. Stop and report if a removal would affect non-GGA behavior.

## Evidence Log

- 2026-10-10: Task record created and verified in Engram before GGA removal. Engram mirror: `odd/remove-gga-configuration/tasks` (observation 669).
- 2026-10-10: Deleted `.gga` and the isolated non-blocking `gga run` block. No other pre-commit behavior changed.
- 2026-10-10: `bash -n scripts/pre-commit.sh` and `git diff --check` passed. `git grep` found no active tracked GGA invocation outside `odd/`; the focused repository search found only this historical task record. `rg` is unavailable in this environment, so the dedicated search tool was used as the fallback.
- 2026-10-10: Created `a0e0b20` (`chore: remove GGA configuration`) with only `.gga`, `scripts/pre-commit.sh`, and this task record. Existing staged OAuth work was preserved and excluded.
- 2026-10-10: Global GGA removal phase: inspected `/home/gcabr/.config/gga/` (GGA rules and generated GGA configuration only) and `/home/gcabr/.local/share/gga/` (GGA cache, PR-mode, and provider libraries only) before deleting both complete directories. No historical backups or documentation were removed.
- 2026-10-10: Removed only the `"gga"` component entry from `/home/gcabr/.gentle-ai/state.json`; all other state keys and components were retained. `python3` JSON validation passed and confirmed that `components` excludes `gga`.
- 2026-10-10: Post-removal checks passed: both inspected global GGA directories are absent; `state.json` contains no `gga` text; and `git grep -n -i -e 'gga run' -e 'Gentleman Guardian Angel' -- ':!odd/**'` returned no active tracked invocation in either repository. `gga` remains discoverable on `PATH`, but no configuration or invocation was found in the inspected active locations and the executable was outside the authorized deletion scope.
- 2026-10-10: No native review was started or retried. The prior provider-default review block remains recorded; this phase was explicitly performed without GGA or review execution.

## Next Step

No further configuration removal is needed. Retain the existing unrelated OAuth work for its own work unit.
