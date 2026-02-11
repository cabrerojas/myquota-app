import { getAuthHeaders } from "@/features/auth/hooks/useAuth";
import { API_BASE_URL } from "@/config/api";

export const getQuotasByTransaction = async (
  creditCardId: string,
  transactionId: string,
) => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/${transactionId}/quotas`,
    { headers },
  );
  return response.json();
};
