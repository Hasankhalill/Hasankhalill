import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { CarMonthCard } from "@/components/car-month-card";
import { LanguageSwitch } from "@/components/language-switch";
import { MonthSwitcher } from "@/components/month-switcher";
import { Banner, Button, Card, Hint, LoadingState, MoneyLine, Screen, SectionTitle } from "@/components/ui";
import { formatUSD } from "@/domain/format";
import { summarizeFleetMonth } from "@/domain/report";
import { useMonth } from "@/hooks/use-month";
import { useAuth } from "@/lib/auth";
import { useFleet } from "@/lib/fleet";
import { useLocale } from "@/lib/locale";
import { colors } from "@/theme";

export function DashboardScreen() {
  const { t } = useLocale();
  const { email, signOut } = useAuth();
  const fleetApi = useFleet();
  const { fleet, loading, error, refresh, refreshing, readOnly, initialMonth, paths, online } = fleetApi;
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
      <View style={styles.mast}>
        <View style={styles.mastText}>
          <Text style={styles.mark}>Jazzar</Text>
          <Text style={styles.sub}>{t("fleetDesk")}</Text>
        </View>
        <LanguageSwitch />
      </View>
      {readOnly ? <Banner>{t("sampleBanner")}</Banner> : null}
      {!readOnly && !online ? <Banner>{t("offlineBanner")}</Banner> : null}
      {error ? <Banner tone="error">{error}</Banner> : null}
      <MonthSwitcher month={month} canForward={canForward} onBack={back} onForward={forward} />
      {readOnly ? null : (
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button label={t("addRental")} onPress={() => router.push(paths.newRental())} />
          </View>
          <View style={styles.action}>
            <Button label={t("addExpense")} variant="secondary" onPress={() => router.push(paths.newExpense())} />
          </View>
        </View>
      )}
      <Card tone="soft">
        <Text style={styles.fleetTitle}>{t("wholeFleet")}</Text>
        <MoneyLine label={t("rentedDays")} value={String(report.totals.rentedDays)} />
        <MoneyLine label={t("rentalRevenue")} value={formatUSD(report.totals.rentalRevenue)} />
        <MoneyLine label={t("cashCollected")} value={formatUSD(report.totals.cashCollected)} />
        <MoneyLine label={t("maintenance")} value={formatUSD(report.totals.maintenanceCosts)} />
        <MoneyLine label={t("totalExpenses")} value={formatUSD(report.totals.totalExpenses)} />
        <MoneyLine
          label={t("profit")}
          value={formatUSD(report.totals.profit)}
          tone={report.totals.profit < 0 ? "bad" : report.totals.profit > 0 ? "good" : "normal"}
        />
      </Card>
      {fleet.cars.length === 0 ? (
        <Card>
          <Text style={styles.empty}>{t("noCars")}</Text>
          {readOnly ? null : <Button label={t("addCar")} onPress={() => router.push(paths.newCar)} />}
        </Card>
      ) : (
        <>
          <SectionTitle>{t("cars")}</SectionTitle>
          <Hint>{t("photoStays")}</Hint>
          {quiet ? <Hint>{t("quietMonth")}</Hint> : null}
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
      <Hint>{t("maintenanceRule")}</Hint>
      {readOnly ? null : (
        <Button
          label={email ? `${t("signOut")} ${email}` : t("signOut")}
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
  mast: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  mastText: { flex: 1, gap: 2 },
  mark: { fontSize: 28, fontWeight: "800", color: colors.brand, letterSpacing: -0.4 },
  sub: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: "row", gap: 10 },
  action: { flex: 1 },
  fleetTitle: { fontSize: 16, fontWeight: "800", color: colors.ink },
  empty: { fontSize: 16, color: colors.ink },
});
