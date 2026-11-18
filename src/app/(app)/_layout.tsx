import { Stack } from "expo-router";

import { LiveFleetProvider } from "@/lib/fleet";
import { useLocale } from "@/lib/locale";
import { colors } from "@/theme";

export default function AppLayout() {
  const { t } = useLocale();
  return (
    <LiveFleetProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.page },
          headerTintColor: colors.onPhoto,
          headerTitleStyle: { fontWeight: "700", color: colors.onPhoto },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.page },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="car/new" options={{ title: t("addCarShort") }} />
        <Stack.Screen name="car/[id]/index" options={{ title: t("car") }} />
        <Stack.Screen name="car/[id]/edit" options={{ title: t("editCar") }} />
        <Stack.Screen name="rental/new" options={{ title: t("addRental") }} />
        <Stack.Screen name="rental/[id]/index" options={{ title: t("rental") }} />
        <Stack.Screen name="rental/[id]/condition/[phase]" options={{ title: t("vehicleCondition") }} />
        <Stack.Screen name="rental/[id]/edit" options={{ title: t("rental") }} />
        <Stack.Screen name="rental/[id]/payment/new" options={{ title: t("payments") }} />
        <Stack.Screen name="rental/[id]/payment/[paymentId]" options={{ title: t("payments") }} />
        <Stack.Screen name="expense/new" options={{ title: t("addExpense") }} />
        <Stack.Screen name="expense/[id]" options={{ title: t("addExpense") }} />
      </Stack>
    </LiveFleetProvider>
  );
}
