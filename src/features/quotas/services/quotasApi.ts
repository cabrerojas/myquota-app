import { requestWithAuth } from "@/features/auth/hooks/useAuth";
import { API_BASE_URL } from "@/config/api";

export interface Quota {
  id: string;
  transactionId: string;
  amount: number;
  due_date: string;
  status: "pending" | "paid";
  currency: string;
  payment_date?: string;
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

export const getQuotasByTransaction = async (
  creditCardId: string,
  transactionId: string,
): Promise<Quota[]> => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/${transactionId}/quotas`,
  );
  if (!response.ok) {
    return [];
  }
  return response.json();
};

export const createQuota = async (
  creditCardId: string,
  transactionId: string,
  data: Omit<Quota, "id">,
): Promise<Quota> => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/${transactionId}/quotas`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
  if (!response.ok) {
    throw new Error("Error al crear cuota");
  }
  return response.json();
};

export const updateQuota = async (
  creditCardId: string,
  transactionId: string,
  quotaId: string,
  data: Partial<Quota>,
): Promise<void> => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/${transactionId}/quotas/${quotaId}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );
  if (!response.ok) {
    throw new Error("Error al actualizar cuota");
  }
};

export const deleteQuota = async (
  creditCardId: string,
  transactionId: string,
  quotaId: string,
): Promise<void> => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/${transactionId}/quotas/${quotaId}`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    throw new Error("Error al eliminar cuota");
  }
};

export const splitQuotas = async (
  creditCardId: string,
  transactionId: string,
  numberOfQuotas: number,
): Promise<Quota[]> => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/${transactionId}/quotas/split`,
    { method: "POST", body: JSON.stringify({ numberOfQuotas }) },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || "Error al dividir en cuotas");
  }
  return response.json();
};
