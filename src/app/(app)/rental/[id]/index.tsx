import { useLocalSearchParams } from "expo-router";

import { oneParam } from "@/lib/params";
import { RentalDetailScreen } from "@/screens/rental-detail-screen";

export default function RentalDetailRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  return <RentalDetailScreen rentalId={oneParam(params.id)} />;
}
