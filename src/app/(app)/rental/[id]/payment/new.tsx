import { useLocalSearchParams } from "expo-router";

import { oneParam } from "@/lib/params";
import { PaymentFormScreen } from "@/screens/payment-form-screen";

export default function NewPaymentRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  return <PaymentFormScreen rentalId={oneParam(params.id)} />;
}
