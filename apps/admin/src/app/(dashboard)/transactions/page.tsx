"use client";

import { useState } from "react";
import { trpc } from "../../../lib/trpc";
import { Button, Card, CardContent } from "@indietix/ui";

export default function TransactionsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("");

  const { data, isLoading } = trpc.admin.transactions.list.useQuery({
    page,
    limit: 20,
    status: (status || undefined) as "PENDING" | "CONFIRMED" | "CANCELLED" | undefined,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Transactions</h1>
        <p className="text-gray-600">Manage bookings and transactions</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
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
                      Ticket #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.bookings.map((booking) => (
                    <tr key={booking.id}>
                      <td className="px-6 py-4 text-sm font-mono">
                        {booking.ticketNumber}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>{booking.user.name}</div>
                        <div className="text-xs text-gray-500">
                          {booking.user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">{booking.event.title}</td>
                      <td className="px-6 py-4 text-sm">
                        ₹{(booking.finalAmount / 100).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`rounded px-2 py-1 text-xs ${
                            booking.status === "CONFIRMED"
                              ? "bg-green-100 text-green-800"
                              : booking.status === "PENDING"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {new Date(booking.createdAt).toLocaleDateString()}
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
            {data.total} transactions
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
