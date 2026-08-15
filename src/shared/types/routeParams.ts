export interface DebtRouteParams {
  editMode?: string;
  transactionId?: string;
  creditCardId?: string;
  merchant?: string;
  quotaAmount?: string;
  totalInstallments?: string;
  paidInstallments?: string;
  currency?: string;
  purchaseDate?: string;
  lastPaidMonth?: string;
  lastPaidYear?: string;
  selectedCategoryId?: string;
  selectedCategoryName?: string;
  readOnlyFields?: string;
  source?: string;
}

export interface TransactionDetailRouteParams {
  creditCardId?: string;
  transactionId?: string;
}

export interface BillingPeriodDetailRouteParams {
  creditCardId?: string;
  periodMonth?: string;
  periodStartDate?: string;
  periodEndDate?: string;
}

export interface BillingPeriodsRouteParams {
  creditCardId?: string;
  creditCardLabel?: string;
}

type RouteParamValue = string | string[] | undefined;

export const readRouteParam = (value: RouteParamValue): string | undefined => {
  return Array.isArray(value) ? value[0] : value;
};

export const pickDebtRouteParams = (
  params: Partial<Record<keyof DebtRouteParams, RouteParamValue>>,
): DebtRouteParams => ({
  editMode: readRouteParam(params.editMode),
  transactionId: readRouteParam(params.transactionId),
  creditCardId: readRouteParam(params.creditCardId),
  merchant: readRouteParam(params.merchant),
  quotaAmount: readRouteParam(params.quotaAmount),
  totalInstallments: readRouteParam(params.totalInstallments),
  paidInstallments: readRouteParam(params.paidInstallments),
  currency: readRouteParam(params.currency),
  purchaseDate: readRouteParam(params.purchaseDate),
  lastPaidMonth: readRouteParam(params.lastPaidMonth),
  lastPaidYear: readRouteParam(params.lastPaidYear),
  selectedCategoryId: readRouteParam(params.selectedCategoryId),
  selectedCategoryName: readRouteParam(params.selectedCategoryName),
  readOnlyFields: readRouteParam(params.readOnlyFields),
  source: readRouteParam(params.source),
});

export const pickTransactionDetailRouteParams = (
  params: Partial<Record<keyof TransactionDetailRouteParams, RouteParamValue>>,
): TransactionDetailRouteParams => ({
  creditCardId: readRouteParam(params.creditCardId),
  transactionId: readRouteParam(params.transactionId),
});

export const pickBillingPeriodDetailRouteParams = (
  params: Partial<
    Record<keyof BillingPeriodDetailRouteParams, RouteParamValue>
  >,
): BillingPeriodDetailRouteParams => ({
  creditCardId: readRouteParam(params.creditCardId),
  periodMonth: readRouteParam(params.periodMonth),
  periodStartDate: readRouteParam(params.periodStartDate),
  periodEndDate: readRouteParam(params.periodEndDate),
});

export const pickBillingPeriodsRouteParams = (
  params: Partial<Record<keyof BillingPeriodsRouteParams, RouteParamValue>>,
): BillingPeriodsRouteParams => ({
  creditCardId: readRouteParam(params.creditCardId),
  creditCardLabel: readRouteParam(params.creditCardLabel),
});
