import { router } from "expo-router";
import { useState } from "react";

import { CarPhoto } from "@/components/car-photo";
import { Banner, Button, Hint, LoadingState, Screen, TextField } from "@/components/ui";
import { parseMoney } from "@/domain/format";
import type { Car } from "@/domain/types";
import { confirmDelete } from "@/lib/confirm";
import { useFleet } from "@/lib/fleet";
import { useLocale } from "@/lib/locale";

export function CarFormScreen({ carId }: { carId?: string }) {
  const { t } = useLocale();
  const { fleet, loading } = useFleet();
  const existing = fleet.cars.find((car) => car.id === carId);
  if (carId && !existing) {
    if (loading) return <LoadingState />;
    return (
      <Screen>
        <Hint>{t("carMissing")}</Hint>
      </Screen>
    );
  }
  return <CarForm existing={existing} />;
}

function CarForm({ existing }: { existing?: Car }) {
  const { t } = useLocale();
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
      setError(t("requiredCar"));
      return;
    }
    if (!Number.isInteger(parsedYear) || parsedYear < 1980 || parsedYear > 2035) {
      setError(t("badYear"));
      return;
    }
    if (parsedRate == null) {
      setError(t("badRate"));
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
      setError(err instanceof Error ? err.message : t("couldNotSave"));
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
      setError(t("carInUse"));
      return;
    }
    const ok = await confirmDelete(t("deleteCarTitle"), `${existing.name} ${t("deleteCarBody")}`);
    if (!ok) return;
    setSaving(true);
    try {
      await deleteCar(existing.id);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("couldNotDelete"));
      setSaving(false);
    }
  }

  return (
    <Screen>
      {error ? <Banner tone="error">{error}</Banner> : null}
      {existing ? <CarPhoto carId={existing.id} name={existing.name} /> : <Hint>{t("photoStays")}</Hint>}
      <TextField label={t("name")} value={name} onChangeText={setName} placeholder="Toyota Corolla" />
      <TextField label={t("make")} value={make} onChangeText={setMake} placeholder="Toyota" />
      <TextField label={t("model")} value={model} onChangeText={setModel} placeholder="Corolla" />
      <TextField label={t("year")} value={year} onChangeText={setYear} keyboardType="number-pad" placeholder="2019" />
      <TextField
        label={t("licensePlate")}
        value={plate}
        onChangeText={setPlate}
        autoCapitalize="characters"
        placeholder="JAZ-1001"
      />
      <TextField
        label={t("dailyRate")}
        value={rate}
        onChangeText={setRate}
        keyboardType="decimal-pad"
        placeholder="30.00"
      />
      <Button label={saving ? t("saving") : t("saveCar")} onPress={() => void onSave()} disabled={saving} />
      {existing ? (
        <Button label={t("deleteCar")} variant="danger" onPress={() => void onDelete()} disabled={saving} />
      ) : null}
    </Screen>
  );
}
