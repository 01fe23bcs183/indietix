import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@indietix/db";

export const revalidate = 60;

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.post.findUnique({
    where: { slug },
    select: { title: true, excerpt: true },
  });

  if (!post) {
    return {
      title: "Post Not Found | IndieTix",
    };
  }

  return {
    title: `${post.title} | IndieTix Blog`,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;

  const post = await prisma.post.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: {
      author: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!post) {
    notFound();
  }

  const body = post.body as { content?: string } | string;
  const content = typeof body === "string" ? body : body?.content || "";

  return (
    <main className="min-h-screen bg-gray-50">
      <article className="max-w-3xl mx-auto px-4 py-12">
        <Link
          href="/blog"
          className="text-blue-600 hover:underline text-sm mb-6 inline-block"
        >
          &larr; Back to Blog
        </Link>

        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {post.title}
          </h1>
          <div className="flex items-center gap-4 text-gray-600">
            <span>By {post.author.name}</span>
            {post.publishedAt && (
              <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
            )}
          </div>
          {post.tags.length > 0 && (
            <div className="flex gap-2 mt-4">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/blog?tag=${encodeURIComponent(tag)}`}
                  className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-full hover:bg-gray-300"
                >
                  {tag}
                </Link>
              ))}
            </div>
          )}
        </header>

        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </article>
    </main>
  );
}
