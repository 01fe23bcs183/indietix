import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { trpc } from "../../lib/trpc";
import { formatINR, computeBookingAmounts } from "@indietix/utils";
import { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

export default function EventDetail(): JSX.Element {
  const params = useLocalSearchParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [quantity, setQuantity] = useState(1);
  const [isBooking, setIsBooking] = useState(false);
  const { user } = useAuth();

  const { data: event, isLoading } = trpc.events.getBySlug.useQuery({
    slug,
  });

  const { data: effectivePrice } = trpc.pricing.effectivePrice.useQuery(
    { eventId: event?.id || "", now: new Date() },
    { enabled: !!event?.id }
  );

  const startBooking = trpc.booking.start.useMutation();

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading event...</Text>
      </View>
    );
  }

  if (!event) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Event Not Found</Text>
        <TouchableOpacity style={styles.button} onPress={() => router.back()}>
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const seatsLeft = event.totalSeats - event.bookedSeats;
  const isSoldOut = seatsLeft <= 0;
  const currentPrice = effectivePrice?.effectivePrice || event.price;

  // Use computeBookingAmounts for consistent fee calculation
  const bookingAmounts = computeBookingAmounts(currentPrice, quantity);
  const ticketPrice = bookingAmounts.subtotal;
  const convenienceFee =
    (bookingAmounts.breakdown?.paymentGateway ?? 0) +
    (bookingAmounts.breakdown?.serverMaintenance ?? 0);
  const platformFee = bookingAmounts.breakdown?.platformSupport ?? 0;
  const gst = bookingAmounts.gst;
  const finalAmount = bookingAmounts.finalAmount;

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${event.venue}, ${event.city}`
  )}`;

  async function handleBookNow() {
    if (!event) return;

    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to book tickets", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign In", onPress: () => router.push("/auth/signin") },
      ]);
      return;
    }

    if (isSoldOut) {
      router.push(`/waitlist/${event.id}`);
      return;
    }

    setIsBooking(true);
    try {
      const result = await startBooking.mutateAsync({
        eventId: event.id,
        quantity,
        userId: user.id,
      });

      router.push(`/checkout/${result.bookingId}`);
    } catch (error) {
      Alert.alert(
        "Booking Failed",
        error instanceof Error ? error.message : "Failed to start booking",
        [{ text: "OK" }]
      );
    } finally {
      setIsBooking(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.heroImage}>
        <Text style={styles.heroEmoji}>🎉</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{event.title}</Text>

        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📅</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Date & Time</Text>
              <Text style={styles.infoText}>
                {new Date(event.date).toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <Text style={styles.infoText}>
                {new Date(event.date).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>📍</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Venue</Text>
              <Text style={styles.infoText}>{event.venue}</Text>
              <Text style={styles.infoText}>{event.city}</Text>
              <TouchableOpacity onPress={() => Linking.openURL(mapUrl)}>
                <Text style={styles.mapLink}>View on Google Maps →</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoIcon}>🎭</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Category</Text>
              <Text style={styles.infoText}>
                {event.category.charAt(0) +
                  event.category.slice(1).toLowerCase()}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This Event</Text>
          <Text style={styles.description}>{event.description}</Text>
        </View>

        <View style={styles.organizerCard}>
          <Text style={styles.sectionTitle}>Organizer</Text>
          <View style={styles.organizerInfo}>
            <View style={styles.organizerAvatar}>
              <Text style={styles.organizerEmoji}>🏢</Text>
            </View>
            <View style={styles.organizerDetails}>
              <Text style={styles.organizerName}>
                {event.organizer.businessName}
              </Text>
              {event.organizer.verified && (
                <Text style={styles.verifiedBadge}>✓ Verified</Text>
              )}
              {event.organizer.description && (
                <Text style={styles.organizerDescription}>
                  {event.organizer.description}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.bookingCard}>
          <Text style={styles.sectionTitle}>Book Tickets</Text>

          <View style={styles.priceSection}>
            <Text style={styles.priceLabel}>Ticket Price</Text>
            {effectivePrice?.activePhase ? (
              <View>
                <View style={styles.priceRow}>
                  <Text style={styles.discountedPrice}>
                    {formatINR(effectivePrice.effectivePrice)}
                  </Text>
                  <Text style={styles.originalPrice}>
                    {formatINR(event.price)}
                  </Text>
                </View>
                <View style={styles.phaseBadge}>
                  <Text style={styles.phaseBadgeText}>
                    {effectivePrice.activePhase.name}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.price}>{formatINR(event.price)}</Text>
            )}
          </View>

          {!isSoldOut && (
            <>
              <Text style={styles.quantityLabel}>Number of Tickets</Text>
              <View style={styles.quantitySelector}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Text style={styles.quantityButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => setQuantity(Math.min(10, quantity + 1))}
                  disabled={quantity >= 10}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.priceBreakdown}>
                <Text style={styles.breakdownTitle}>Price Breakdown</Text>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>
                    Ticket Price × {quantity}
                  </Text>
                  <Text style={styles.breakdownValue}>
                    {formatINR(ticketPrice)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Convenience Fee</Text>
                  <Text style={styles.breakdownValue}>
                    {formatINR(convenienceFee)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Platform Fee</Text>
                  <Text style={styles.breakdownValue}>
                    {formatINR(platformFee)}
                  </Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>GST (18%)</Text>
                  <Text style={styles.breakdownValue}>{formatINR(gst)}</Text>
                </View>
                <View style={[styles.breakdownRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total Amount</Text>
                  <Text style={styles.totalValue}>
                    {formatINR(finalAmount)}
                  </Text>
                </View>
              </View>
            </>
          )}

          <TouchableOpacity
            style={[
              styles.bookButton,
              isSoldOut && styles.soldOutButton,
              isBooking && styles.bookButtonDisabled,
            ]}
            onPress={handleBookNow}
            disabled={isBooking}
          >
            {isBooking ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.bookButtonText}>
                {isSoldOut ? "Join Waitlist" : "Book Now"}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={styles.seatsInfo}>
            {isSoldOut
              ? "Event is sold out"
              : `${seatsLeft} of ${event.totalSeats} seats available`}
          </Text>
        </View>
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
  },
  heroImage: {
    height: 200,
    backgroundColor: "#e8f0fe",
    justifyContent: "center",
    alignItems: "center",
  },
  heroEmoji: {
    fontSize: 72,
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
  infoSection: {
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 20,
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  mapLink: {
    fontSize: 14,
    color: "#0066cc",
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
  },
  organizerCard: {
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
  organizerInfo: {
    flexDirection: "row",
  },
  organizerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#e8f0fe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  organizerEmoji: {
    fontSize: 28,
  },
  organizerDetails: {
    flex: 1,
  },
  organizerName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  verifiedBadge: {
    fontSize: 14,
    color: "#0066cc",
    marginBottom: 4,
  },
  organizerDescription: {
    fontSize: 14,
    color: "#666",
  },
  bookingCard: {
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
  priceSection: {
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  price: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  discountedPrice: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#22c55e",
  },
  originalPrice: {
    fontSize: 20,
    color: "#999",
    textDecorationLine: "line-through",
  },
  phaseBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  phaseBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16a34a",
  },
  quantityLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },
  quantitySelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  quantityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#e8f0fe",
    justifyContent: "center",
    alignItems: "center",
  },
  quantityButtonText: {
    fontSize: 24,
    color: "#0066cc",
    fontWeight: "600",
  },
  quantityText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000",
    marginHorizontal: 32,
  },
  priceBreakdown: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
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
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  totalValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
  },
  bookButton: {
    backgroundColor: "#0066cc",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  soldOutButton: {
    backgroundColor: "#f59e0b",
  },
  bookButtonDisabled: {
    backgroundColor: "#ccc",
  },
  bookButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  seatsInfo: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
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
