import { useLocalSearchParams } from "expo-router";
import TransactionDetailScreen from "@/features/transactions/screens/TransactionDetailScreen";

export default function TransactionDetail() {
  const { creditCardId, transactionId } = useLocalSearchParams<{
    creditCardId: string;
    transactionId: string;
  }>();

  if (!creditCardId || !transactionId) {
    return null;
  }

  return (
    <TransactionDetailScreen
      creditCardId={creditCardId}
      transactionId={transactionId}
    />
  );
}
