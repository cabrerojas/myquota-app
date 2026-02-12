import { useLocalSearchParams } from "expo-router";
import BillingPeriodsScreen from "@/features/billingPeriods/screens/BillingPeriodsScreen";

export default function BillingPeriods() {
  const { creditCardId, creditCardLabel } = useLocalSearchParams<{
    creditCardId: string;
    creditCardLabel: string;
  }>();

  if (!creditCardId) {
    return null;
  }

  return (
    <BillingPeriodsScreen
      creditCardId={creditCardId}
      creditCardLabel={creditCardLabel || ""}
    />
  );
}
