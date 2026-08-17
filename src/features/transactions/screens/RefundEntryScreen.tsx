import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { RefundEntrySheet } from "@/features/transactions/components/RefundEntrySheet";
import {
  useCreateRefundMutation,
  useTransactionDetail,
} from "@/features/transactions/services/transactionsApi";
import ErrorState from "@/shared/components/ErrorState";
import { colors, spacing } from "@/shared/theme/tokens";

interface RefundEntryScreenProps {
  creditCardId: string;
  transactionId: string;
}

export default function RefundEntryScreen({
  creditCardId,
  transactionId,
}: RefundEntryScreenProps) {
  const router = useRouter();
  const { data, isLoading, error, refetch } = useTransactionDetail(
    creditCardId,
    transactionId,
  );
  const createRefundMutation = useCreateRefundMutation();
  const transaction = data?.transaction;

  const handleCreateRefund = async (input: {
    amount: number;
    reason?: string;
  }) => {
    await createRefundMutation.mutateAsync({
      creditCardId,
      transactionId,
      data: input,
    });
    await refetch();
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.secondary} />
      </View>
    );
  }

  if (error || !transaction) {
    return (
      <ErrorState
        message={
          error instanceof Error
            ? error.message
            : "No se encontró la transacción"
        }
        onRetry={() => {
          refetch();
        }}
      />
    );
  }

  return (
    <RefundEntrySheet
      currency={transaction.currency}
      onClose={() => router.back()}
      onSubmit={handleCreateRefund}
      refundableAmount={transaction.refundableAmount ?? 0}
      submitting={createRefundMutation.isPending}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    padding: spacing.md2,
  },
});
