import { router } from "expo-router";
import { useState } from "react";

import { DateField } from "@/components/date-field";
import { Banner, Button, Hint, LoadingState, Screen, TextField } from "@/components/ui";
import { isIsoDate } from "@/domain/dates";
import { parseMoney } from "@/domain/format";
import type { Payment, Rental } from "@/domain/types";
import { confirmDelete } from "@/lib/confirm";
import { useFleet } from "@/lib/fleet";

export function PaymentFormScreen({
  rentalId,
  paymentId,
}: {
  rentalId: string;
  paymentId?: string;
}) {
  const { fleet, loading } = useFleet();
  const existing = fleet.payments.find((payment) => payment.id === paymentId);
  const rental = fleet.rentals.find((item) => item.id === rentalId);
  if (loading && (!rental || (paymentId && !existing))) return <LoadingState />;
  if (!rental) {
    return (
      <Screen>
        <Hint>That rental is not on file.</Hint>
      </Screen>
    );
  }
  if (paymentId && !existing) {
    return (
      <Screen>
        <Hint>That payment is not on file.</Hint>
      </Screen>
    );
  }
  return <PaymentForm rental={rental} existing={existing} />;
}

function PaymentForm({ rental, existing }: { rental: Rental; existing?: Payment }) {
  const { savePayment, deletePayment } = useFleet();
  const [amount, setAmount] = useState(existing ? existing.amount.toFixed(2) : "");
  const [date, setDate] = useState(existing?.paymentDate ?? rental?.pickupDate ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    const parsed = parseMoney(amount);
    if (parsed == null) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!isIsoDate(date)) {
      setError("Choose the payment date.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await savePayment({ rentalId: rental.id, amount: parsed, paymentDate: date }, existing?.id);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the payment.");
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!existing) return;
    const ok = await confirmDelete("Delete payment?", "The rental balance will update.");
    if (!ok) return;
    setSaving(true);
    try {
      await deletePayment(existing.id);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the payment.");
      setSaving(false);
    }
  }

  return (
    <Screen>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <TextField label="Amount (USD)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="100.00" />
      <DateField label="Payment date" value={date} onChange={setDate} />
      <Button label={saving ? "Saving…" : "Save payment"} onPress={() => void onSave()} disabled={saving} />
      {existing ? (
        <Button label="Delete payment" variant="danger" onPress={() => void onDelete()} disabled={saving} />
      ) : null}
    </Screen>
  );
}
