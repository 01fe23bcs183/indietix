"use client";

import { useState } from "react";
import { trpc } from "../../../lib/trpc";
import { Button, Card, CardContent } from "@indietix/ui";

export default function EventsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("");

  const { data, isLoading, refetch } = trpc.admin.events.list.useQuery({
    page,
    limit: 20,
    status: (status || undefined) as "DRAFT" | "PUBLISHED" | "CANCELLED" | "SOLD_OUT" | "COMPLETED" | undefined,
  });

  const featureMutation = trpc.admin.events.feature.useMutation({
    onSuccess: () => refetch(),
  });

  const hideMutation = trpc.admin.events.hide.useMutation({
    onSuccess: () => refetch(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Events</h1>
        <p className="text-gray-600">Manage platform events</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="SOLD_OUT">Sold Out</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Organizer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Bookings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.events.map((event) => (
                    <tr key={event.id}>
                      <td className="px-6 py-4 text-sm">
                        <div>{event.title}</div>
                        {event.featured && (
                          <span className="text-xs text-blue-600">Featured</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {event.organizer.user.name}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="rounded bg-blue-100 px-2 py-1 text-xs">
                          {event.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {new Date(event.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {event.bookedSeats}/{event.totalSeats}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              featureMutation.mutate({
                                id: event.id,
                                featured: !event.featured,
                              })
                            }
                          >
                            {event.featured ? "Unfeature" : "Feature"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              hideMutation.mutate({
                                id: event.id,
                                hidden: !event.hidden,
                              })
                            }
                          >
                            {event.hidden ? "Unhide" : "Hide"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {data && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.total)} of{" "}
            {data.total} events
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page >= data.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
