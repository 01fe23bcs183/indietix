import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { trpc } from "../../lib/trpc";
import { formatINR } from "@indietix/utils";

export default function CheckoutPage(): JSX.Element {
  const params = useLocalSearchParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;

  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoSuccess, setPromoSuccess] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const { data: booking, refetch } = trpc.booking.poll.useQuery(
    { bookingId },
    {
      refetchInterval: 3000,
    }
  );

  const confirmPayment = trpc.booking.confirmPayment.useMutation();

  useEffect(() => {
    if (booking?.status === "CONFIRMED") {
      router.replace(`/bookings/${bookingId}`);
    }
  }, [booking?.status, bookingId, router]);

  useEffect(() => {
    if (!booking) return;

    const holdExpiresAt = new Date(booking.holdExpiresAt);
    const updateTimer = () => {
      const now = new Date();
      const remaining = Math.max(0, holdExpiresAt.getTime() - now.getTime());
      setTimeRemaining(remaining);

      if (remaining === 0) {
        Alert.alert(
          "Booking Expired",
          "Your booking hold has expired. Please try again.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [booking, router]);

  async function handleValidatePromo() {
    if (!promoCode.trim() || !booking) return;

    setPromoError(null);
    setPromoSuccess(null);

    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/trpc/promos.validate?input=${encodeURIComponent(
          JSON.stringify({
            code: promoCode.trim().toUpperCase(),
            eventId: booking.eventId,
            quantity: booking.seats,
          })
        )}`
      );

      const data = await response.json();
      const result = data.result?.data;

      if (result?.valid) {
        setPromoSuccess(
          `Promo code applied! You'll save ${result.discountAmount ? formatINR(result.discountAmount) : "some amount"}`
        );
      } else {
        setPromoError(result?.reason || "Invalid promo code");
      }
    } catch (err) {
      setPromoError(
        err instanceof Error ? err.message : "Failed to validate promo code"
      );
    }
  }

  async function handleSimulatePayment() {
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
  }

  if (!booking) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </View>
    );
  }

  const minutesRemaining = Math.floor(timeRemaining / 60000);
  const secondsRemaining = Math.floor((timeRemaining % 60000) / 1000);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Complete Your Booking</Text>

        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>Your seats are on hold for:</Text>
          <Text style={styles.timerValue}>
            {minutesRemaining}:{secondsRemaining.toString().padStart(2, "0")}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Event</Text>
            <Text style={styles.detailValue}>{booking.event.title}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>
              {new Date(booking.event.date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Venue</Text>
            <Text style={styles.detailValue}>
              {booking.event.venue}, {booking.event.city}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Seats</Text>
            <Text style={styles.detailValue}>{booking.seats}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Ticket Number</Text>
            <Text style={styles.detailValue}>{booking.ticketNumber}</Text>
          </View>
        </View>

        {booking.status === "PENDING" && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Have a Promo Code?</Text>
            <View style={styles.promoInputContainer}>
              <TextInput
                style={styles.promoInput}
                value={promoCode}
                onChangeText={(text) => setPromoCode(text.toUpperCase())}
                placeholder="Enter promo code"
                maxLength={50}
                autoCapitalize="characters"
              />
              <TouchableOpacity
                style={[
                  styles.promoButton,
                  !promoCode.trim() && styles.promoButtonDisabled,
                ]}
                onPress={handleValidatePromo}
                disabled={!promoCode.trim()}
              >
                <Text style={styles.promoButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
            {promoError && (
              <Text style={styles.promoError}>{promoError}</Text>
            )}
            {promoSuccess && (
              <Text style={styles.promoSuccess}>{promoSuccess}</Text>
            )}
            <Text style={styles.promoNote}>
              Note: Promo code will be applied during payment processing
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amount Breakdown</Text>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>
              Subtotal ({booking.seats} × {formatINR(booking.event.price)})
            </Text>
            <Text style={styles.breakdownValue}>
              {formatINR(booking.event.price * booking.seats)}
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>
              {formatINR(booking.finalAmount)}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Status</Text>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusBadge,
                booking.status === "CONFIRMED"
                  ? styles.statusConfirmed
                  : booking.status === "PENDING"
                    ? styles.statusPending
                    : styles.statusCancelled,
              ]}
            >
              <Text style={styles.statusText}>{booking.status}</Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                booking.paymentStatus === "COMPLETED"
                  ? styles.statusConfirmed
                  : booking.paymentStatus === "PENDING"
                    ? styles.statusPending
                    : styles.statusCancelled,
              ]}
            >
              <Text style={styles.statusText}>
                Payment: {booking.paymentStatus}
              </Text>
            </View>
          </View>
        </View>

        {booking.status === "PENDING" && (
          <View style={styles.section}>
            {error && (
              <View style={styles.errorCard}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.paymentButton,
                isProcessing && styles.paymentButtonDisabled,
              ]}
              onPress={handleSimulatePayment}
              disabled={isProcessing}
            >
              <Text style={styles.paymentButtonText}>
                {isProcessing ? "Processing..." : "Simulate Payment Success"}
              </Text>
            </TouchableOpacity>

            <Text style={styles.paymentNote}>
              In production, this would show Razorpay payment options
            </Text>
          </View>
        )}

        {booking.status === "CONFIRMED" && (
          <View style={styles.successCard}>
            <Text style={styles.successText}>
              Payment successful! Redirecting to confirmation page...
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
  },
  content: {
    padding: 16,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: "#0066cc",
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 24,
  },
  timerCard: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fbbf24",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    alignItems: "center",
  },
  timerLabel: {
    fontSize: 14,
    color: "#92400e",
    marginBottom: 8,
  },
  timerValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#92400e",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 14,
    color: "#000",
    flex: 1,
    textAlign: "right",
  },
  promoInputContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  promoInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: "monospace",
  },
  promoButton: {
    backgroundColor: "#0066cc",
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  promoButtonDisabled: {
    backgroundColor: "#ccc",
  },
  promoButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  promoError: {
    fontSize: 14,
    color: "#dc2626",
    marginBottom: 8,
  },
  promoSuccess: {
    fontSize: 14,
    color: "#16a34a",
    marginBottom: 8,
  },
  promoNote: {
    fontSize: 12,
    color: "#666",
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  breakdownLabel: {
    fontSize: 14,
    color: "#666",
  },
  breakdownValue: {
    fontSize: 14,
    color: "#000",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  statusContainer: {
    flexDirection: "row",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusConfirmed: {
    backgroundColor: "#dcfce7",
  },
  statusPending: {
    backgroundColor: "#fef3c7",
  },
  statusCancelled: {
    backgroundColor: "#fee2e2",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  errorCard: {
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fca5a5",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: "#991b1b",
  },
  paymentButton: {
    backgroundColor: "#0066cc",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  paymentButtonDisabled: {
    backgroundColor: "#ccc",
  },
  paymentButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  paymentNote: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
  },
  successCard: {
    backgroundColor: "#dcfce7",
    borderWidth: 1,
    borderColor: "#86efac",
    borderRadius: 8,
    padding: 16,
  },
  successText: {
    fontSize: 14,
    color: "#166534",
    fontWeight: "600",
  },
});
