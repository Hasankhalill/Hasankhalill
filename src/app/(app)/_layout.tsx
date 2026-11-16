import { Stack } from "expo-router";

import { LiveFleetProvider } from "@/lib/fleet";
import { colors } from "@/theme";

export default function AppLayout() {
  return (
    <LiveFleetProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.ink,
          headerTitleStyle: { fontWeight: "700" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="car/new" options={{ title: "Add car" }} />
        <Stack.Screen name="car/[id]/index" options={{ title: "Car" }} />
        <Stack.Screen name="car/[id]/edit" options={{ title: "Edit car" }} />
        <Stack.Screen name="rental/new" options={{ title: "Add rental" }} />
        <Stack.Screen name="rental/[id]/index" options={{ title: "Rental" }} />
        <Stack.Screen name="rental/[id]/edit" options={{ title: "Edit rental" }} />
        <Stack.Screen name="rental/[id]/payment/new" options={{ title: "Add payment" }} />
        <Stack.Screen name="rental/[id]/payment/[paymentId]" options={{ title: "Edit payment" }} />
        <Stack.Screen name="expense/new" options={{ title: "Add expense" }} />
        <Stack.Screen name="expense/[id]" options={{ title: "Edit expense" }} />
      </Stack>
    </LiveFleetProvider>
  );
}
