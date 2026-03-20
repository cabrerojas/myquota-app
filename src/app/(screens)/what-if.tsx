import { Stack } from "expo-router";
import WhatIfScreen from "@/features/whatIf/screens/WhatIfScreen";

export default function WhatIf() {
  return (
    <>
      <Stack.Screen options={{ title: "Simular Compra" }} />
      <WhatIfScreen />
    </>
  );
}
