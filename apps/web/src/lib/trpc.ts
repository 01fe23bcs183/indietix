import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@indietix/api";

export const trpc = createTRPCReact<AppRouter>();
