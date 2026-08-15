import { useLocalSearchParams } from "expo-router";
import BillingPeriodsScreen from "@/features/billingPeriods/screens/BillingPeriodsScreen";
import {
  BillingPeriodsRouteParams,
  pickBillingPeriodsRouteParams,
} from "@/shared/types/routeParams";

export default function BillingPeriods() {
  const params = pickBillingPeriodsRouteParams(
    useLocalSearchParams<BillingPeriodsRouteParams>(),
  );

  if (!params.creditCardId) {
    return null;
  }

  return (
    <BillingPeriodsScreen
      creditCardId={params.creditCardId}
      creditCardLabel={params.creditCardLabel ?? ""}
    />
  );
}
