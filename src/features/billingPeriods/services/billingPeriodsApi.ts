import { getAuthHeaders } from "@/features/auth/hooks/useAuth";
import { API_BASE_URL } from "@/config/api";

export const getBillingPeriodsByCreditCard = async (creditCardId: string) => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/creditCards/${creditCardId}/billingPeriods`,
    { headers },
  );
  return response.json();
};
