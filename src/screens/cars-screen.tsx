import { router } from "expo-router";

import { Button, Hint, ListRow, LoadingState, Screen, SectionTitle } from "@/components/ui";
import { formatUSD } from "@/domain/format";
import { currentMonth } from "@/domain/dates";
import { useFleet } from "@/lib/fleet";

export function CarsScreen() {
  const { fleet, loading, refresh, refreshing, readOnly, paths } = useFleet();
  const month = currentMonth();
  if (loading && fleet.cars.length === 0) return <LoadingState />;

  return (
    <Screen onRefresh={readOnly ? undefined : refresh} refreshing={refreshing}>
      {readOnly ? null : <Button label="Add car" onPress={() => router.push(paths.newCar)} />}
      <SectionTitle>Fleet</SectionTitle>
      {fleet.cars.length === 0 ? <Hint>Add the first car to start recording rentals.</Hint> : null}
      {fleet.cars.map((car) => (
        <ListRow
          key={car.id}
          title={car.name}
          subtitle={`${car.year} ${car.make} ${car.model} · ${car.licensePlate}`}
          meta={formatUSD(car.defaultDailyRate)}
          onPress={() => router.push(paths.car(car.id, month))}
        />
      ))}
      <Hint>The amount on the right is the default daily rate. A rental can use a different rate.</Hint>
    </Screen>
  );
}
