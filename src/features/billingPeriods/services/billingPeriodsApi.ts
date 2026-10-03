import { requestWithAuth } from "@/features/auth/hooks/useAuth";
import { API_BASE_URL } from "@/config/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface BillingPeriod {
  id: string;
  creditCardId: string;
  month: string;
  startDate: string;
  endDate: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateBillingPeriodDto {
  creditCardId: string;
  month: string;
  startDate: string;
  endDate: string;
  dueDate?: string;
}

export const getBillingPeriodsByCreditCard = async (
  creditCardId: string,
): Promise<{
  items: BillingPeriod[];
  metadata: { hasMore: boolean; nextCursor: string | null };
}> => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/billingPeriods`,
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
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/billingPeriods`,
    {
      method: "POST",
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
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/billingPeriods/${billingPeriodId}`,
    {
      method: "PUT",
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
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/billingPeriods/${billingPeriodId}`,
    {
      method: "DELETE",
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      error.message || "Error al eliminar período de facturación",
    );
  }
};

export interface BillingPeriodSettlementLine {
  quotaId: string;
  transactionId: string;
  amount: number;
  currency: string;
  dueDate: string;
}

export interface BillingPeriodSettlementOutcome {
  settlementId: string;
  billingPeriodId: string;
  creditCardId: string;
  settledAt: string;
  alreadySettled: boolean;
  settledQuotaCount: number;
  settledTotalAmount: number;
  lines: BillingPeriodSettlementLine[];
}

export interface BillingPeriodSettlementTarget {
  creditCardId: string;
  billingPeriodId: string;
}

export interface BillingPeriodSettlementResult {
  period: BillingPeriodSettlementTarget;
  status: "settled" | "already-settled" | "failed";
  outcome?: BillingPeriodSettlementOutcome;
  error?: string;
}

const getSettlementIdempotencyKey = (
  creditCardId: string,
  billingPeriodId: string,
): string => `settle:${creditCardId}:${billingPeriodId}`;

export const settleBillingPeriod = async (
  creditCardId: string,
  billingPeriodId: string,
): Promise<BillingPeriodSettlementOutcome> => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/billingPeriods/${billingPeriodId}/settle`,
    {
      method: "POST",
      headers: {
        "Idempotency-Key": getSettlementIdempotencyKey(
          creditCardId,
          billingPeriodId,
        ),
      },
    },
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Error al registrar el pago del período");
  }
  return response.json();
};

export const executeBillingPeriodSettlements = async (
  periods: BillingPeriodSettlementTarget[],
  settle: (
    creditCardId: string,
    billingPeriodId: string,
  ) => Promise<BillingPeriodSettlementOutcome> = settleBillingPeriod,
): Promise<BillingPeriodSettlementResult[]> => {
  const uniquePeriods = Array.from(
    new Map(
      periods.map((period) => [
        `${period.creditCardId}:${period.billingPeriodId}`,
        period,
      ]),
    ).values(),
  );

  return Promise.all(
    uniquePeriods.map(
      async (period): Promise<BillingPeriodSettlementResult> => {
        try {
          const outcome = await settle(
            period.creditCardId,
            period.billingPeriodId,
          );
          return {
            period,
            outcome,
            status: outcome.alreadySettled ? "already-settled" : "settled",
          };
        } catch (error) {
          return {
            period,
            status: "failed",
            error:
              error instanceof Error
                ? error.message
                : "No se pudo registrar el pago del período",
          };
        }
      },
    ),
  );
};

// React Query hooks for billing periods
export const useBillingPeriods = (creditCardId: string) => {
  return useQuery({
    queryKey: ["billingPeriods", creditCardId],
    queryFn: () => getBillingPeriodsByCreditCard(creditCardId),
    enabled: !!creditCardId,
  });
};

export const useCreateBillingPeriod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      creditCardId,
      data,
    }: {
      creditCardId: string;
      data: CreateBillingPeriodDto;
    }) => createBillingPeriod(creditCardId, data),
    onSuccess: (_, { creditCardId }) => {
      // Invalidate billing periods cache
      queryClient.invalidateQueries({
        queryKey: ["billingPeriods", creditCardId],
      });
      // Also invalidate debt summary as it depends on billing periods
      queryClient.invalidateQueries({ queryKey: ["debtSummary"] });
    },
  });
};

export const useUpdateBillingPeriod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      creditCardId,
      billingPeriodId,
      data,
    }: {
      creditCardId: string;
      billingPeriodId: string;
      data: Partial<CreateBillingPeriodDto>;
    }) => updateBillingPeriod(creditCardId, billingPeriodId, data),
    onSuccess: (_, { creditCardId }) => {
      queryClient.invalidateQueries({
        queryKey: ["billingPeriods", creditCardId],
      });
      queryClient.invalidateQueries({ queryKey: ["debtSummary"] });
    },
  });
};

export const useDeleteBillingPeriod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      creditCardId,
      billingPeriodId,
    }: {
      creditCardId: string;
      billingPeriodId: string;
    }) => deleteBillingPeriod(creditCardId, billingPeriodId),
    onSuccess: (_, { creditCardId }) => {
      queryClient.invalidateQueries({
        queryKey: ["billingPeriods", creditCardId],
      });
      queryClient.invalidateQueries({ queryKey: ["debtSummary"] });
    },
  });
};
