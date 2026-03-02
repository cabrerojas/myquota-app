import { requestWithAuth } from "@/features/auth/hooks/useAuth";
import { API_BASE_URL } from "@/config/api";
import { CreditCard } from "@/shared/types/creditCard";

export const getCreditCards = async (): Promise<CreditCard[]> => {
  const response = await requestWithAuth(`${API_BASE_URL}/creditCards`);
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const err = data as Record<string, string> | null;
    const msg =
      err && (err.message || err.error)
        ? err.message || err.error
        : `HTTP ${response.status}`;
    throw new Error(`Error fetching credit cards: ${msg}`);
  }

  // Normalize to array
  if (Array.isArray(data)) return data as CreditCard[];
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as Record<string, unknown>).data)
  ) {
    return (data as Record<string, unknown>).data as CreditCard[];
  }
  return [];
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
