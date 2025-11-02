import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { prisma } from "@indietix/db";
import {
  validateSegmentQuery,
  previewSegmentQuery,
  type SegmentQuery,
} from "@indietix/marketing";
import { TRPCError } from "@trpc/server";

function requireAuth(ctx: { session?: { user?: { id: string; role: string } } }) {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in",
    });
  }
  return ctx.session.user;
}

function requireOrganizerOrAdmin(user: { role: string }) {
  if (user.role !== "ORGANIZER" && user.role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only organizers and admins can manage segments",
    });
  }
}

export const segmentsRouter = router({
  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        query: z.record(z.unknown()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      requireOrganizerOrAdmin(user);

      const validation = validateSegmentQuery(input.query);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid query: ${validation.errors?.join(", ")}`,
        });
      }

      const segment = await prisma.segment.create({
        data: {
          name: input.name,
          query: input.query as any,
          createdBy: user.id,
        },
      });

      return segment;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        query: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      requireOrganizerOrAdmin(user);

      const segment = await prisma.segment.findUnique({
        where: { id: input.id },
      });

      if (!segment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Segment not found",
        });
      }

      if (segment.createdBy !== user.id && user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update your own segments",
        });
      }

      if (input.query) {
        const validation = validateSegmentQuery(input.query);
        if (!validation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid query: ${validation.errors?.join(", ")}`,
          });
        }
      }

      const updated = await prisma.segment.update({
        where: { id: input.id },
        data: {
          name: input.name,
          query: input.query as any,
        },
      });

      return updated;
    }),

  list: publicProcedure.query(async ({ ctx }) => {
    const user = requireAuth(ctx);
    requireOrganizerOrAdmin(user);

    const where = user.role === "ADMIN" ? {} : { createdBy: user.id };

    const segments = await prisma.segment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { campaigns: true },
        },
      },
    });

    return segments;
  }),

  get: publicProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      requireOrganizerOrAdmin(user);

      const segment = await prisma.segment.findUnique({
        where: { id: input.id },
        include: {
          _count: {
            select: { campaigns: true },
          },
        },
      });

      if (!segment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Segment not found",
        });
      }

      if (segment.createdBy !== user.id && user.role !== "ADMIN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only view your own segments",
        });
      }

      return segment;
    }),

  testQuery: publicProcedure
    .input(
      z.object({
        query: z.record(z.unknown()),
      })
    )
    .query(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      requireOrganizerOrAdmin(user);

      const validation = validateSegmentQuery(input.query);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid query: ${validation.errors?.join(", ")}`,
        });
      }

      const count = await previewSegmentQuery(prisma, input.query as SegmentQuery);

      return {
        count,
        valid: true,
      };
    }),
});
