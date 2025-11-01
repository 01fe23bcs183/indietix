import { router } from "./trpc";
import { healthRouter } from "./routers/health";
import { authRouter } from "./routers/auth";
import { eventsRouter } from "./routers/events";

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  events: eventsRouter,
});

export type AppRouter = typeof appRouter;
export { router, publicProcedure } from "./trpc";
export { hashPassword, verifyPassword } from "./lib/auth";
