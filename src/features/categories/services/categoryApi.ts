import { getAuthHeaders } from "@/features/auth/hooks/useAuth";
import { API_BASE_URL } from "@/config/api";

export interface CategoryMatch {
  categoryId: string;
  categoryName: string;
}

export const matchCategoryByMerchant = async (
  merchantName: string,
): Promise<CategoryMatch | null> => {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}/categories/match-merchant`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ merchantName }),
  });
  if (!response.ok) return null;
  return response.json();
};

export interface Category {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  userId?: string | null;
}

export interface CreateCategoryWithMerchantParams {
  name: string;
  color?: string;
  icon?: string;
  isGlobal?: boolean;
  merchantName?: string;
  pattern?: string;
}

export const createCategoryWithMerchant = async (
  params: CreateCategoryWithMerchantParams,
): Promise<Category> => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/categories/with-merchant`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error("Error creating category");
  return res.json();
};

export const addMerchantToCategory = async (
  categoryId: string,
  merchantName: string,
  pattern: string,
): Promise<void> => {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${API_BASE_URL}/categories/${categoryId}/add-merchant`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ merchantName, pattern }),
    },
  );
  if (!res.ok) throw new Error("Error adding merchant to category");
};

export const getMerchantsForCategory = async (
  categoryId: string,
): Promise<any[]> => {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${API_BASE_URL}/categories/${categoryId}/merchants`,
    {
      method: "GET",
      headers,
    },
  );
  if (!res.ok) return [];
  return res.json();
};

export const addGlobalCategoryToUser = async (
  categoryId: string,
): Promise<Category> => {
  const headers = await getAuthHeaders();
  const res = await fetch(
    `${API_BASE_URL}/categories/${categoryId}/add-to-user`,
    {
      method: "POST",
      headers,
    },
  );
  if (!res.ok) throw new Error("Error adding global category to user");
  return res.json();
};
