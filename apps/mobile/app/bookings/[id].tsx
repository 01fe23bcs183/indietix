import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Share,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { trpc } from "../../lib/trpc";
import { useEffect, useState, useRef } from "react";
import {
  getCachedTicket,
  cacheTicket,
  type CachedTicket,
} from "../../utils/TicketCache";
import QRCode from "react-native-qrcode-svg";
import * as Calendar from "expo-calendar";
import * as Sharing from "expo-sharing";
import * as Haptics from "expo-haptics";
import { captureRef } from "react-native-view-shot";
import { Analytics } from "../../lib/analytics";

export default function TicketDetail(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [cachedTicket, setCachedTicket] = useState<CachedTicket | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const qrCodeRef = useRef<View>(null);

  const {
    data: booking,
    isLoading,
    error,
  } = trpc.booking.get.useQuery(
    { bookingId: id! },
    {
      enabled: !!id,
      onError: async () => {
        console.log("Failed to fetch booking, loading from cache");
        setIsOffline(true);
        const cached = await getCachedTicket(id!);
        setCachedTicket(cached);
      },
      onSuccess: async (data) => {
        if (data.status === "CONFIRMED" && data.qrCode) {
          try {
            const ticketToCache: CachedTicket = {
              payload: {
                bookingId: data.id,
                userId: data.userId,
                eventId: data.eventId,
                timestamp: Date.now(),
              },
              signature: data.ticketPayloadHash || "",
              meta: {
                eventTitle: data.event.title,
                eventDate: new Date(data.event.startTime).toLocaleDateString(),
                venue: data.event.venue,
                city: data.event.city,
                ticketNumber: data.id.slice(0, 8).toUpperCase(),
                seats: data.seats,
                cachedAt: Date.now(),
              },
            };
            await cacheTicket(data.id, ticketToCache);
          } catch (error) {
            console.error("Failed to cache ticket:", error);
          }
        }
      },
    }
  );

  useEffect(() => {
    if (id) {
      loadCachedTicket();
      Analytics.openTicket(id, "");
    }
  }, [id]);

  useEffect(() => {
    const updateTimestamp = () => {
      if (cachedTicket?.meta.cachedAt) {
        const minutesAgo = Math.floor(
          (Date.now() - cachedTicket.meta.cachedAt) / 60000
        );
        if (minutesAgo < 1) {
          setLastUpdated("Updated just now");
        } else if (minutesAgo < 60) {
          setLastUpdated(`Updated ${minutesAgo} minute${minutesAgo === 1 ? "" : "s"} ago`);
        } else {
          const hoursAgo = Math.floor(minutesAgo / 60);
          setLastUpdated(`Updated ${hoursAgo} hour${hoursAgo === 1 ? "" : "s"} ago`);
        }
      }
    };

    updateTimestamp();
    const interval = setInterval(updateTimestamp, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [cachedTicket]);

  async function loadCachedTicket() {
    const cached = await getCachedTicket(id!);
    setCachedTicket(cached);
  }

  async function handleShareTicket() {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      if (!qrCodeRef.current) {
        Alert.alert("Error", "Unable to capture QR code");
        return;
      }

      const uri = await captureRef(qrCodeRef.current, {
        format: "png",
        quality: 1,
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: `Share ${ticketData.event.title} Ticket`,
        });
      } else {
        await Share.share({
          message: `My ticket for ${ticketData.event.title}\nBooking ID: ${ticketData.id.slice(0, 8).toUpperCase()}\nDate: ${typeof ticketData.event.startTime === "string" ? ticketData.event.startTime : new Date(ticketData.event.startTime).toLocaleDateString()}\nVenue: ${ticketData.event.venue}, ${ticketData.event.city}`,
        });
      }
      
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Error sharing ticket:", error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to share ticket. Please try again.");
    }
  }

  async function handleAddToCalendar() {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Calendar permission is required to add events"
        );
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(
        Calendar.EntityTypes.EVENT
      );
      const defaultCalendar =
        calendars.find((cal) => cal.allowsModifications) || calendars[0];

      if (!defaultCalendar) {
        Alert.alert("Error", "No calendar available");
        return;
      }

      const eventDate =
        typeof ticketData.event.startTime === "string"
          ? new Date(ticketData.event.startTime)
          : new Date(ticketData.event.startTime);

      const endDate = new Date(eventDate);
      endDate.setHours(endDate.getHours() + 3);

      const eventId = await Calendar.createEventAsync(defaultCalendar.id, {
        title: ticketData.event.title,
        startDate: eventDate,
        endDate: endDate,
        location: `${ticketData.event.venue}, ${ticketData.event.city}`,
        notes: `Booking ID: ${ticketData.id.slice(0, 8).toUpperCase()}\nTickets: ${ticketData.seats}`,
        alarms: [{ relativeOffset: -60 }, { relativeOffset: -1440 }],
      });

      if (eventId) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Success", "Event added to your calendar!");
      }
    } catch (error) {
      console.error("Error adding to calendar:", error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Error",
        "Failed to add event to calendar. Please try again."
      );
    }
  }

  function handleTransferTicket() {
    Alert.alert(
      "Transfer Ticket",
      "Enter the email address of the person you want to transfer this ticket to:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Transfer",
          onPress: () => {
            Alert.alert("Info", "Ticket transfer feature coming soon");
          },
        },
      ]
    );
  }

  function handleCancelBooking() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    Alert.alert(
      "Cancel Booking",
      "Are you sure you want to cancel this booking? This action cannot be undone.",
      [
        { text: "No", style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: () => {
            Alert.alert("Info", "Cancellation feature coming soon");
          },
        },
      ]
    );
  }

  if (isLoading && !cachedTicket) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading ticket...</Text>
      </View>
    );
  }

  if (error && !cachedTicket) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Ticket Not Found</Text>
        <Text style={styles.errorText}>
          Unable to load ticket. Please check your connection.
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const ticketData = booking || {
    id: id!,
    event: {
      title: cachedTicket?.meta.eventTitle || "Event",
      startTime: cachedTicket?.meta.eventDate || "",
      venue: cachedTicket?.meta.venue || "",
      city: cachedTicket?.meta.city || "",
    },
    seats: cachedTicket?.meta.seats || 1,
    status: "CONFIRMED",
    qrCode: cachedTicket ? JSON.stringify(cachedTicket) : "",
  };

  const qrData =
    booking?.qrCode || (cachedTicket ? JSON.stringify(cachedTicket) : "");

  return (
    <ScrollView style={styles.container}>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            📱 Offline Mode - Showing cached ticket
          </Text>
          {lastUpdated && (
            <Text style={styles.offlineTimestamp}>{lastUpdated}</Text>
          )}
        </View>
      )}

      <View style={styles.ticketCard}>
        <View style={styles.ticketHeader}>
          <Text style={styles.eventTitle}>{ticketData.event.title}</Text>
          <View
            style={[
              styles.statusBadge,
              ticketData.status === "CONFIRMED" && styles.statusConfirmed,
              ticketData.status === "PENDING" && styles.statusPending,
            ]}
          >
            <Text style={styles.statusText}>{ticketData.status}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.eventDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date</Text>
            <Text style={styles.detailValue}>
              {typeof ticketData.event.startTime === "string"
                ? ticketData.event.startTime
                : new Date(ticketData.event.startTime).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Venue</Text>
            <Text style={styles.detailValue}>{ticketData.event.venue}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>City</Text>
            <Text style={styles.detailValue}>{ticketData.event.city}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Tickets</Text>
            <Text style={styles.detailValue}>
              {ticketData.seats} {ticketData.seats === 1 ? "ticket" : "tickets"}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Booking ID</Text>
            <Text style={styles.detailValue}>
              {ticketData.id.slice(0, 8).toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {qrData && (
          <View style={styles.qrContainer}>
            <Text style={styles.qrTitle}>Your Ticket QR Code</Text>
            <View 
              style={styles.qrCodeWrapper} 
              ref={qrCodeRef}
              accessibilityLabel="Ticket QR code"
              accessibilityHint="Show this QR code at the venue entrance for scanning"
            >
              <QRCode value={qrData} size={200} />
            </View>
            <Text style={styles.qrInstructions}>
              Show this QR code at the venue entrance
            </Text>
          </View>
        )}
      </View>

      {ticketData.status === "CONFIRMED" && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAddToCalendar}
            accessibilityLabel="Add event to calendar"
            accessibilityHint="Adds this event to your device calendar with reminders"
            accessibilityRole="button"
          >
            <Text style={styles.actionButtonText}>📅 Add to Calendar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleShareTicket}
            accessibilityLabel="Share ticket"
            accessibilityHint="Share your ticket QR code with others"
            accessibilityRole="button"
          >
            <Text style={styles.actionButtonText}>📤 Share Ticket</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleTransferTicket}
            accessibilityLabel="Transfer ticket"
            accessibilityHint="Transfer this ticket to another person"
            accessibilityRole="button"
          >
            <Text style={styles.actionButtonText}>🔄 Transfer Ticket</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={handleCancelBooking}
            accessibilityLabel="Cancel booking"
            accessibilityHint="Cancel this booking and request a refund"
            accessibilityRole="button"
          >
            <Text style={[styles.actionButtonText, styles.cancelButtonText]}>
              ❌ Cancel Booking
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#000",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "#0066cc",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  offlineBanner: {
    backgroundColor: "#fff3cd",
    padding: 12,
    alignItems: "center",
  },
  offlineBannerText: {
    fontSize: 14,
    color: "#856404",
    fontWeight: "600",
  },
  offlineTimestamp: {
    fontSize: 12,
    color: "#856404",
    marginTop: 4,
  },
  ticketCard: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ticketHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  eventTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusConfirmed: {
    backgroundColor: "#e8f5e9",
  },
  statusPending: {
    backgroundColor: "#fff3e0",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000",
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginVertical: 16,
  },
  eventDetails: {
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
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  qrContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  qrCodeWrapper: {
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#e0e0e0",
  },
  qrInstructions: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginTop: 16,
  },
  actions: {
    padding: 16,
  },
  actionButton: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  cancelButton: {
    borderColor: "#ff3b30",
  },
  cancelButtonText: {
    color: "#ff3b30",
  },
});
