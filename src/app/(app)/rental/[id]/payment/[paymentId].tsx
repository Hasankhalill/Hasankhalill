import { useLocalSearchParams } from "expo-router";

import { oneParam } from "@/lib/params";
import { PaymentFormScreen } from "@/screens/payment-form-screen";

export default function EditPaymentRoute() {
  const params = useLocalSearchParams<{ id: string; paymentId: string }>();
  return <PaymentFormScreen rentalId={oneParam(params.id)} paymentId={oneParam(params.paymentId)} />;
}
