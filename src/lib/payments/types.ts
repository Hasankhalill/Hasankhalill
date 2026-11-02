export type PaymentStart = {
  providerRef: string | null;
  redirectUrl: string | null;
};

export interface PaymentProvider {
  id: "COD" | "STRIPE" | "AREEBA";
  start(input: {
    orderId: string;
    orderNumber: string;
    accessToken: string;
    amountCents: number;
    currency: string;
    email: string;
    lines: { name: string; quantity: number; unitPriceCents: number }[];
    shippingCents: number;
    taxCents: number;
    discountCents: number;
  }): Promise<PaymentStart>;
}
