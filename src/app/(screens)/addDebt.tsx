import { Stack } from "expo-router";
import AddDebtScreen from "@/features/transactions/screens/AddDebtScreen";

export default function AddDebt() {
  return (
    <>
      <Stack.Screen options={{ title: "Deuda Manual" }} />
      <AddDebtScreen />
    </>
  );
}
