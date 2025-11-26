import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  saveNotification,
  getNotifications,
  markNotificationAsRead,
  clearAllNotifications,
  getUnreadCount,
  type CachedNotification,
} from "../lib/notificationCache";

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe("NotificationCache", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("saveNotification", () => {
    it("should save a notification successfully", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      await saveNotification({
        id: "notif1",
        type: "event_reminder",
        title: "Event Reminder",
        body: "Your event starts in 2 hours",
        data: { eventId: "event123" },
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        "notifications_inbox",
        expect.stringContaining("notif1")
      );
    });

    it("should keep only last 20 notifications", async () => {
      const existingNotifications: CachedNotification[] = Array.from(
        { length: 20 },
        (_, i) => ({
          id: `notif${i}`,
          type: "general" as const,
          title: `Notification ${i}`,
          body: `Body ${i}`,
          receivedAt: Date.now() - i * 1000,
          read: false,
        })
      );

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(existingNotifications)
      );

      await saveNotification({
        id: "notif20",
        type: "event_reminder",
        title: "New Notification",
        body: "New body",
      });

      const savedData = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
      const savedNotifications = JSON.parse(savedData);

      expect(savedNotifications).toHaveLength(20);
      expect(savedNotifications[0].id).toBe("notif20");
    });
  });

  describe("getNotifications", () => {
    it("should retrieve all notifications", async () => {
      const mockNotifications: CachedNotification[] = [
        {
          id: "notif1",
          type: "event_reminder",
          title: "Event Reminder",
          body: "Your event starts soon",
          receivedAt: Date.now(),
          read: false,
        },
        {
          id: "notif2",
          type: "booking_confirmed",
          title: "Booking Confirmed",
          body: "Your booking is confirmed",
          receivedAt: Date.now() - 1000,
          read: true,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(mockNotifications)
      );

      const result = await getNotifications();

      expect(result).toEqual(mockNotifications);
    });

    it("should return empty array if no notifications", async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

      const result = await getNotifications();

      expect(result).toEqual([]);
    });

    it("should return empty array on error", async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(
        new Error("Storage error")
      );

      const result = await getNotifications();

      expect(result).toEqual([]);
    });
  });

  describe("markNotificationAsRead", () => {
    it("should mark a notification as read", async () => {
      const mockNotifications: CachedNotification[] = [
        {
          id: "notif1",
          type: "event_reminder",
          title: "Event Reminder",
          body: "Your event starts soon",
          receivedAt: Date.now(),
          read: false,
        },
        {
          id: "notif2",
          type: "booking_confirmed",
          title: "Booking Confirmed",
          body: "Your booking is confirmed",
          receivedAt: Date.now() - 1000,
          read: false,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(mockNotifications)
      );

      await markNotificationAsRead("notif1");

      const savedData = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
      const savedNotifications = JSON.parse(savedData);

      expect(savedNotifications[0].read).toBe(true);
      expect(savedNotifications[1].read).toBe(false);
    });
  });

  describe("clearAllNotifications", () => {
    it("should clear all notifications", async () => {
      await clearAllNotifications();

      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
        "notifications_inbox"
      );
    });
  });

  describe("getUnreadCount", () => {
    it("should return count of unread notifications", async () => {
      const mockNotifications: CachedNotification[] = [
        {
          id: "notif1",
          type: "event_reminder",
          title: "Event Reminder",
          body: "Your event starts soon",
          receivedAt: Date.now(),
          read: false,
        },
        {
          id: "notif2",
          type: "booking_confirmed",
          title: "Booking Confirmed",
          body: "Your booking is confirmed",
          receivedAt: Date.now() - 1000,
          read: true,
        },
        {
          id: "notif3",
          type: "general",
          title: "General",
          body: "General notification",
          receivedAt: Date.now() - 2000,
          read: false,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(mockNotifications)
      );

      const result = await getUnreadCount();

      expect(result).toBe(2);
    });

    it("should return 0 if no unread notifications", async () => {
      const mockNotifications: CachedNotification[] = [
        {
          id: "notif1",
          type: "event_reminder",
          title: "Event Reminder",
          body: "Your event starts soon",
          receivedAt: Date.now(),
          read: true,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(mockNotifications)
      );

      const result = await getUnreadCount();

      expect(result).toBe(0);
    });

    it("should return 0 on error", async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(
        new Error("Storage error")
      );

      const result = await getUnreadCount();

      expect(result).toBe(0);
    });
  });
});
