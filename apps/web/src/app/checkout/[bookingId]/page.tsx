"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@indietix/ui";
import { formatINR } from "@indietix/utils";

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);

  const { data: booking, refetch } = trpc.booking.poll.useQuery(
    { bookingId },
    {
      refetchInterval: 3000, // Poll every 3 seconds
    }
  );

  const validatePromo = trpc.promos.validate.useMutation();
  const confirmPayment = trpc.booking.confirmPayment.useMutation();

  useEffect(() => {
    if (booking?.status === "CONFIRMED") {
      router.push(`/bookings/${bookingId}`);
    }
  }, [booking?.status, bookingId, router]);

  const handleValidatePromo = async () => {
    if (!promoCode.trim() || !booking) return;

    setPromoError(null);
    setPromoSuccess(null);

    try {
      const result = await validatePromo.mutateAsync({
        code: promoCode.trim().toUpperCase(),
        eventId: booking.event.id,
        basePrice: booking.event.price,
        quantity: booking.seats,
      });

      if (result.valid) {
        setPromoSuccess(
          `Promo code applied! You'll save ${result.discountAmount ? formatINR(result.discountAmount) : "some amount"}`
        );
      } else {
        setPromoError(result.reason || "Invalid promo code");
      }
    } catch (err) {
      setPromoError(
        err instanceof Error ? err.message : "Failed to validate promo code"
      );
    }
  };

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      await confirmPayment.mutateAsync({
        bookingId,
      });

      await refetch();
    } catch (err) {
      setError("Failed to process payment. Please try again.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  const holdExpiresAt = new Date(booking.holdExpiresAt);
  const now = new Date();
  const timeRemaining = Math.max(0, holdExpiresAt.getTime() - now.getTime());
  const minutesRemaining = Math.floor(timeRemaining / 60000);
  const secondsRemaining = Math.floor((timeRemaining % 60000) / 1000);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">Complete Your Booking</h1>

          {/* Hold Timer */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
            <p className="text-sm text-yellow-800">
              Your seats are on hold for:{" "}
              <span className="font-bold">
                {minutesRemaining}:
                {secondsRemaining.toString().padStart(2, "0")}
              </span>
            </p>
          </div>

          {/* Event Details */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Event Details</h2>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Event:</span>{" "}
                {booking.event.title}
              </p>
              <p>
                <span className="font-medium">Date:</span>{" "}
                {new Date(booking.event.date).toLocaleDateString()}
              </p>
              <p>
                <span className="font-medium">Venue:</span>{" "}
                {booking.event.venue}, {booking.event.city}
              </p>
              <p>
                <span className="font-medium">Seats:</span> {booking.seats}
              </p>
              <p>
                <span className="font-medium">Ticket Number:</span>{" "}
                {booking.ticketNumber}
              </p>
            </div>
          </div>

          {/* Promo Code Section */}
          {booking.status === "PENDING" && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Have a Promo Code?</h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  placeholder="Enter promo code"
                  className="flex-1 border rounded px-4 py-2 font-mono uppercase"
                  maxLength={50}
                />
                <Button
                  onClick={handleValidatePromo}
                  disabled={!promoCode.trim() || validatePromo.isPending}
                  variant="outline"
                >
                  {validatePromo.isPending ? "Checking..." : "Apply"}
                </Button>
              </div>
              {promoError && (
                <p className="mt-2 text-sm text-red-600">{promoError}</p>
              )}
              {promoSuccess && (
                <p className="mt-2 text-sm text-green-600">{promoSuccess}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Note: Promo code will be applied during payment processing
              </p>
            </div>
          )}

          {/* Amount Breakdown */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Amount Breakdown</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>
                  Subtotal ({booking.seats} × {formatINR(booking.event.price)})
                </span>
                <span>{formatINR(booking.event.price * booking.seats)}</span>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Amount</span>
                  <span>{formatINR(booking.finalAmount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Payment Status</h2>
            <div className="flex items-center space-x-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  booking.status === "CONFIRMED"
                    ? "bg-green-100 text-green-800"
                    : booking.status === "PENDING"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {booking.status}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  booking.paymentStatus === "COMPLETED"
                    ? "bg-green-100 text-green-800"
                    : booking.paymentStatus === "PENDING"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                Payment: {booking.paymentStatus}
              </span>
            </div>
          </div>

          {/* Payment Actions */}
          {booking.status === "PENDING" && (
            <div className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Fake Payment Provider Button (for testing) */}
              <Button
                onClick={handleSimulatePayment}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? "Processing..." : "Simulate Payment Success"}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                In production, this would show Razorpay payment options
              </p>
            </div>
          )}

          {booking.status === "CONFIRMED" && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <p className="text-sm text-green-800 font-medium">
                Payment successful! Redirecting to confirmation page...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
