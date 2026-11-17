import { router } from "expo-router";

import { CarPhoto } from "@/components/car-photo";
import { Button, Hint, ListRow, LoadingState, Screen, SectionTitle } from "@/components/ui";
import { formatUSD } from "@/domain/format";
import { currentMonth } from "@/domain/dates";
import { useFleet } from "@/lib/fleet";
import { useLocale } from "@/lib/locale";

export function CarsScreen() {
  const { t } = useLocale();
  const { fleet, loading, refresh, refreshing, readOnly, paths } = useFleet();
  const month = currentMonth();
  if (loading && fleet.cars.length === 0) return <LoadingState />;

  return (
    <Screen onRefresh={readOnly ? undefined : refresh} refreshing={refreshing}>
      {readOnly ? null : <Button label={t("addCarShort")} onPress={() => router.push(paths.newCar)} />}
      <SectionTitle>{t("fleet")}</SectionTitle>
      {fleet.cars.length === 0 ? <Hint>{t("addFirstCar")}</Hint> : null}
      {fleet.cars.map((car) => (
        <ListRow
          key={car.id}
          leading={<CarPhoto carId={car.id} name={car.name} variant="thumb" />}
          title={car.name}
          subtitle={`${car.year} ${car.make} ${car.model} · ${car.licensePlate}`}
          meta={formatUSD(car.defaultDailyRate)}
          onPress={() => router.push(paths.car(car.id, month))}
        />
      ))}
      <Hint>{t("dailyRateHint")}</Hint>
    </Screen>
  );
}
