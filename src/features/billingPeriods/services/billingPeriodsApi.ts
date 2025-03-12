import { getAuthHeaders } from "@/features/auth/hooks/useAuth";

export const getBillingPeriodsByCreditCard = async (creditCardId: string) => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `https://myquota-backend-production.up.railway.app/api/creditCards/${creditCardId}/billingPeriods`,
    { headers },
  );
  return response.json();
};
