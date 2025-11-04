import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { trpc } from "../../lib/trpc";
import { useEffect, useState } from "react";
import {
  getAllCachedTickets,
  type CachedTicket,
} from "../../utils/TicketCache";

interface BookingItem {
  id: string;
  eventTitle: string;
  eventDate: string;
  venue: string;
  city: string;
  seats: number;
  status: string;
  isCached?: boolean;
}

export default function Bookings(): JSX.Element {
  const router = useRouter();
  const [cachedTickets, setCachedTickets] = useState<
    Array<{ bookingId: string; ticket: CachedTicket }>
  >([]);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const {
    data: bookings,
    isLoading,
    refetch,
  } = trpc.booking.list.useQuery(undefined, {
    onError: () => {
      console.log("Failed to fetch bookings, using cached tickets only");
    },
  });

  useEffect(() => {
    loadCachedTickets();
  }, []);

  async function loadCachedTickets() {
    const cached = await getAllCachedTickets();
    setCachedTickets(cached);
  }

  const allBookings: BookingItem[] = [
    ...(bookings?.map((b) => ({
      id: b.id,
      eventTitle: b.event.title,
      eventDate: new Date(b.event.startTime).toLocaleDateString(),
      venue: b.event.venue,
      city: b.event.city,
      seats: b.seats,
      status: b.status,
      isCached: false,
    })) || []),
    ...cachedTickets
      .filter((ct) => !bookings?.some((b) => b.id === ct.bookingId))
      .map((ct) => ({
        id: ct.bookingId,
        eventTitle: ct.ticket.meta.eventTitle,
        eventDate: ct.ticket.meta.eventDate,
        venue: ct.ticket.meta.venue,
        city: ct.ticket.meta.city,
        seats: ct.ticket.meta.seats,
        status: "CONFIRMED",
        isCached: true,
      })),
  ];

  const filteredBookings = statusFilter
    ? allBookings.filter((b) => b.status === statusFilter)
    : allBookings;

  function renderBooking({ item }: { item: BookingItem }) {
    return (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => router.push(`/bookings/${item.id}`)}
      >
        <View style={styles.bookingHeader}>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {item.eventTitle}
          </Text>
          {item.isCached && (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineBadgeText}>📱 Offline</Text>
            </View>
          )}
        </View>

        <View style={styles.bookingDetails}>
          <Text style={styles.detailText}>📅 {item.eventDate}</Text>
          <Text style={styles.detailText}>
            📍 {item.venue}, {item.city}
          </Text>
          <Text style={styles.detailText}>
            🎫 {item.seats} {item.seats === 1 ? "ticket" : "tickets"}
          </Text>
        </View>

        <View style={styles.bookingFooter}>
          <View
            style={[
              styles.statusBadge,
              item.status === "CONFIRMED" && styles.statusConfirmed,
              item.status === "PENDING" && styles.statusPending,
              item.status === "CANCELLED" && styles.statusCancelled,
            ]}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          <Text style={styles.viewTicket}>View Ticket →</Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (isLoading && cachedTickets.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading your tickets...</Text>
      </View>
    );
  }

  if (allBookings.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyIcon}>🎫</Text>
        <Text style={styles.emptyTitle}>No Tickets Yet</Text>
        <Text style={styles.emptyText}>
          Your booked tickets will appear here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, !statusFilter && styles.filterButtonActive]}
          onPress={() => setStatusFilter(null)}
        >
          <Text style={[styles.filterButtonText, !statusFilter && styles.filterButtonTextActive]}>
            All ({allBookings.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, statusFilter === "CONFIRMED" && styles.filterButtonActive]}
          onPress={() => setStatusFilter("CONFIRMED")}
        >
          <Text style={[styles.filterButtonText, statusFilter === "CONFIRMED" && styles.filterButtonTextActive]}>
            Confirmed ({allBookings.filter((b) => b.status === "CONFIRMED").length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, statusFilter === "ATTENDED" && styles.filterButtonActive]}
          onPress={() => setStatusFilter("ATTENDED")}
        >
          <Text style={[styles.filterButtonText, statusFilter === "ATTENDED" && styles.filterButtonTextActive]}>
            Attended ({allBookings.filter((b) => b.status === "ATTENDED").length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, statusFilter === "CANCELLED" && styles.filterButtonActive]}
          onPress={() => setStatusFilter("CANCELLED")}
        >
          <Text style={[styles.filterButtonText, statusFilter === "CANCELLED" && styles.filterButtonTextActive]}>
            Cancelled ({allBookings.filter((b) => b.status === "CANCELLED").length})
          </Text>
        </TouchableOpacity>
      </View>

      {filteredBookings.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyIcon}>🎫</Text>
          <Text style={styles.emptyTitle}>No {statusFilter} Tickets</Text>
          <Text style={styles.emptyText}>
            You don't have any {statusFilter?.toLowerCase()} tickets
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredBookings}
          renderItem={renderBooking}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => {
                refetch();
                loadCachedTickets();
              }}
            />
          }
        />
      )}
    </View>
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
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#000",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  filterContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  filterButtonActive: {
    backgroundColor: "#0066cc",
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  filterButtonTextActive: {
    color: "#fff",
  },
  listContent: {
    padding: 16,
  },
  bookingCard: {
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
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    flex: 1,
    marginRight: 8,
  },
  offlineBadge: {
    backgroundColor: "#f0f0f0",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  offlineBadgeText: {
    fontSize: 12,
    color: "#666",
  },
  bookingDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  bookingFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  statusCancelled: {
    backgroundColor: "#ffebee",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000",
  },
  viewTicket: {
    fontSize: 14,
    color: "#0066cc",
    fontWeight: "600",
  },
});
