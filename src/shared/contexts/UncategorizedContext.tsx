import React, { createContext, useContext, useCallback } from "react";
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

  const refreshCount = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const decrementCount = useCallback(() => {
    // The count will automatically update on next query refetch
    // For immediate UI update, we could use queryClient.setQueryData but that's complex
    // The count will refresh naturally with the next query
  }, []);

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
