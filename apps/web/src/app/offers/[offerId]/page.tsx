"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

export default function WaitlistOfferPage() {
  const params = useParams();
  const router = useRouter();
  const offerId = params.offerId as string;
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  const {
    data: offer,
    isLoading,
    error,
  } = trpc.waitlist.getOffer.useQuery({
    offerId,
  });

  const claimMutation = trpc.waitlist.claim.useMutation({
    onSuccess: (data) => {
      router.push(`/events/${data.eventId}`);
    },
    onError: (error) => {
      window.alert(error.message);
    },
  });

  useEffect(() => {
    if (!offer || offer.status !== "PENDING") return;

    const interval = setInterval(() => {
      const now = new Date();
      const expiresAt = new Date(offer.expiresAt);
      const diff = expiresAt.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("Expired");
        clearInterval(interval);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [offer]);

  const handleClaim = async () => {
    await claimMutation.mutateAsync({ offerId });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading offer...</p>
        </div>
      </div>
    );
  }

  if (error || !offer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error?.message || "Offer not found"}</p>
        </div>
      </div>
    );
  }

  if (offer.status === "EXPIRED") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Offer Expired
          </h1>
          <p className="text-gray-600 mb-6">
            This waitlist offer has expired. You may be offered another spot if
            more seats become available.
          </p>
          <button
            onClick={() => router.push("/events")}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg"
          >
            Browse Events
          </button>
        </div>
      </div>
    );
  }

  if (offer.status === "CLAIMED") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-bold text-green-600 mb-4">
            Already Claimed
          </h1>
          <p className="text-gray-600 mb-6">
            This offer has already been claimed. Please proceed to checkout.
          </p>
          <button
            onClick={() => router.push(`/events/${offer.event.id}`)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg"
          >
            Go to Event
          </button>
        </div>
      </div>
    );
  }

  const eventDate = new Date(offer.event.date);
  const formattedDate = eventDate.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = eventDate.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-green-600 to-blue-600 p-6 text-white">
            <h1 className="text-3xl font-bold mb-2">Seat Available!</h1>
            <p className="text-green-100">
              You have been offered a seat from the waitlist
            </p>
          </div>

          <div className="p-6">
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-800 font-medium">
                    Offer expires in:
                  </p>
                  <p className="text-3xl font-bold text-yellow-900">
                    {timeRemaining}
                  </p>
                </div>
                <svg
                  className="w-12 h-12 text-yellow-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {offer.event.title}
              </h2>

              <div className="space-y-3">
                <div className="flex items-start">
                  <svg
                    className="w-6 h-6 text-gray-400 mr-3 mt-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-500">Date & Time</p>
                    <p className="font-semibold text-gray-900">
                      {formattedDate}
                    </p>
                    <p className="text-gray-700">{formattedTime}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <svg
                    className="w-6 h-6 text-gray-400 mr-3 mt-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
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
                  <div>
                    <p className="text-sm text-gray-500">Venue</p>
                    <p className="font-semibold text-gray-900">
                      {offer.event.venue}
                    </p>
                    <p className="text-gray-700">{offer.event.city}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <svg
                    className="w-6 h-6 text-gray-400 mr-3 mt-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-500">Seats Available</p>
                    <p className="font-semibold text-gray-900">
                      {offer.quantity} seat{offer.quantity > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <svg
                    className="w-6 h-6 text-gray-400 mr-3 mt-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-500">Price per ticket</p>
                    <p className="font-semibold text-gray-900">
                      ₹{(offer.event.price / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleClaim}
              disabled={claimMutation.isLoading || timeRemaining === "Expired"}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              {claimMutation.isLoading
                ? "Claiming..."
                : timeRemaining === "Expired"
                  ? "Offer Expired"
                  : "Claim Seat & Proceed to Checkout"}
            </button>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Important:</strong> Click the button above to claim your
                seat and proceed to checkout. You must complete the payment
                before the timer expires.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
