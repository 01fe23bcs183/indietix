import { router, publicProcedure } from "../trpc";

export const healthRouter = router({
  ping: publicProcedure.query(() => {
    return { ok: true };
  }),
});
