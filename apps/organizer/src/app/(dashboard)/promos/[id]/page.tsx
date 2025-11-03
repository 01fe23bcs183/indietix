"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "../../../../lib/trpc";
import { Button } from "@indietix/ui";
import Link from "next/link";
import { formatINR } from "@indietix/utils";

export default function PromoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: promo, isLoading, error } = trpc.promos.get.useQuery({ id });

  const disableMutation = trpc.promos.disable.useMutation({
    onSuccess: () => {
      router.push("/promos");
    },
  });

  const handleDisable = async () => {
    if (window.confirm("Are you sure you want to disable this promo code?")) {
      await disableMutation.mutateAsync({ id });
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading promo code...</div>;
  }

  if (error || !promo) {
    return (
      <div className="p-8 text-red-500">
        Error: {error?.message || "Promo code not found"}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Promo Code Details</h1>
        <div className="flex gap-2">
          <Link href="/promos">
            <Button variant="outline">Back to List</Button>
          </Link>
          {promo.active && (
            <>
              <Link href={`/promos/${id}/edit`}>
                <Button variant="outline">Edit</Button>
              </Link>
              <Button variant="destructive" onClick={handleDisable}>
                Disable
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6 space-y-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-2">
              Promo Code
            </h3>
            <p className="text-2xl font-mono font-bold">{promo.code}</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-500 mb-2">Status</h3>
            <span
              className={`inline-block px-3 py-1 rounded text-sm font-semibold ${
                promo.active
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {promo.active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">Discount Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-1">Type</h3>
              <p className="text-lg">
                <span className="px-2 py-1 rounded text-sm bg-blue-100 text-blue-800">
                  {promo.type}
                </span>
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-1">
                Value
              </h3>
              <p className="text-lg font-semibold">
                {promo.type === "PERCENT"
                  ? `${promo.value}%`
                  : formatINR(promo.value)}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">Validity Period</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-1">
                Start Date
              </h3>
              <p className="text-lg">
                {promo.startAt ? (
                  new Date(promo.startAt).toLocaleString()
                ) : (
                  <span className="text-gray-400">Immediate</span>
                )}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-1">
                End Date
              </h3>
              <p className="text-lg">
                {promo.endAt ? (
                  new Date(promo.endAt).toLocaleString()
                ) : (
                  <span className="text-gray-400">No expiry</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">Usage Limits</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-1">
                Total Usage
              </h3>
              <p className="text-lg font-semibold">
                {promo._count.bookings}
                {promo.usageLimit && ` / ${promo.usageLimit}`}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-1">
                Per User Limit
              </h3>
              <p className="text-lg">
                {promo.perUserLimit || (
                  <span className="text-gray-400">Unlimited</span>
                )}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-1">
                Min Purchase
              </h3>
              <p className="text-lg">
                {promo.minPrice ? (
                  formatINR(promo.minPrice)
                ) : (
                  <span className="text-gray-400">None</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">Applicability</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">
                Categories
              </h3>
              {promo.applicableCategories &&
              promo.applicableCategories.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {promo.applicableCategories.map((cat) => (
                    <span
                      key={cat}
                      className="px-3 py-1 bg-gray-100 rounded text-sm"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">All categories</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">
                Cities
              </h3>
              {promo.applicableCities && promo.applicableCities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {promo.applicableCities.map((city) => (
                    <span
                      key={city}
                      className="px-3 py-1 bg-gray-100 rounded text-sm"
                    >
                      {city}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">All cities</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">
                Events
              </h3>
              {promo.applicableEvents && promo.applicableEvents.length > 0 ? (
                <p className="text-sm">
                  {promo.applicableEvents.length} specific events
                </p>
              ) : (
                <p className="text-gray-400">All events</p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">Metadata</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-1">
                Created
              </h3>
              <p>{new Date(promo.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-1">
                Last Updated
              </h3>
              <p>{new Date(promo.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
