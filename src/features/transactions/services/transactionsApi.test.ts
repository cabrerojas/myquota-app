import { createRefund } from "./transactionsApi";
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

describe("createRefund", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("uses the Spanish fallback when the refund API fails without a message", async () => {
    mockRequestWithAuth.mockResolvedValue({
      json: jest.fn().mockRejectedValue(new Error("invalid json")),
      ok: false,
    } as unknown as Response);

    await expect(
      createRefund("card-1", "tx-1", { amount: 4500 }),
    ).rejects.toThrow("Error al registrar el reembolso");
  });
});
