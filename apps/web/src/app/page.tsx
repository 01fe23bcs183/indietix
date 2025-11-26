import { draftMode } from "next/headers";
import Link from "next/link";
import { Button } from "@indietix/ui";
import { prisma } from "@indietix/db";

export const revalidate = 60;

interface HeroContent {
  title: string;
  subtitle: string;
  ctaText?: string;
  ctaLink?: string;
  backgroundImage?: string;
}

interface FeaturedContent {
  title: string;
  subtitle?: string;
  eventIds?: string[];
}

interface Category {
  name: string;
  icon: string;
  slug: string;
}

interface CategoriesContent {
  title: string;
  categories: Category[];
}

interface Testimonial {
  name: string;
  role?: string;
  content: string;
  avatar?: string;
}

interface TestimonialsContent {
  title: string;
  items: Testimonial[];
}

async function getContentBlock<T>(
  key: string,
  isDraft: boolean
): Promise<T | null> {
  try {
    const block = await prisma.contentBlock.findUnique({
      where: { key },
    });

    if (!block) return null;

    if (!isDraft && !block.published) return null;

    return block.value as T;
  } catch {
    return null;
  }
}

export default async function Home(): Promise<JSX.Element> {
  const { isEnabled: isDraft } = await draftMode();

  const [hero, featured, categories, testimonials] = await Promise.all([
    getContentBlock<HeroContent>("home.hero", isDraft),
    getContentBlock<FeaturedContent>("home.featured", isDraft),
    getContentBlock<CategoriesContent>("home.categories", isDraft),
    getContentBlock<TestimonialsContent>("home.testimonials", isDraft),
  ]);

  return (
    <main className="min-h-screen">
      {isDraft && (
        <div className="bg-yellow-500 text-black text-center py-2 text-sm font-medium">
          Preview Mode Enabled -{" "}
          <form action="/api/preview" method="POST" className="inline">
            <button type="submit" className="underline">
              Exit Preview
            </button>
          </form>
        </div>
      )}

      <section className="relative bg-gradient-to-br from-blue-600 to-purple-700 text-white py-24">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">
            {hero?.title || "Discover Amazing Events"}
          </h1>
          <p className="text-xl mb-8 text-blue-100">
            {hero?.subtitle ||
              "Find and book tickets for the best events in your city"}
          </p>
          <Link href={hero?.ctaLink || "/events"}>
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              {hero?.ctaText || "Browse Events"}
            </Button>
          </Link>
        </div>
      </section>

      {featured && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-4">
              {featured.title}
            </h2>
            {featured.subtitle && (
              <p className="text-gray-600 text-center mb-8">
                {featured.subtitle}
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(featured.eventIds || []).length === 0 ? (
                <p className="col-span-3 text-center text-gray-500">
                  No featured events yet
                </p>
              ) : (
                <p className="col-span-3 text-center text-gray-500">
                  Featured events will appear here
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {categories && categories.categories.length > 0 && (
        <section className="py-16">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-8">
              {categories.title}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {categories.categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/events?category=${category.slug}`}
                  className="flex flex-col items-center p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <span className="text-4xl mb-2">
                    {getCategoryEmoji(category.icon)}
                  </span>
                  <span className="font-medium text-gray-900">
                    {category.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {testimonials && testimonials.items.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-8">
              {testimonials.title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {testimonials.items.map((testimonial, index) => (
                <div
                  key={index}
                  className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
                >
                  <p className="text-gray-600 mb-4">
                    &ldquo;{testimonial.content}&rdquo;
                  </p>
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-300 rounded-full mr-3" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {testimonial.name}
                      </p>
                      {testimonial.role && (
                        <p className="text-sm text-gray-500">
                          {testimonial.role}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-16 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to discover events?</h2>
          <p className="text-blue-100 mb-8">
            Join thousands of event-goers and find your next experience
          </p>
          <Link href="/events">
            <Button
              size="lg"
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              Explore Events
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}

function getCategoryEmoji(icon: string): string {
  const emojiMap: Record<string, string> = {
    music: "🎵",
    comedy: "😂",
    sports: "🏆",
    tech: "💻",
    art: "🎨",
    food: "🍽️",
    theater: "🎭",
    film: "🎬",
    default: "📅",
  };
  return emojiMap[icon] ?? emojiMap["default"] ?? "📅";
}
