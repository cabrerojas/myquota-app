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

export interface MonthBucket {
  key: string;
  label: string;
  totalCLP: number;
  totalUSD: number;
  count: number;
  details: Array<{
    merchant: string;
    amount: number;
    currency: string;
    quotaNumber: number;
    totalQuotas: number;
    transactionId: string;
    creditCardId: string;
  }>;
  periodsByCard: Array<{ creditCardId: string; billingPeriodId: string }>;
}

export interface DebtForecastResponse {
  months: MonthBucket[];
  totalDebtCLP: number;
  totalDebtUSD: number;
}
