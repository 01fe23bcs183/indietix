"use client";

import { useState } from "react";
import { trpc } from "../../../lib/trpc";
import { Button } from "@indietix/ui";
import Link from "next/link";

export default function EventsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "DRAFT" | "PUBLISHED" | "CANCELLED" | "SOLD_OUT" | "COMPLETED" | ""
  >("");
  const [cityFilter, setCityFilter] = useState("");

  const { data, isLoading, error } = trpc.organizer.events.list.useQuery({
    page,
    q: search || undefined,
    status: statusFilter || undefined,
    city: cityFilter || undefined,
  });

  const setStatusMutation = trpc.organizer.events.setStatus.useMutation();
  const duplicateMutation = trpc.organizer.events.duplicate.useMutation();

  const handleStatusChange = async (
    id: string,
    status: "DRAFT" | "PUBLISHED" | "CANCELLED" | "SOLD_OUT" | "COMPLETED"
  ) => {
    await setStatusMutation.mutateAsync({ id, status });
  };

  const handleDuplicate = async (id: string) => {
    await duplicateMutation.mutateAsync({ id });
  };

  if (isLoading) {
    return <div className="p-8">Loading events...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Events</h1>
        <Link href="/events/new">
          <Button>Create Event</Button>
        </Link>
      </div>

      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-4 py-2 flex-1"
        />
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as typeof statusFilter)
          }
          className="border rounded px-4 py-2"
        >
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="SOLD_OUT">Sold Out</option>
          <option value="COMPLETED">Completed</option>
        </select>
        <input
          type="text"
          placeholder="Filter by city..."
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="border rounded px-4 py-2"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Title</th>
              <th className="border p-2 text-left">City</th>
              <th className="border p-2 text-left">Date</th>
              <th className="border p-2 text-left">Status</th>
              <th className="border p-2 text-left">Bookings</th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.events.map((event) => (
              <tr key={event.id}>
                <td className="border p-2">{event.title}</td>
                <td className="border p-2">{event.city}</td>
                <td className="border p-2">
                  {new Date(event.date).toLocaleDateString()}
                </td>
                <td className="border p-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      event.status === "PUBLISHED"
                        ? "bg-green-100 text-green-800"
                        : event.status === "DRAFT"
                          ? "bg-gray-100 text-gray-800"
                          : event.status === "CANCELLED"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {event.status}
                  </span>
                </td>
                <td className="border p-2">{event._count.bookings}</td>
                <td className="border p-2">
                  <div className="flex gap-2">
                    <Link href={`/events/${event.id}`}>
                      <Button size="sm" variant="outline">
                        Edit
                      </Button>
                    </Link>
                    <Link href={`/events/${event.id}/attendees`}>
                      <Button size="sm" variant="outline">
                        Attendees
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDuplicate(event.id)}
                    >
                      Duplicate
                    </Button>
                    {event.status === "DRAFT" && (
                      <Button
                        size="sm"
                        onClick={() =>
                          handleStatusChange(event.id, "PUBLISHED")
                        }
                      >
                        Publish
                      </Button>
                    )}
                    {event.status === "PUBLISHED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleStatusChange(event.id, "CANCELLED")
                        }
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <Button
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
            variant="outline"
          >
            Previous
          </Button>
          <span className="px-4 py-2">
            Page {page} of {data.totalPages}
          </span>
          <Button
            disabled={page === data.totalPages}
            onClick={() => setPage(page + 1)}
            variant="outline"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
