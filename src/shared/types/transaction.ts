export type TransactionSource = "email" | "manual" | "refund";
export type RefundStatus = "none" | "partial" | "full";

export interface TransactionRefund {
  id: string;
  amount: number;
  currency: string;
  transactionDate: string;
  createdAt: string;
  refundReason?: string;
}

export interface ImportResult {
  message: string;
  importedCount: number;
  quotasCreated: number;
  orphanedCount: number;
  orphanedTransactions: {
    id: string;
    merchant: string;
    amount: number;
    currency: string;
    transactionDate: string;
  }[];
  suggestedPeriod: {
    month: string;
    startDate: string;
    endDate: string;
  } | null;
}

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  cardType: string;
  cardLastDigits: string;
  merchant: string;
  transactionDate: string;
  bank: string;
  creditCardId: string;
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  source?: TransactionSource;
  parentTransactionId?: string | null;
  totalInstallments?: number;
  refundReason?: string;
  refundStatus?: RefundStatus;
  refundedAmount?: number;
  refundableAmount?: number;
  canRefund?: boolean;
  refunds?: TransactionRefund[];
}
