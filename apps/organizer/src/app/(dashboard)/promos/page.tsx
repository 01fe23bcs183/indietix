"use client";

import { useState } from "react";
import { trpc } from "../../../lib/trpc";
import { Button } from "@indietix/ui";
import Link from "next/link";
import { formatINR } from "@indietix/utils";

export default function PromosPage() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "active" | "inactive"
  >("all");

  const { data, isLoading, error, refetch } = trpc.promos.list.useQuery();

  const disableMutation = trpc.promos.disable.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleDisable = async (id: string) => {
    if (window.confirm("Are you sure you want to disable this promo code?")) {
      await disableMutation.mutateAsync({ id });
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading promo codes...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Promo Codes</h1>
        <Link href="/promos/new">
          <Button>Create Promo Code</Button>
        </Link>
      </div>

      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Search promo codes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded px-4 py-2 flex-1"
        />
        <select
          value={activeFilter}
          onChange={(e) =>
            setActiveFilter(e.target.value as typeof activeFilter)
          }
          className="border rounded px-4 py-2"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Code</th>
              <th className="border p-2 text-left">Type</th>
              <th className="border p-2 text-left">Value</th>
              <th className="border p-2 text-left">Usage</th>
              <th className="border p-2 text-left">Valid Period</th>
              <th className="border p-2 text-left">Status</th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.map((promo) => (
              <tr key={promo.id}>
                <td className="border p-2 font-mono font-bold">{promo.code}</td>
                <td className="border p-2">
                  <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                    {promo.type}
                  </span>
                </td>
                <td className="border p-2">
                  {promo.type === "PERCENT"
                    ? `${promo.value}%`
                    : formatINR(promo.value)}
                </td>
                <td className="border p-2">
                  {promo._count.bookings}
                  {promo.usageLimit && ` / ${promo.usageLimit}`}
                </td>
                <td className="border p-2 text-sm">
                  {promo.startAt && (
                    <div>
                      From: {new Date(promo.startAt).toLocaleDateString()}
                    </div>
                  )}
                  {promo.endAt && (
                    <div>To: {new Date(promo.endAt).toLocaleDateString()}</div>
                  )}
                  {!promo.startAt && !promo.endAt && (
                    <div className="text-gray-500">No expiry</div>
                  )}
                </td>
                <td className="border p-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      promo.active
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {promo.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="border p-2">
                  <div className="flex gap-2">
                    <Link href={`/promos/${promo.id}`}>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </Link>
                    <Link href={`/promos/${promo.id}/edit`}>
                      <Button size="sm" variant="outline">
                        Edit
                      </Button>
                    </Link>
                    {promo.active && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDisable(promo.id)}
                      >
                        Disable
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
