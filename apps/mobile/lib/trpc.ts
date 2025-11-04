import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@indietix/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const trpc = createTRPCReact<AppRouter>();

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: `${API_URL}/api/trpc`,
      async headers() {
        const token = await AsyncStorage.getItem("auth_token");
        return {
          authorization: token ? `Bearer ${token}` : "",
        };
      },
    }),
  ],
});
