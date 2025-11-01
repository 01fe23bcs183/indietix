export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
}

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

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
}
