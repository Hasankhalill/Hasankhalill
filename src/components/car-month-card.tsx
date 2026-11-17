import { Pressable, StyleSheet, Text, View } from "react-native";

import { CarPhoto } from "@/components/car-photo";
import { formatUSD } from "@/domain/format";
import type { Car, CarMonthSummary } from "@/domain/types";
import { useLocale } from "@/lib/locale";
import { colors, space } from "@/theme";

export function CarMonthCard({
  car,
  summary,
  onPress,
}: {
  car: Car;
  summary: CarMonthSummary;
  onPress?: () => void;
}) {
  const { t } = useLocale();
  const profitTone = summary.profit < 0 ? styles.bad : summary.profit > 0 ? styles.good : undefined;
  const dayWord = summary.rentedDays === 1 ? t("day") : t("days");
  return (
    <View style={styles.card}>
      <CarPhoto carId={car.id} name={car.name} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${car.name}, ${summary.rentedDays} ${dayWord}, ${t("rentalRevenue")} ${formatUSD(summary.rentalRevenue)}, ${t("cashCollected")} ${formatUSD(summary.cashCollected)}, ${t("totalExpenses")} ${formatUSD(summary.totalExpenses)}, ${t("profit")} ${formatUSD(summary.profit)}`}
        onPress={onPress}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <View style={styles.header}>
          <View style={styles.titles}>
            <Text style={styles.name}>{car.name}</Text>
            <Text style={styles.meta}>
              {car.year} · {car.licensePlate}
            </Text>
          </View>
          <Text style={styles.days}>
            {summary.rentedDays} {dayWord}
          </Text>
        </View>
        <Line label={t("rentalRevenue")} value={formatUSD(summary.rentalRevenue)} />
        <Line label={t("cashCollected")} value={formatUSD(summary.cashCollected)} />
        <Line label={t("maintenance")} value={formatUSD(summary.maintenanceCosts)} />
        <Line label={t("totalExpenses")} value={formatUSD(summary.totalExpenses)} />
        <Line label={t("profit")} value={formatUSD(summary.profit)} valueStyle={profitTone} />
      </Pressable>
    </View>
  );
}

function Line({
  label,
  value,
  valueStyle,
}: {
  label: string;
  value: string;
  valueStyle?: object;
}) {
  return (
    <View style={styles.line}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, valueStyle]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: "hidden",
    shadowColor: "#071410",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  pressed: { opacity: 0.94, transform: [{ scale: 0.985 }] },
  body: { padding: space.lg, gap: 6 },
  header: { flexDirection: "row", justifyContent: "space-between", gap: space.md, marginBottom: 4 },
  titles: { flex: 1, gap: 2 },
  name: { fontSize: 18, fontWeight: "800", color: colors.ink },
  meta: { color: colors.muted, fontSize: 13 },
  days: { color: colors.brand, fontWeight: "800", fontSize: 15 },
  line: { flexDirection: "row", justifyContent: "space-between", gap: space.md },
  label: { color: colors.muted, fontSize: 15 },
  value: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  good: { color: colors.brand },
  bad: { color: colors.danger },
});
