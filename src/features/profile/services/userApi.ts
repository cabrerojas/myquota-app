import { requestWithAuth } from "@/features/auth/hooks/useAuth";
import { API_BASE_URL } from "@/config/api";
import { User, UserUpdate } from "@/shared/types/user";

export const getMyProfile = async (): Promise<User> => {
  const response = await requestWithAuth(`${API_BASE_URL}/users/me`);
  if (!response.ok) {
    const data: unknown = await response.json().catch(() => null);
    const err = data as Record<string, string> | null;
    const msg =
      err && (err.message || err.error)
        ? err.message || err.error
        : `HTTP ${response.status}`;
    throw new Error(`Error fetching profile: ${msg}`);
  }
  return response.json();
};

export const updateMyProfile = async (data: UserUpdate): Promise<User> => {
  const response = await requestWithAuth(`${API_BASE_URL}/users/me`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const errData: unknown = await response.json().catch(() => null);
    const err = errData as Record<string, string> | null;
    const msg =
      err && (err.message || err.error)
        ? err.message || err.error
        : `HTTP ${response.status}`;
    throw new Error(`Error updating profile: ${msg}`);
  }
  return response.json();
};
