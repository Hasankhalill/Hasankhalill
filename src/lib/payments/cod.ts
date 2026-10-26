import type { PaymentProvider } from "./types";

export const cashOnDelivery: PaymentProvider = {
  id: "COD",
  async start() {
    return { providerRef: null, redirectUrl: null };
  },
};
