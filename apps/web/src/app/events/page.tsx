"use client";

import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { formatINR } from "@indietix/utils";
import Link from "next/link";

export default function EventsPage(): JSX.Element {
  const [city, setCity] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [priceLte, setPriceLte] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const { data, isLoading } = trpc.search.query.useQuery({
    city: city || undefined,
    category: category
      ? (category as
          | "MUSIC"
          | "COMEDY"
          | "SPORTS"
          | "TECH"
          | "FOOD"
          | "ART"
          | "OTHER")
      : undefined,
    priceLte: priceLte ? parseInt(priceLte) : undefined,
    dateFrom: dateFrom ? new Date(dateFrom) : undefined,
    dateTo: dateTo ? new Date(dateTo) : undefined,
    orderBy: "date_asc",
  });

  const events = data?.events || [];

  const getSeatsLeft = (
    event: (typeof events)[0]
  ): { seatsLeft: number; bookedSeats: number } => {
    const bookedSeats = event._count?.bookings || 0;
    const seatsLeft = event.totalSeats - bookedSeats;
    return { seatsLeft, bookedSeats };
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Discover Events</h1>

        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">City</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
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
              value={category}
              onChange={(e) => setCategory(e.target.value)}
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

          <div>
            <label className="block text-sm font-medium mb-2">Max Price</label>
            <input
              type="number"
              value={priceLte}
              onChange={(e) => setPriceLte(e.target.value)}
              placeholder="e.g., 2000"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">From Date</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">To Date</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading events...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No events found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {events.map((event: (typeof events)[0]) => {
              const { seatsLeft } = getSeatsLeft(event);
              return (
                <Link
                  key={event.id}
                  href={`/events/${event.slug}`}
                  className="block group"
                >
                  <div className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <span className="text-4xl">🎉</span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {event.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {new Date(event.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground mb-3">
                        📍 {event.city}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-lg">
                          {formatINR(event.price)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {seatsLeft} seats left
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {data && data.total > 0 && (
          <div className="mt-8 text-center text-sm text-muted-foreground">
            Showing {events.length} of {data.total} events
          </div>
        )}
      </div>
    </div>
  );
}
