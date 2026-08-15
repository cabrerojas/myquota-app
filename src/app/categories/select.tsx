import { Stack, useLocalSearchParams } from "expo-router";
import CategorySelectScreen from "@/features/categories/screens/CategorySelectScreen";
import {
  DebtRouteParams,
  pickDebtRouteParams,
} from "@/shared/types/routeParams";

export default function CategorySelectRoute() {
  const params = useLocalSearchParams<DebtRouteParams>();
  const debtParams = pickDebtRouteParams(params);

  return (
    <>
      <Stack.Screen options={{ title: "Seleccionar Categoría" }} />
      <CategorySelectScreen
        merchant={debtParams.merchant ?? ""}
        debtParams={debtParams}
      />
    </>
  );
}
