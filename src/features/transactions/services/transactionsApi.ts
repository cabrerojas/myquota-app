import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { API_BASE_URL } from "@/config/api";
import { PaginatedResponse } from "@/features/creditCards/services/creditCardsApi";
import { requestWithAuth } from "@/features/auth/hooks/useAuth";
import {
  getQuotasByTransaction,
  splitQuotas,
} from "@/features/quotas/services/quotasApi";
import { ImportResult, Transaction } from "@/shared/types/transaction";

export type { PaginatedResponse };
export type { ImportResult, Transaction };

export interface CreateRefundDto {
  amount: number;
  reason?: string;
  transactionDate?: string;
}

export interface CreateRefundResult {
  refund: Transaction;
  transaction: Transaction;
}

export interface TransactionDetail {
  transaction: Transaction;
  quotas: Awaited<ReturnType<typeof getQuotasByTransaction>>;
}

interface CreateRefundResponse {
  message?: string;
  data?: CreateRefundResult;
}

export const transactionKeys = {
  all: ["transactions"] as const,
  details: () => [...transactionKeys.all, "detail"] as const,
  detail: (creditCardId: string, transactionId: string) =>
    [...transactionKeys.details(), creditCardId, transactionId] as const,
};

const parseJsonSafely = async (response: Response): Promise<unknown> => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

const getErrorMessage = (payload: unknown, fallback: string): string => {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string"
  ) {
    return payload.message;
  }

  return fallback;
};

const isPaginationMetadata = (
  metadata: unknown,
): metadata is PaginatedResponse<Transaction>["metadata"] => {
  return (
    !!metadata &&
    typeof metadata === "object" &&
    "hasMore" in metadata &&
    typeof metadata.hasMore === "boolean" &&
    "nextCursor" in metadata &&
    (typeof metadata.nextCursor === "string" || metadata.nextCursor === null)
  );
};

const isPaginatedTransactionResponse = (
  payload: unknown,
): payload is PaginatedResponse<Transaction> => {
  return (
    !!payload &&
    typeof payload === "object" &&
    "items" in payload &&
    Array.isArray(payload.items) &&
    "metadata" in payload &&
    isPaginationMetadata(payload.metadata)
  );
};

export const getTransactionsByCreditCard = async (
  creditCardId: string,
  limit?: number,
  startAfter?: string,
  startDate?: string,
  endDate?: string,
  categoryId?: string,
): Promise<PaginatedResponse<Transaction>> => {
  let url = `${API_BASE_URL}/creditCards/${creditCardId}/transactions`;
  const params = new URLSearchParams();
  if (limit) params.append("limit", limit.toString());
  if (startAfter) params.append("startAfter", startAfter);
  if (startDate) params.append("startDate", startDate);
  if (endDate) params.append("endDate", endDate);
  if (categoryId) params.append("categoryId", categoryId);
  if (params.toString()) url += `?${params.toString()}`;

  const response = await requestWithAuth(url);
  if (!response.ok) {
    throw new Error("Error al obtener transacciones");
  }

  const data = await response.json();

  // Handle both array (legacy) and paginated response
  if (isPaginatedTransactionResponse(data)) {
    return data;
  }

  // Legacy: wrap array response
  if (Array.isArray(data)) {
    return {
      items: data,
      metadata: { hasMore: false, nextCursor: null },
    };
  }

  return { items: [], metadata: { hasMore: false, nextCursor: null } };
};

export const getTransactionById = async (
  creditCardId: string,
  transactionId: string,
): Promise<Transaction> => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/${transactionId}`,
  );
  if (!response.ok) {
    const error = await parseJsonSafely(response);
    throw new Error(getErrorMessage(error, "Error al obtener transacción"));
  }
  return response.json();
};

export const importBankTransactions = async (
  creditCardId: string,
): Promise<ImportResult> => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/import-bank-transactions`,
    { method: "POST" },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al importar transacciones");
  }
  return response.json();
};

export interface CreateManualTransactionDto {
  merchant: string;
  purchaseDate: string;
  quotaAmount: number;
  totalInstallments: number;
  paidInstallments: number;
  lastPaidMonth: string;
  currency: string;
  categoryId?: string;
}

export const createManualTransaction = async (
  creditCardId: string,
  data: CreateManualTransactionDto,
): Promise<{ message: string; quotasCreated: number }> => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/manual`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al crear transacción manual");
  }
  return response.json();
};

export interface ManualTransaction {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  transactionDate: string;
  creditCardId: string;
  source: string;
  totalInstallments: number;
  paidInstallments: number;
}

export const getManualTransactions = async (
  creditCardId: string,
): Promise<ManualTransaction[]> => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/manual`,
  );
  if (!response.ok) throw new Error("Error al obtener deudas manuales");
  return response.json();
};

export const updateManualTransaction = async (
  creditCardId: string,
  transactionId: string,
  data: CreateManualTransactionDto,
): Promise<{ message: string; quotasCreated: number }> => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/manual/${transactionId}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al actualizar deuda");
  }
  return response.json();
};

export const deleteManualTransaction = async (
  creditCardId: string,
  transactionId: string,
): Promise<{ message: string; deletedQuotas: number }> => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/manual/${transactionId}`,
    { method: "DELETE" },
  );
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al eliminar deuda");
  }
  return response.json();
};

interface UpdateTransactionResponse {
  message?: string;
  data?: Transaction;
}

export const updateTransaction = async (
  creditCardId: string,
  transactionId: string,
  data: Partial<{ categoryId?: string }>,
): Promise<UpdateTransactionResponse> => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/${transactionId}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );
  if (!response.ok) {
    const error = await parseJsonSafely(response);
    throw new Error(getErrorMessage(error, "Error updating transaction"));
  }
  return response.json();
};

export const createRefund = async (
  creditCardId: string,
  transactionId: string,
  data: CreateRefundDto,
): Promise<CreateRefundResponse> => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}/transactions/${transactionId}/refunds`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  if (!response.ok) {
    const error = await parseJsonSafely(response);
    throw new Error(getErrorMessage(error, "Error al registrar el reembolso"));
  }

  return response.json();
};

const sortQuotasByDueDate = (
  quotas: Awaited<ReturnType<typeof getQuotasByTransaction>>,
) => {
  return [...quotas].sort(
    (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
  );
};

export function useTransactionDetail(
  creditCardId: string,
  transactionId: string,
) {
  return useQuery({
    queryKey: transactionKeys.detail(creditCardId, transactionId),
    queryFn: async (): Promise<TransactionDetail> => {
      const [transaction, quotas] = await Promise.all([
        getTransactionById(creditCardId, transactionId),
        getQuotasByTransaction(creditCardId, transactionId),
      ]);

      return {
        transaction,
        quotas: sortQuotasByDueDate(quotas),
      };
    },
  });
}

export function useUpdateTransactionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      creditCardId,
      transactionId,
      data,
    }: {
      creditCardId: string;
      transactionId: string;
      data: Partial<{ categoryId?: string }>;
    }) => updateTransaction(creditCardId, transactionId, data),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });

      if (!response.data) {
        queryClient.invalidateQueries({
          queryKey: transactionKeys.detail(
            variables.creditCardId,
            variables.transactionId,
          ),
        });
        return;
      }

      queryClient.setQueryData(
        transactionKeys.detail(variables.creditCardId, variables.transactionId),
        (current: TransactionDetail | undefined) => {
          if (!current) return current;

          return {
            ...current,
            transaction: response.data ?? current.transaction,
          };
        },
      );
    },
  });
}

export function useCreateRefundMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      creditCardId,
      transactionId,
      data,
    }: {
      creditCardId: string;
      transactionId: string;
      data: CreateRefundDto;
    }) => createRefund(creditCardId, transactionId, data),
    onSuccess: async (_response, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
        queryClient.invalidateQueries({
          queryKey: transactionKeys.detail(
            variables.creditCardId,
            variables.transactionId,
          ),
        }),
        queryClient.invalidateQueries({ queryKey: ["debtSummary"] }),
        queryClient.invalidateQueries({ queryKey: ["monthlyStats"] }),
        queryClient.invalidateQueries({ queryKey: ["debtForecast"] }),
      ]);
    },
  });
}

export function useSplitQuotasMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      creditCardId,
      transactionId,
      numberOfQuotas,
    }: {
      creditCardId: string;
      transactionId: string;
      numberOfQuotas: number;
    }) => splitQuotas(creditCardId, transactionId, numberOfQuotas),
    onSuccess: async (_response, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: transactionKeys.all }),
        queryClient.invalidateQueries({
          queryKey: transactionKeys.detail(
            variables.creditCardId,
            variables.transactionId,
          ),
        }),
        queryClient.invalidateQueries({ queryKey: ["debtSummary"] }),
        queryClient.invalidateQueries({ queryKey: ["monthlyStats"] }),
        queryClient.invalidateQueries({ queryKey: ["debtForecast"] }),
      ]);
    },
  });
}

// ─── React Query infinite hook ────────────────────────────────────────

const PAGE_SIZE = 50;

export function useInfiniteTransactions(
  creditCardId: string | null,
  startDate?: string,
  endDate?: string,
  categoryId?: string,
) {
  return useInfiniteQuery({
    queryKey: ["transactions", creditCardId, startDate, endDate, categoryId],
    queryFn: ({ pageParam }) =>
      getTransactionsByCreditCard(
        creditCardId!,
        PAGE_SIZE,
        pageParam as string | undefined,
        startDate,
        endDate,
        categoryId,
      ),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.metadata.nextCursor ?? undefined,
    enabled: !!creditCardId,
    staleTime: 30_000,
  });
}
