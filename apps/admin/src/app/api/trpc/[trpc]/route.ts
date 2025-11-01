import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@indietix/api";
import { auth } from "../../../../lib/auth";

const handler = async (req: Request) => {
  const session = await auth();

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => ({
      session: session?.user
        ? {
            user: {
              id: session.user.id,
              email: session.user.email || "",
              role: session.user.role,
            },
          }
        : undefined,
    }),
  });
};

export { handler as GET, handler as POST };
