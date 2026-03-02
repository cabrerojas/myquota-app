import React, { createContext, useContext, useState, useCallback } from "react";
import { getUncategorizedCount } from "@/features/creditCards/services/creditCardsApi";

interface UncategorizedContextType {
  count: number;
  refreshCount: () => Promise<void>;
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
  const [count, setCount] = useState(0);

  const refreshCount = useCallback(async () => {
    try {
      const c = await getUncategorizedCount();
      setCount(c);
    } catch {
      setCount(0);
    }
  }, []);

  const decrementCount = useCallback(() => {
    setCount((prev) => Math.max(0, prev - 1));
  }, []);

  return (
    <UncategorizedContext.Provider
      value={{ count, refreshCount, decrementCount }}
    >
      {children}
    </UncategorizedContext.Provider>
  );
}

export function useUncategorized(): UncategorizedContextType {
  return useContext(UncategorizedContext);
}
