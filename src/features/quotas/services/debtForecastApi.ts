import { requestWithAuth } from "@/features/auth/hooks/useAuth";
import { API_BASE_URL } from "@/config/api";

export interface MonthBucket {
  key: string;
  label: string;
  totalCLP: number;
  totalUSD: number;
  count: number;
  details: {
    merchant: string;
    amount: number;
    currency: string;
    quotaNumber: number;
    totalQuotas: number;
    transactionId: string;
    creditCardId: string;
  }[];
  periodsByCard: { creditCardId: string; billingPeriodId: string }[];
}

export interface DebtForecastResponse {
  months: MonthBucket[];
  totalDebtCLP: number;
  totalDebtUSD: number;
}

export const getDebtForecast = async (force = false): Promise<DebtForecastResponse> => {
  const url = `${API_BASE_URL}/quotas/debt-forecast`;
  const response = await requestWithAuth(
    force ? `${url}?force=true` : url,
  );
  if (!response.ok) {
    throw new Error("Error al obtener proyección de deuda");
  }
  return response.json();
};
