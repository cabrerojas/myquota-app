/**
 * Category types — synced with backend Category model.
 * Source of truth: myquota-backend/src/modules/category/category.model.ts
 */
export interface Category {
  id: string;
  name: string;
  normalizedName?: string;
  color?: string;
  icon?: string;
  userId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}
