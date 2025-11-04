import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { trpc } from "../../../lib/trpc";
import { formatINR } from "@indietix/utils";
import { useAuth } from "../../../contexts/AuthContext";

export default function WaitlistClaim(): JSX.Element {
  const params = useLocalSearchParams();
  const router = useRouter();
  const offerId = params.offerId as string;
  const { user } = useAuth();

  const [isClaiming, setIsClaiming] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const { data: offer, isLoading } = trpc.waitlist.getOffer.useQuery({
    offerId,
  });

  const claimOffer = trpc.waitlist.claim.useMutation();
  const startBooking = trpc.booking.start.useMutation();

  useEffect(() => {
    if (!offer) return;

    const expiresAt = new Date(offer.expiresAt);
    const updateTimer = () => {
      const now = new Date();
      const remaining = Math.max(0, expiresAt.getTime() - now.getTime());
      setTimeRemaining(remaining);

      if (remaining === 0) {
        Alert.alert(
          "Offer Expired",
          "This waitlist offer has expired. Please check for new offers.",
          [{ text: "OK", onPress: () => router.back() }]
        );
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [offer, router]);

  async function handleClaimOffer() {
    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to claim this offer", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/auth/signin") },
      ]);
      return;
    }

    setIsClaiming(true);
    try {
      const claimResult = await claimOffer.mutateAsync({
        offerId,
      });

      const bookingResult = await startBooking.mutateAsync({
        eventId: claimResult.eventId,
        quantity: claimResult.quantity,
        userId: user.id,
      });

      router.replace(`/checkout/${bookingResult.bookingId}`);
    } catch (error) {
      Alert.alert(
        "Failed to Claim Offer",
        error instanceof Error ? error.message : "Please try again",
        [{ text: "OK" }]
      );
    } finally {
      setIsClaiming(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading offer...</Text>
      </View>
    );
  }

  if (!offer) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Offer Not Found</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (offer.status !== "PENDING") {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Offer No Longer Available</Text>
        <Text style={styles.errorText}>
          This offer has been {offer.status.toLowerCase()}.
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
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

        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🎉</Text>
        </View>

        <Text style={styles.title}>Waitlist Offer Available!</Text>

        <View style={styles.timerCard}>
          <Text style={styles.timerLabel}>Offer expires in:</Text>
          <Text style={styles.timerValue}>
            {minutesRemaining}:{secondsRemaining.toString().padStart(2, "0")}
          </Text>
        </View>

        <View style={styles.eventCard}>
          <Text style={styles.eventTitle}>{offer.event.title}</Text>
          <Text style={styles.eventDate}>
            📅{" "}
            {new Date(offer.event.date).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
          <Text style={styles.eventLocation}>
            📍 {offer.event.venue}, {offer.event.city}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Price per ticket:</Text>
            <Text style={styles.priceValue}>{formatINR(offer.event.price)}</Text>
          </View>
        </View>

        <View style={styles.offerCard}>
          <Text style={styles.offerTitle}>Your Offer</Text>
          <View style={styles.offerRow}>
            <Text style={styles.offerLabel}>Available Tickets:</Text>
            <Text style={styles.offerValue}>
              {offer.quantity} ticket{offer.quantity > 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.offerRow}>
            <Text style={styles.offerLabel}>Total Amount:</Text>
            <Text style={styles.offerValue}>
              {formatINR(offer.event.price * offer.quantity)}
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>⚠️ Important</Text>
          <Text style={styles.infoText}>
            • You must claim this offer within the time limit
          </Text>
          <Text style={styles.infoText}>
            • After claiming, you'll have 15 minutes to complete payment
          </Text>
          <Text style={styles.infoText}>
            • If you don't complete payment, the tickets will be released
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.claimButton, isClaiming && styles.claimButtonDisabled]}
          onPress={handleClaimOffer}
          disabled={isClaiming}
        >
          {isClaiming ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.claimButtonText}>Claim Offer & Proceed to Checkout</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
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
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#000",
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
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
  iconContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
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
  eventCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  eventDate: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  eventLocation: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceLabel: {
    fontSize: 14,
    color: "#666",
  },
  priceValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0066cc",
  },
  offerCard: {
    backgroundColor: "#dcfce7",
    borderWidth: 1,
    borderColor: "#86efac",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#166534",
    marginBottom: 12,
  },
  offerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  offerLabel: {
    fontSize: 14,
    color: "#166534",
  },
  offerValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#166534",
  },
  infoCard: {
    backgroundColor: "#e8f0fe",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  claimButton: {
    backgroundColor: "#0066cc",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  claimButtonDisabled: {
    backgroundColor: "#ccc",
  },
  claimButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  cancelButton: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  button: {
    backgroundColor: "#0066cc",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
