import { requestWithAuth } from "@/features/auth/hooks/useAuth";
import { API_BASE_URL } from "@/config/api";
import { PaginatedResponse } from "@/features/creditCards/services/creditCardsApi";

export type { PaginatedResponse };

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
  // Optional category fields
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
}

export const getTransactionsByCreditCard = async (
  creditCardId: string,
  limit?: number,
  startAfter?: string,
  startDate?: string,
  endDate?: string,
): Promise<PaginatedResponse<Transaction>> => {
  let url = `${API_BASE_URL}/creditCards/${creditCardId}/transactions`;
  const params = new URLSearchParams();
  if (limit) params.append("limit", limit.toString());
  if (startAfter) params.append("startAfter", startAfter);
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  if (params.toString()) url += `?${params.toString()}`;

  const response = await requestWithAuth(url);
  if (!response.ok) {
    throw new Error("Error al obtener transacciones");
  }
  
  const data = await response.json();
  
  // Handle both array (legacy) and paginated response
  if (data && typeof data === "object" && "items" in data && "metadata" in data) {
    return data as PaginatedResponse<Transaction>;
  }
  // Legacy: wrap array response
  if (Array.isArray(data)) {
    return {
      items: data as Transaction[],
      metadata: { hasMore: false, nextCursor: null },
    };
  }
  return { items: [], metadata: { hasMore: false, nextCursor: null } };
};

export const getTransactionById = async (
  creditCardId: string,
  transactionId: string,
): Promise<Transaction> => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/${transactionId}`,
  );
  if (!response.ok) {
    throw new Error("Error al obtener transacción");
  }
  return response.json();
};

export const importBankTransactions = async (
  creditCardId: string,
): Promise<ImportResult> => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/import-bank-transactions`,
    { method: "POST" },
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
  categoryId?: string;
}

export const createManualTransaction = async (
  creditCardId: string,
  data: CreateManualTransactionDto,
): Promise<{ message: string; quotasCreated: number }> => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/manual`,
    {
      method: "POST",
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
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/manual`,
  );
  if (!response.ok) throw new Error("Error al obtener deudas manuales");
  return response.json();
};

export const updateManualTransaction = async (
  creditCardId: string,
  transactionId: string,
  data: CreateManualTransactionDto,
): Promise<{ message: string; quotasCreated: number }> => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/manual/${transactionId}`,
    {
      method: "PUT",
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
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/manual/${transactionId}`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al eliminar deuda");
  }
  return response.json();
};

interface UpdateTransactionResponse {
  message?: string;
  data?: Transaction;
}

export const updateTransaction = async (
  creditCardId: string,
  transactionId: string,
  data: Partial<{ categoryId?: string }>,
): Promise<UpdateTransactionResponse> => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/${transactionId}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error updating transaction");
  }
  return response.json();
};
