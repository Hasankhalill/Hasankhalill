import { useLocalSearchParams } from "expo-router";

import { oneParam } from "@/lib/params";
import { ExpenseFormScreen } from "@/screens/expense-form-screen";

export default function EditExpenseRoute() {
  const params = useLocalSearchParams<{ id: string }>();
  return <ExpenseFormScreen expenseId={oneParam(params.id)} />;
}
