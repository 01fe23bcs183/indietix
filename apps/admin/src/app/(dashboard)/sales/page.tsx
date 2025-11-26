"use client";

import { trpc } from "../../../lib/trpc";
import { Button } from "@indietix/ui";
import { useState } from "react";

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default function AdminSalesDashboard() {
  const [statusFilter, setStatusFilter] = useState<
    "PENDING" | "ACTIVE" | "ENDED" | "CANCELLED" | undefined
  >(undefined);
  const [cityFilter, setCityFilter] = useState<string>("");
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch } = trpc.flash.adminList.useQuery({
    status: statusFilter,
    city: cityFilter || undefined,
    page,
    limit: 20,
  });

  const stopMutation = trpc.flash.adminStop.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  if (isLoading) {
    return <div className="p-8">Loading flash sales...</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Flash Sales Dashboard</h1>

      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            value={statusFilter ?? ""}
            onChange={(e) =>
              setStatusFilter(
                (e.target.value as "PENDING" | "ACTIVE" | "ENDED" | "CANCELLED") ||
                  undefined
              )
            }
            className="border rounded px-3 py-2"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ACTIVE">Active</option>
            <option value="ENDED">Ended</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">City</label>
          <input
            type="text"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder="Filter by city..."
            className="border rounded px-3 py-2"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Event
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Organizer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Discount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sold
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Time Window
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data?.flashSales.map((sale) => (
              <tr key={sale.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {sale.event.title}
                  </div>
                  <div className="text-sm text-gray-500">
                    {sale.event.city} - {formatPrice(sale.event.price)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {sale.event.organizer?.businessName ?? "Unknown"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-green-600">
                    {sale.discountPercent}% OFF
                  </div>
                  <div className="text-sm text-gray-500">
                    {formatPrice(
                      Math.round(
                        sale.event.price * (1 - sale.discountPercent / 100)
                      )
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {sale.soldSeats} / {sale.maxSeats}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>{new Date(sale.startsAt).toLocaleString()}</div>
                  <div>{new Date(sale.endsAt).toLocaleString()}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {(sale.status === "ACTIVE" || sale.status === "PENDING") && (
                    <Button
                      variant="outline"
                      onClick={() => stopMutation.mutate({ id: sale.id })}
                      disabled={stopMutation.isPending}
                    >
                      Stop
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && data.totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="px-4 py-2">
            Page {page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {data?.flashSales.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No flash sales found
        </div>
      )}
    </div>
  );
}
