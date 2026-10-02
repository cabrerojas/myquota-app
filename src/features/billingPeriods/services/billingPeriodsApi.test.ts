import {
  executeBillingPeriodSettlements,
  settleBillingPeriod,
} from "./billingPeriodsApi";
import { requestWithAuth } from "@/features/auth/hooks/useAuth";

jest.mock("@/config/api", () => ({
  API_BASE_URL: "https://api.test",
}));

jest.mock("@/features/auth/hooks/useAuth", () => ({
  requestWithAuth: jest.fn(),
}));

const mockRequestWithAuth = requestWithAuth as jest.MockedFunction<
  typeof requestWithAuth
>;

describe("billing period settlement API", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("uses the settlement route and a stable per-period idempotency key", async () => {
    mockRequestWithAuth.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        settlementId: "settlement-1",
        billingPeriodId: "period-1",
        creditCardId: "card-1",
        settledAt: "2026-10-02T12:00:00.000Z",
        alreadySettled: false,
        settledQuotaCount: 2,
        settledTotalAmount: 12000,
        lines: [],
      }),
    } as unknown as Response);

    await settleBillingPeriod("card-1", "period-1");

    expect(mockRequestWithAuth).toHaveBeenCalledWith(
      "https://api.test/creditCards/card-1/billingPeriods/period-1/settle",
      expect.objectContaining({
        method: "POST",
        headers: { "Idempotency-Key": "settle:card-1:period-1" },
      }),
    );
  });

  it("reports partial failures and retries only failed periods without repeating settled ones", async () => {
    const settle = jest
      .fn()
      .mockResolvedValueOnce({
        settlementId: "settlement-1",
        billingPeriodId: "period-1",
        creditCardId: "card-1",
        settledAt: "2026-10-02T12:00:00.000Z",
        alreadySettled: false,
        settledQuotaCount: 2,
        settledTotalAmount: 12000,
        lines: [],
      })
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        settlementId: "settlement-2",
        billingPeriodId: "period-2",
        creditCardId: "card-2",
        settledAt: "2026-10-02T12:01:00.000Z",
        alreadySettled: true,
        settledQuotaCount: 0,
        settledTotalAmount: 0,
        lines: [],
      });
    const periods = [
      { creditCardId: "card-1", billingPeriodId: "period-1" },
      { creditCardId: "card-2", billingPeriodId: "period-2" },
    ];

    const firstAttempt = await executeBillingPeriodSettlements(periods, settle);
    const retry = await executeBillingPeriodSettlements(
      firstAttempt
        .filter((result) => result.status === "failed")
        .map((result) => result.period),
      settle,
    );

    expect(firstAttempt.map((result) => result.status)).toEqual([
      "settled",
      "failed",
    ]);
    expect(firstAttempt[0].outcome?.settledQuotaCount).toBe(2);
    expect(retry.map((result) => result.status)).toEqual(["already-settled"]);
    expect(settle.mock.calls).toEqual([
      ["card-1", "period-1"],
      ["card-2", "period-2"],
      ["card-2", "period-2"],
    ]);
  });
});
