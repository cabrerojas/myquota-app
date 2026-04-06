import { requestWithAuth } from "@/features/auth/hooks/useAuth";
import { API_BASE_URL } from "@/config/api";
import { CreditCard } from "@/shared/types/creditCard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface PaginatedResponse<T> {
  items: T[];
  metadata: {
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export const getCreditCards = async (
  limit?: number,
  startAfter?: string,
): Promise<PaginatedResponse<CreditCard>> => {
  let url = `${API_BASE_URL}/creditCards`;
  const params = new URLSearchParams();
  if (limit) params.append("limit", limit.toString());
  if (startAfter) params.append("startAfter", startAfter);
  if (params.toString()) url += `?${params.toString()}`;

  const response = await requestWithAuth(url);
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const err = data as Record<string, string> | null;
    const msg =
      err && (err.message || err.error)
        ? err.message || err.error
        : `HTTP ${response.status}`;
    throw new Error(`Error fetching credit cards: ${msg}`);
  }

  // Handle both array response (backward compat) and paginated response
  if (data && typeof data === "object" && "items" in data && "metadata" in data) {
    return data as PaginatedResponse<CreditCard>;
  }
  // Legacy: wrap array response
  if (Array.isArray(data)) {
    return {
      items: data as CreditCard[],
      metadata: { hasMore: false, nextCursor: null },
    };
  }
  return { items: [], metadata: { hasMore: false, nextCursor: null } };
};

export const useCreditCards = () => {
  return useQuery({
    queryKey: ["creditCards"],
    queryFn: () => getCreditCards().then(r => r.items),
  });
};

export const getUncategorizedCount = async (): Promise<number> => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/uncategorized-count`,
  );
  if (!response.ok) return 0;
  const data = (await response.json().catch(() => null)) as {
    uncategorizedCount?: number;
  } | null;
  return data?.uncategorizedCount ?? 0;
};

export const useUncategorizedCount = () => {
  return useQuery({
    queryKey: ["uncategorizedCount"],
    queryFn: getUncategorizedCount,
  });
};

export const getCreditCardById = async (
  creditCardId: string,
): Promise<CreditCard> => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}`,
  );
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    const err = data as Record<string, string> | null;
    const msg =
      err && (err.message || err.error)
        ? err.message || err.error
        : `HTTP ${response.status}`;
    throw new Error(`Error fetching credit card: ${msg}`);
  }
  return response.json();
};
