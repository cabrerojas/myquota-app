import { getAuthHeaders } from "@/features/auth/hooks/useAuth";

export const getTransactionsByCreditCard = async (creditCardId: string) => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `https://myquota-backend-production.up.railway.app/api/creditCards/${creditCardId}/transactions`,
    { headers },
  );
  return response.json();
};
