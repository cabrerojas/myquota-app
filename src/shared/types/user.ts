/**
 * User / session interfaces.
 *
 * UserInfo comes from Google Sign-In data stored in AsyncStorage.
 */

export interface UserInfo {
  givenName?: string;
  familyName?: string;
  email?: string;
  photo?: string;
}

/**
 * User profile from backend (includes budgets).
 * Backend entity: myquota-backend/src/modules/user/user.model.ts
 */
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  monthlyBudgetCLP?: number;
  monthlyBudgetUSD?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/**
 * Payload for updating user profile (partial).
 */
export type UserUpdate = Partial<
  Pick<User, "name" | "picture" | "monthlyBudgetCLP" | "monthlyBudgetUSD">
>;
