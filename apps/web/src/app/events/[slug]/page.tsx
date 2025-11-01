"use client";

import { useState } from "react";
import { trpc } from "../../../lib/trpc";
import { Button, PriceBreakdown } from "@indietix/ui";
import { formatINR, FEES, GST_RATE } from "@indietix/utils";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function EventDetailPage(): JSX.Element {
  const params = useParams();
  const slug = params.slug as string;
  const [quantity, setQuantity] = useState(1);

  const { data: event, isLoading } = trpc.events.getBySlug.useQuery({
    slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading event...</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Event Not Found</h1>
          <Link href="/events">
            <Button>Browse Events</Button>
          </Link>
        </div>
      </div>
    );
  }

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${event.venue}, ${event.city}`
  )}`;

  return (
    <>
      <title>{event.title} | IndieTix</title>
      <meta name="description" content={event.description} />
      <meta property="og:title" content={event.title} />
      <meta property="og:description" content={event.description} />
      <meta property="og:type" content="website" />
      <meta
        property="og:url"
        content={`https://indietix.com/events/${event.slug}`}
      />

      <div className="min-h-screen bg-background">
        <div className="aspect-[21/9] bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
          <span className="text-9xl">🎉</span>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <div className="mb-4">
                <Link
                  href="/events"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  ← Back to Events
                </Link>
              </div>

              <h1 className="text-4xl font-bold mb-4">{event.title}</h1>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📅</span>
                  <div>
                    <p className="font-medium">Date & Time</p>
                    <p className="text-muted-foreground">
                      {new Date(event.date).toLocaleDateString("en-IN", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-muted-foreground">
                      {new Date(event.date).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-2xl">📍</span>
                  <div>
                    <p className="font-medium">Venue</p>
                    <p className="text-muted-foreground">{event.venue}</p>
                    <p className="text-muted-foreground">{event.city}</p>
                    <a
                      href={mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      View on Google Maps →
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-2xl">🎭</span>
                  <div>
                    <p className="font-medium">Category</p>
                    <p className="text-muted-foreground">
                      {event.category.charAt(0) +
                        event.category.slice(1).toLowerCase()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-2xl font-semibold mb-4">
                  About This Event
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  {event.description}
                </p>
              </div>

              <div className="border rounded-lg p-6 bg-card">
                <h3 className="text-xl font-semibold mb-4">Organizer</h3>
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                    🏢
                  </div>
                  <div>
                    <p className="font-semibold text-lg">
                      {event.organizer.businessName}
                    </p>
                    {event.organizer.verified && (
                      <p className="text-sm text-primary">✓ Verified</p>
                    )}
                    {event.organizer.description && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {event.organizer.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-1">
              <div className="sticky top-8 space-y-6">
                <div className="border rounded-lg p-6 bg-card">
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground mb-1">
                      Ticket Price
                    </p>
                    <p className="text-3xl font-bold">
                      {formatINR(event.price)}
                    </p>
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">
                      Number of Tickets
                    </label>
                    <select
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <option key={num} value={num}>
                          {num} {num === 1 ? "ticket" : "tickets"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <PriceBreakdown
                    basePrice={event.price * quantity}
                    feesConfig={FEES}
                    gstRate={GST_RATE}
                    className="mb-6"
                  />

                  <Button className="w-full" size="lg">
                    Book Now
                  </Button>

                  <p className="text-xs text-center text-muted-foreground mt-4">
                    {event.totalSeats} total seats available
                  </p>
                </div>

                <div className="border rounded-lg p-4 bg-muted/50">
                  <h4 className="font-semibold mb-2 text-sm">
                    💡 Transparent Pricing
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    We believe in complete transparency. All fees are clearly
                    broken down so you know exactly what you&apos;re paying
                    for.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
