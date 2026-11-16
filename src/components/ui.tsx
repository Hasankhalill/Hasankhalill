import { type ReactNode } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

import { colors, space } from "@/theme";

export function Screen({
  children,
  onRefresh,
  refreshing,
}: {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh && Platform.OS !== "web" ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
        ) : undefined
      }
    >
      <View style={styles.column}>
        {onRefresh && Platform.OS === "web" ? (
          <Pressable accessibilityRole="button" onPress={onRefresh} style={styles.refresh}>
            <Text style={styles.refreshText}>{refreshing ? "Refreshing…" : "Refresh"}</Text>
          </Pressable>
        ) : null}
        {children}
      </View>
    </ScrollView>
  );
}

export function Card({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "soft" }) {
  return <View style={[styles.card, tone === "soft" && styles.cardSoft]}>{children}</View>;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "danger" && styles.danger,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === "secondary" && styles.secondaryText,
          variant === "danger" && styles.dangerText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function TextField({
  label,
  error,
  ...input
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.muted}
        style={styles.input}
        {...input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function Banner({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" }) {
  return (
    <View style={[styles.banner, tone === "error" && styles.bannerError]}>
      <Text style={[styles.bannerText, tone === "error" && styles.bannerErrorText]}>{children}</Text>
    </View>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <Text style={styles.hint}>{children}</Text>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function LoadingState({ label = "Loading the fleet…" }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.brand} />
      <Text style={styles.hint}>{label}</Text>
    </View>
  );
}

export function MoneyLine({
  label,
  value,
  tone = "normal",
}: {
  label: string;
  value: string;
  tone?: "normal" | "good" | "bad";
}) {
  return (
    <View style={styles.moneyLine}>
      <Text style={styles.moneyLabel}>{label}</Text>
      <Text
        style={[
          styles.moneyValue,
          tone === "good" && styles.good,
          tone === "bad" && styles.bad,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export function ListRow({
  title,
  subtitle,
  meta,
  onPress,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  onPress?: () => void;
}) {
  const body = (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
    </View>
  );
  if (!onPress) return <View style={styles.rowWrap}>{body}</View>;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.rowWrap}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { alignItems: "center", paddingBottom: 32 },
  column: { width: "100%", maxWidth: 520, padding: space.lg, gap: space.md },
  refresh: { alignSelf: "center", paddingTop: space.sm },
  refreshText: { color: colors.brand, fontWeight: "700" },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: space.sm,
  },
  cardSoft: { backgroundColor: colors.brandSoft, borderColor: "#C9E6DA" },
  button: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  primary: { backgroundColor: colors.brand },
  secondary: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  danger: { backgroundColor: colors.dangerSoft },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  secondaryText: { color: colors.ink },
  dangerText: { color: colors.danger },
  field: { gap: 6 },
  label: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  input: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    fontSize: 17,
    color: colors.ink,
  },
  error: { color: colors.danger, fontSize: 14 },
  banner: {
    backgroundColor: colors.brandSoft,
    borderRadius: 12,
    padding: space.md,
  },
  bannerError: { backgroundColor: colors.dangerSoft },
  bannerText: { color: colors.ink, fontSize: 15, lineHeight: 21 },
  bannerErrorText: { color: colors.danger },
  hint: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  section: { color: colors.ink, fontSize: 18, fontWeight: "800", marginTop: space.sm },
  center: { padding: space.xl, alignItems: "center", gap: space.sm },
  moneyLine: { flexDirection: "row", justifyContent: "space-between", gap: space.md },
  moneyLabel: { color: colors.muted, fontSize: 15 },
  moneyValue: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  good: { color: colors.brand },
  bad: { color: colors.danger },
  rowWrap: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
  },
  row: { flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, minHeight: 64 },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  rowSubtitle: { color: colors.muted, fontSize: 14 },
  rowMeta: { color: colors.ink, fontSize: 15, fontWeight: "700" },
});
