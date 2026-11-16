import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { CarMonthCard } from "@/components/car-month-card";
import { MonthSwitcher } from "@/components/month-switcher";
import { Banner, Button, Card, Hint, LoadingState, MoneyLine, Screen, SectionTitle } from "@/components/ui";
import { MAINTENANCE_RULE } from "@/domain/expenses";
import { formatUSD } from "@/domain/format";
import { summarizeFleetMonth } from "@/domain/report";
import { useMonth } from "@/hooks/use-month";
import { useAuth } from "@/lib/auth";
import { useFleet } from "@/lib/fleet";
import { colors } from "@/theme";

export function DashboardScreen() {
  const { email, signOut } = useAuth();
  const fleetApi = useFleet();
  const { fleet, loading, error, refresh, refreshing, readOnly, initialMonth, paths } = fleetApi;
  const { month, canForward, back, forward } = useMonth(initialMonth);
  const report = summarizeFleetMonth(month, fleet);
  const quiet =
    fleet.cars.length > 0 &&
    report.totals.rentedDays === 0 &&
    report.totals.totalExpenses === 0 &&
    report.totals.cashCollected === 0;

  if (loading && fleet.cars.length === 0) return <LoadingState />;

  return (
    <Screen onRefresh={readOnly ? undefined : refresh} refreshing={refreshing}>
      {readOnly ? (
        <Banner>
          Sample data for June 2026. Nothing here is saved. The Toyota Corolla row is the worked example: 5 days, $150 revenue, $100 collected, $40 expenses, $110 profit.
        </Banner>
      ) : null}
      {error ? <Banner tone="error">{error}</Banner> : null}
      <MonthSwitcher month={month} canForward={canForward} onBack={back} onForward={forward} />
      {readOnly ? null : (
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button label="Add rental" onPress={() => router.push(paths.newRental())} />
          </View>
          <View style={styles.action}>
            <Button label="Add expense" variant="secondary" onPress={() => router.push(paths.newExpense())} />
          </View>
        </View>
      )}
      <Card tone="soft">
        <Text style={styles.fleetTitle}>Whole fleet · USD</Text>
        <MoneyLine label="Rented days" value={String(report.totals.rentedDays)} />
        <MoneyLine label="Rental revenue" value={formatUSD(report.totals.rentalRevenue)} />
        <MoneyLine label="Cash collected" value={formatUSD(report.totals.cashCollected)} />
        <MoneyLine label="Maintenance" value={formatUSD(report.totals.maintenanceCosts)} />
        <MoneyLine label="Total expenses" value={formatUSD(report.totals.totalExpenses)} />
        <MoneyLine
          label="Profit"
          value={formatUSD(report.totals.profit)}
          tone={report.totals.profit < 0 ? "bad" : report.totals.profit > 0 ? "good" : "normal"}
        />
      </Card>
      {fleet.cars.length === 0 ? (
        <Card>
          <Text style={styles.empty}>No cars yet.</Text>
          {readOnly ? null : <Button label="Add a car" onPress={() => router.push(paths.newCar)} />}
        </Card>
      ) : (
        <>
          <SectionTitle>Cars</SectionTitle>
          {quiet ? (
            <Hint>Nothing recorded this month. The sample Corolla rental is in June 2026.</Hint>
          ) : null}
          {fleet.cars.map((car, index) => (
            <CarMonthCard
              key={car.id}
              car={car}
              summary={report.cars[index]}
              onPress={() => router.push(paths.car(car.id, month))}
            />
          ))}
        </>
      )}
      <Hint>{MAINTENANCE_RULE}</Hint>
      {readOnly ? null : (
        <Button
          label={email ? `Sign out ${email}` : "Sign out"}
          variant="secondary"
          onPress={() => {
            void signOut();
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 10 },
  action: { flex: 1 },
  fleetTitle: { fontSize: 16, fontWeight: "800", color: colors.ink },
  empty: { fontSize: 16, color: colors.ink },
});
