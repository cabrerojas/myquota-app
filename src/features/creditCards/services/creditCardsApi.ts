import { getAuthHeaders } from "@/features/auth/hooks/useAuth";
import { API_BASE_URL } from "@/config/api";

export const getCreditCards = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/creditCards`, { headers });
  return response.json();
};

export const getCreditCardById = async (creditCardId: string) => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/creditCards/${creditCardId}`, {
    headers,
  });
  return response.json();
};
