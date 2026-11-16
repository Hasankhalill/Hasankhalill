import { useLocalSearchParams } from "expo-router";

import { oneParam } from "@/lib/params";
import { RentalDetailScreen } from "@/screens/rental-detail-screen";

export default function PreviewRentalRoute() {
  return <RentalDetailScreen rentalId={oneParam(useLocalSearchParams<{ id: string }>().id)} />;
}
