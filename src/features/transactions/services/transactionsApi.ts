import { getAuthHeaders } from "@/features/auth/hooks/useAuth";
import { API_BASE_URL } from "@/config/api";

export const getTransactionsByCreditCard = async (creditCardId: string) => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions`,
    { headers },
  );
  return response.json();
};

export const importBankTransactions = async (creditCardId: string) => {
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
