import { useQuery } from "@tanstack/react-query";
import { getTransactionsByCreditCard } from "@/features/transactions/services/transactionsApi";
import type { Transaction } from "@/shared/types/transaction";

const sortTransactionsByDateDesc = (transactions: Transaction[]) => {
  return [...transactions].sort(
    (a, b) =>
      new Date(b.transactionDate).getTime() -
      new Date(a.transactionDate).getTime(),
  );
};

export function useRecentTransactions(creditCardId: string | null, limit = 10) {
  return useQuery({
    queryKey: ["transactions", "recent", creditCardId, limit],
    queryFn: async () => {
      if (!creditCardId) {
        throw new Error("Selecciona una tarjeta para ver transacciones");
      }

      const response = await getTransactionsByCreditCard(creditCardId, limit);

      return sortTransactionsByDateDesc(response.items).slice(0, limit);
    },
    enabled: !!creditCardId,
    staleTime: 30_000,
  });
}
