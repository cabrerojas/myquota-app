import { Stack, useLocalSearchParams } from "expo-router";
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
    <>
      <Stack.Screen options={{ title: "Detalle de Transacción" }} />
      <TransactionDetailScreen
        creditCardId={creditCardId}
        transactionId={transactionId}
      />
    </>
  );
}
