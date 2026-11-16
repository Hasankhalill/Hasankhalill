import { useLocalSearchParams } from "expo-router";

import { oneParam } from "@/lib/params";
import { RentalFormScreen } from "@/screens/rental-form-screen";

export default function EditRentalRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  return <RentalFormScreen rentalId={oneParam(params.id)} />;
}
