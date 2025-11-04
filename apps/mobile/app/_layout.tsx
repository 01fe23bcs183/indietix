import { Stack } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { trpc, trpcClient } from "../lib/trpc";
import { AuthProvider } from "../contexts/AuthContext";

const queryClient = new QueryClient();

export default function RootLayout(): JSX.Element {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="auth/signin" options={{ title: "Sign In" }} />
            <Stack.Screen name="auth/signup" options={{ title: "Sign Up" }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="bookings/[id]" options={{ title: "Ticket" }} />
          </Stack>
        </AuthProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
