"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { trpc } from "../../../../../lib/trpc";
import { Button } from "@indietix/ui";

export default function AttendeesPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading } = trpc.organizer.attendees.list.useQuery({
    eventId,
    page,
    q: search || undefined,
  });

  const { refetch: exportCsv, isFetching: isExporting } =
    trpc.organizer.attendees.exportCsv.useQuery(
      { eventId },
      {
        enabled: false,
        onSuccess: (csvData) => {
          const blob = new Blob([csvData], { type: "text/csv" });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `event-${eventId}-attendees-${new Date().toISOString().split("T")[0]}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        },
      }
    );

  const handleExport = () => {
    exportCsv();
  };

  if (isLoading) {
    return <div className="p-8">Loading attendees...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Event Attendees</h1>
        <Button onClick={handleExport} disabled={isExporting}>
          {isExporting ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-4 py-2 w-full max-w-md"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Ticket #</th>
              <th className="border p-2 text-left">Name</th>
              <th className="border p-2 text-left">Email</th>
              <th className="border p-2 text-left">Phone</th>
              <th className="border p-2 text-left">Seats</th>
              <th className="border p-2 text-left">Status</th>
              <th className="border p-2 text-left">Paid At</th>
              <th className="border p-2 text-left">Created At</th>
            </tr>
          </thead>
          <tbody>
            {data?.attendees.map((attendee: (typeof data.attendees)[0]) => (
              <tr key={attendee.ticketNumber}>
                <td className="border p-2">{attendee.ticketNumber}</td>
                <td className="border p-2">{attendee.userName}</td>
                <td className="border p-2">{attendee.userEmail}</td>
                <td className="border p-2">{attendee.userPhone || "-"}</td>
                <td className="border p-2">{attendee.seats}</td>
                <td className="border p-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      attendee.status === "CONFIRMED"
                        ? "bg-green-100 text-green-800"
                        : attendee.status === "ATTENDED"
                          ? "bg-blue-100 text-blue-800"
                          : attendee.status === "CANCELLED"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {attendee.status}
                  </span>
                </td>
                <td className="border p-2">
                  {attendee.paidAt
                    ? new Date(attendee.paidAt).toLocaleString()
                    : "-"}
                </td>
                <td className="border p-2">
                  {new Date(attendee.createdAt).toLocaleString()}
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

      {data?.attendees.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No attendees found for this event.
        </div>
      )}
    </div>
  );
}
