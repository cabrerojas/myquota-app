import { requestWithAuth } from "@/features/auth/hooks/useAuth";
import { API_BASE_URL } from "@/config/api";

export interface MonthlyStat {
  month: string;
  totalCLP: number;
  totalUSD: number;
  categoryBreakdown: {
    [category: string]: { CLP: number; USD: number };
  };
}

export const getMonthlyStats = async (
  creditCardId: string,
): Promise<MonthlyStat[]> => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/stats/monthly`,
  );
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const err = data as Record<string, string> | null;
    const msg =
      err && (err.message || err.error)
        ? err.message || err.error
        : `HTTP ${response.status}`;
    throw new Error(`Error fetching monthly stats: ${msg}`);
  }
  return data as MonthlyStat[];
};

export interface DebtSummary {
  totalCLP: number;
  totalUSD: number;
  pendingCount: number;
  monthsRemaining: number;
  nextMonthCLP: number;
  nextMonthUSD: number;
  /** Per-period totals sorted chronologically. Used for the 3-month preview. */
  monthlyBreakdown: { month: string; CLP: number; USD: number }[];
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
