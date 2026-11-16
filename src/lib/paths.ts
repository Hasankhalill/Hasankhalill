import type { Href } from "expo-router";

import type { ConditionPhase } from "@/domain/condition";

export type AppPaths = {
  car: (id: string, month: string) => Href;
  editCar: (id: string) => Href;
  newCar: Href;
  rental: (id: string) => Href;
  newRental: (carId?: string) => Href;
  editRental: (id: string) => Href;
  newExpense: (carId?: string) => Href;
  editExpense: (id: string) => Href;
  newPayment: (rentalId: string) => Href;
  editPayment: (rentalId: string, paymentId: string) => Href;
  recordCondition: (rentalId: string, phase: ConditionPhase) => Href;
};

function href(path: string): Href {
  return path as Href;
}

export const livePaths: AppPaths = {
  car: (id, month) => href(`/car/${id}?month=${month}`),
  editCar: (id) => href(`/car/${id}/edit`),
  newCar: "/car/new",
  rental: (id) => href(`/rental/${id}`),
  newRental: (carId) => href(carId ? `/rental/new?carId=${carId}` : "/rental/new"),
  editRental: (id) => href(`/rental/${id}/edit`),
  newExpense: (carId) => href(carId ? `/expense/new?carId=${carId}` : "/expense/new"),
  editExpense: (id) => href(`/expense/${id}`),
  newPayment: (rentalId) => href(`/rental/${rentalId}/payment/new`),
  editPayment: (rentalId, paymentId) => href(`/rental/${rentalId}/payment/${paymentId}`),
  recordCondition: (rentalId, phase) => href(`/rental/${rentalId}/condition/${phase}`),
};

export const previewPaths: AppPaths = {
  car: (id, month) => href(`/preview/car/${id}?month=${month}`),
  editCar: () => "/preview",
  newCar: "/preview",
  rental: (id) => href(`/preview/rental/${id}`),
  newRental: () => "/preview",
  editRental: () => "/preview",
  newExpense: () => "/preview",
  editExpense: () => "/preview",
  newPayment: () => "/preview",
  editPayment: () => "/preview",
  recordCondition: () => "/preview",
};
