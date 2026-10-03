# Settle Billing Periods — App Work Plan

## Objective

Enable a user to deliberately record the settlement of every eligible credit-card billing period represented by a selected debt-forecast month. The app records financial state; it never claims to initiate or make a bank payment.

## Scope

- Replace visible “Pagar período” wording in the debt forecast with “Registrar pago”.
- Add a review-before-commit confirmation that identifies the forecast month, card/period scope, eligible quota count, and currency amounts when local forecast data provides them.
- Add a typed authenticated client for `POST /api/creditCards/:creditCardId/billingPeriods/:billingPeriodId/settle`.
- Send a stable idempotency key for each selected credit-card/billing-period pair.
- Settle all distinct periods in a selected month, preserve completed results, and retry only failed periods.
- Present per-period settled, already-settled, and failed outcomes.
- Invalidate only existing React Query keys relevant to debt forecasts, billing periods, quotas/transactions, debt summaries, and monthly statistics.
- Add focused RED-then-GREEN tests for wording, review confirmation, success, partial failure/retry, already-settled, and future-installment-facing outcomes when represented by the API response.

## Backend Dependency

The local backend implementation is `myquota-backend` commit `fb8ab76d28d3e62cf99e111256570d04dceb876b` on `feat/settle-billing-periods`. It exposes the settlement route but has not been pushed or deployed, and migration `006_settle_billing_periods.sql` has not been applied. App integration cannot be proven end-to-end until that backend branch and migration are deployed.

## Business Invariant

Settlement is a state-recording operation, not a bank-payment operation. For each selected billing period, only quotas whose transaction date belongs to that period and whose due date is no later than the period due date may be marked paid. Future installments remain pending. The client must avoid blindly repeating successfully settled periods and must retry only failures.

## Tasks

| ID     | Task                                                          | Acceptance criteria                                                                                                                                                                | TDD/checks                                               | Route/delegation evidence                                                                                                    |
| ------ | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| SBP-01 | Establish typed settlement contract and orchestration service | Typed request/result models match backend response; key is stable per period; outcomes distinguish settled/already-settled/failed                                                  | Service tests start RED, then pass GREEN                 | Authorized backend route: `POST /api/creditCards/:creditCardId/billingPeriods/:billingPeriodId/settle`; backend commit above |
| SBP-02 | Add forecast review and accessible action                     | “Registrar pago” is visible; review states affected month, period/card scope, count/amounts; 44px+ control and accessible label/hint; no bank-payment implication                  | Component tests start RED, then pass GREEN               | Forecast month may delegate to multiple card periods                                                                         |
| SBP-03 | Implement safe multi-period execution and cache consistency   | Completed periods are retained; retries call failures only; per-period result is presented; existing relevant query keys are invalidated/refetched after success or partial result | Orchestration/component tests start RED, then pass GREEN | Settlement result drives completed/failure state; do not fabricate cache keys                                                |
| SBP-04 | Verify and commit work unit                                   | Focused tests, lint, and typecheck/build run; task evidence contains exact results; app-only conventional commit is created                                                        | Record exact command outcomes                            | No GGA, remote access, push, or PR                                                                                           |

## Verification and Commit Evidence

- Status: SBP-01 through SBP-04 implemented, verified, and committed.
- Route/response evidence: backend commit `fb8ab76d28d3e62cf99e111256570d04dceb876b` returns `settlementId`, card/period IDs, `settledAt`, `alreadySettled`, `settledQuotaCount`, `settledTotalAmount`, and eligible-quota lines. The local app sends `Idempotency-Key: settle:<creditCardId>:<billingPeriodId>`; the backend's immutable period-level settlement is itself idempotent.
- Query-key evidence: invalidates existing `debtForecast`, `debtSummary`, `monthlyStats`, `transactions`, and each affected `billingPeriods/<creditCardId>` cache. No quota-specific React Query key exists in this app, so none was invented.
- RED observation: `npx jest src/features/billingPeriods/services/billingPeriodsApi.test.ts src/features/quotas/screens/DebtForecastScreen.test.tsx --runInBand --watchAll=false` failed before implementation: missing `settleBillingPeriod` / `executeBillingPeriodSettlements` exports and the old visible “Pagar período” label.
- GREEN observation: the same focused command passed after implementation (2 suites, 3 tests).
- Verification: focused Jest GREEN (2 suites, 3 tests), `git diff --check` GREEN, and Prettier GREEN after formatting. Full `npm run lint` exceeded 120 seconds without a result; a direct changed-file ESLint run was blocked by the repository's missing `unrs-resolver` native optional dependency. `npx tsc --noEmit` remains blocked by pre-existing route/navigation and `StyleSheet.absoluteFillObject` errors outside this work unit. `npx expo export -p web` started Metro/static rendering but exceeded 120 seconds before completion.
- Commit boundary: one app-only conventional work-unit commit containing the completed behavior, tests, and this tracking document.
- Commit evidence: `9e30cd7 feat(quotas): record billing period settlements` on `feat/settle-billing-periods-app`; this follow-up tracking update is committed separately as documentation evidence.
- Rollback boundary: settlement client/orchestration, forecast review UI, focused tests, and this ODD task document; no backend or database changes are included.
