import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatUSD } from "@/domain/format";
import type { Car, CarMonthSummary } from "@/domain/types";
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
  const profitTone = summary.profit < 0 ? styles.bad : summary.profit > 0 ? styles.good : undefined;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${car.name}, ${summary.rentedDays} rented ${summary.rentedDays === 1 ? "day" : "days"}, revenue ${formatUSD(summary.rentalRevenue)}, collected ${formatUSD(summary.cashCollected)}, expenses ${formatUSD(summary.totalExpenses)}, profit ${formatUSD(summary.profit)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <View style={styles.titles}>
          <Text style={styles.name}>{car.name}</Text>
          <Text style={styles.meta}>
            {car.year} · {car.licensePlate}
          </Text>
        </View>
        <Text style={styles.days}>
          {summary.rentedDays} {summary.rentedDays === 1 ? "day" : "days"}
        </Text>
      </View>
      <Line label="Rental revenue" value={formatUSD(summary.rentalRevenue)} />
      <Line label="Cash collected" value={formatUSD(summary.cashCollected)} />
      <Line label="Maintenance" value={formatUSD(summary.maintenanceCosts)} />
      <Line label="Total expenses" value={formatUSD(summary.totalExpenses)} />
      <Line label="Profit" value={formatUSD(summary.profit)} valueStyle={profitTone} />
    </Pressable>
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.lg,
    gap: 6,
  },
  pressed: { opacity: 0.92 },
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
