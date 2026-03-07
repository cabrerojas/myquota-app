import { Stack } from "expo-router";

export default function ScreensLayout() {
  return (
    <Stack
      screenOptions={{
        headerTintColor: "#007BFF",
        headerTitleStyle: { fontWeight: "600", color: "#212529" },
        headerStyle: { backgroundColor: "#fff" },
      }}
    />
  );
}
