import { randomBytes } from "crypto";
import type { PaymentProvider, PaymentOrder, RefundResult } from "./types";

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

  async createRefund(params: {
    paymentId: string;
    amountPaise: number;
    speed?: "normal" | "optimum";
  }): Promise<RefundResult> {
    const fakeRefundId = `rf_fake_${randomBytes(12).toString("hex")}`;

    return {
      refundId: fakeRefundId,
      status: "processed",
      amount: params.amountPaise,
      currency: "INR",
    };
  }
}
