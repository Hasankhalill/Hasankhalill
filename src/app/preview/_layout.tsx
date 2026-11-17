import { Stack } from "expo-router";

import { PreviewFleetProvider } from "@/lib/fleet";
import { useLocale } from "@/lib/locale";
import { colors } from "@/theme";

export default function PreviewLayout() {
  const { t } = useLocale();
  return (
    <PreviewFleetProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.page },
          headerTintColor: colors.onPhoto,
          headerTitleStyle: { fontWeight: "700", color: colors.onPhoto },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.page },
        }}
      >
        <Stack.Screen name="index" options={{ title: t("sampleFleet") }} />
        <Stack.Screen name="car/[id]" options={{ title: t("car") }} />
        <Stack.Screen name="rental/[id]" options={{ title: t("rental") }} />
      </Stack>
    </PreviewFleetProvider>
  );
}
