import { getAuthHeaders } from "@/features/auth/hooks/useAuth";

export const getCreditCards = async () => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    "https://myquota-backend-production.up.railway.app/api/creditCards",
    { headers },
  );
  return response.json();
};

export const getCreditCardById = async (creditCardId: string) => {
  const headers = await getAuthHeaders();
  const response = await fetch(
    `https://myquota-backend-production.up.railway.app/api/creditCards/${creditCardId}`,
    { headers },
  );
  return response.json();
};
