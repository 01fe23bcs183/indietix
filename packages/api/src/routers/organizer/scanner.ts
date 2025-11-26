import { z } from "zod";
import { router, publicProcedure } from "../../trpc";
import { prisma } from "@indietix/db";
import { TRPCError } from "@trpc/server";
import {
  requireOrgPerm,
  validateScannerPass,
  generateSecureToken,
} from "@indietix/auth";

const requireAuth = (ctx: {
  session?: { user?: { id: string; email: string; role: string } };
}) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Not authenticated",
    });
  }
  return ctx.session.user;
};

const requireOrganizer = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { organizer: true },
  });

  if (!user?.organizer) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "User is not an organizer",
    });
  }

  return user.organizer;
};

const logOrgAction = async (
  organizerId: string,
  actorUserId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  prev: unknown,
  next: unknown
) => {
  await prisma.orgAction.create({
    data: {
      organizerId,
      actorUserId,
      action,
      entityType,
      entityId,
      prev: prev ? JSON.parse(JSON.stringify(prev)) : null,
      next: next ? JSON.parse(JSON.stringify(next)) : null,
    },
  });
};

export const organizerScannerRouter = router({
  /**
   * Create a scanner pass (one-time QR/key for limited-scope access)
   */
  createPass: publicProcedure
    .input(
      z.object({
        organizerId: z.string().optional(),
        eventId: z.string().optional(),
        ttlHours: z.number().min(1).max(72).default(24),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      const organizer = await requireOrganizer(user.id);
      const organizerId = input.organizerId ?? organizer.id;

      // Check permission (only OWNER can create scanner passes)
      const perm = await requireOrgPerm(user.id, organizerId, "team.invite");
      if (!perm.allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: perm.reason ?? "Permission denied",
        });
      }

      // If eventId is provided, verify it belongs to the organizer
      if (input.eventId) {
        const event = await prisma.event.findUnique({
          where: { id: input.eventId },
        });

        if (!event) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        }

        if (event.organizerId !== organizerId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Event does not belong to this organizer",
          });
        }
      }

      // Generate token and create pass
      const token = generateSecureToken();
      const expiresAt = new Date(Date.now() + input.ttlHours * 60 * 60 * 1000);

      const pass = await prisma.scannerPass.create({
        data: {
          organizerId,
          eventId: input.eventId,
          token,
          expiresAt,
          createdBy: user.id,
        },
      });

      // Log action
      await logOrgAction(
        organizerId,
        user.id,
        "scanner.pass.create",
        "ScannerPass",
        pass.id,
        null,
        { eventId: input.eventId, ttlHours: input.ttlHours }
      );

      return {
        id: pass.id,
        token: pass.token,
        expiresAt: pass.expiresAt,
        eventId: pass.eventId,
        scannerUrl: `/organizer/scanner?pass=${token}`,
        qrData: `indietix://scanner/${token}`,
      };
    }),

  /**
   * List scanner passes
   */
  listPasses: publicProcedure
    .input(
      z.object({
        organizerId: z.string().optional(),
        eventId: z.string().optional(),
        includeExpired: z.boolean().default(false),
      })
    )
    .query(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      const organizer = await requireOrganizer(user.id);
      const organizerId = input.organizerId ?? organizer.id;

      // Check permission
      const perm = await requireOrgPerm(user.id, organizerId, "team.view");
      if (!perm.allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: perm.reason ?? "Permission denied",
        });
      }

      const where: {
        organizerId: string;
        eventId?: string;
        expiresAt?: { gte: Date };
      } = {
        organizerId,
      };

      if (input.eventId) {
        where.eventId = input.eventId;
      }

      if (!input.includeExpired) {
        where.expiresAt = { gte: new Date() };
      }

      const passes = await prisma.scannerPass.findMany({
        where,
        include: {
          organizer: {
            select: {
              id: true,
              businessName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return passes.map((pass) => ({
        id: pass.id,
        token: pass.token,
        eventId: pass.eventId,
        expiresAt: pass.expiresAt,
        usedAt: pass.usedAt,
        createdAt: pass.createdAt,
        isExpired: pass.expiresAt < new Date(),
        isUsed: !!pass.usedAt,
      }));
    }),

  /**
   * Revoke a scanner pass
   */
  revokePass: publicProcedure
    .input(z.object({ passId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);

      const pass = await prisma.scannerPass.findUnique({
        where: { id: input.passId },
      });

      if (!pass) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Scanner pass not found",
        });
      }

      // Check permission
      const perm = await requireOrgPerm(user.id, pass.organizerId, "team.remove");
      if (!perm.allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: perm.reason ?? "Permission denied",
        });
      }

      // Delete the pass
      await prisma.scannerPass.delete({
        where: { id: input.passId },
      });

      // Log action
      await logOrgAction(
        pass.organizerId,
        user.id,
        "scanner.pass.revoke",
        "ScannerPass",
        input.passId,
        { eventId: pass.eventId },
        null
      );

      return { success: true };
    }),

  /**
   * Validate a scanner pass (public endpoint for scanner login)
   */
  validatePass: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const result = await validateScannerPass(input.token);

      if (!result.valid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: result.reason ?? "Invalid scanner pass",
        });
      }

      // Get organizer details
      const organizer = await prisma.organizer.findUnique({
        where: { id: result.organizerId },
        select: {
          id: true,
          businessName: true,
        },
      });

      // Get event details if scoped to an event
      let event = null;
      if (result.eventId) {
        event = await prisma.event.findUnique({
          where: { id: result.eventId },
          select: {
            id: true,
            title: true,
            slug: true,
            date: true,
            venue: true,
          },
        });
      }

      return {
        valid: true,
        organizerId: result.organizerId,
        organizer,
        eventId: result.eventId,
        event,
      };
    }),

  /**
   * Get scanner access for current user (check if they have scanner permission)
   */
  getAccess: publicProcedure
    .input(z.object({ organizerId: z.string() }))
    .query(async ({ input, ctx }) => {
      const user = requireAuth(ctx);

      const perm = await requireOrgPerm(user.id, input.organizerId, "scanner.access");

      if (!perm.allowed) {
        return {
          hasAccess: false,
          role: null,
          reason: perm.reason,
        };
      }

      return {
        hasAccess: true,
        role: perm.role,
      };
    }),
});
