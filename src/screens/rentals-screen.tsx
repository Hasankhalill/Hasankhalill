import { router } from "expo-router";

import { Button, Hint, ListRow, LoadingState, Screen, SectionTitle } from "@/components/ui";
import { rentalBalance } from "@/domain/billing";
import { formatDate, formatUSD } from "@/domain/format";
import { paymentsForRental } from "@/domain/report";
import { useFleet } from "@/lib/fleet";

export function RentalsScreen() {
  const { fleet, loading, refresh, refreshing, readOnly, paths } = useFleet();
  if (loading && fleet.cars.length === 0) return <LoadingState />;
  const cars = new Map(fleet.cars.map((car) => [car.id, car]));
  const rentals = [...fleet.rentals].sort((a, b) => b.pickupDate.localeCompare(a.pickupDate));

  return (
    <Screen onRefresh={readOnly ? undefined : refresh} refreshing={refreshing}>
      {readOnly ? null : <Button label="Add rental" onPress={() => router.push(paths.newRental())} />}
      <SectionTitle>All rentals</SectionTitle>
      {rentals.length === 0 ? <Hint>No rentals yet.</Hint> : null}
      {rentals.map((rental) => {
        const car = cars.get(rental.carId);
        const balance = rentalBalance(rental, paymentsForRental(fleet.payments, rental.id));
        const due =
          balance.balance > 0
            ? `Due ${formatUSD(balance.balance)}`
            : balance.balance < 0
              ? `Overpaid ${formatUSD(Math.abs(balance.balance))}`
              : "Paid";
        return (
          <ListRow
            key={rental.id}
            title={car?.name ?? "Car"}
            subtitle={`${formatDate(rental.pickupDate)} → ${formatDate(rental.returnDate)} · ${balance.days} days · ${formatUSD(balance.total)}`}
            meta={due}
            onPress={() => router.push(paths.rental(rental.id))}
          />
        );
      })}
    </Screen>
  );
}
