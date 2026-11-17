import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { LanguageSwitch } from "@/components/language-switch";
import { Banner, Button, Screen, TextField } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useLocale } from "@/lib/locale";
import { colors } from "@/theme";

export function SignInScreen() {
  const { t } = useLocale();
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
      setError(err instanceof Error ? err.message : t("couldNotSignIn"));
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={styles.mast}>
        <Text style={styles.mark}>Jazzar</Text>
        <LanguageSwitch />
      </View>
      <Text style={styles.sub}>{t("fleetDesk")}</Text>
      {configured ? null : <Banner>{t("setupBanner")}</Banner>}
      {error ? <Banner tone="error">{error}</Banner> : null}
      <TextField
        label={t("email")}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        placeholder="owner@jazzar.app"
      />
      <TextField
        label={t("password")}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="password"
        placeholder="Password"
      />
      <Button label={busy ? t("signingIn") : t("signIn")} onPress={() => void onSubmit()} disabled={busy} />
      <Button label={t("viewSample")} variant="secondary" onPress={() => router.push("/preview")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  mast: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  mark: { fontSize: 40, fontWeight: "800", color: colors.brand, letterSpacing: -0.5 },
  sub: { fontSize: 16, color: colors.muted, marginTop: -4 },
});
