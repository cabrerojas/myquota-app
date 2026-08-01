export interface Quota {
  id: string;
  transactionId: string;
  amount: number;
  dueDate: string;
  status: "pending" | "paid";
  currency: string;
  paymentDate?: string;
  /** Vencimiento real del período de facturación (calculado en backend). */
  billingDueDate?: string;
}

export interface QuotaWithTransaction extends Quota {
  merchant: string;
  transactionDate: string;
  transactionAmount: number;
  totalQuotas: number;
  paidQuotas: number;
  pendingQuotas: number;
  quotaNumber: number;
}
