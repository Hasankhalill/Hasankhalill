import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { AuthProvider, useAuth } from "@/lib/auth";
import { colors } from "@/theme";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <AuthProvider>
      <SplashGate />
      <StatusBar style="dark" />
      <RootNavigator />
    </AuthProvider>
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
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.bg },
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
