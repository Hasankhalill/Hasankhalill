import { router, Stack } from "expo-router";

import { ConditionSection } from "@/components/condition-section";
import { Banner, Button, Card, Hint, ListRow, MoneyLine, Screen, SectionTitle } from "@/components/ui";
import { rentalBalance } from "@/domain/billing";
import { formatDate, formatUSD } from "@/domain/format";
import { paymentsForRental } from "@/domain/report";
import { confirmDelete } from "@/lib/confirm";
import { useFleet } from "@/lib/fleet";
import { useState } from "react";

export function RentalDetailScreen({ rentalId }: { rentalId: string }) {
  const { fleet, refresh, refreshing, readOnly, paths, deleteRental } = useFleet();
  const rental = fleet.rentals.find((item) => item.id === rentalId);
  const car = fleet.cars.find((item) => item.id === rental?.carId);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!rental) {
    return (
      <Screen>
        <Hint>That rental is not on file.</Hint>
      </Screen>
    );
  }

  const payments = paymentsForRental(fleet.payments, rental.id);
  const balance = rentalBalance(rental, payments);

  async function onDelete() {
    const ok = await confirmDelete("Delete rental?", "Its payments will be deleted too.");
    if (!ok) return;
    setBusy(true);
    try {
      await deleteRental(rental!.id);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the rental.");
      setBusy(false);
    }
  }

  return (
    <Screen onRefresh={readOnly ? undefined : refresh} refreshing={refreshing}>
      <Stack.Screen options={{ title: car?.name ?? "Rental" }} />
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Card>
        <Hint>
          {formatDate(rental.pickupDate)} → {formatDate(rental.returnDate)} · {formatUSD(rental.dailyRate)} / day
        </Hint>
        <MoneyLine label="Billed days" value={String(balance.days)} />
        <MoneyLine label="Total charged" value={formatUSD(balance.total)} />
        <MoneyLine label="Amount paid" value={formatUSD(balance.paid)} />
        <MoneyLine
          label="Remaining balance"
          value={formatUSD(balance.balance)}
          tone={balance.balance > 0 ? "bad" : balance.balance < 0 ? "bad" : "good"}
        />
      </Card>
      {rental.customerName ? <Hint>Customer: {rental.customerName}</Hint> : null}
      {rental.customerPhone ? <Hint>Phone: {rental.customerPhone}</Hint> : null}
      {rental.notes ? <Hint>Notes: {rental.notes}</Hint> : null}
      <ConditionSection rentalId={rental.id} />
      {readOnly ? null : (
        <>
          <Button label="Edit rental" variant="secondary" onPress={() => router.push(paths.editRental(rental.id))} />
          <Button label="Add payment" onPress={() => router.push(paths.newPayment(rental.id))} />
        </>
      )}
      <SectionTitle>Payments</SectionTitle>
      {payments.length === 0 ? <Hint>No payments yet.</Hint> : null}
      {payments.map((payment) => (
        <ListRow
          key={payment.id}
          title={formatDate(payment.paymentDate)}
          meta={formatUSD(payment.amount)}
          onPress={readOnly ? undefined : () => router.push(paths.editPayment(rental.id, payment.id))}
        />
      ))}
      {readOnly ? null : (
        <Button label={busy ? "Deleting…" : "Delete rental"} variant="danger" onPress={() => void onDelete()} disabled={busy} />
      )}
    </Screen>
  );
}
