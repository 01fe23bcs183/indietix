import { RazorpayProvider } from "./razorpay";
import { FakePaymentProvider } from "./fake";
import type { PaymentProvider } from "./types";

export { RazorpayProvider } from "./razorpay";
export { FakePaymentProvider } from "./fake";
export type {
  PaymentProvider,
  PaymentOrder,
  RazorpayConfig,
  RefundResult,
  PayoutResult,
} from "./types";

export function getPaymentProvider(): PaymentProvider {
  const isTest = process.env.NODE_ENV === "test";
  const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

  if (isTest || !razorpayKeyId || !razorpayKeySecret) {
    return new FakePaymentProvider();
  }

  return new RazorpayProvider({
    keyId: razorpayKeyId,
    keySecret: razorpayKeySecret,
  });
}
