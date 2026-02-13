import { getAuthHeaders } from "@/features/auth/hooks/useAuth";
import { API_BASE_URL } from "@/config/api";

export interface ImportResult {
  message: string;
  importedCount: number;
  quotasCreated: number;
  orphanedCount: number;
  orphanedTransactions: Array<{
    id: string;
    merchant: string;
    amount: number;
    currency: string;
    transactionDate: string;
  }>;
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
}

export const getTransactionsByCreditCard = async (
  creditCardId: string,
): Promise<Transaction[]> => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions`,
    { headers },
  );
  if (!response.ok) {
    throw new Error("Error al obtener transacciones");
  }
  return response.json();
};

export const importBankTransactions = async (
  creditCardId: string,
): Promise<ImportResult> => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/import-bank-transactions`,
    { method: "POST", headers },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al importar transacciones");
  }
  return response.json();
};

export interface CreateManualTransactionDto {
  merchant: string;
  purchaseDate: string;
  quotaAmount: number;
  totalInstallments: number;
  paidInstallments: number;
  lastPaidMonth: string;
  currency: string;
}

export const createManualTransaction = async (
  creditCardId: string,
  data: CreateManualTransactionDto,
): Promise<{ message: string; quotasCreated: number }> => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/manual`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al crear transacción manual");
  }
  return response.json();
};
