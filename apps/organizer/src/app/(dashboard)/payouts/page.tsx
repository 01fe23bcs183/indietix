"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@indietix/ui";
import { formatINR } from "@indietix/utils";

export default function PayoutsPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const { data: pendingPayouts, refetch: refetchPending } =
    trpc.payouts.organizer.list.useQuery({
      status: "PENDING",
      page: 1,
    });

  const { data: completedPayouts } = trpc.payouts.organizer.list.useQuery({
    status: "COMPLETED",
    page: 1,
  });

  const createPayoutMutation = trpc.payouts.organizer.create.useMutation({
    onSuccess: () => {
      setShowRequestDialog(false);
      setPeriodStart("");
      setPeriodEnd("");
      refetchPending();
    },
  });

  const handleRequestPayout = () => {
    if (!periodStart || !periodEnd) {
      alert("Please select both start and end dates");
      return;
    }

    createPayoutMutation.mutate({
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
    });
  };

  const payouts = activeTab === "pending" ? pendingPayouts : completedPayouts;
  const payoutsList = (payouts?.payouts || []) as unknown as Array<{
    id: string;
    amount: number;
    status: string;
    periodStart: string;
    periodEnd: string;
    createdAt: string;
    breakdown: unknown;
  }>;

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Payouts</h1>
        <Button onClick={() => setShowRequestDialog(true)}>
          Request Payout
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          className={`px-4 py-2 ${
            activeTab === "pending"
              ? "border-b-2 border-blue-500 font-semibold"
              : "text-gray-600"
          }`}
          onClick={() => setActiveTab("pending")}
        >
          Pending
        </button>
        <button
          className={`px-4 py-2 ${
            activeTab === "completed"
              ? "border-b-2 border-blue-500 font-semibold"
              : "text-gray-600"
          }`}
          onClick={() => setActiveTab("completed")}
        >
          Completed
        </button>
      </div>

      {/* Payouts List */}
      <div className="space-y-4">
        {payoutsList.map((payout) => {
          const breakdown = payout.breakdown as {
            gmv: number;
            refunds: number;
            feesKept: number;
            netPayable: number;
            eventCount: number;
            bookingCount: number;
          };

          return (
            <div
              key={payout.id}
              className="border rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">
                    {formatINR(payout.amount / 100)}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Period: {new Date(payout.periodStart).toLocaleDateString()} -{" "}
                    {new Date(payout.periodEnd).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    {breakdown.eventCount} events, {breakdown.bookingCount}{" "}
                    bookings
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      payout.status === "COMPLETED"
                        ? "bg-green-100 text-green-800"
                        : payout.status === "PENDING"
                        ? "bg-yellow-100 text-yellow-800"
                        : payout.status === "APPROVED"
                        ? "bg-blue-100 text-blue-800"
                        : payout.status === "PROCESSING"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {payout.status}
                  </span>
                  <p className="text-xs text-gray-500 mt-2">
                    Created: {new Date(payout.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Breakdown Details */}
              <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">GMV</p>
                  <p className="font-semibold">
                    {formatINR(breakdown.gmv / 100)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Refunds</p>
                  <p className="font-semibold text-red-600">
                    -{formatINR(breakdown.refunds / 100)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Platform Fees</p>
                  <p className="font-semibold text-red-600">
                    -{formatINR(breakdown.feesKept / 100)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {payoutsList.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No {activeTab} payouts found
          </div>
        )}
      </div>

      {/* Request Payout Dialog */}
      {showRequestDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Request Payout</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Period Start
                </label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Period End
                </label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              {createPayoutMutation.error && (
                <div className="text-red-600 text-sm">
                  {createPayoutMutation.error.message}
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowRequestDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRequestPayout}
                  disabled={createPayoutMutation.isPending}
                >
                  {createPayoutMutation.isPending ? "Creating..." : "Request"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
