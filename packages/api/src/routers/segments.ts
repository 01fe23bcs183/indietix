import { z } from "zod";
import { router, publicProcedure } from "../trpc";
import { prisma, Prisma } from "@indietix/db";
import { TRPCError } from "@trpc/server";
import { validateSegmentQuery, estimateSegmentSize } from "@indietix/marketing";

const createSegmentSchema = z.object({
  name: z.string().min(1),
  query: z.record(z.unknown()),
});

export const segmentsRouter = router({
  create: publicProcedure
    .input(createSegmentSchema)
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const user = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!user || (user.role !== "ADMIN" && user.role !== "ORGANIZER")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const validation = validateSegmentQuery(input.query);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid segment query: ${validation.errors?.join(", ")}`,
        });
      }

      const segment = await prisma.segment.create({
        data: {
          name: input.name,
          query: input.query as Prisma.InputJsonValue,
        },
      });

      return segment;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        query: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const user = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!user || (user.role !== "ADMIN" && user.role !== "ORGANIZER")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (input.query) {
        const validation = validateSegmentQuery(input.query);
        if (!validation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid segment query: ${validation.errors?.join(", ")}`,
          });
        }
      }

      const segment = await prisma.segment.update({
        where: { id: input.id },
        data: {
          name: input.name,
          query: input.query
            ? (input.query as Prisma.InputJsonValue)
            : undefined,
        },
      });

      return segment;
    }),

  list: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const user = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "ORGANIZER")) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const segments = await prisma.segment.findMany({
      orderBy: { createdAt: "desc" },
    });

    return segments;
  }),

  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const segment = await prisma.segment.findUnique({
        where: { id: input.id },
      });

      if (!segment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Segment not found",
        });
      }

      return segment;
    }),

  estimate: publicProcedure
    .input(z.object({ query: z.record(z.unknown()) }))
    .query(async ({ input, ctx }) => {
      if (!ctx.session?.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const validation = validateSegmentQuery(input.query);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid segment query: ${validation.errors?.join(", ")}`,
        });
      }

      const size = await estimateSegmentSize(prisma, input.query);

      return { size };
    }),
});
