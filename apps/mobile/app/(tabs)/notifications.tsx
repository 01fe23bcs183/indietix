import { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { trpc } from "../../lib/trpc";

interface NotificationItem {
  id: string;
  type: string;
  channel: string;
  category: string;
  payload: Record<string, unknown>;
  sentAt: string | null;
  readAt: string | null;
  campaignId: string | null;
}

export default function NotificationsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = trpc.inbox.list.useQuery();
  const { data: unreadCount, refetch: refetchCount } = trpc.inbox.unreadCount.useQuery();
  const readMutation = trpc.inbox.read.useMutation();
  const markAllReadMutation = trpc.inbox.markAllRead.useMutation();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    await refetchCount();
    setRefreshing(false);
  }, [refetch, refetchCount]);

  const handleMarkRead = async (notificationId: string) => {
    await readMutation.mutateAsync({ notificationId });
    refetch();
    refetchCount();
  };

  const handleMarkAllRead = async () => {
    await markAllReadMutation.mutateAsync();
    refetch();
    refetchCount();
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes("booking")) return "🎫";
    if (type.includes("event")) return "📅";
    if (type.includes("waitlist")) return "⏳";
    if (type.includes("refund")) return "💰";
    if (type.includes("announcement")) return "📢";
    return "📬";
  };

  const getNotificationTitle = (type: string, payload: Record<string, unknown>) => {
    if (payload.title) return payload.title as string;

    const titles: Record<string, string> = {
      booking_confirmed: "Booking Confirmed",
      booking_cancelled: "Booking Cancelled",
      refund_succeeded: "Refund Processed",
      waitlist_offer_created: "Waitlist Offer Available",
      event_reminder_T24: "Event Reminder",
      event_reminder_T2: "Event Starting Soon",
      admin_announcement: "Announcement",
      marketing_promo: "Special Offer",
    };

    return titles[type] || "Notification";
  };

  const getNotificationPreview = (type: string, payload: Record<string, unknown>) => {
    if (payload.message) return payload.message as string;
    if (payload.eventTitle) return `Event: ${payload.eventTitle}`;
    return "Tap to view details";
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const isUnread = !item.readAt;
    const payload = item.payload as Record<string, unknown>;

    return (
      <TouchableOpacity
        style={[styles.notificationItem, isUnread && styles.unreadItem]}
        onPress={() => {
          if (isUnread) {
            handleMarkRead(item.id);
          }
        }}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{getNotificationIcon(item.type)}</Text>
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, isUnread && styles.unreadTitle]}>
              {getNotificationTitle(item.type, payload)}
            </Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.preview} numberOfLines={2}>
            {getNotificationPreview(item.type, payload)}
          </Text>
          <Text style={styles.timestamp}>
            {item.sentAt ? new Date(item.sentAt).toLocaleString() : ""}
          </Text>
        </View>
        <View style={styles.channelBadge}>
          <Text style={styles.channelText}>{item.channel}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Inbox</Text>
          {unreadCount && unreadCount.count > 0 && (
            <Text style={styles.unreadCountText}>
              {unreadCount.count} unread
            </Text>
          )}
        </View>
        {unreadCount && unreadCount.count > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllRead}
            disabled={markAllReadMutation.isPending}
          >
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {!data?.items || data.items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptyText}>
            You&apos;re all caught up! Check back later for updates.
          </Text>
        </View>
      ) : (
        <FlatList
          data={data.items as NotificationItem[]}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6B7280",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  unreadCountText: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  markAllText: {
    fontSize: 14,
    color: "#374151",
  },
  listContent: {
    paddingVertical: 8,
  },
  notificationItem: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unreadItem: {
    backgroundColor: "#EFF6FF",
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  contentContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
    color: "#374151",
  },
  unreadTitle: {
    color: "#111827",
    fontWeight: "600",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3B82F6",
    marginLeft: 8,
  },
  preview: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  timestamp: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  channelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: "#E5E7EB",
    alignSelf: "flex-start",
  },
  channelText: {
    fontSize: 10,
    fontWeight: "500",
    color: "#374151",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
});
