import type { Transaction } from "@/shared/types/transaction";
import {
  canShowRefundAction,
  getRefundStatusChip,
  hasTransactionRefunds,
} from "./refundPresentation";

const BASE_TRANSACTION: Transaction = {
  id: "tx-1",
  amount: 15000,
  bank: "bank",
  cardLastDigits: "4242",
  cardType: "Visa",
  creditCardId: "card-1",
  currency: "CLP",
  merchant: "Mercado",
  transactionDate: "2026-08-14T12:00:00.000Z",
};

describe("refundPresentation", () => {
  it("returns the Spanish chip for a partial refund", () => {
    expect(
      getRefundStatusChip({
        ...BASE_TRANSACTION,
        refundStatus: "partial",
      }),
    ).toEqual({
      label: "Reembolso parcial",
      tone: "warning",
    });
  });

  it("returns the Spanish chip for a full refund", () => {
    expect(
      getRefundStatusChip({
        ...BASE_TRANSACTION,
        refundStatus: "full",
      }),
    ).toEqual({
      label: "Reembolso total",
      tone: "success",
    });
  });

  it("does not create a chip for a merely eligible transaction", () => {
    expect(
      getRefundStatusChip({
        ...BASE_TRANSACTION,
        canRefund: true,
        refundStatus: "none",
      }),
    ).toBeNull();
  });

  it("detects whether a transaction has recorded refunds", () => {
    expect(hasTransactionRefunds(BASE_TRANSACTION)).toBe(false);
    expect(
      hasTransactionRefunds({
        ...BASE_TRANSACTION,
        refunds: [
          {
            id: "refund-1",
            amount: 2500,
            currency: "CLP",
            createdAt: "2026-08-15T12:00:00.000Z",
            transactionDate: "2026-08-15T12:00:00.000Z",
          },
        ],
      }),
    ).toBe(true);
  });

  it("allows the refund action only for eligible parent transactions", () => {
    expect(
      canShowRefundAction({
        ...BASE_TRANSACTION,
        canRefund: true,
        parentTransactionId: null,
      }),
    ).toBe(true);

    expect(
      canShowRefundAction({
        ...BASE_TRANSACTION,
        canRefund: true,
        parentTransactionId: "parent-1",
      }),
    ).toBe(false);

    expect(
      canShowRefundAction({
        ...BASE_TRANSACTION,
        canRefund: true,
        source: "refund",
      }),
    ).toBe(false);
  });
});
