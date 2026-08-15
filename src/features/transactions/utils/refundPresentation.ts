import type { Transaction } from "@/shared/types/transaction";

export interface RefundStatusChip {
  label: "Reembolso parcial" | "Reembolso total";
  tone: "warning" | "success";
}

const REFUND_STATUS_CHIPS: Record<"partial" | "full", RefundStatusChip> = {
  partial: {
    label: "Reembolso parcial",
    tone: "warning",
  },
  full: {
    label: "Reembolso total",
    tone: "success",
  },
};

type RefundPresentationTransaction = Pick<
  Transaction,
  "canRefund" | "parentTransactionId" | "refundStatus" | "refunds" | "source"
>;

export function getRefundStatusChip(
  transaction: RefundPresentationTransaction,
): RefundStatusChip | null {
  if (transaction.refundStatus === "partial") {
    return REFUND_STATUS_CHIPS.partial;
  }

  if (transaction.refundStatus === "full") {
    return REFUND_STATUS_CHIPS.full;
  }

  return null;
}

export function hasTransactionRefunds(
  transaction: RefundPresentationTransaction,
): boolean {
  return (transaction.refunds?.length ?? 0) > 0;
}

export function canShowRefundAction(
  transaction: RefundPresentationTransaction,
): boolean {
  if (!transaction.canRefund) {
    return false;
  }

  return transaction.source !== "refund" && !transaction.parentTransactionId;
}
