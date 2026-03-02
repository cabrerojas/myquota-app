/**
 * CreditCard — canonical interface matching the backend model.
 *
 * Backend entity: myquota-backend/src/modules/creditCard/creditCard.model.ts
 *
 * Use Pick<CreditCard, …> in components that only need a subset of fields.
 */

export interface CreditCard {
  id: string;
  cardType: string;
  cardLastDigits: string;
  cardHolderName: string;
  status: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  dueDate: string;
  nationalAmountUsed: number;
  nationalAmountAvailable: number;
  nationalTotalLimit: number;
  nationalAdvanceAvailable: number;
  internationalAmountUsed: number;
  internationalAmountAvailable: number;
  internationalTotalLimit: number;
  internationalAdvanceAvailable: number;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

/** Minimal subset used by selectors / pickers (e.g. card tabs). */
export type CreditCardBasic = Pick<
  CreditCard,
  "id" | "cardType" | "cardLastDigits"
>;

/** Subset with national & international limits (used in dashboard/alerts). */
export type CreditCardWithLimits = Pick<
  CreditCard,
  | "id"
  | "cardType"
  | "cardLastDigits"
  | "nationalAmountUsed"
  | "nationalTotalLimit"
  | "internationalAmountUsed"
  | "internationalTotalLimit"
>;

/** Summary used in the profile screen. */
export interface CreditCardSummary {
  total: number;
  active: number;
}
