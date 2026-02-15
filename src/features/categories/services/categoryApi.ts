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
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as CategoryMatch;
  } catch (e) {
    console.warn("categoryApi.matchCategoryByMerchant parse error", e);
    return null;
  }
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
  const text = await res.text();
  if (!text) throw new Error("Empty response from server");
  try {
    return JSON.parse(text) as Category;
  } catch (e) {
    console.warn("categoryApi.createCategoryWithMerchant parse error", e);
    throw new Error("Invalid response from server");
  }
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
  const text = await res.text();
  if (!text) return [];
  try {
    return JSON.parse(text) as any[];
  } catch (e) {
    console.warn("categoryApi.getMerchantsForCategory parse error", e);
    return [];
  }
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
  const text = await res.text();
  if (!text) throw new Error("Empty response from server");
  try {
    return JSON.parse(text) as Category;
  } catch (e) {
    console.warn("categoryApi.addGlobalCategoryToUser parse error", e);
    throw new Error("Invalid response from server");
  }
};

export const getAllCategories = async (): Promise<Category[]> => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE_URL}/categories`, {
    method: "GET",
    headers,
  });
  if (!res.ok) return [];
  const text = await res.text();
  if (!text) return [];
  try {
    return JSON.parse(text) as Category[];
  } catch (e) {
    console.warn("categoryApi.getAllCategories parse error", e);
    return [];
  }
};
