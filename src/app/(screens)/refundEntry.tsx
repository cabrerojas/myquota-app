import { useLocalSearchParams } from "expo-router";
import RefundEntryScreen from "@/features/transactions/screens/RefundEntryScreen";
import {
  pickRefundEntryRouteParams,
} from "@/shared/types/routeParams";

export default function RefundEntryRoute() {
  const params = pickRefundEntryRouteParams(
    useLocalSearchParams(),
  );

  if (!params.creditCardId || !params.transactionId) {
    return null;
  }

  return (
    <RefundEntryScreen
      creditCardId={params.creditCardId}
      transactionId={params.transactionId}
    />
  );
}
