import { useLocalSearchParams } from "expo-router";

import { oneParam } from "@/lib/params";
import { CarFormScreen } from "@/screens/car-form-screen";

export default function EditCarRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  return <CarFormScreen carId={oneParam(params.id)} />;
}
