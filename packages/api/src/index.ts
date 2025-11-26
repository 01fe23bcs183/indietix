import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { searchRouter } from './routers/search.js';

/**
 * Context type for tRPC procedures
 */
export interface Context {
  userId?: string;
  isAdmin?: boolean;
}

/**
 * Initialize tRPC
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

/**
 * App router combining all routers
 */
export const appRouter = router({
  search: searchRouter,
});

export type AppRouter = typeof appRouter;

export { searchRouter };
