import { router, Stack, useLocalSearchParams } from "expo-router";

import { CarMonthCard } from "@/components/car-month-card";
import { MonthSwitcher } from "@/components/month-switcher";
import { Button, Hint, ListRow, Screen, SectionTitle } from "@/components/ui";
import { rentalBalance } from "@/domain/billing";
import { CATEGORY_LABELS, isMaintenanceCategory } from "@/domain/expenses";
import { formatDate, formatUSD } from "@/domain/format";
import { billedDaysInMonth } from "@/domain/billing";
import { expensesInMonth, paymentsForRental, rentalsTouchingMonth, summarizeCarMonth } from "@/domain/report";
import { useMonth } from "@/hooks/use-month";
import { useFleet } from "@/lib/fleet";
import { oneParam } from "@/lib/params";
import { StyleSheet, View } from "react-native";

export function CarDetailScreen() {
  const params = useLocalSearchParams<{ id: string; month?: string }>();
  const id = oneParam(params.id);
  const { fleet, refresh, refreshing, readOnly, paths } = useFleet();
  const monthState = useMonth(oneParam(params.month) || null);
  const car = fleet.cars.find((item) => item.id === id);

  if (!car) {
    return (
      <Screen>
        <Hint>That car is not in the fleet.</Hint>
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
            <Button label="Add rental" onPress={() => router.push(paths.newRental(car.id))} />
          </View>
          <View style={styles.action}>
            <Button label="Add expense" variant="secondary" onPress={() => router.push(paths.newExpense(car.id))} />
          </View>
        </View>
      )}
      {readOnly ? null : (
        <Button label="Edit car" variant="secondary" onPress={() => router.push(paths.editCar(car.id))} />
      )}
      <SectionTitle>Rentals this month</SectionTitle>
      {rentals.length === 0 ? <Hint>No billed days this month.</Hint> : null}
      {rentals.map((rental) => {
        const balance = rentalBalance(rental, paymentsForRental(fleet.payments, rental.id));
        const daysHere = billedDaysInMonth(rental.pickupDate, rental.returnDate, monthState.month);
        return (
          <ListRow
            key={rental.id}
            title={rental.customerName || "Rental"}
            subtitle={`${formatDate(rental.pickupDate)} → ${formatDate(rental.returnDate)} · ${daysHere} days this month`}
            meta={balance.balance > 0 ? `Due ${formatUSD(balance.balance)}` : "Paid"}
            onPress={() => router.push(paths.rental(rental.id))}
          />
        );
      })}
      <SectionTitle>Expenses this month</SectionTitle>
      {expenses.length === 0 ? <Hint>No expenses this month.</Hint> : null}
      {expenses.map((expense) => (
        <ListRow
          key={expense.id}
          title={CATEGORY_LABELS[expense.category]}
          subtitle={`${formatDate(expense.expenseDate)}${expense.description ? ` · ${expense.description}` : ""} · ${isMaintenanceCategory(expense.category) ? "Maintenance" : "Other expense"}`}
          meta={formatUSD(expense.amount)}
          onPress={readOnly ? undefined : () => router.push(paths.editExpense(expense.id))}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 10 },
  action: { flex: 1 },
});
