import { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@indietix/db";

export const metadata: Metadata = {
  title: "Help Center | IndieTix",
  description: "Find answers to your questions about IndieTix",
};

export const revalidate = 60;

interface HelpPageProps {
  searchParams: Promise<{ q?: string; category?: string }>;
}

export default async function HelpPage({ searchParams }: HelpPageProps) {
  const params = await searchParams;
  const query = params.q;
  const category = params.category;

  const faqBlock = await prisma.contentBlock.findUnique({
    where: { key: "faq.items", published: true },
  });

  const faqData = faqBlock?.value as {
    items?: Array<{
      question: string;
      answer: string;
      category?: string;
    }>;
  } | null;

  const faqItems = faqData?.items || [];

  const helpPosts = await prisma.post.findMany({
    where: {
      status: "PUBLISHED",
      tags: { has: "help" },
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { excerpt: { contains: query, mode: "insensitive" } },
              { tags: { has: query } },
            ],
          }
        : {}),
    },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      excerpt: true,
      tags: true,
    },
  });

  const filteredFaqs = faqItems.filter((item) => {
    if (query) {
      const q = query.toLowerCase();
      return (
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q)
      );
    }
    if (category) {
      return item.category === category;
    }
    return true;
  });

  const categories = [
    ...new Set(faqItems.map((item) => item.category).filter(Boolean)),
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Help Center</h1>
        <p className="text-lg text-gray-600 mb-8">
          Find answers to your questions about IndieTix
        </p>

        <form className="mb-8">
          <div className="relative">
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Search for help..."
              className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </form>

        {categories.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/help"
                className={`px-3 py-1 rounded-full text-sm ${
                  !category
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                All
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat}
                  href={`/help?category=${encodeURIComponent(cat || "")}`}
                  className={`px-3 py-1 rounded-full text-sm ${
                    category === cat
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {cat}
                </Link>
              ))}
            </div>
          </div>
        )}

        {filteredFaqs.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {filteredFaqs.map((item, index) => (
                <details
                  key={index}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                >
                  <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50 font-medium text-gray-900">
                    {item.question}
                  </summary>
                  <div className="px-6 py-4 border-t border-gray-200 text-gray-600">
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {helpPosts.length > 0 && (
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">
              Help Articles
            </h2>
            <div className="space-y-4">
              {helpPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="block bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 mb-2">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 text-sm">{post.excerpt}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {filteredFaqs.length === 0 && helpPosts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {query
                ? `No results found for "${query}"`
                : "No help content available yet."}
            </p>
          </div>
        )}

        <section className="mt-12 bg-blue-50 rounded-lg p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Still need help?
          </h2>
          <p className="text-gray-600 mb-4">
            Contact our support team for personalized assistance
          </p>
          <a
            href="mailto:support@indietix.com"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Contact Support
          </a>
        </section>
      </div>
    </main>
  );
}
