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
  // Optional category fields
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
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

export interface ManualTransaction {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  transactionDate: string;
  creditCardId: string;
  source: "manual";
  totalInstallments: number;
  paidInstallments: number;
}

export const getManualTransactions = async (
  creditCardId: string,
): Promise<ManualTransaction[]> => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/manual`,
    { headers },
  );
  if (!response.ok) throw new Error("Error al obtener deudas manuales");
  return response.json();
};

export const updateManualTransaction = async (
  creditCardId: string,
  transactionId: string,
  data: CreateManualTransactionDto,
): Promise<{ message: string; quotasCreated: number }> => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/manual/${transactionId}`,
    {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al actualizar deuda");
  }
  return response.json();
};

export const deleteManualTransaction = async (
  creditCardId: string,
  transactionId: string,
): Promise<{ message: string; deletedQuotas: number }> => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/manual/${transactionId}`,
    { method: "DELETE", headers },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al eliminar deuda");
  }
  return response.json();
};

export const updateTransaction = async (
  creditCardId: string,
  transactionId: string,
  data: Partial<{ categoryId?: string }>,
): Promise<any> => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/${transactionId}`,
    {
      method: "PUT",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error updating transaction");
  }
  return response.json();
};
