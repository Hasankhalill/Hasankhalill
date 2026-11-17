import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatMonth } from "@/domain/format";
import { useLocale } from "@/lib/locale";
import { colors } from "@/theme";

export function MonthSwitcher({
  month,
  canForward,
  onBack,
  onForward,
}: {
  month: string;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
}) {
  const { t } = useLocale();
  return (
    <View style={styles.bar}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("previousMonth")} onPress={onBack} style={styles.nav}>
        <Text style={styles.navText}>‹</Text>
      </Pressable>
      <Text style={styles.label}>{formatMonth(month)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("nextMonth")}
        disabled={!canForward}
        onPress={onForward}
        style={styles.nav}
      >
        <Text style={[styles.navText, !canForward && styles.hidden]}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    minHeight: 56,
  },
  label: { fontSize: 18, fontWeight: "800", color: colors.ink },
  nav: { minWidth: 56, minHeight: 56, alignItems: "center", justifyContent: "center" },
  navText: { fontSize: 30, color: colors.brand, fontWeight: "700", lineHeight: 34 },
  hidden: { opacity: 0.25 },
});
