import { initTRPC } from "@trpc/server";

export interface Context {
  session?: {
    user?: {
      id: string;
      email: string;
      role: string;
    };
  };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
