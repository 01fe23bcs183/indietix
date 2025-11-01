export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
}

export interface RefundResult {
  refundId: string;
  status: "processed" | "pending" | "failed";
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
  createRefund?(params: {
    paymentId: string;
    amountPaise: number;
    speed?: "normal" | "optimum";
  }): Promise<RefundResult>;
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
