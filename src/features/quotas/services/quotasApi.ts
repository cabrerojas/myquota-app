import { getAuthHeaders } from "@/features/auth/hooks/useAuth";

export const getQuotasByTransaction = async (
  creditCardId: string,
  transactionId: string,
) => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `https://myquota-backend-production.up.railway.app/api/creditCards/${creditCardId}/transactions/${transactionId}/quotas`,
    { headers },
  );
  return response.json();
};
