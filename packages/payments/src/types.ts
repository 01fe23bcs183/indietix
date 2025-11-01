export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
}

/* eslint-disable no-unused-vars */
export interface PaymentProvider {
  kind: "razorpay" | "fake";
  createOrder(params: {
    amountINR: number;
    receipt: string;
  }): Promise<PaymentOrder>;
  verifyWebhookSignature?(params: {
    body: string;
    signature: string;
    secret: string;
  }): boolean;
}
/* eslint-enable no-unused-vars */

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
}
