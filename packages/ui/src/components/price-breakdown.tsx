import * as React from "react";
import { cn } from "../lib/utils";

export interface PriceBreakdownProps {
  basePrice: number;
  feesConfig?: {
    paymentGateway: number;
    serverMaintenance: number;
    platformSupport: number;
  };
  gstRate?: number;
  className?: string;
}

export function PriceBreakdown({
  basePrice,
  feesConfig = {
    paymentGateway: 2,
    serverMaintenance: 2,
    platformSupport: 10,
  },
  gstRate = 0.18,
  className,
}: PriceBreakdownProps): JSX.Element {
  const subtotal = basePrice;
  const fees =
    feesConfig.paymentGateway +
    feesConfig.serverMaintenance +
    feesConfig.platformSupport;
  const gst = Math.round(fees * gstRate);
  const total = subtotal + fees + gst;

  const formatINR = (amount: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className={cn("space-y-3 rounded-lg border p-4", className)}>
      <h3 className="font-semibold text-lg">Transparent Fee Breakdown</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Ticket Price</span>
          <span className="font-medium">{formatINR(subtotal)}</span>
        </div>
        <div className="border-t pt-2 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Payment gateway</span>
            <span>{formatINR(feesConfig.paymentGateway)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Server maintenance</span>
            <span>{formatINR(feesConfig.serverMaintenance)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Platform support</span>
            <span>{formatINR(feesConfig.platformSupport)}</span>
          </div>
        </div>
        <div className="flex justify-between text-xs border-t pt-2">
          <span className="text-muted-foreground">
            GST ({Math.round(gstRate * 100)}% on fees)
          </span>
          <span>{formatINR(gst)}</span>
        </div>
        <div className="flex justify-between font-semibold text-base border-t pt-2">
          <span>Total</span>
          <span>{formatINR(total)}</span>
        </div>
      </div>
    </div>
  );
}
