import { router, Stack, useLocalSearchParams } from "expo-router";

import { CarMonthCard } from "@/components/car-month-card";
import { MonthSwitcher } from "@/components/month-switcher";
import { Button, Hint, ListRow, Screen, SectionTitle } from "@/components/ui";
import { rentalBalance } from "@/domain/billing";
import { isMaintenanceCategory } from "@/domain/expenses";
import type { ExpenseCategory } from "@/domain/types";
import type { CopyKey } from "@/i18n/copy";
import { formatDate, formatUSD } from "@/domain/format";
import { billedDaysInMonth } from "@/domain/billing";
import { expensesInMonth, paymentsForRental, rentalsTouchingMonth, summarizeCarMonth } from "@/domain/report";
import { useMonth } from "@/hooks/use-month";
import { useFleet } from "@/lib/fleet";
import { useLocale } from "@/lib/locale";
import { oneParam } from "@/lib/params";
import { StyleSheet, View } from "react-native";

export function CarDetailScreen() {
  const params = useLocalSearchParams<{ id: string; month?: string }>();
  const id = oneParam(params.id);
  const { t } = useLocale();
  const { fleet, refresh, refreshing, readOnly, paths } = useFleet();
  const monthState = useMonth(oneParam(params.month) || null);
  const car = fleet.cars.find((item) => item.id === id);

  if (!car) {
    return (
      <Screen>
        <Hint>{t("carMissing")}</Hint>
      </Screen>
    );
  }

  const summary = summarizeCarMonth(car.id, monthState.month, fleet);
  const rentals = rentalsTouchingMonth(fleet.rentals, car.id, monthState.month);
  const expenses = expensesInMonth(fleet.expenses, car.id, monthState.month);

  return (
    <Screen onRefresh={readOnly ? undefined : refresh} refreshing={refreshing}>
      <Stack.Screen options={{ title: car.name }} />
      <MonthSwitcher
        month={monthState.month}
        canForward={monthState.canForward}
        onBack={monthState.back}
        onForward={monthState.forward}
      />
      <CarMonthCard car={car} summary={summary} />
      {readOnly ? null : (
        <View style={styles.actions}>
          <View style={styles.action}>
            <Button label={t("addRental")} onPress={() => router.push(paths.newRental(car.id))} />
          </View>
          <View style={styles.action}>
            <Button label={t("addExpense")} variant="secondary" onPress={() => router.push(paths.newExpense(car.id))} />
          </View>
        </View>
      )}
      {readOnly ? null : (
        <Button label={t("editCar")} variant="secondary" onPress={() => router.push(paths.editCar(car.id))} />
      )}
      <SectionTitle>{t("rentalsThisMonth")}</SectionTitle>
      {rentals.length === 0 ? <Hint>{t("noBilledDays")}</Hint> : null}
      {rentals.map((rental) => {
        const balance = rentalBalance(rental, paymentsForRental(fleet.payments, rental.id));
        const daysHere = billedDaysInMonth(rental.pickupDate, rental.returnDate, monthState.month);
        return (
          <ListRow
            key={rental.id}
            title={rental.customerName || t("rental")}
            subtitle={`${formatDate(rental.pickupDate)} → ${formatDate(rental.returnDate)} · ${daysHere} ${t("daysThisMonth")}`}
            meta={balance.balance > 0 ? `${t("due")} ${formatUSD(balance.balance)}` : t("paid")}
            onPress={() => router.push(paths.rental(rental.id))}
          />
        );
      })}
      <SectionTitle>{t("expensesThisMonth")}</SectionTitle>
      {expenses.length === 0 ? <Hint>{t("noExpenses")}</Hint> : null}
      {expenses.map((expense) => (
        <ListRow
          key={expense.id}
          title={t(categoryKey(expense.category))}
          subtitle={`${formatDate(expense.expenseDate)}${expense.description ? ` · ${expense.description}` : ""} · ${isMaintenanceCategory(expense.category) ? t("maintenance") : t("otherExpense")}`}
          meta={formatUSD(expense.amount)}
          onPress={readOnly ? undefined : () => router.push(paths.editExpense(expense.id))}
        />
      ))}
    </Screen>
  );
}

const categoryKeys: Record<ExpenseCategory, CopyKey> = {
  oil_change: "oilChange",
  tires: "tires",
  repairs: "repairs",
  insurance: "insurance",
  cleaning: "cleaning",
  other: "other",
};

function categoryKey(category: ExpenseCategory): CopyKey {
  return categoryKeys[category];
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 10 },
  action: { flex: 1 },
});
