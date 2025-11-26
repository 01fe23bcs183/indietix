import { router, publicProcedure } from "../trpc";
import { z } from "zod";
import { prisma, Prisma } from "@indietix/db";
import { TRPCError } from "@trpc/server";

const PREDEFINED_KEYS = [
  "home.hero",
  "home.featured",
  "home.categories",
  "home.testimonials",
  "legal.terms",
  "legal.privacy",
  "faq.items",
] as const;

const contentBlockKeySchema = z.enum(PREDEFINED_KEYS);

const contentBlockTypeSchema = z.enum(["RICH", "JSON"]);

const postStatusSchema = z.enum(["DRAFT", "PUBLISHED"]);

export const cmsRouter = router({
  blocks: router({
    list: publicProcedure
      .input(
        z
          .object({
            published: z.boolean().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const where: { published?: boolean } = {};
        if (input?.published !== undefined) {
          where.published = input.published;
        }

        const blocks = await prisma.contentBlock.findMany({
          where,
          orderBy: { key: "asc" },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        return blocks;
      }),

    get: publicProcedure
      .input(
        z.object({
          key: z.string(),
          version: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        const block = await prisma.contentBlock.findUnique({
          where: { key: input.key },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            versions: {
              orderBy: { version: "desc" },
              take: 10,
              select: {
                id: true,
                version: true,
                value: true,
                authorId: true,
                createdAt: true,
              },
            },
          },
        });

        if (!block) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Content block with key "${input.key}" not found`,
          });
        }

        if (input.version) {
          const versionData = block.versions.find(
            (v) => v.version === input.version
          );
          if (!versionData) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: `Version ${input.version} not found for block "${input.key}"`,
            });
          }
          return {
            ...block,
            value: versionData.value,
            requestedVersion: input.version,
          };
        }

        return block;
      }),

    save: publicProcedure
      .input(
        z.object({
          key: contentBlockKeySchema,
          type: contentBlockTypeSchema,
          value: z.any(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.session?.user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "You must be logged in to save content blocks",
          });
        }

        const authorId = ctx.session.user.id;

        const existingBlock = await prisma.contentBlock.findUnique({
          where: { key: input.key },
        });

        if (existingBlock) {
          const newVersion = existingBlock.version + 1;

          await prisma.contentBlockVersion.create({
            data: {
              contentBlockId: existingBlock.id,
              version: existingBlock.version,
              value: existingBlock.value as Prisma.InputJsonValue,
              authorId: existingBlock.authorId,
            },
          });

          const updatedBlock = await prisma.contentBlock.update({
            where: { key: input.key },
            data: {
              type: input.type,
              value: input.value,
              version: newVersion,
              authorId,
              published: false,
            },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          });

          await prisma.adminAction.create({
            data: {
              adminId: authorId,
              entityType: "ContentBlock",
              entityId: updatedBlock.id,
              action: "UPDATE",
              prev: existingBlock.value as object,
              next: input.value as object,
            },
          });

          return updatedBlock;
        } else {
          const newBlock = await prisma.contentBlock.create({
            data: {
              key: input.key,
              type: input.type,
              value: input.value,
              version: 1,
              published: false,
              authorId,
            },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          });

          await prisma.adminAction.create({
            data: {
              adminId: authorId,
              entityType: "ContentBlock",
              entityId: newBlock.id,
              action: "CREATE",
              next: input.value as object,
            },
          });

          return newBlock;
        }
      }),

    publish: publicProcedure
      .input(
        z.object({
          key: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.session?.user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "You must be logged in to publish content blocks",
          });
        }

        if (ctx.session.user.role !== "ADMIN") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only admins can publish content blocks",
          });
        }

        const block = await prisma.contentBlock.findUnique({
          where: { key: input.key },
        });

        if (!block) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Content block with key "${input.key}" not found`,
          });
        }

        const updatedBlock = await prisma.contentBlock.update({
          where: { key: input.key },
          data: {
            published: true,
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        await prisma.adminAction.create({
          data: {
            adminId: ctx.session.user.id,
            entityType: "ContentBlock",
            entityId: block.id,
            action: "PUBLISH",
            prev: { published: false },
            next: { published: true },
          },
        });

        return updatedBlock;
      }),

    rollback: publicProcedure
      .input(
        z.object({
          key: z.string(),
          version: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.session?.user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "You must be logged in to rollback content blocks",
          });
        }

        if (ctx.session.user.role !== "ADMIN") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only admins can rollback content blocks",
          });
        }

        const block = await prisma.contentBlock.findUnique({
          where: { key: input.key },
        });

        if (!block) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Content block with key "${input.key}" not found`,
          });
        }

        const versionData = await prisma.contentBlockVersion.findUnique({
          where: {
            contentBlockId_version: {
              contentBlockId: block.id,
              version: input.version,
            },
          },
        });

        if (!versionData) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Version ${input.version} not found for block "${input.key}"`,
          });
        }

        await prisma.contentBlockVersion.create({
          data: {
            contentBlockId: block.id,
            version: block.version,
            value: block.value as Prisma.InputJsonValue,
            authorId: block.authorId,
          },
        });

        const newVersion = block.version + 1;

        const updatedBlock = await prisma.contentBlock.update({
          where: { key: input.key },
          data: {
            value: versionData.value as Prisma.InputJsonValue,
            version: newVersion,
            authorId: ctx.session.user.id,
            published: false,
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        await prisma.adminAction.create({
          data: {
            adminId: ctx.session.user.id,
            entityType: "ContentBlock",
            entityId: block.id,
            action: "ROLLBACK",
            prev: { version: block.version, value: block.value },
            next: { version: newVersion, value: versionData.value },
          },
        });

        return updatedBlock;
      }),
  }),

  posts: router({
    list: publicProcedure
      .input(
        z
          .object({
            status: postStatusSchema.optional(),
            tag: z.string().optional(),
            limit: z.number().min(1).max(100).optional().default(20),
            cursor: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const where: {
          status?: "DRAFT" | "PUBLISHED";
          tags?: { has: string };
        } = {};

        if (input?.status) {
          where.status = input.status;
        }

        if (input?.tag) {
          where.tags = { has: input.tag };
        }

        const posts = await prisma.post.findMany({
          where,
          take: (input?.limit ?? 20) + 1,
          cursor: input?.cursor ? { id: input.cursor } : undefined,
          orderBy: { createdAt: "desc" },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        let nextCursor: string | undefined = undefined;
        if (posts.length > (input?.limit ?? 20)) {
          const nextItem = posts.pop();
          nextCursor = nextItem?.id;
        }

        return {
          posts,
          nextCursor,
        };
      }),

    get: publicProcedure
      .input(
        z.object({
          slug: z.string(),
        })
      )
      .query(async ({ input }) => {
        const post = await prisma.post.findUnique({
          where: { slug: input.slug },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        if (!post) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Post with slug "${input.slug}" not found`,
          });
        }

        return post;
      }),

    create: publicProcedure
      .input(
        z.object({
          slug: z.string().min(1).max(200),
          title: z.string().min(1).max(200),
          excerpt: z.string().min(1).max(500),
          body: z.any(),
          tags: z.array(z.string()).optional().default([]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.session?.user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "You must be logged in to create posts",
          });
        }

        const existingPost = await prisma.post.findUnique({
          where: { slug: input.slug },
        });

        if (existingPost) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `A post with slug "${input.slug}" already exists`,
          });
        }

        const post = await prisma.post.create({
          data: {
            slug: input.slug,
            title: input.title,
            excerpt: input.excerpt,
            body: input.body,
            tags: input.tags,
            status: "DRAFT",
            authorId: ctx.session.user.id,
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        await prisma.adminAction.create({
          data: {
            adminId: ctx.session.user.id,
            entityType: "Post",
            entityId: post.id,
            action: "CREATE",
            next: {
              slug: post.slug,
              title: post.title,
              status: post.status,
            },
          },
        });

        return post;
      }),

    update: publicProcedure
      .input(
        z.object({
          slug: z.string(),
          title: z.string().min(1).max(200).optional(),
          excerpt: z.string().min(1).max(500).optional(),
          body: z.any().optional(),
          tags: z.array(z.string()).optional(),
          newSlug: z.string().min(1).max(200).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.session?.user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "You must be logged in to update posts",
          });
        }

        const existingPost = await prisma.post.findUnique({
          where: { slug: input.slug },
        });

        if (!existingPost) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Post with slug "${input.slug}" not found`,
          });
        }

        if (input.newSlug && input.newSlug !== input.slug) {
          const slugConflict = await prisma.post.findUnique({
            where: { slug: input.newSlug },
          });
          if (slugConflict) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `A post with slug "${input.newSlug}" already exists`,
            });
          }
        }

        const updateData: {
          slug?: string;
          title?: string;
          excerpt?: string;
          body?: Prisma.InputJsonValue;
          tags?: string[];
        } = {};

        if (input.newSlug) updateData.slug = input.newSlug;
        if (input.title) updateData.title = input.title;
        if (input.excerpt) updateData.excerpt = input.excerpt;
        if (input.body !== undefined) updateData.body = input.body as Prisma.InputJsonValue;
        if (input.tags) updateData.tags = input.tags;

        const post = await prisma.post.update({
          where: { slug: input.slug },
          data: updateData,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        await prisma.adminAction.create({
          data: {
            adminId: ctx.session.user.id,
            entityType: "Post",
            entityId: post.id,
            action: "UPDATE",
            prev: {
              slug: existingPost.slug,
              title: existingPost.title,
              excerpt: existingPost.excerpt,
            },
            next: {
              slug: post.slug,
              title: post.title,
              excerpt: post.excerpt,
            },
          },
        });

        return post;
      }),

    publish: publicProcedure
      .input(
        z.object({
          slug: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.session?.user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "You must be logged in to publish posts",
          });
        }

        if (ctx.session.user.role !== "ADMIN") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only admins can publish posts",
          });
        }

        const existingPost = await prisma.post.findUnique({
          where: { slug: input.slug },
        });

        if (!existingPost) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Post with slug "${input.slug}" not found`,
          });
        }

        const post = await prisma.post.update({
          where: { slug: input.slug },
          data: {
            status: "PUBLISHED",
            publishedAt: new Date(),
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        await prisma.adminAction.create({
          data: {
            adminId: ctx.session.user.id,
            entityType: "Post",
            entityId: post.id,
            action: "PUBLISH",
            prev: { status: existingPost.status },
            next: { status: "PUBLISHED", publishedAt: post.publishedAt },
          },
        });

        return post;
      }),
  }),

  search: publicProcedure
    .input(
      z.object({
        q: z.string().min(1),
        type: z.enum(["posts", "blocks", "all"]).optional().default("all"),
      })
    )
    .query(async ({ input }) => {
      const results: {
        posts: Array<{
          id: string;
          slug: string;
          title: string;
          excerpt: string;
          tags: string[];
        }>;
        blocks: Array<{
          id: string;
          key: string;
          type: string;
        }>;
      } = {
        posts: [],
        blocks: [],
      };

      if (input.type === "posts" || input.type === "all") {
        const posts = await prisma.post.findMany({
          where: {
            status: "PUBLISHED",
            OR: [
              { title: { contains: input.q, mode: "insensitive" } },
              { excerpt: { contains: input.q, mode: "insensitive" } },
              { tags: { has: input.q } },
            ],
          },
          select: {
            id: true,
            slug: true,
            title: true,
            excerpt: true,
            tags: true,
          },
          take: 20,
        });
        results.posts = posts;
      }

      if (input.type === "blocks" || input.type === "all") {
        const blocks = await prisma.contentBlock.findMany({
          where: {
            published: true,
            key: { contains: input.q, mode: "insensitive" },
          },
          select: {
            id: true,
            key: true,
            type: true,
          },
          take: 20,
        });
        results.blocks = blocks;
      }

      return results;
    }),
});
