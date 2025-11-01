import { router } from "./trpc";
import { healthRouter } from "./routers/health";
import { authRouter } from "./routers/auth";
import { eventsRouter } from "./routers/events";
import { searchRouter } from "./routers/search";
import { bookingRouter } from "./routers/booking";
import { waitlistRouter } from "./routers/waitlist";
import { organizerEventsRouter } from "./routers/organizer/events";
import { organizerAttendeesRouter } from "./routers/organizer/attendees";
import { organizerAnalyticsRouter } from "./routers/organizer/analytics";
import { payoutsRouter } from "./routers/payouts";

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  events: eventsRouter,
  search: searchRouter,
  booking: bookingRouter,
  waitlist: waitlistRouter,
  payouts: payoutsRouter,
  organizer: router({
    events: organizerEventsRouter,
    attendees: organizerAttendeesRouter,
    analytics: organizerAnalyticsRouter,
  }),
});

export type AppRouter = typeof appRouter;
export { router, publicProcedure } from "./trpc";
export { hashPassword, verifyPassword } from "./lib/auth";
export { expireWaitlistOffers, issueWaitlistOffers } from "./lib/waitlist";
