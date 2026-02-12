import { getAuthHeaders } from "@/features/auth/hooks/useAuth";
import { API_BASE_URL } from "@/config/api";

export interface BillingPeriod {
  id: string;
  creditCardId: string;
  month: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateBillingPeriodDto {
  month: string;
  startDate: string;
  endDate: string;
}

export const getBillingPeriodsByCreditCard = async (
  creditCardId: string,
): Promise<BillingPeriod[]> => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/creditCards/${creditCardId}/billingPeriods`,
    { headers },
  );
  if (!response.ok) {
    throw new Error("Error al obtener períodos de facturación");
  }
  return response.json();
};

export const createBillingPeriod = async (
  creditCardId: string,
  data: CreateBillingPeriodDto,
): Promise<BillingPeriod> => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/creditCards/${creditCardId}/billingPeriods`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al crear período de facturación");
  }
  return response.json();
};

export const updateBillingPeriod = async (
  creditCardId: string,
  billingPeriodId: string,
  data: Partial<CreateBillingPeriodDto>,
): Promise<BillingPeriod> => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/creditCards/${creditCardId}/billingPeriods/${billingPeriodId}`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify(data),
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      error.message || "Error al actualizar período de facturación",
    );
  }
  return response.json();
};

export const deleteBillingPeriod = async (
  creditCardId: string,
  billingPeriodId: string,
): Promise<void> => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `${API_BASE_URL}/creditCards/${creditCardId}/billingPeriods/${billingPeriodId}`,
    {
      method: "DELETE",
      headers,
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      error.message || "Error al eliminar período de facturación",
    );
  }
};
