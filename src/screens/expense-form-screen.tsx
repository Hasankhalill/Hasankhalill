import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DateField } from "@/components/date-field";
import { Banner, Button, Hint, LoadingState, Screen, TextField } from "@/components/ui";
import { isIsoDate } from "@/domain/dates";
import { CATEGORY_LABELS, isMaintenanceCategory, MAINTENANCE_RULE } from "@/domain/expenses";
import { parseMoney } from "@/domain/format";
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory } from "@/domain/types";
import { confirmDelete } from "@/lib/confirm";
import { useFleet } from "@/lib/fleet";
import { oneParam } from "@/lib/params";
import { colors } from "@/theme";

export function ExpenseFormScreen({ expenseId }: { expenseId?: string }) {
  const { fleet, loading } = useFleet();
  const existing = fleet.expenses.find((expense) => expense.id === expenseId);
  if (expenseId && !existing) {
    if (loading) return <LoadingState />;
    return (
      <Screen>
        <Hint>That expense is not on file.</Hint>
      </Screen>
    );
  }
  if (!expenseId && loading && fleet.cars.length === 0) return <LoadingState />;
  return <ExpenseForm existing={existing} />;
}

function ExpenseForm({ existing }: { existing?: Expense }) {
  const params = useLocalSearchParams<{ carId?: string }>();
  const presetCarId = oneParam(params.carId);
  const { fleet, saveExpense, deleteExpense, paths } = useFleet();
  const [carId, setCarId] = useState(existing?.carId ?? presetCarId ?? fleet.cars[0]?.id ?? "");
  const [date, setDate] = useState(existing?.expenseDate ?? "");
  const [category, setCategory] = useState<ExpenseCategory>(existing?.category ?? "oil_change");
  const [amount, setAmount] = useState(existing ? existing.amount.toFixed(2) : "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    const parsed = parseMoney(amount);
    if (!carId) {
      setError("Choose a car.");
      return;
    }
    if (!isIsoDate(date)) {
      setError("Choose the expense date.");
      return;
    }
    if (parsed == null) {
      setError("Enter an amount greater than zero.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveExpense(
        { carId, expenseDate: date, category, amount: parsed, description },
        existing?.id,
      );
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the expense.");
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!existing) return;
    const ok = await confirmDelete("Delete expense?", "It will leave this car's totals.");
    if (!ok) return;
    setSaving(true);
    try {
      await deleteExpense(existing.id);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the expense.");
      setSaving(false);
    }
  }

  if (fleet.cars.length === 0) {
    return (
      <Screen>
        <Hint>Add a car before recording an expense.</Hint>
        <Button label="Add car" onPress={() => router.push(paths.newCar)} />
      </Screen>
    );
  }

  return (
    <Screen>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Text style={styles.label}>Car</Text>
      <View style={styles.chips}>
        {fleet.cars.map((car) => {
          const selected = car.id === carId;
          return (
            <Pressable
              key={car.id}
              accessibilityRole="button"
              onPress={() => setCarId(car.id)}
              style={[styles.chip, selected && styles.chipOn]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextOn]}>{car.name}</Text>
            </Pressable>
          );
        })}
      </View>
      <DateField label="Date" value={date} onChange={setDate} />
      <Text style={styles.label}>Category</Text>
      <View style={styles.chips}>
        {EXPENSE_CATEGORIES.map((value) => {
          const selected = value === category;
          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              onPress={() => setCategory(value)}
              style={[styles.chip, selected && styles.chipOn]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextOn]}>{CATEGORY_LABELS[value]}</Text>
            </Pressable>
          );
        })}
      </View>
      <Hint>
        {isMaintenanceCategory(category)
          ? "This counts as maintenance and in total expenses."
          : "This counts in total expenses, not in the maintenance subtotal."}
      </Hint>
      <Hint>{MAINTENANCE_RULE}</Hint>
      <TextField label="Amount (USD)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="40.00" />
      <TextField label="Description (optional)" value={description} onChangeText={setDescription} />
      <Button label={saving ? "Saving…" : "Save expense"} onPress={() => void onSave()} disabled={saving} />
      {existing ? (
        <Button label="Delete expense" variant="danger" onPress={() => void onDelete()} disabled={saving} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  chipOn: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { color: colors.ink, fontWeight: "700" },
  chipTextOn: { color: colors.white },
});
