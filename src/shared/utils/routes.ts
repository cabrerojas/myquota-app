import { Href } from "expo-router";

interface TransactionsRouteParams extends Record<string, string | undefined> {
  creditCardId?: string;
  categoryId?: string;
  categoryName?: string;
}

interface RefundEntryRouteParams extends Record<string, string | undefined> {
  creditCardId: string;
  transactionId: string;
}

export const homeRoute: Href = "/(tabs)/inicio";
export const addDebtRoute: Href = "/(screens)/addDebt";
export const creditCardsRoute: Href = "/(tabs)/inicio/creditCards";
export const profileRoute: Href = "/(tabs)/perfil";
export const chartsRoute: Href = "/(tabs)/proyecciones/charts";

export const buildRefundEntryRoute = (
  params: RefundEntryRouteParams,
): Href => ({
  pathname: "/(screens)/refundEntry",
  params,
});

export const buildTransactionsRoute = (
  params?: TransactionsRouteParams,
): Href => {
  if (!params) {
    return "/(tabs)/transacciones";
  }

  return {
    pathname: "/(tabs)/transacciones",
    params,
  };
};
