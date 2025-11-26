import AsyncStorage from "@react-native-async-storage/async-storage";

export interface CachedNotification {
  id: string;
  type: "event_reminder" | "waitlist_offer" | "booking_confirmed" | "general";
  title: string;
  body: string;
  data?: Record<string, unknown>;
  receivedAt: number;
  read: boolean;
}

const NOTIFICATION_CACHE_KEY = "notifications_inbox";
const MAX_NOTIFICATIONS = 20;

export async function saveNotification(
  notification: Omit<CachedNotification, "receivedAt" | "read">
): Promise<void> {
  try {
    const existing = await getNotifications();
    const newNotification: CachedNotification = {
      ...notification,
      receivedAt: Date.now(),
      read: false,
    };

    const updated = [newNotification, ...existing].slice(0, MAX_NOTIFICATIONS);
    await AsyncStorage.setItem(NOTIFICATION_CACHE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to save notification:", error);
  }
}

export async function getNotifications(): Promise<CachedNotification[]> {
  try {
    const cached = await AsyncStorage.getItem(NOTIFICATION_CACHE_KEY);
    if (!cached) {
      return [];
    }
    return JSON.parse(cached) as CachedNotification[];
  } catch (error) {
    console.error("Failed to get notifications:", error);
    return [];
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    const notifications = await getNotifications();
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    await AsyncStorage.setItem(NOTIFICATION_CACHE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
  }
}

export async function clearAllNotifications(): Promise<void> {
  try {
    await AsyncStorage.removeItem(NOTIFICATION_CACHE_KEY);
  } catch (error) {
    console.error("Failed to clear notifications:", error);
  }
}

export async function getUnreadCount(): Promise<number> {
  try {
    const notifications = await getNotifications();
    return notifications.filter((n) => !n.read).length;
  } catch (error) {
    console.error("Failed to get unread count:", error);
    return 0;
  }
}
