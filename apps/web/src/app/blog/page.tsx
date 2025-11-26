import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@indietix/db";

export const metadata: Metadata = {
  title: "Blog | IndieTix",
  description: "Read the latest news, tips, and stories from IndieTix",
};

export const revalidate = 60;

interface BlogPageProps {
  searchParams: Promise<{ tag?: string }>;
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams;
  const tag = params.tag;

  const posts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      ...(tag ? { tags: { has: tag } } : {}),
    },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      tags: true,
      publishedAt: true,
      author: {
        select: {
          name: true,
        },
      },
    },
  });

  const allTags = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    select: { tags: true },
  });

  const uniqueTags = [...new Set(allTags.flatMap((p) => p.tags))];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Blog</h1>
        <p className="text-lg text-gray-600 mb-8">
          Read the latest news, tips, and stories from IndieTix
        </p>

        {uniqueTags.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/blog"
                className={`px-3 py-1 rounded-full text-sm ${
                  !tag
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                All
              </Link>
              {uniqueTags.map((t) => (
                <Link
                  key={t}
                  href={`/blog?tag=${encodeURIComponent(t)}`}
                  className={`px-3 py-1 rounded-full text-sm ${
                    tag === t
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {t}
                </Link>
              ))}
            </div>
          </div>
        )}

        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No posts found.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {posts.map((post) => (
              <article
                key={post.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <Link href={`/blog/${post.slug}`}>
                  <h2 className="text-2xl font-semibold text-gray-900 hover:text-blue-600 mb-2">
                    {post.title}
                  </h2>
                </Link>
                <p className="text-gray-600 mb-4">{post.excerpt}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">
                      By {post.author.name}
                    </span>
                    {post.publishedAt && (
                      <span className="text-sm text-gray-500">
                        {new Date(post.publishedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {post.tags.length > 0 && (
                    <div className="flex gap-2">
                      {post.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
