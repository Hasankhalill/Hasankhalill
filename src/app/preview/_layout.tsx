import { Stack } from "expo-router";

import { PreviewFleetProvider } from "@/lib/fleet";
import { colors } from "@/theme";

export default function PreviewLayout() {
  return (
    <PreviewFleetProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontWeight: "700" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Sample fleet" }} />
        <Stack.Screen name="car/[id]" options={{ title: "Car" }} />
        <Stack.Screen name="rental/[id]" options={{ title: "Rental" }} />
      </Stack>
    </PreviewFleetProvider>
  );
}
