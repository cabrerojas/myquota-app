import { requestWithAuth } from "../../auth/hooks/useAuth";
import { API_BASE_URL } from "@/config/api";

export const getMonthlyStats = async (creditCardId: string) => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/stats/monthly`,
  );
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const msg =
      data && (data.message || data.error)
        ? data.message || data.error
        : `HTTP ${response.status}`;
    throw new Error(`Error fetching monthly stats: ${msg}`);
  }
  return data;
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
  const response = await requestWithAuth(`${API_BASE_URL}/stats/debt-summary`);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const msg =
      data && (data.message || data.error)
        ? data.message || data.error
        : `HTTP ${response.status}`;
    throw new Error(`Error fetching debt summary: ${msg}`);
  }
  return data as DebtSummary;
};
