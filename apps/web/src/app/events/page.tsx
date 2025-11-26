'use client';

import { useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc-provider';
import { SearchBar } from '@/components/SearchBar';
import { FilterChips } from '@/components/FilterChips';
import { EventCard } from '@/components/EventCard';
import { DebugPanel } from '@/components/DebugPanel';

// Search filters interface (matches API router)
interface SearchFilters {
  category?: string;
  dateStart?: string;
  dateEnd?: string;
  maxPrice?: number;
  minPrice?: number;
  area?: string;
  city?: string;
  startTimeWindow?: 'morning' | 'afternoon' | 'evening' | 'night';
  freeTextQuery?: string;
}

export default function EventsPage() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Partial<SearchFilters>>({});
  const [showDebug, setShowDebug] = useState(false);
  
  const isDev = process.env.NODE_ENV === 'development';
  
  const { data, isLoading, error } = trpc.search.query.useQuery(
    {
      q: query || undefined,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
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
    setFilters((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);
  
  const handleClearFilters = useCallback(() => {
    setFilters({});
    setQuery('');
  }, []);
  
  // Merge applied filters from debug info with explicit filters
  const appliedFilters = data?.debug?.appliedFilters || filters;
  
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
                {data.total} event{data.total !== 1 ? 's' : ''} found
              </p>
              {data.debug && (
                <p className="text-sm text-gray-500">
                  Query time: {data.debug.queryTime}ms
                  {data.debug.embeddingsUsed && ' (with embeddings)'}
                </p>
              )}
            </div>
            
            {data.results.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <p className="text-gray-600">No events found matching your search.</p>
                <button
                  onClick={handleClearFilters}
                  className="mt-4 text-blue-600 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.results.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    showDebug={showDebug}
                  />
                ))}
              </div>
            )}
            
            {showDebug && data.debug && (
              <DebugPanel debug={data.debug} />
            )}
          </>
        )}
      </div>
    </main>
  );
}
