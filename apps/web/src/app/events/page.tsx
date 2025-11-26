"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc-provider";
import { SearchBar } from "@/components/SearchBar";
import { FilterChips } from "@/components/FilterChips";
import { DebugPanel } from "@/components/DebugPanel";
import { formatINR } from "@indietix/utils";

// Search filters interface (matches API router)
interface SearchFilters {
  category?: string;
  dateStart?: string;
  dateEnd?: string;
  maxPrice?: number;
  minPrice?: number;
  area?: string;
  city?: string;
  startTimeWindow?: "morning" | "afternoon" | "evening" | "night";
  freeTextQuery?: string;
}

export default function EventsPage() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Partial<SearchFilters>>({});
  const [showDebug, setShowDebug] = useState(false);

  // Traditional filter dropdowns (for backward compatibility with E2E tests)
  const [cityFilter, setCityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const isDev = process.env.NODE_ENV === "development";

  // Merge dropdown filters with NL-parsed filters
  const mergedFilters: Partial<SearchFilters> = {
    ...filters,
    ...(cityFilter ? { city: cityFilter } : {}),
    ...(categoryFilter ? { category: categoryFilter } : {}),
  };

  const { data, isLoading, error } = trpc.search.query.useQuery(
    {
      q: query || undefined,
      filters:
        Object.keys(mergedFilters).length > 0 ? mergedFilters : undefined,
      debug: showDebug,
      limit: 20,
    },
    {
      enabled: true,
      staleTime: 30000,
    }
  );

  const handleSearch = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  const handleRemoveFilter = useCallback((key: keyof SearchFilters) => {
    // Also clear dropdown filters if they match
    if (key === "city") setCityFilter("");
    if (key === "category") setCategoryFilter("");
    setFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({});
    setQuery("");
    setCityFilter("");
    setCategoryFilter("");
  }, []);

  // Merge applied filters from debug info with explicit filters
  const appliedFilters = data?.debug?.appliedFilters || mergedFilters;

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Discover Events</h1>

          <SearchBar
            value={query}
            onChange={handleSearch}
            placeholder="Try: comedy tonight under 600 near indiranagar"
          />

          {/* Traditional filter dropdowns for backward compatibility */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">City</label>
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">All Cities</option>
                <option value="Bengaluru">Bengaluru</option>
                <option value="Mumbai">Mumbai</option>
                <option value="Delhi">Delhi</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">All Categories</option>
                <option value="MUSIC">Music</option>
                <option value="COMEDY">Comedy</option>
                <option value="SPORTS">Sports</option>
                <option value="TECH">Tech</option>
                <option value="FOOD">Food</option>
                <option value="ART">Art</option>
                <option value="OTHER">Workshop</option>
              </select>
            </div>
          </div>

          {Object.keys(appliedFilters).length > 0 && (
            <FilterChips
              filters={appliedFilters}
              onRemove={handleRemoveFilter}
              onClear={handleClearFilters}
            />
          )}

          {isDev && (
            <div className="mt-4">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={showDebug}
                  onChange={(e) => setShowDebug(e.target.checked)}
                  className="rounded"
                />
                Show debug info
              </label>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Searching events...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            Error loading events: {error.message}
          </div>
        )}

        {data && (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-gray-600">
                {data.total} event{data.total !== 1 ? "s" : ""} found
              </p>
              {data.debug && (
                <p className="text-sm text-gray-500">
                  Query time: {data.debug.queryTime}ms
                  {data.debug.embeddingsUsed && " (with embeddings)"}
                </p>
              )}
            </div>

            {data.results.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-600">
                  No events found matching your search.
                </p>
                <button
                  onClick={handleClearFilters}
                  className="mt-4 text-blue-600 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {data.results.map((event) => {
                  const bookedSeats = event._count?.bookings || 0;
                  const seatsLeft = event.totalSeats - bookedSeats;
                  return (
                    <Link
                      key={event.id}
                      href={`/events/${event.slug}`}
                      className="block group"
                    >
                      <div className="card border rounded-lg overflow-hidden hover:shadow-lg transition-shadow bg-white">
                        <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                          <span className="text-4xl">🎉</span>
                        </div>
                        <div className="p-4">
                          <h3 className="card-title font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
                            {event.title}
                          </h3>
                          <p className="text-sm text-gray-500 mb-2">
                            {new Date(event.date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          <p className="text-sm text-gray-500 mb-3">
                            📍 {event.city}
                          </p>
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-lg">
                              {formatINR(event.price)}
                            </span>
                            <span className="text-sm text-gray-500">
                              {seatsLeft} seats left
                            </span>
                          </div>
                          {showDebug && event.score !== undefined && (
                            <div className="mt-2 text-xs text-gray-400">
                              Score: {event.score.toFixed(3)}
                            </div>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {showDebug && data.debug && <DebugPanel debug={data.debug} />}
          </>
        )}
      </div>
    </main>
  );
}
