import { validateRental } from "@/domain/billing";
import {
  contentTypeForExtension,
  extensionFromUri,
  isConditionPhase,
  type ConditionVideo,
} from "@/domain/condition";
import { blankToNull } from "@/domain/format";
import type { Car, Expense, ExpenseCategory, Fleet, Payment, Rental } from "@/domain/types";
import type { RemoteCondition, RemotePort } from "@/data/sync-engine";
import { requireSupabase } from "@/lib/supabase";

const BUCKET = "condition-videos";

type DbError = { message: string; code?: string };

function toError(error: DbError): Error {
  if (error.code === "23P01" || /overlap/i.test(error.message)) {
    return new Error("This car already has a rental on those days.");
  }
  if (error.code === "23505") return new Error("That license plate is already in the fleet.");
  if (error.code === "23503") return new Error("This car still has rentals or expenses.");
  return new Error(error.message);
}

async function ownerId(): Promise<string> {
  const { data, error } = await requireSupabase().auth.getSession();
  if (error || !data.session?.user) throw new Error("Sign in again.");
  return data.session.user.id;
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

function mapCondition(row: {
  id: string;
  rental_id: string;
  car_id: string;
  phase: string;
  notes: string | null;
  license_plate: string;
  recorded_at: string;
  storage_path: string | null;
}): RemoteCondition {
  if (!isConditionPhase(row.phase)) throw new Error("Unknown condition video.");
  return {
    id: row.id,
    rentalId: row.rental_id,
    carId: row.car_id,
    phase: row.phase,
    notes: row.notes,
    licensePlate: row.license_plate,
    recordedAt: row.recorded_at,
    storagePath: row.storage_path ?? "",
    extension: extensionFromUri(row.storage_path ?? ".mp4"),
  };
}

export function createRemotePort(): RemotePort {
  const client = () => requireSupabase();
  return {
    async pullFleet() {
      const db = client();
      const [cars, rentals, payments, expenses] = await Promise.all([
        db.from("cars").select("*").order("license_plate"),
        db.from("rentals").select("*").order("pickup_date", { ascending: false }),
        db.from("payments").select("*").order("payment_date"),
        db.from("expenses").select("*").order("expense_date", { ascending: false }),
      ]);
      if (cars.error) throw toError(cars.error);
      if (rentals.error) throw toError(rentals.error);
      if (payments.error) throw toError(payments.error);
      if (expenses.error) throw toError(expenses.error);
      const fleet: Fleet = {
        cars: (cars.data ?? []).map(mapCar),
        rentals: (rentals.data ?? []).map(mapRental),
        payments: (payments.data ?? []).map(mapPayment),
        expenses: (expenses.data ?? []).map(mapExpense),
      };
      return fleet;
    },
    async pushCar(car) {
      const { error } = await client()
        .from("cars")
        .upsert({
          id: car.id,
          owner_id: await ownerId(),
          name: car.name,
          make: car.make,
          model: car.model,
          year: car.year,
          license_plate: car.licensePlate,
          default_daily_rate: car.defaultDailyRate,
        });
      if (error) throw toError(error);
    },
    async pushRental(rental) {
      const db = client();
      const { data: rows, error: loadError } = await db
        .from("rentals")
        .select("id, car_id, pickup_date, return_date, daily_rate, customer_name, customer_phone, notes")
        .eq("car_id", rental.carId);
      if (loadError) throw toError(loadError);
      const check = validateRental(rental, (rows ?? []).map(mapRental));
      if (!check.ok) throw new Error(check.error);
      const { error } = await db.from("rentals").upsert({
        id: rental.id,
        owner_id: await ownerId(),
        car_id: rental.carId,
        pickup_date: rental.pickupDate,
        return_date: rental.returnDate,
        daily_rate: rental.dailyRate,
        customer_name: blankToNull(rental.customerName ?? ""),
        customer_phone: blankToNull(rental.customerPhone ?? ""),
        notes: blankToNull(rental.notes ?? ""),
      });
      if (error) throw toError(error);
    },
    async pushPayment(payment) {
      const { error } = await client().from("payments").upsert({
        id: payment.id,
        owner_id: await ownerId(),
        rental_id: payment.rentalId,
        amount: payment.amount,
        payment_date: payment.paymentDate,
      });
      if (error) throw toError(error);
    },
    async pushExpense(expense) {
      const { error } = await client().from("expenses").upsert({
        id: expense.id,
        owner_id: await ownerId(),
        car_id: expense.carId,
        expense_date: expense.expenseDate,
        category: expense.category,
        amount: expense.amount,
        description: expense.description,
      });
      if (error) throw toError(error);
    },
    async deleteCar(id) {
      const { error } = await client().from("cars").delete().eq("id", id);
      if (error) throw toError(error);
    },
    async deleteRental(id) {
      const { error } = await client().from("rentals").delete().eq("id", id);
      if (error) throw toError(error);
    },
    async deletePayment(id) {
      const { error } = await client().from("payments").delete().eq("id", id);
      if (error) throw toError(error);
    },
    async deleteExpense(id) {
      const { error } = await client().from("expenses").delete().eq("id", id);
      if (error) throw toError(error);
    },
    async uploadVideo(path, bytes, contentType) {
      const body = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const { error } = await client().storage.from(BUCKET).upload(path, body, {
        contentType: contentType || contentTypeForExtension(extensionFromUri(path)),
        upsert: true,
      });
      if (error) throw new Error(error.message);
    },
    async upsertCondition(video: ConditionVideo, path: string) {
      const { error } = await client()
        .from("condition_videos")
        .upsert({
          id: video.id,
          owner_id: await ownerId(),
          rental_id: video.rentalId,
          car_id: video.carId,
          phase: video.phase,
          notes: video.notes,
          license_plate: video.licensePlate,
          recorded_at: video.recordedAt,
          storage_path: path,
        });
      if (error) throw toError(error);
    },
    async deleteVideo(path) {
      const { error } = await client().storage.from(BUCKET).remove([path]);
      if (error) throw new Error(error.message);
    },
    async pullConditions() {
      const { data, error } = await client().from("condition_videos").select("*");
      if (error) throw toError(error);
      return (data ?? []).map(mapCondition);
    },
    async downloadVideo(path) {
      const { data, error } = await client().storage.from(BUCKET).download(path);
      if (error || !data) throw new Error(error?.message ?? "Could not download the condition video.");
      return new Uint8Array(await data.arrayBuffer());
    },
  };
}

export async function currentOwnerId(): Promise<string> {
  return ownerId();
}
