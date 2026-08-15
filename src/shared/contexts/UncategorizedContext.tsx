import React, { createContext, useContext, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUncategorizedCount } from "@/features/creditCards/services/creditCardsApi";

interface UncategorizedContextType {
  count: number;
  refreshCount: () => Promise<unknown>;
  decrementCount: () => void;
}

const UncategorizedContext = createContext<UncategorizedContextType>({
  count: 0,
  refreshCount: async () => {},
  decrementCount: () => {},
});

export function UncategorizedProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use React Query hook for uncategorized count
  const { data: count = 0, refetch } = useUncategorizedCount();
  const queryClient = useQueryClient();

  const refreshCount = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const decrementCount = useCallback(() => {
    queryClient.setQueryData<number>(["uncategorizedCount"], (old) =>
      old !== undefined ? Math.max(0, old - 1) : 0,
    );
  }, [queryClient]);

  return (
    <UncategorizedContext.Provider
      value={{ count, refreshCount: () => refreshCount(), decrementCount }}
    >
      {children}
    </UncategorizedContext.Provider>
  );
}

export function useUncategorized(): UncategorizedContextType {
  return useContext(UncategorizedContext);
}
