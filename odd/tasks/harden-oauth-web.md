# Harden Web OAuth

## Objective

Protect the web Google OAuth authorization-code flow from CSRF/login injection and weak PKCE verifier generation without changing the backend contract.

## Scope

- Generate OAuth `state` and PKCE `code_verifier` with the Web Crypto CSPRNG.
- Include `state` in the authorization request.
- Store a short-lived, same-tab correlation for `state` and `code_verifier`.
- Validate and consume the correlation before the code exchange.
- Clean correlation data on success, mismatch, missing callback data, and expired flow.
- Remove credential-bearing logging.
- Add focused tests for valid state, mismatch, cleanup, and non-deterministic generation.

## Constraints

- Do not modify the backend, OAuth backend contract, dependencies, or native flow.
- Do not use `Math.random` for OAuth secrets.
- Use only browser APIs supported by the existing Expo web target.
- Keep implementation artifacts in English.
- Do not push, open a PR, merge, or perform remote operations.

## Acceptance Criteria

- [x] Web authorization URL includes a generated `state` and PKCE S256 challenge.
- [x] `state` and `code_verifier` originate from `crypto.getRandomValues`.
- [x] Callback code exchange only happens after a matching, unexpired stored state is consumed.
- [x] Missing, mismatched, or expired state produces a safe user-facing error and clears correlation data.
- [x] No id token, authorization code, verifier, or access/refresh credential is logged.
- [x] Focused tests cover valid state, mismatch, cleanup, and non-deterministic generation.
- [ ] Applicable lint and type checks pass (blocked by local tooling and pre-existing errors; see evidence).

## Effective TDD

- RED: focused tests were added before implementation. The initial direct Jest invocation exceeded 120 seconds without output; this is recorded as an infrastructure timing failure, not a claimed assertion failure.
- GREEN: implemented the minimum secure generation, one-time correlation consumption, and state validation; focused tests passed.
- REFACTOR: normalized modified files with Prettier and retained pure correlation helpers for isolated coverage.

## Verification Commands

- `npx jest src/config/auth.test.ts src/features/auth/hooks/useAuth.utils.test.ts --runInBand`
- `npm run lint`
- `npx tsc --noEmit`

## Delivery Strategy

- Strategy: one cohesive work unit, within the 400-line budget after removing unrelated formatting churn.
- Commit candidate: `fix(auth): harden web OAuth callback correlation`.
- Scope: configuration, CSPRNG correlation helper, authorization and callback integration, safe callback error rendering, and their focused tests.
- Security rationale: these changes cannot be split safely. A partial commit would either generate a `state` that is not validated or change callback behavior without a matching verifier correlation.
- Rollback boundary: revert only the web OAuth helper/config, callback integration, focused tests, and this task document; native Google Sign-In and backend contract remain unaffected.

## Trigger Evidence

- User-authorized bounded remediation of the first critical audit finding: OAuth web CSRF/login injection and weak PKCE.
- Existing web flow uses `Math.random` for the verifier, stores only the verifier/return flag, and exchanges a callback code without state validation.
- Existing project dependencies include Expo web and browser Web Crypto APIs; no new dependency is planned.

## Progress Log

- [x] Pre-work completed: repository rules, branch, OAuth flow, existing focused tests, and persisted-memory context inspected.
- [x] Create RED tests.
- [x] Implement secure generation and callback validation.
- [x] Complete GREEN/REFACTOR and focused verification.
- [x] Remove unrelated formatting churn and recalculate the delivery budget.
- [x] Normalize the scoped files and rerun focused verification.
- [ ] Create one work-unit commit with the scoped files and documented check exceptions.
- [ ] Query local RDD mode and assess this commit without starting a review or provider.

## Evidence

- Branch: `fix/harden-oauth-web` (created from `master`).
- Commit: pending (the candidate is this task's single work unit).
- Work-unit size: 395 additions/deletions, within the 400-line review budget.
- Normalization: `node_modules/.bin/prettier --write` completed for every scoped source, test, and ODD file.
- Focused tests: `CI=true npx jest --no-watchAll --forceExit --verbose --runInBand --runTestsByPath src/config/auth.test.ts src/features/auth/hooks/useAuth.utils.test.ts --no-cache` passed: 2 suites, 16 tests, 66.792 seconds. Jest force-exited because of open handles after assertions completed.
- Lint: `npm run lint` exceeded 150 seconds after Expo loaded environment variables. The focused ESLint command failed before linting because `unrs-resolver` lacks its native optional binding. No dependency reinstall was performed.
- Typecheck: `npx tsc --noEmit` failed on pre-existing errors, including route parameter constraints, navigation `fontWeight` inference, and existing `StyleSheet.absoluteFillObject` usage. The LoginScreen occurrence is an unchanged existing line; no error was reported from the new correlation helpers or tests.
- GGA: not used. The repository no longer has a `.gga` file; previously confirmed GGA-removal changes remain outside this work unit.
- Next step: commit the cohesive OAuth work unit, then query local RDD mode and assess the exact new commit range without initiating a review or provider.
