"use client";

import { useState } from "react";
import { Button } from "@indietix/ui";
import { formatINR } from "@indietix/utils";

export default function AdminPayoutsPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");

  const mockPayouts = [
    {
      id: "1",
      organizerId: "org1",
      organizer: {
        businessName: "Sample Organizer",
        user: { email: "organizer@example.com", name: "John Doe" },
      },
      amount: 50000,
      status: "PENDING",
      periodStart: new Date("2024-01-01"),
      periodEnd: new Date("2024-01-31"),
      createdAt: new Date(),
      breakdown: {
        gmv: 100000,
        refunds: 10000,
        feesKept: 40000,
        netPayable: 50000,
        eventCount: 5,
        bookingCount: 50,
      },
    },
  ];

  const handleApprove = (payoutId: string) => {
    console.log("Approve payout:", payoutId);
  };

  const handleReject = (payoutId: string) => {
    console.log("Reject payout:", payoutId);
  };

  const handleProcess = (payoutId: string) => {
    console.log("Process payout:", payoutId);
  };

  const handleExportCSV = (payoutId: string) => {
    console.log("Export CSV:", payoutId);
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Payouts Management</h1>
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
          Pending Approval
        </button>
        <button
          className={`px-4 py-2 ${
            activeTab === "all"
              ? "border-b-2 border-blue-500 font-semibold"
              : "text-gray-600"
          }`}
          onClick={() => setActiveTab("all")}
        >
          All Payouts
        </button>
      </div>

      {/* Payouts List */}
      <div className="space-y-4">
        {mockPayouts.map((payout) => {
          const breakdown = payout.breakdown;

          return (
            <div
              key={payout.id}
              className="border rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-xl">
                    {formatINR(payout.amount / 100)}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {payout.organizer.businessName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {payout.organizer.user.email}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    Period: {payout.periodStart.toLocaleDateString()} -{" "}
                    {payout.periodEnd.toLocaleDateString()}
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
                    Created: {payout.createdAt.toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Breakdown Details */}
              <div className="grid grid-cols-4 gap-4 text-sm mb-4 p-4 bg-gray-50 rounded">
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
                <div>
                  <p className="text-gray-600">Net Payable</p>
                  <p className="font-semibold text-green-600">
                    {formatINR(breakdown.netPayable / 100)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 justify-end">
                {payout.status === "PENDING" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleReject(payout.id)}
                    >
                      Reject
                    </Button>
                    <Button onClick={() => handleApprove(payout.id)}>
                      Approve
                    </Button>
                  </>
                )}
                {payout.status === "APPROVED" && (
                  <Button onClick={() => handleProcess(payout.id)}>
                    Process Payout
                  </Button>
                )}
                {(payout.status === "COMPLETED" ||
                  payout.status === "PROCESSING") && (
                  <Button
                    variant="outline"
                    onClick={() => handleExportCSV(payout.id)}
                  >
                    Export CSV
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {mockPayouts.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No payouts found
          </div>
        )}
      </div>
    </div>
  );
}
