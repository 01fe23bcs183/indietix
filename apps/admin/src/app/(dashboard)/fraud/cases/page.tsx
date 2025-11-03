"use client";

import { trpc } from "@/lib/trpc";
import { Button } from "@indietix/ui";
import { useState } from "react";

export default function FraudCasesPage() {
  const [status, setStatus] = useState<"OPEN" | "APPROVED" | "REJECTED" | undefined>("OPEN");
  const { data, isLoading, refetch } = trpc.admin.fraud.listCases.useQuery({
    status,
    limit: 50,
    offset: 0,
  });
  const resolveCase = trpc.admin.fraud.resolveCase.useMutation();

  const handleResolve = async (
    caseId: string,
    resolution: "APPROVED" | "REJECTED",
    note?: string
  ) => {
    await resolveCase.mutateAsync({
      id: caseId,
      status: resolution,
      note,
    });
    refetch();
  };

  if (isLoading) {
    return <div className="p-6">Loading cases...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Review Queue</h1>
        <p className="text-gray-600 mt-2">
          Review and resolve flagged booking attempts
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={() => setStatus("OPEN")}
          variant={status === "OPEN" ? "default" : "outline"}
        >
          Open ({data?.items.filter((c) => c.status === "OPEN").length || 0})
        </Button>
        <Button
          onClick={() => setStatus("APPROVED")}
          variant={status === "APPROVED" ? "default" : "outline"}
        >
          Approved
        </Button>
        <Button
          onClick={() => setStatus("REJECTED")}
          variant={status === "REJECTED" ? "default" : "outline"}
        >
          Rejected
        </Button>
        <Button
          onClick={() => setStatus(undefined)}
          variant={status === undefined ? "default" : "outline"}
        >
          All
        </Button>
      </div>

      <div className="space-y-4">
        {data?.items.map((fraudCase: any) => (
          <div key={fraudCase.id} className="bg-white border rounded-lg p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-lg">
                    Booking #{fraudCase.booking.id.substring(0, 8)}
                  </h3>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      fraudCase.status === "OPEN"
                        ? "bg-orange-100 text-orange-800"
                        : fraudCase.status === "APPROVED"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {fraudCase.status}
                  </span>
                  <span className="text-sm text-gray-600">
                    Risk Score: {fraudCase.riskScore}
                  </span>
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  <p>Event: {fraudCase.booking.event.title}</p>
                  <p>User: {fraudCase.booking.user.email}</p>
                  <p>
                    Created:{" "}
                    {new Date(fraudCase.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {fraudCase.riskTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              {fraudCase.status === "OPEN" && (
                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      handleResolve(fraudCase.id, "APPROVED", "Approved by admin")
                    }
                    size="sm"
                    variant="default"
                  >
                    Approve
                  </Button>
                  <Button
                    onClick={() =>
                      handleResolve(fraudCase.id, "REJECTED", "Rejected by admin")
                    }
                    size="sm"
                    variant="destructive"
                  >
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
        {!data?.items.length && (
          <div className="p-6 text-center text-gray-500 bg-white border rounded-lg">
            No cases found
          </div>
        )}
      </div>
    </div>
  );
}
