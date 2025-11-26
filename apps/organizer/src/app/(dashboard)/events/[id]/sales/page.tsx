"use client";

import { useParams } from "next/navigation";
import { trpc } from "../../../../../lib/trpc";
import { Button } from "@indietix/ui";
import { useState, useEffect } from "react";

function formatCountdown(endsAt: Date): string {
  const now = new Date();
  const diff = endsAt.getTime() - now.getTime();

  if (diff <= 0) return "Ended";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default function EventSalesPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [countdown, setCountdown] = useState<string>("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: event, isLoading: eventLoading } =
    trpc.organizer.events.get.useQuery({ id: eventId });

  const { data: suggestions } = trpc.flash.suggestions.useQuery({
    windowHours: 6,
  });

  const { data: flashSales, refetch: refetchFlashSales } =
    trpc.flash.listForEvent.useQuery({ eventId });

  const { data: activeFlashSale } = trpc.flash.getActiveForEvent.useQuery({
    eventId,
  });

  const createMutation = trpc.flash.create.useMutation({
    onSuccess: () => {
      refetchFlashSales();
      setShowCreateDialog(false);
    },
  });

  const cancelMutation = trpc.flash.cancel.useMutation({
    onSuccess: () => {
      refetchFlashSales();
    },
  });

  // Update countdown every second
  useEffect(() => {
    if (!activeFlashSale) return;

    const interval = setInterval(() => {
      setCountdown(formatCountdown(new Date(activeFlashSale.endsAt)));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeFlashSale]);

  // Get suggestion for this event
  const eventSuggestion = suggestions?.find((s) => s.event.id === eventId);

  if (eventLoading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!event) {
    return <div className="p-8">Event not found</div>;
  }

  const remainingSeats = event.totalSeats - event.bookedSeats;
  const sellThrough = (event.bookedSeats / event.totalSeats) * 100;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Flash Sales</h1>
        <a
          href={`/events/${eventId}`}
          className="text-blue-600 hover:underline"
        >
          Back to Event
        </a>
      </div>

      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">{event.title}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Base Price:</span>
            <div className="font-semibold">{formatPrice(event.price)}</div>
          </div>
          <div>
            <span className="text-gray-500">Booked:</span>
            <div className="font-semibold">
              {event.bookedSeats} / {event.totalSeats}
            </div>
          </div>
          <div>
            <span className="text-gray-500">Sell-through:</span>
            <div className="font-semibold">{sellThrough.toFixed(1)}%</div>
          </div>
          <div>
            <span className="text-gray-500">Remaining:</span>
            <div className="font-semibold">{remainingSeats} seats</div>
          </div>
        </div>
      </div>

      {activeFlashSale && (
        <div className="mb-8 p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">
                Active Flash Sale
              </h3>
              <p className="text-yellow-700">
                {activeFlashSale.discountPercent}% OFF
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-yellow-800">
                {countdown}
              </div>
              <div className="text-sm text-yellow-600">Time Remaining</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-yellow-600">Flash Price:</span>
              <div className="font-semibold">
                {formatPrice(
                  Math.round(
                    event.price * (1 - activeFlashSale.discountPercent / 100)
                  )
                )}
              </div>
            </div>
            <div>
              <span className="text-yellow-600">Max Seats:</span>
              <div className="font-semibold">{activeFlashSale.maxSeats}</div>
            </div>
            <div>
              <span className="text-yellow-600">Sold:</span>
              <div className="font-semibold">{activeFlashSale.soldSeats}</div>
            </div>
          </div>
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => cancelMutation.mutate({ id: activeFlashSale.id })}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel Flash Sale"}
            </Button>
          </div>
        </div>
      )}

      {eventSuggestion?.suggestion.shouldTrigger && !activeFlashSale && (
        <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800">
            Flash Sale Suggestion
          </h3>
          <p className="text-blue-700 mt-2">
            {eventSuggestion.suggestion.reason}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-blue-600">Suggested Discount:</span>
              <div className="font-semibold">
                {eventSuggestion.suggestion.suggestedDiscount}%
              </div>
            </div>
            <div>
              <span className="text-blue-600">Max Seats:</span>
              <div className="font-semibold">
                {eventSuggestion.suggestion.suggestedMaxSeats}
              </div>
            </div>
            <div>
              <span className="text-blue-600">Duration:</span>
              <div className="font-semibold">
                {eventSuggestion.suggestion.suggestedDurationHours}h
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={() => setShowCreateDialog(true)}>
              Start Flash Sale
            </Button>
          </div>
        </div>
      )}

      {!activeFlashSale && !eventSuggestion?.suggestion.shouldTrigger && (
        <div className="mb-8">
          <Button onClick={() => setShowCreateDialog(true)}>
            Create Flash Sale
          </Button>
        </div>
      )}

      {showCreateDialog && (
        <CreateFlashSaleDialog
          eventId={eventId}
          basePrice={event.price}
          remainingSeats={remainingSeats}
          suggestion={eventSuggestion?.suggestion}
          onClose={() => setShowCreateDialog(false)}
          onSubmit={(data) => {
            createMutation.mutate(data);
          }}
          isPending={createMutation.isPending}
          error={createMutation.error?.message}
        />
      )}

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Flash Sale History</h3>
        {flashSales && flashSales.length > 0 ? (
          <div className="space-y-4">
            {flashSales.map((sale) => (
              <div
                key={sale.id}
                className="p-4 border rounded-lg flex justify-between items-center"
              >
                <div>
                  <div className="font-semibold">{sale.discountPercent}% OFF</div>
                  <div className="text-sm text-gray-500">
                    {new Date(sale.startsAt).toLocaleString()} -{" "}
                    {new Date(sale.endsAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`px-2 py-1 rounded text-sm ${
                      sale.status === "ACTIVE"
                        ? "bg-green-100 text-green-800"
                        : sale.status === "ENDED"
                          ? "bg-gray-100 text-gray-800"
                          : sale.status === "CANCELLED"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {sale.status}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {sale.soldSeats} / {sale.maxSeats} sold
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No flash sales yet</p>
        )}
      </div>
    </div>
  );
}

function CreateFlashSaleDialog({
  eventId,
  basePrice,
  remainingSeats,
  suggestion,
  onClose,
  onSubmit,
  isPending,
  error,
}: {
  eventId: string;
  basePrice: number;
  remainingSeats: number;
  suggestion?: {
    suggestedDiscount: number;
    suggestedMaxSeats: number;
    suggestedDurationHours: number;
  };
  onClose: () => void;
  onSubmit: (data: {
    eventId: string;
    discountPercent: number;
    durationHours: number;
    maxSeats: number;
  }) => void;
  isPending: boolean;
  error?: string;
}) {
  const [discountPercent, setDiscountPercent] = useState(
    suggestion?.suggestedDiscount ?? 20
  );
  const [durationHours, setDurationHours] = useState(
    suggestion?.suggestedDurationHours ?? 2
  );
  const [maxSeats, setMaxSeats] = useState(
    suggestion?.suggestedMaxSeats ?? Math.floor(remainingSeats * 0.5)
  );

  const flashPrice = Math.round(basePrice * (1 - discountPercent / 100));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-semibold mb-4">Create Flash Sale</h3>

        <div className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">
              Discount Percentage
            </label>
            <input
              type="number"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Number(e.target.value))}
              min={1}
              max={100}
              className="w-full border rounded px-3 py-2"
            />
            <div className="text-sm text-gray-500 mt-1">
              Flash price: {formatPrice(flashPrice)} (was{" "}
              {formatPrice(basePrice)})
            </div>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">
              Duration (hours)
            </label>
            <input
              type="number"
              value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))}
              min={0.5}
              max={24}
              step={0.5}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">
              Max Seats (of {remainingSeats} remaining)
            </label>
            <input
              type="number"
              value={maxSeats}
              onChange={(e) => setMaxSeats(Number(e.target.value))}
              min={1}
              max={remainingSeats}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              onClick={() =>
                onSubmit({
                  eventId,
                  discountPercent,
                  durationHours,
                  maxSeats,
                })
              }
              disabled={isPending}
            >
              {isPending ? "Creating..." : "Start Flash Sale"}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
