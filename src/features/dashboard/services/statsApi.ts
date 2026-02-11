import { getAuthHeaders } from "../../auth/hooks/useAuth";
import { API_BASE_URL } from "@/config/api";

export const getMonthlyStats = async (creditCardId: string) => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/creditCards/${creditCardId}/stats/monthly`,
    { headers },
  );
  return response.json();
};
