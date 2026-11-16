import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";

import { Banner, Button, Screen, TextField } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { colors } from "@/theme";

export function SignInScreen() {
  const { configured, session, signIn } = useAuth();
  useEffect(() => {
    if (session) router.replace("/");
  }, [session]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Text style={styles.mark}>Jazzar</Text>
      <Text style={styles.sub}>Fleet desk for the owner. Amounts are in USD.</Text>
      {configured ? null : (
        <Banner>
          Copy .env.example to .env and set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, then restart Expo. You can still open the June 2026 sample below.
        </Banner>
      )}
      {error ? <Banner tone="error">{error}</Banner> : null}
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="owner@jazzar.app"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        placeholder="Password"
      />
      <Button label={busy ? "Signing in…" : "Sign in"} onPress={() => void onSubmit()} disabled={busy} />
      <Button label="View the June 2026 sample" variant="secondary" onPress={() => router.push("/preview")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  mark: { fontSize: 40, fontWeight: "800", color: colors.brand, letterSpacing: -0.5 },
  sub: { fontSize: 16, color: colors.muted, marginTop: -4 },
});
