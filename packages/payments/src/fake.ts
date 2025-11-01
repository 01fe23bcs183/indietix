import { randomBytes } from "crypto";
import type { PaymentProvider, PaymentOrder } from "./types";

export class FakePaymentProvider implements PaymentProvider {
  kind: "fake" = "fake";

  async createOrder(params: {
    amountINR: number;
    receipt: string;
  }): Promise<PaymentOrder> {
    const fakeOrderId = `fake_${randomBytes(12).toString("hex")}`;

    return {
      orderId: fakeOrderId,
      amount: params.amountINR,
      currency: "INR",
    };
  }
}
