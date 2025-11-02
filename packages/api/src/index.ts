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
import { adminUsersRouter } from "./routers/admin/users";
import { adminOrganizersRouter } from "./routers/admin/organizers";
import { adminEventsRouter } from "./routers/admin/events";
import { adminTransactionsRouter } from "./routers/admin/transactions";
import { adminSettingsRouter } from "./routers/admin/settings";
import { adminDashboardRouter } from "./routers/admin/dashboard";
import { notifyRouter } from "./routers/notify";

export const appRouter = router({
  health: healthRouter,
  auth: authRouter,
  events: eventsRouter,
  search: searchRouter,
  booking: bookingRouter,
  waitlist: waitlistRouter,
  payouts: payoutsRouter,
  notify: notifyRouter,
  organizer: router({
    events: organizerEventsRouter,
    attendees: organizerAttendeesRouter,
    analytics: organizerAnalyticsRouter,
  }),
  admin: router({
    dashboard: adminDashboardRouter,
    users: adminUsersRouter,
    organizers: adminOrganizersRouter,
    events: adminEventsRouter,
    transactions: adminTransactionsRouter,
    settings: adminSettingsRouter,
  }),
});

export type AppRouter = typeof appRouter;
export { router, publicProcedure } from "./trpc";
export { hashPassword, verifyPassword } from "./lib/auth";
export { expireWaitlistOffers, issueWaitlistOffers } from "./lib/waitlist";
