import { Stack, useRouter } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, trpcClient } from "../lib/trpc";
import { AuthProvider } from "../contexts/AuthContext";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { OfflineBanner } from "../components/OfflineBanner";
import { useEffect, useRef } from "react";
import {
  registerForPushNotifications,
  setupNotificationListeners,
  getDeepLinkFromNotification,
} from "../lib/pushNotifications";
import { initializeSentry } from "../lib/sentry";
import { initializeAnalytics } from "../lib/analytics";

const queryClient = new QueryClient();

initializeSentry();
initializeAnalytics();

function RootNavigator(): JSX.Element {
  const router = useRouter();
  const notificationListener = useRef<(() => void) | null>(null);

  useEffect(() => {
    registerForPushNotifications().then((token) => {
      if (token) {
        console.log("Push token:", token);
      }
    });

    notificationListener.current = setupNotificationListeners(
      (notification) => {
        console.log("Notification received:", notification);
      },
      (response) => {
        console.log("Notification tapped:", response);
        const deepLink = getDeepLinkFromNotification(response);
        if (deepLink) {
          const url = new URL(deepLink);
          const path = url.pathname;
          router.push(path as never);
        }
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current();
      }
    };
  }, []);

  return (
    <>
      <OfflineBanner />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/signin" options={{ title: "Sign In" }} />
        <Stack.Screen name="auth/signup" options={{ title: "Sign Up" }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="bookings/[id]" options={{ title: "Ticket" }} />
        <Stack.Screen name="events/[slug]" options={{ title: "Event" }} />
        <Stack.Screen
          name="waitlist/claim/[offerId]"
          options={{ title: "Claim Offer" }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout(): JSX.Element {
  return (
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}
