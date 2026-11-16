import { router } from "expo-router";
import { useState } from "react";

import { Banner, Button, Hint, LoadingState, Screen, TextField } from "@/components/ui";
import { parseMoney } from "@/domain/format";
import type { Car } from "@/domain/types";
import { confirmDelete } from "@/lib/confirm";
import { useFleet } from "@/lib/fleet";

export function CarFormScreen({ carId }: { carId?: string }) {
  const { fleet, loading } = useFleet();
  const existing = fleet.cars.find((car) => car.id === carId);
  if (carId && !existing) {
    if (loading) return <LoadingState />;
    return (
      <Screen>
        <Hint>That car is not in the fleet.</Hint>
      </Screen>
    );
  }
  return <CarForm existing={existing} />;
}

function CarForm({ existing }: { existing?: Car }) {
  const { fleet, saveCar, deleteCar } = useFleet();
  const [name, setName] = useState(existing?.name ?? "");
  const [make, setMake] = useState(existing?.make ?? "");
  const [model, setModel] = useState(existing?.model ?? "");
  const [year, setYear] = useState(existing ? String(existing.year) : "");
  const [plate, setPlate] = useState(existing?.licensePlate ?? "");
  const [rate, setRate] = useState(existing ? existing.defaultDailyRate.toFixed(2) : "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    const parsedYear = Number(year);
    const parsedRate = parseMoney(rate);
    if (!name.trim() || !make.trim() || !model.trim() || !plate.trim()) {
      setError("Name, make, model, and license plate are required.");
      return;
    }
    if (!Number.isInteger(parsedYear) || parsedYear < 1980 || parsedYear > 2035) {
      setError("Enter a year from 1980 to 2035.");
      return;
    }
    if (parsedRate == null) {
      setError("Enter a default daily rate greater than zero, with up to two decimals.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveCar(
        {
          name,
          make,
          model,
          year: parsedYear,
          licensePlate: plate,
          defaultDailyRate: parsedRate,
        },
        existing?.id,
      );
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the car.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!existing) return;
    const used =
      fleet.rentals.some((rental) => rental.carId === existing.id) ||
      fleet.expenses.some((expense) => expense.carId === existing.id);
    if (used) {
      setError("This car has rentals or expenses, so it stays in the fleet. Edit it instead.");
      return;
    }
    const ok = await confirmDelete("Delete car?", `${existing.name} will be removed.`);
    if (!ok) return;
    setSaving(true);
    try {
      await deleteCar(existing.id);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the car.");
      setSaving(false);
    }
  }

  return (
    <Screen>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <TextField label="Name" value={name} onChangeText={setName} placeholder="Toyota Corolla" />
      <TextField label="Make" value={make} onChangeText={setMake} placeholder="Toyota" />
      <TextField label="Model" value={model} onChangeText={setModel} placeholder="Corolla" />
      <TextField label="Year" value={year} onChangeText={setYear} keyboardType="number-pad" placeholder="2019" />
      <TextField
        label="License plate"
        value={plate}
        onChangeText={setPlate}
        autoCapitalize="characters"
        placeholder="JAZ-1001"
      />
      <TextField
        label="Default daily rate (USD)"
        value={rate}
        onChangeText={setRate}
        keyboardType="decimal-pad"
        placeholder="30.00"
      />
      <Button label={saving ? "Saving…" : "Save car"} onPress={() => void onSave()} disabled={saving} />
      {existing ? (
        <Button label="Delete car" variant="danger" onPress={() => void onDelete()} disabled={saving} />
      ) : null}
    </Screen>
  );
}
