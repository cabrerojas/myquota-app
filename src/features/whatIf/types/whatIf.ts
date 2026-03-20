export type Currency = "CLP" | "USD";

export interface WhatIfProduct {
  id?: string; // local-only id
  merchant: string;
  amount: number;
  currency: Currency;
  totalInstallments: number;
  firstDueDate: string; // ISO date
  creditCardId?: string | null;
}

export interface WhatIfRequest {
  products: WhatIfProduct[];
}

export interface MonthProjection {
  year: number;
  month: number;
  amountCLP: number;
  amountUSD: number;
  breakdown?: Record<string, unknown>;
}

export interface WhatIfResponse {
  projection: MonthProjection[];
  meta: { months: number };
}
