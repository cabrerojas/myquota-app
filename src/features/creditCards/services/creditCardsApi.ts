import { requestWithAuth } from "@/features/auth/hooks/useAuth";
import { API_BASE_URL } from "@/config/api";

export const getCreditCards = async () => {
  const response = await requestWithAuth(`${API_BASE_URL}/creditCards`);
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    // Try to extract message otherwise throw generic
    const msg =
      data && (data.message || data.error)
        ? data.message || data.error
        : `HTTP ${response.status}`;
    throw new Error(`Error fetching credit cards: ${msg}`);
  }

  // Normalize to array
  if (Array.isArray(data)) return data;
  if (data && Array.isArray((data as any).data)) return (data as any).data;
  return [];
};

export const getCreditCardById = async (creditCardId: string) => {
  const response = await requestWithAuth(
    `${API_BASE_URL}/creditCards/${creditCardId}`,
  );
  return response.json();
};
