import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DateField } from "@/components/date-field";
import { Banner, Button, Card, Hint, LoadingState, Screen, TextField } from "@/components/ui";
import { billedDays, rentalTotal, validateRental } from "@/domain/billing";
import { isIsoDate } from "@/domain/dates";
import { formatUSD, parseMoney } from "@/domain/format";
import type { Rental } from "@/domain/types";
import { useFleet } from "@/lib/fleet";
import { oneParam } from "@/lib/params";
import { colors } from "@/theme";

export function RentalFormScreen({ rentalId }: { rentalId?: string }) {
  const { fleet, loading } = useFleet();
  const existing = fleet.rentals.find((rental) => rental.id === rentalId);
  if (rentalId && !existing) {
    if (loading) return <LoadingState />;
    return (
      <Screen>
        <Hint>That rental is not on file.</Hint>
      </Screen>
    );
  }
  if (!rentalId && loading && fleet.cars.length === 0) return <LoadingState />;
  return <RentalForm existing={existing} />;
}

function RentalForm({ existing }: { existing?: Rental }) {
  const params = useLocalSearchParams<{ carId?: string }>();
  const presetCarId = oneParam(params.carId);
  const { fleet, refresh, saveRental, paths } = useFleet();
  const [carId, setCarId] = useState(existing?.carId ?? presetCarId ?? fleet.cars[0]?.id ?? "");
  const [pickup, setPickup] = useState(existing?.pickupDate ?? "");
  const [returnDate, setReturnDate] = useState(existing?.returnDate ?? "");
  const [rateText, setRateText] = useState(existing ? existing.dailyRate.toFixed(2) : "");
  const [rateDirty, setRateDirty] = useState(Boolean(existing));
  const [customerName, setCustomerName] = useState(existing?.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(existing?.customerPhone ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [paymentText, setPaymentText] = useState("");
  const [paymentDate, setPaymentDate] = useState(existing?.pickupDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (rateDirty) return;
    const car = fleet.cars.find((item) => item.id === carId);
    if (car) setRateText(car.defaultDailyRate.toFixed(2));
  }, [carId, fleet.cars, rateDirty]);

  const car = fleet.cars.find((item) => item.id === carId);
  const rate = parseMoney(rateText);
  const preview =
    carId && isIsoDate(pickup) && isIsoDate(returnDate) && rate != null
      ? validateRental(
          { id: existing?.id, carId, pickupDate: pickup, returnDate, dailyRate: rate },
          fleet.rentals,
        )
      : null;

  let dayNote = "Pickup day is billed. The return day is not. A same-day rental is 1 day.";
  if (isIsoDate(pickup) && isIsoDate(returnDate) && returnDate >= pickup) {
    const days = billedDays(pickup, returnDate);
    dayNote =
      pickup === returnDate
        ? "Same-day rental: 1 billed day."
        : `${days} billed ${days === 1 ? "day" : "days"}. Pickup included, return excluded.`;
  } else if (pickup && returnDate && returnDate < pickup) {
    dayNote = "Return date cannot be before pickup.";
  }

  async function onSave() {
    if (!carId) {
      setError("Choose a car.");
      return;
    }
    if (rate == null) {
      setError("Enter a daily rate greater than zero.");
      return;
    }
    const paymentAmount = paymentText.trim() ? parseMoney(paymentText) : null;
    if (paymentText.trim() && paymentAmount == null) {
      setError("Enter a payment amount greater than zero, or leave it blank.");
      return;
    }
    if (paymentAmount != null && !isIsoDate(paymentDate)) {
      setError("Choose the payment date.");
      return;
    }
    const check = validateRental(
      { id: existing?.id, carId, pickupDate: pickup, returnDate, dailyRate: rate },
      fleet.rentals,
    );
    if (!check.ok) {
      setError(check.error);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const id = await saveRental(
        {
          carId,
          pickupDate: pickup,
          returnDate,
          dailyRate: rate,
          customerName,
          customerPhone,
          notes,
          initialPaymentAmount: existing ? null : paymentAmount,
          initialPaymentDate: existing ? null : paymentDate,
        },
        existing?.id,
      );
      if (existing) router.back();
      else router.replace(paths.rental(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the rental.");
      setSaving(false);
    }
  }

  if (fleet.cars.length === 0) {
    return (
      <Screen>
        <Hint>Add a car before recording a rental.</Hint>
        <Button label="Add car" onPress={() => router.push(paths.newCar)} />
      </Screen>
    );
  }

  return (
    <Screen>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <View style={styles.field}>
        <Text style={styles.label}>Car</Text>
        <Pressable accessibilityRole="button" onPress={() => setPickerOpen((open) => !open)} style={styles.input}>
          <Text style={styles.value}>{car ? `${car.name} · ${car.licensePlate}` : "Choose a car"}</Text>
        </Pressable>
        {pickerOpen
          ? fleet.cars.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() => {
                  setCarId(item.id);
                  setPickerOpen(false);
                }}
                style={styles.option}
              >
                <Text style={styles.optionText}>
                  {item.name} · {formatUSD(item.defaultDailyRate)}/day
                </Text>
              </Pressable>
            ))
          : null}
      </View>
      <DateField label="Pickup date" value={pickup} onChange={setPickup} />
      <DateField
        label="Return date"
        value={returnDate}
        onChange={(value) => {
          setReturnDate(value);
          if (!paymentDate) setPaymentDate(value);
        }}
      />
      <Card>
        <Text style={styles.preview}>{dayNote}</Text>
        {rate != null && isIsoDate(pickup) && isIsoDate(returnDate) && returnDate >= pickup ? (
          <Text style={styles.total}>
            {billedDays(pickup, returnDate)} × {formatUSD(rate)} ={" "}
            {formatUSD(rentalTotal(rate, pickup, returnDate))}
          </Text>
        ) : (
          <Hint>The total appears here before you save.</Hint>
        )}
        {preview && !preview.ok ? <Text style={styles.previewError}>{preview.error}</Text> : null}
      </Card>
      <TextField
        label="Daily rate (USD)"
        value={rateText}
        onChangeText={(value) => {
          setRateDirty(true);
          setRateText(value);
        }}
        keyboardType="decimal-pad"
        placeholder="30.00"
      />
      <Hint>Starts as the car's default rate. Change it for this rental if you need to.</Hint>
      <TextField label="Customer name (optional)" value={customerName} onChangeText={setCustomerName} />
      <TextField
        label="Phone (optional)"
        value={customerPhone}
        onChangeText={setCustomerPhone}
        keyboardType="phone-pad"
      />
      <TextField label="Notes (optional)" value={notes} onChangeText={setNotes} multiline />
      {existing ? null : (
        <>
          <TextField
            label="Payment received now (optional)"
            value={paymentText}
            onChangeText={setPaymentText}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
          <DateField label="Payment date" value={paymentDate} onChange={setPaymentDate} />
        </>
      )}
      <Button
        label={saving ? "Saving…" : "Save rental"}
        onPress={() => void onSave()}
        disabled={saving || preview?.ok === false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  input: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  value: { fontSize: 17, color: colors.ink },
  option: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.brandSoft,
  },
  optionText: { color: colors.ink, fontSize: 16, fontWeight: "600" },
  preview: { color: colors.ink, fontSize: 15, lineHeight: 21 },
  total: { color: colors.brand, fontSize: 20, fontWeight: "800" },
  previewError: { color: colors.danger, fontSize: 15, lineHeight: 21 },
});
