import { getAuthHeaders } from "../../auth/hooks/useAuth";

export const getMonthlyStats = async (creditCardId: string) => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `https://myquota-backend-production.up.railway.app/api/creditCards/${creditCardId}/stats/monthly`,
    { headers },
  );
  return response.json();
};
