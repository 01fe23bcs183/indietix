"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface RecommendedEvent {
  id: string;
  title: string;
  slug: string;
  category: string;
  city: string;
  venue: string;
  date: string;
  price: number;
  totalSeats: number;
  bookedSeats: number;
  organizer: {
    businessName: string;
  };
}

interface Recommendation {
  event: RecommendedEvent;
  score: number;
  reason: {
    type: string;
    details: Record<string, unknown>;
  };
}

interface RecommendationsResponse {
  recommendations: Recommendation[];
  isPersonalized: boolean;
}

function formatPrice(priceInPaise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(priceInPaise / 100);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getCategoryEmoji(category: string): string {
  const emojiMap: Record<string, string> = {
    MUSIC: "🎵",
    COMEDY: "😂",
    SPORTS: "🏆",
    TECH: "💻",
    ART: "🎨",
    FOOD: "🍽️",
    OTHER: "📅",
  };
  return emojiMap[category] ?? "📅";
}

export function RecommendationsSection() {
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        const response = await fetch(
          "/api/trpc/reco.forUser?input=" +
            encodeURIComponent(JSON.stringify({ limit: 6 }))
        );
        if (!response.ok) {
          throw new Error("Failed to fetch recommendations");
        }
        const json = await response.json();
        setData(json.result?.data ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">
            Recommended for You
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-gray-100 rounded-lg h-64 animate-pulse"
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || !data || data.recommendations.length === 0) {
    return null; // Don't show section if no recommendations
  }

  const handleClick = async (
    eventId: string,
    position: number,
    score: number
  ) => {
    try {
      await fetch("/api/trpc/reco.logClick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { eventId, position, score },
        }),
      });
    } catch {
      // Silently fail - click logging is not critical
    }
  };

  return (
    <section className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold">
            {data.isPersonalized ? "Recommended for You" : "Popular Events"}
          </h2>
          <Link
            href="/events"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.recommendations.slice(0, 6).map((reco, index) => (
            <Link
              key={reco.event.id}
              href={`/events/${reco.event.slug}`}
              onClick={() => handleClick(reco.event.id, index, reco.score)}
              className="group bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="h-32 bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <span className="text-5xl">
                  {getCategoryEmoji(reco.event.category)}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 line-clamp-2 mb-2">
                  {reco.event.title}
                </h3>
                <p className="text-sm text-gray-500 mb-1">
                  {formatDate(reco.event.date)} • {reco.event.city}
                </p>
                <p className="text-sm text-gray-500 mb-2">{reco.event.venue}</p>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-600">
                    {formatPrice(reco.event.price)}
                  </span>
                  {reco.event.totalSeats > 0 && (
                    <span className="text-xs text-gray-400">
                      {reco.event.totalSeats - reco.event.bookedSeats} left
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
