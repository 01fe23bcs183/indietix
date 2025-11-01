import { router } from "./trpc";
import { healthRouter } from "./routers/health";
import { authRouter } from "./routers/auth";
import { eventsRouter } from "./routers/events";
import { organizerEventsRouter } from "./routers/organizer/events";
import { organizerAttendeesRouter } from "./routers/organizer/attendees";

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  events: eventsRouter,
  organizer: router({
    events: organizerEventsRouter,
    attendees: organizerAttendeesRouter,
  }),
});

export type AppRouter = typeof appRouter;
export { router, publicProcedure } from "./trpc";
export { hashPassword, verifyPassword } from "./lib/auth";
