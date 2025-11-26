import { z } from "zod";
import { router, publicProcedure } from "../../trpc";
import { prisma } from "@indietix/db";
import { TRPCError } from "@trpc/server";
import { requireOrgPerm, generateSecureToken } from "@indietix/auth";

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

export const organizerInviteRouter = router({
  /**
   * Create an invite
   */
  create: publicProcedure
    .input(
      z.object({
        organizerId: z.string().optional(),
        email: z.string().email(),
        role: z.enum(["MANAGER", "STAFF", "SCANNER"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      const organizer = await requireOrganizer(user.id);
      const organizerId = input.organizerId ?? organizer.id;

      // Check permission
      const perm = await requireOrgPerm(user.id, organizerId, "team.invite");
      if (!perm.allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: perm.reason ?? "Permission denied",
        });
      }

      // Check if email is already a member
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        const existingMember = await prisma.orgMember.findUnique({
          where: {
            organizerId_userId: {
              organizerId,
              userId: existingUser.id,
            },
          },
        });

        if (existingMember) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "User is already a team member",
          });
        }

        // Check if user is the organizer owner
        const org = await prisma.organizer.findUnique({
          where: { id: organizerId },
        });

        if (org?.userId === existingUser.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot invite the organizer owner",
          });
        }
      }

      // Check for existing pending invite
      const existingInvite = await prisma.orgInvite.findFirst({
        where: {
          organizerId,
          email: input.email,
          status: "PENDING",
        },
      });

      if (existingInvite) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An invite is already pending for this email",
        });
      }

      // Create invite
      const token = generateSecureToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const invite = await prisma.orgInvite.create({
        data: {
          organizerId,
          email: input.email,
          role: input.role,
          token,
          expiresAt,
          createdBy: user.id,
        },
      });

      // Log action
      await logOrgAction(
        organizerId,
        user.id,
        "invite.create",
        "OrgInvite",
        invite.id,
        null,
        { email: input.email, role: input.role }
      );

      // TODO: Send invite email using notification system
      // For now, return the invite with token for testing

      return {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        expiresAt: invite.expiresAt,
        inviteUrl: `/invite/accept?token=${token}`,
      };
    }),

  /**
   * List pending invites
   */
  list: publicProcedure
    .input(
      z.object({
        organizerId: z.string().optional(),
        status: z.enum(["PENDING", "ACCEPTED", "EXPIRED"]).optional(),
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

      const invites = await prisma.orgInvite.findMany({
        where: {
          organizerId,
          ...(input.status && { status: input.status }),
        },
        orderBy: { createdAt: "desc" },
      });

      return invites.map((invite) => ({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
      }));
    }),

  /**
   * Resend an invite
   */
  resend: publicProcedure
    .input(z.object({ inviteId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);

      const invite = await prisma.orgInvite.findUnique({
        where: { id: input.inviteId },
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite not found",
        });
      }

      // Check permission
      const perm = await requireOrgPerm(
        user.id,
        invite.organizerId,
        "team.invite"
      );
      if (!perm.allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: perm.reason ?? "Permission denied",
        });
      }

      if (invite.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only resend pending invites",
        });
      }

      // Generate new token and extend expiry
      const token = generateSecureToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const updated = await prisma.orgInvite.update({
        where: { id: input.inviteId },
        data: { token, expiresAt },
      });

      // Log action
      await logOrgAction(
        invite.organizerId,
        user.id,
        "invite.resend",
        "OrgInvite",
        invite.id,
        null,
        { email: invite.email }
      );

      // TODO: Send invite email

      return {
        id: updated.id,
        email: updated.email,
        role: updated.role,
        status: updated.status,
        expiresAt: updated.expiresAt,
        inviteUrl: `/invite/accept?token=${token}`,
      };
    }),

  /**
   * Cancel an invite
   */
  cancel: publicProcedure
    .input(z.object({ inviteId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);

      const invite = await prisma.orgInvite.findUnique({
        where: { id: input.inviteId },
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invite not found",
        });
      }

      // Check permission
      const perm = await requireOrgPerm(
        user.id,
        invite.organizerId,
        "team.invite"
      );
      if (!perm.allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: perm.reason ?? "Permission denied",
        });
      }

      if (invite.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only cancel pending invites",
        });
      }

      // Delete the invite
      await prisma.orgInvite.delete({
        where: { id: input.inviteId },
      });

      // Log action
      await logOrgAction(
        invite.organizerId,
        user.id,
        "invite.cancel",
        "OrgInvite",
        invite.id,
        { email: invite.email, role: invite.role },
        null
      );

      return { success: true };
    }),

  /**
   * Accept an invite (public endpoint)
   */
  accept: publicProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);

      const invite = await prisma.orgInvite.findUnique({
        where: { token: input.token },
        include: {
          organizer: {
            select: {
              id: true,
              businessName: true,
            },
          },
        },
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid or expired invite",
        });
      }

      if (invite.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invite has already been used or expired",
        });
      }

      if (invite.expiresAt < new Date()) {
        // Mark as expired
        await prisma.orgInvite.update({
          where: { id: invite.id },
          data: { status: "EXPIRED" },
        });

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invite has expired",
        });
      }

      // Check if user email matches invite email
      const invitedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!invitedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      if (invitedUser.email.toLowerCase() !== invite.email.toLowerCase()) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This invite was sent to a different email address",
        });
      }

      // Check if already a member
      const existingMember = await prisma.orgMember.findUnique({
        where: {
          organizerId_userId: {
            organizerId: invite.organizerId,
            userId: user.id,
          },
        },
      });

      if (existingMember) {
        // Mark invite as accepted
        await prisma.orgInvite.update({
          where: { id: invite.id },
          data: { status: "ACCEPTED" },
        });

        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already a member of this organization",
        });
      }

      // Create member and mark invite as accepted
      await prisma.$transaction([
        prisma.orgMember.create({
          data: {
            organizerId: invite.organizerId,
            userId: user.id,
            role: invite.role,
            invitedBy: invite.createdBy,
          },
        }),
        prisma.orgInvite.update({
          where: { id: invite.id },
          data: { status: "ACCEPTED" },
        }),
      ]);

      // Log action
      await logOrgAction(
        invite.organizerId,
        user.id,
        "invite.accept",
        "OrgInvite",
        invite.id,
        null,
        { userId: user.id, role: invite.role }
      );

      return {
        success: true,
        organizerId: invite.organizerId,
        organizerName: invite.organizer.businessName,
        role: invite.role,
      };
    }),

  /**
   * Get invite details by token (public, for accept page)
   */
  getByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const invite = await prisma.orgInvite.findUnique({
        where: { token: input.token },
        include: {
          organizer: {
            select: {
              id: true,
              businessName: true,
            },
          },
        },
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid invite",
        });
      }

      const isExpired =
        invite.expiresAt < new Date() || invite.status !== "PENDING";

      return {
        id: invite.id,
        email: invite.email,
        role: invite.role,
        status: invite.status,
        isExpired,
        expiresAt: invite.expiresAt,
        organizer: {
          id: invite.organizer.id,
          name: invite.organizer.businessName,
        },
      };
    }),
});
