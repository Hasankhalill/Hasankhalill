import { CommerceError } from "../errors";
import type { PaymentProvider } from "./types";

// Lebanese card acquiring is the likely local option. This stub never captures a payment.
export const areeba: PaymentProvider = {
  id: "AREEBA",
  async start() {
    throw new CommerceError(
      "AREEBA_NOT_CONFIGURED",
      "Card acquiring through Areeba is not configured. No charge was attempted.",
    );
  },
};
