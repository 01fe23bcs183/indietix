import { z } from "zod";
import { router, publicProcedure } from "../../trpc";
import { prisma } from "@indietix/db";
import { TRPCError } from "@trpc/server";
import { requireOrgPerm } from "@indietix/auth";
import type { OrgRole } from "@indietix/auth";

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

export const organizerTeamRouter = router({
  /**
   * List team members
   */
  list: publicProcedure
    .input(z.object({ organizerId: z.string().optional() }))
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

      // Get the organizer owner
      const org = await prisma.organizer.findUnique({
        where: { id: organizerId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!org) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Organizer not found",
        });
      }

      // Get team members
      const members = await prisma.orgMember.findMany({
        where: { organizerId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      // Combine owner and members
      const team = [
        {
          id: "owner",
          userId: org.user.id,
          name: org.user.name,
          email: org.user.email,
          role: "OWNER" as OrgRole,
          isOwner: true,
          createdAt: org.createdAt,
        },
        ...members.map((m) => ({
          id: m.id,
          userId: m.user.id,
          name: m.user.name,
          email: m.user.email,
          role: m.role as OrgRole,
          isOwner: false,
          createdAt: m.createdAt,
        })),
      ];

      return team;
    }),

  /**
   * Add a team member (for existing users)
   */
  add: publicProcedure
    .input(
      z.object({
        organizerId: z.string().optional(),
        userId: z.string(),
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

      // Check if user exists
      const targetUser = await prisma.user.findUnique({
        where: { id: input.userId },
      });

      if (!targetUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Check if already a member
      const existing = await prisma.orgMember.findUnique({
        where: {
          organizerId_userId: {
            organizerId,
            userId: input.userId,
          },
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User is already a team member",
        });
      }

      // Check if user is the organizer owner
      const org = await prisma.organizer.findUnique({
        where: { id: organizerId },
      });

      if (org?.userId === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot add organizer owner as a team member",
        });
      }

      // Create member
      const member = await prisma.orgMember.create({
        data: {
          organizerId,
          userId: input.userId,
          role: input.role,
          invitedBy: user.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Log action
      await logOrgAction(
        organizerId,
        user.id,
        "member.add",
        "OrgMember",
        member.id,
        null,
        { userId: input.userId, role: input.role }
      );

      return member;
    }),

  /**
   * Remove a team member
   */
  remove: publicProcedure
    .input(
      z.object({
        organizerId: z.string().optional(),
        memberId: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      const organizer = await requireOrganizer(user.id);
      const organizerId = input.organizerId ?? organizer.id;

      // Check permission
      const perm = await requireOrgPerm(user.id, organizerId, "team.remove");
      if (!perm.allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: perm.reason ?? "Permission denied",
        });
      }

      // Get member
      const member = await prisma.orgMember.findUnique({
        where: { id: input.memberId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team member not found",
        });
      }

      if (member.organizerId !== organizerId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Member does not belong to this organization",
        });
      }

      // Delete member
      await prisma.orgMember.delete({
        where: { id: input.memberId },
      });

      // Log action
      await logOrgAction(
        organizerId,
        user.id,
        "member.remove",
        "OrgMember",
        input.memberId,
        { userId: member.userId, role: member.role },
        null
      );

      return { success: true };
    }),

  /**
   * Update a team member's role
   */
  updateRole: publicProcedure
    .input(
      z.object({
        organizerId: z.string().optional(),
        memberId: z.string(),
        role: z.enum(["MANAGER", "STAFF", "SCANNER"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = requireAuth(ctx);
      const organizer = await requireOrganizer(user.id);
      const organizerId = input.organizerId ?? organizer.id;

      // Check permission
      const perm = await requireOrgPerm(
        user.id,
        organizerId,
        "team.updateRole"
      );
      if (!perm.allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: perm.reason ?? "Permission denied",
        });
      }

      // Get member
      const member = await prisma.orgMember.findUnique({
        where: { id: input.memberId },
      });

      if (!member) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team member not found",
        });
      }

      if (member.organizerId !== organizerId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Member does not belong to this organization",
        });
      }

      const prevRole = member.role;

      // Update role
      const updated = await prisma.orgMember.update({
        where: { id: input.memberId },
        data: { role: input.role },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Log action
      await logOrgAction(
        organizerId,
        user.id,
        "member.updateRole",
        "OrgMember",
        input.memberId,
        { role: prevRole },
        { role: input.role }
      );

      return updated;
    }),
});
