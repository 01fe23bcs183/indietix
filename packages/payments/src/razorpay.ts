import Razorpay from "razorpay";
import crypto from "crypto";
import type { PaymentProvider, PaymentOrder, RazorpayConfig } from "./types";

export class RazorpayProvider implements PaymentProvider {
  kind: "razorpay" = "razorpay";
  private client: Razorpay;
  private keySecret: string;

  constructor(config: RazorpayConfig) {
    this.client = new Razorpay({
      key_id: config.keyId,
      key_secret: config.keySecret,
    });
    this.keySecret = config.keySecret;
  }

  async createOrder(params: {
    amountINR: number;
    receipt: string;
  }): Promise<PaymentOrder> {
    const order = await this.client.orders.create({
      amount: params.amountINR * 100, // Razorpay expects amount in paise
      currency: "INR",
      receipt: params.receipt,
    });

    return {
      orderId: order.id,
      amount: params.amountINR,
      currency: "INR",
    };
  }

  verifyWebhookSignature(params: {
    body: string;
    signature: string;
    secret: string;
  }): boolean {
    const expectedSignature = crypto
      .createHmac("sha256", params.secret)
      .update(params.body)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(params.signature)
    );
  }
}
