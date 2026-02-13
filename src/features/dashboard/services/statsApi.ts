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

export interface DebtSummary {
  totalCLP: number;
  totalUSD: number;
  pendingCount: number;
  monthsRemaining: number;
  nextMonthCLP: number;
  nextMonthUSD: number;
}

export const getDebtSummary = async (): Promise<DebtSummary> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/stats/debt-summary`, {
    headers,
  });
  if (!response.ok) {
    throw new Error("Error fetching debt summary");
  }
  return response.json();
};
