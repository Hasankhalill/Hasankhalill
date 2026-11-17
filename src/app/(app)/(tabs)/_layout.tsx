import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";

import { useLocale } from "@/lib/locale";
import { colors } from "@/theme";

export default function TabLayout() {
  const { t } = useLocale();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: "#9AA6B5",
        tabBarStyle: { backgroundColor: colors.page, borderTopColor: "#2C3848" },
        headerStyle: { backgroundColor: colors.page },
        headerTintColor: colors.onPhoto,
        headerTitleStyle: { fontWeight: "700", color: colors.onPhoto },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Jazzar",
          tabBarLabel: t("dashboard"),
          tabBarIcon: ({ color, size }) => <Ionicons name="speedometer-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="cars"
        options={{
          title: t("cars"),
          tabBarIcon: ({ color, size }) => <Ionicons name="car-sport-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="rentals"
        options={{
          title: t("rentals"),
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
