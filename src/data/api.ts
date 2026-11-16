import { validateRental } from "@/domain/billing";
import { blankToNull } from "@/domain/format";
import type { Car, Expense, ExpenseCategory, Fleet, Payment, Rental } from "@/domain/types";
import { requireSupabase } from "@/lib/supabase";

type DbError = { message: string; code?: string };

export type CarInput = {
  name: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  defaultDailyRate: number;
};

export type RentalInput = {
  carId: string;
  pickupDate: string;
  returnDate: string;
  dailyRate: number;
  customerName: string;
  customerPhone: string;
  notes: string;
  initialPaymentAmount?: number | null;
  initialPaymentDate?: string | null;
};

export type ExpenseInput = {
  carId: string;
  expenseDate: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
};

export type PaymentInput = {
  rentalId: string;
  amount: number;
  paymentDate: string;
};

function toError(error: DbError): Error {
  if (error.code === "23P01" || /overlap/i.test(error.message)) {
    return new Error("This car already has a rental on those days.");
  }
  if (error.code === "23505") {
    return new Error("That license plate is already in the fleet.");
  }
  if (error.code === "23503") {
    return new Error("This car still has rentals or expenses.");
  }
  return new Error(error.message);
}

function mapCar(row: {
  id: string;
  name: string;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  default_daily_rate: number | string;
}): Car {
  return {
    id: row.id,
    name: row.name,
    make: row.make,
    model: row.model,
    year: row.year,
    licensePlate: row.license_plate,
    defaultDailyRate: Number(row.default_daily_rate),
  };
}

function mapRental(row: {
  id: string;
  car_id: string;
  pickup_date: string;
  return_date: string;
  daily_rate: number | string;
  customer_name: string | null;
  customer_phone: string | null;
  notes: string | null;
}): Rental {
  return {
    id: row.id,
    carId: row.car_id,
    pickupDate: row.pickup_date,
    returnDate: row.return_date,
    dailyRate: Number(row.daily_rate),
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    notes: row.notes,
  };
}

function mapPayment(row: {
  id: string;
  rental_id: string;
  amount: number | string;
  payment_date: string;
}): Payment {
  return {
    id: row.id,
    rentalId: row.rental_id,
    amount: Number(row.amount),
    paymentDate: row.payment_date,
  };
}

function mapExpense(row: {
  id: string;
  car_id: string;
  expense_date: string;
  category: ExpenseCategory;
  amount: number | string;
  description: string | null;
}): Expense {
  return {
    id: row.id,
    carId: row.car_id,
    expenseDate: row.expense_date,
    category: row.category,
    amount: Number(row.amount),
    description: row.description,
  };
}

async function currentUserId(): Promise<string> {
  const { data, error } = await requireSupabase().auth.getUser();
  if (error || !data.user) throw new Error("Sign in again.");
  return data.user.id;
}

export async function fetchFleet(): Promise<Fleet> {
  const client = requireSupabase();
  const [cars, rentals, payments, expenses] = await Promise.all([
    client.from("cars").select("*").order("license_plate"),
    client.from("rentals").select("*").order("pickup_date", { ascending: false }),
    client.from("payments").select("*").order("payment_date"),
    client.from("expenses").select("*").order("expense_date", { ascending: false }),
  ]);
  if (cars.error) throw toError(cars.error);
  if (rentals.error) throw toError(rentals.error);
  if (payments.error) throw toError(payments.error);
  if (expenses.error) throw toError(expenses.error);
  return {
    cars: (cars.data ?? []).map(mapCar),
    rentals: (rentals.data ?? []).map(mapRental),
    payments: (payments.data ?? []).map(mapPayment),
    expenses: (expenses.data ?? []).map(mapExpense),
  };
}

export async function saveCar(input: CarInput, id?: string): Promise<void> {
  const client = requireSupabase();
  const payload = {
    name: input.name.trim(),
    make: input.make.trim(),
    model: input.model.trim(),
    year: input.year,
    license_plate: input.licensePlate.trim(),
    default_daily_rate: input.defaultDailyRate,
  };
  const query = id
    ? client.from("cars").update(payload).eq("id", id)
    : client.from("cars").insert({ ...payload, owner_id: await currentUserId() });
  const { error } = await query;
  if (error) throw toError(error);
}

export async function deleteCar(id: string): Promise<void> {
  const { error } = await requireSupabase().from("cars").delete().eq("id", id);
  if (error) throw toError(error);
}

export async function saveRental(input: RentalInput, id?: string): Promise<string> {
  const client = requireSupabase();
  const { data: rows, error: loadError } = await client
    .from("rentals")
    .select("id, car_id, pickup_date, return_date, daily_rate, customer_name, customer_phone, notes")
    .eq("car_id", input.carId);
  if (loadError) throw toError(loadError);

  const check = validateRental(
    {
      id,
      carId: input.carId,
      pickupDate: input.pickupDate,
      returnDate: input.returnDate,
      dailyRate: input.dailyRate,
    },
    (rows ?? []).map(mapRental),
  );
  if (!check.ok) throw new Error(check.error);

  const payload = {
    car_id: input.carId,
    pickup_date: input.pickupDate,
    return_date: input.returnDate,
    daily_rate: input.dailyRate,
    customer_name: blankToNull(input.customerName),
    customer_phone: blankToNull(input.customerPhone),
    notes: blankToNull(input.notes),
  };

  if (id) {
    const { error } = await client.from("rentals").update(payload).eq("id", id);
    if (error) throw toError(error);
    return id;
  }

  const { data, error } = await client
    .from("rentals")
    .insert({ ...payload, owner_id: await currentUserId() })
    .select("id")
    .single();
  if (error) throw toError(error);

  const rentalId = data.id as string;
  if (input.initialPaymentAmount && input.initialPaymentDate) {
    await savePayment({
      rentalId,
      amount: input.initialPaymentAmount,
      paymentDate: input.initialPaymentDate,
    });
  }
  return rentalId;
}

export async function deleteRental(id: string): Promise<void> {
  const { error } = await requireSupabase().from("rentals").delete().eq("id", id);
  if (error) throw toError(error);
}

export async function saveExpense(input: ExpenseInput, id?: string): Promise<void> {
  const client = requireSupabase();
  const payload = {
    car_id: input.carId,
    expense_date: input.expenseDate,
    category: input.category,
    amount: input.amount,
    description: blankToNull(input.description),
  };
  const query = id
    ? client.from("expenses").update(payload).eq("id", id)
    : client.from("expenses").insert({ ...payload, owner_id: await currentUserId() });
  const { error } = await query;
  if (error) throw toError(error);
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await requireSupabase().from("expenses").delete().eq("id", id);
  if (error) throw toError(error);
}

export async function savePayment(input: PaymentInput, id?: string): Promise<void> {
  const client = requireSupabase();
  const payload = {
    rental_id: input.rentalId,
    amount: input.amount,
    payment_date: input.paymentDate,
  };
  const query = id
    ? client.from("payments").update(payload).eq("id", id)
    : client.from("payments").insert({ ...payload, owner_id: await currentUserId() });
  const { error } = await query;
  if (error) throw toError(error);
}

export async function deletePayment(id: string): Promise<void> {
  const { error } = await requireSupabase().from("payments").delete().eq("id", id);
  if (error) throw toError(error);
}
