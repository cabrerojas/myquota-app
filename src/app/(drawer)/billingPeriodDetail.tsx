import { useLocalSearchParams } from "expo-router";
import BillingPeriodDetailScreen from "@/features/billingPeriods/screens/BillingPeriodDetailScreen";

export default function BillingPeriodDetail() {
  const { creditCardId, periodMonth, periodStartDate, periodEndDate } =
    useLocalSearchParams<{
      creditCardId: string;
      periodMonth: string;
      periodStartDate: string;
      periodEndDate: string;
    }>();

  if (!creditCardId || !periodStartDate || !periodEndDate) {
    return null;
  }

  return (
    <BillingPeriodDetailScreen
      creditCardId={creditCardId}
      periodMonth={periodMonth || ""}
      periodStartDate={periodStartDate}
      periodEndDate={periodEndDate}
    />
  );
}
