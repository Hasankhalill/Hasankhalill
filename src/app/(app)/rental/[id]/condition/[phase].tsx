import { useLocalSearchParams } from "expo-router";

import { oneParam } from "@/lib/params";
import { ConditionCaptureScreen } from "@/screens/condition-capture-screen";

export default function ConditionRoute() {
  const params = useLocalSearchParams<{ id: string; phase: string }>();
  return <ConditionCaptureScreen rentalId={oneParam(params.id)} phase={oneParam(params.phase)} />;
}
