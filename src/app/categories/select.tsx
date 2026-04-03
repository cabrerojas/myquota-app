import { Stack, useLocalSearchParams } from "expo-router";
import CategorySelectScreen from "@/features/categories/screens/CategorySelectScreen";

export default function CategorySelectRoute() {
  const params = useLocalSearchParams<{
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
  }>();

  return (
    <>
      <Stack.Screen options={{ title: "Seleccionar Categoría" }} />
      <CategorySelectScreen
        merchant={params.merchant || ""}
        debtParams={{
          editMode: params.editMode,
          transactionId: params.transactionId,
          creditCardId: params.creditCardId,
          merchant: params.merchant,
          quotaAmount: params.quotaAmount,
          totalInstallments: params.totalInstallments,
          paidInstallments: params.paidInstallments,
          currency: params.currency,
          purchaseDate: params.purchaseDate,
          lastPaidMonth: params.lastPaidMonth,
          lastPaidYear: params.lastPaidYear,
          selectedCategoryId: params.selectedCategoryId,
          selectedCategoryName: params.selectedCategoryName,
        }}
      />
    </>
  );
}
