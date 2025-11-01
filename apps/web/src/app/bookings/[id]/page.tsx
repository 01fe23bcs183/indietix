"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import type { SignedTicket } from "@indietix/utils";

interface TicketData {
  payload: {
    bookingId: string;
    userId: string;
    eventId: string;
    ts: number;
  };
  signature: string;
  event: {
    title: string;
    date: string;
    venue: string;
    city: string;
  };
  ticketNumber: string;
  seats: number;
}

export default function BookingTicketPage() {
  const params = useParams();
  const bookingId = params.id as string;
  const [ticket, setTicket] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    async function fetchTicket() {
      try {
        const response = await fetch(`/api/tickets/${bookingId}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch ticket");
        }

        const data = await response.json();
        setTicket(data);
        localStorage.setItem(`ticket-${bookingId}`, JSON.stringify(data));
      } catch (err) {
        const cachedTicket = localStorage.getItem(`ticket-${bookingId}`);
        if (cachedTicket) {
          setTicket(JSON.parse(cachedTicket));
          setIsOffline(true);
        } else {
          setError(
            err instanceof Error ? err.message : "Failed to load ticket"
          );
        }
      } finally {
        setLoading(false);
      }
    }

    fetchTicket();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your ticket...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Ticket Not Found
          </h1>
          <p className="text-gray-600">
            Unable to load ticket. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  const qrData: SignedTicket = {
    payload: ticket.payload,
    signature: ticket.signature,
  };

  const eventDate = new Date(ticket.event.date);
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

  const handleAddToCalendar = () => {
    const startDate = new Date(ticket.event.date);
    const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);

    const formatDateForCalendar = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ticket.event.title)}&dates=${formatDateForCalendar(startDate)}/${formatDateForCalendar(endDate)}&details=${encodeURIComponent(`Ticket Number: ${ticket.ticketNumber}\nSeats: ${ticket.seats}`)}&location=${encodeURIComponent(`${ticket.event.venue}, ${ticket.event.city}`)}`;

    window.open(calendarUrl, "_blank");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {isOffline && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-yellow-600 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-yellow-800 font-medium">
                Works offline - Your ticket is cached locally
              </span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
            <h1 className="text-3xl font-bold mb-2">{ticket.event.title}</h1>
            <p className="text-purple-100">Ticket #{ticket.ticketNumber}</p>
          </div>

          <div className="p-6">
            <div className="flex justify-center mb-6">
              <div className="bg-white p-4 rounded-lg border-4 border-gray-200">
                <QRCodeSVG
                  value={JSON.stringify(qrData)}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
              </div>
            </div>

            <div className="space-y-4 mb-6">
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
                  <p className="font-semibold text-gray-900">{formattedDate}</p>
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
                    {ticket.event.venue}
                  </p>
                  <p className="text-gray-700">{ticket.event.city}</p>
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
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                <div>
                  <p className="text-sm text-gray-500">Number of Seats</p>
                  <p className="font-semibold text-gray-900">{ticket.seats}</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleAddToCalendar}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              Add to Calendar
            </button>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Important:</strong> Present this QR code at the venue
                entrance for check-in. This ticket works offline once loaded.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
