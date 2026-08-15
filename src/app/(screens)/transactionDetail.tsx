import { useLocalSearchParams } from "expo-router";
import TransactionDetailScreen from "@/features/transactions/screens/TransactionDetailScreen";
import {
  TransactionDetailRouteParams,
  pickTransactionDetailRouteParams,
} from "@/shared/types/routeParams";

export default function TransactionDetail() {
  const params = pickTransactionDetailRouteParams(
    useLocalSearchParams<TransactionDetailRouteParams>(),
  );

  if (!params.creditCardId || !params.transactionId) {
    return null;
  }

  return (
    <TransactionDetailScreen
      creditCardId={params.creditCardId}
      transactionId={params.transactionId}
    />
  );
}
