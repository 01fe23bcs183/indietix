'use client';

import Link from 'next/link';
import type { SearchResult } from '@indietix/search';

interface EventCardProps {
  event: SearchResult;
  showDebug?: boolean;
}

export function EventCard({ event, showDebug }: EventCardProps) {
  const formattedDate = new Date(event.startDate).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  
  const formattedPrice = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(event.price);
  
  return (
    <Link
      href={`/events/${event.slug}`}
      className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden"
    >
      {event.imageUrl && (
        <div className="aspect-video bg-gray-200 relative">
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="inline-block px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
            {event.category}
          </span>
          <span className="text-lg font-bold text-green-600">
            {formattedPrice}
          </span>
        </div>
        
        <h3 className="text-lg font-semibold mb-1 line-clamp-2">
          {event.title}
        </h3>
        
        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
          {event.description}
        </p>
        
        <div className="flex items-center gap-2 text-sm text-gray-500">
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
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span>{formattedDate}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
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
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>
            {event.venue}
            {event.area && `, ${event.area}`}
            {event.city && `, ${event.city}`}
          </span>
        </div>
        
        {event.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {event.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {showDebug && event.scoreComponents && (
          <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
            <div className="font-medium mb-1">Score: {event.score.toFixed(3)}</div>
            <div className="grid grid-cols-2 gap-1">
              <span>FTS: {event.scoreComponents.ftsRank.toFixed(3)}</span>
              <span>Trigram: {event.scoreComponents.trigramSimilarity.toFixed(3)}</span>
              <span>Recency: {event.scoreComponents.recencyBoost.toFixed(3)}</span>
              {event.scoreComponents.embeddingSimilarity !== undefined && (
                <span>Embed: {event.scoreComponents.embeddingSimilarity.toFixed(3)}</span>
              )}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
