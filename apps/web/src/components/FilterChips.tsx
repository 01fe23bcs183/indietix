'use client';

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

interface FilterChipsProps {
  filters: SearchFilters;
  onRemove: (key: keyof SearchFilters) => void;
  onClear: () => void;
}

const FILTER_LABELS: Record<keyof SearchFilters, string> = {
  category: 'Category',
  dateStart: 'From',
  dateEnd: 'Until',
  maxPrice: 'Max Price',
  minPrice: 'Min Price',
  area: 'Area',
  city: 'City',
  startTimeWindow: 'Time',
  freeTextQuery: 'Search',
};

function formatFilterValue(key: keyof SearchFilters, value: unknown): string {
  if (key === 'minPrice' || key === 'maxPrice') {
    return `₹${value}`;
  }
  if (key === 'dateStart' || key === 'dateEnd') {
    return new Date(value as string).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  }
  return String(value);
}

export function FilterChips({ filters, onRemove, onClear }: FilterChipsProps) {
  const filterEntries = Object.entries(filters).filter(
    ([, value]) => value !== undefined && value !== null && value !== ''
  ) as Array<[keyof SearchFilters, unknown]>;
  
  if (filterEntries.length === 0) {
    return null;
  }
  
  return (
    <div className="flex flex-wrap gap-2 mt-4">
      {filterEntries.map(([key, value]) => (
        <span
          key={key}
          className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
        >
          <span className="font-medium">{FILTER_LABELS[key]}:</span>
          <span>{formatFilterValue(key, value)}</span>
          <button
            onClick={() => onRemove(key)}
            className="ml-1 hover:text-blue-600"
            aria-label={`Remove ${FILTER_LABELS[key]} filter`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </span>
      ))}
      
      {filterEntries.length > 1 && (
        <button
          onClick={onClear}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:underline"
        >
          Clear all
        </button>
      )}
    </div>
  );
}
