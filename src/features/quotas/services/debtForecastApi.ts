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

export const getDebtForecast = async (): Promise<DebtForecastResponse> => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/quotas/debt-forecast`,
  );
  if (!response.ok) {
    throw new Error("Error al obtener proyección de deuda");
  }
  return response.json();
};
