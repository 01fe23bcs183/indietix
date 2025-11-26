import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { saveNotification } from "./notificationCache";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Failed to get push token for push notification!");
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    return token;
  } catch (error) {
    console.error("Error registering for push notifications:", error);
    return null;
  }
}

export async function registerPushTokenWithBackend(
  token: string,
  userId: string
): Promise<void> {
  try {
    console.log("Registering push token with backend:", { token, userId });
  } catch (error) {
    console.error("Error registering push token with backend:", error);
  }
}

export function setupNotificationListeners(
  // eslint-disable-next-line no-unused-vars
  onNotificationReceived?: (notification: Notifications.Notification) => void,

  onNotificationResponse?: (
    // eslint-disable-next-line no-unused-vars
    response: Notifications.NotificationResponse
  ) => void
): () => void {
  const receivedSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      saveNotification({
        id: notification.request.identifier,
        type:
          (notification.request.content.data?.type as
            | "event_reminder"
            | "waitlist_offer"
            | "booking_confirmed"
            | "general") || "general",
        title: notification.request.content.title || "Notification",
        body: notification.request.content.body || "",
        data: notification.request.content.data as Record<string, unknown>,
      });

      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    }
  );

  const responseSubscription =
    Notifications.addNotificationResponseReceivedListener((response) => {
      saveNotification({
        id: response.notification.request.identifier,
        type:
          (response.notification.request.content.data?.type as
            | "event_reminder"
            | "waitlist_offer"
            | "booking_confirmed"
            | "general") || "general",
        title: response.notification.request.content.title || "Notification",
        body: response.notification.request.content.body || "",
        data: response.notification.request.content.data as Record<
          string,
          unknown
        >,
      });

      if (onNotificationResponse) {
        onNotificationResponse(response);
      }
    });

  return () => {
    receivedSubscription.remove();
    responseSubscription.remove();
  };
}

export function getDeepLinkFromNotification(
  notification: Notifications.Notification | Notifications.NotificationResponse
): string | null {
  const data =
    "notification" in notification
      ? notification.notification.request.content.data
      : notification.request.content.data;

  if (!data) return null;

  const type = data.type as string;

  switch (type) {
    case "event_reminder":
      return data.eventSlug ? `indietix://event/${data.eventSlug}` : null;
    case "waitlist_offer":
      return data.offerId ? `indietix://waitlist/claim/${data.offerId}` : null;
    case "booking_confirmed":
      return data.bookingId ? `indietix://bookings/${data.bookingId}` : null;
    default:
      return null;
  }
}
