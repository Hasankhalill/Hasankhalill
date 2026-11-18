import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { AuthProvider, useAuth } from "@/lib/auth";
import { LocaleProvider } from "@/lib/locale";
import { colors } from "@/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <LocaleProvider>
      <AuthProvider>
        <SplashGate />
        <StatusBar style="light" />
        <RootNavigator />
      </AuthProvider>
    </LocaleProvider>
  );
}

function SplashGate() {
  const { ready } = useAuth();
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);
  return null;
}

function RootNavigator() {
  const { ready, session } = useAuth();
  if (!ready) return null;
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.page },
        headerTintColor: colors.onPhoto,
        headerTitleStyle: { fontWeight: "700", color: colors.onPhoto },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.page },
      }}
    >
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" options={{ headerShown: false, title: "Sign in" }} />
      </Stack.Protected>
      <Stack.Screen name="preview" options={{ headerShown: false }} />
    </Stack>
  );
}
