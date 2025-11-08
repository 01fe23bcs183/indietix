import PostHog from "posthog-react-native";

let posthogClient: PostHog | null = null;

export async function initializeAnalytics(): Promise<void> {
  try {
    const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY || "mock-key-for-ci";
    const host = process.env.EXPO_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";

    if (apiKey === "mock-key-for-ci") {
      console.log("PostHog: Using mock key for CI/development");
      return;
    }

    posthogClient = new PostHog(apiKey, {
      host,
    });

    console.log("PostHog initialized successfully");
  } catch (error) {
    console.error("Failed to initialize PostHog:", error);
  }
}

export function trackEvent(
  eventName: string,
  properties?: Record<string, any>
): void {
  try {
    if (posthogClient) {
      posthogClient.capture(eventName, properties);
    } else {
      console.log("PostHog event (not initialized):", eventName, properties);
    }
  } catch (error) {
    console.error("Failed to track event:", error);
  }
}

export function identifyUser(userId: string, traits?: Record<string, any>): void {
  try {
    if (posthogClient) {
      posthogClient.identify(userId, traits);
    } else {
      console.log("PostHog identify (not initialized):", userId, traits);
    }
  } catch (error) {
    console.error("Failed to identify user:", error);
  }
}

export function resetAnalytics(): void {
  try {
    if (posthogClient) {
      posthogClient.reset();
    }
  } catch (error) {
    console.error("Failed to reset analytics:", error);
  }
}

export const Analytics = {
  viewEvent: (eventId: string, eventSlug: string) => {
    trackEvent("view_event", { eventId, eventSlug });
  },

  addToCart: (eventId: string, quantity: number, price: number) => {
    trackEvent("add_to_cart", { eventId, quantity, price });
  },

  bookingConfirmed: (bookingId: string, eventId: string, amount: number) => {
    trackEvent("booking_confirmed", { bookingId, eventId, amount });
  },

  openTicket: (bookingId: string, eventId: string) => {
    trackEvent("open_ticket", { bookingId, eventId });
  },

  pushOpened: (notificationType: string, notificationId: string) => {
    trackEvent("push_opened", { notificationType, notificationId });
  },

  joinWaitlist: (eventId: string) => {
    trackEvent("join_waitlist", { eventId });
  },

  claimWaitlistOffer: (offerId: string, eventId: string) => {
    trackEvent("claim_waitlist_offer", { offerId, eventId });
  },
};
