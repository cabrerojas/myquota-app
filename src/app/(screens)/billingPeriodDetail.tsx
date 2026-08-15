import { useLocalSearchParams } from "expo-router";
import BillingPeriodDetailScreen from "@/features/billingPeriods/screens/BillingPeriodDetailScreen";
import {
  BillingPeriodDetailRouteParams,
  pickBillingPeriodDetailRouteParams,
} from "@/shared/types/routeParams";

export default function BillingPeriodDetail() {
  const params = pickBillingPeriodDetailRouteParams(
    useLocalSearchParams<BillingPeriodDetailRouteParams>(),
  );

  if (
    !params.creditCardId ||
    !params.periodStartDate ||
    !params.periodEndDate
  ) {
    return null;
  }

  return (
    <BillingPeriodDetailScreen
      creditCardId={params.creditCardId}
      periodMonth={params.periodMonth ?? ""}
      periodStartDate={params.periodStartDate}
      periodEndDate={params.periodEndDate}
    />
  );
}
