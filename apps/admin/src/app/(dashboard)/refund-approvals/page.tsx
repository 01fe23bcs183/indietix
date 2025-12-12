"use client";

import { useState } from "react";
import { trpc } from "../../../lib/trpc";
import { Button, Card, CardContent } from "@indietix/ui";

export default function RefundApprovalsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("PENDING_APPROVAL");

  const { data, isLoading, refetch } = trpc.refundApprovals.admin.list.useQuery(
    {
      page,
      status: (status || undefined) as
        | "PENDING_APPROVAL"
        | "PENDING"
        | "APPROVED"
        | "PROCESSING"
        | "SUCCEEDED"
        | "FAILED"
        | "REJECTED"
        | undefined,
    }
  );

  const approveMutation = trpc.refundApprovals.admin.approve.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const rejectMutation = trpc.refundApprovals.admin.reject.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleApprove = async (refundId: string) => {
    if (
      window.confirm("Are you sure you want to approve this refund request?")
    ) {
      await approveMutation.mutateAsync({ refundId });
    }
  };

  const handleReject = async (refundId: string) => {
    const reason = window.prompt("Enter rejection reason (optional):");
    if (reason !== null) {
      await rejectMutation.mutateAsync({
        refundId,
        reason: reason || undefined,
      });
    }
  };

  const getStatusBadgeClass = (refundStatus: string) => {
    switch (refundStatus) {
      case "PENDING_APPROVAL":
        return "bg-yellow-100 text-yellow-800";
      case "APPROVED":
        return "bg-blue-100 text-blue-800";
      case "PROCESSING":
        return "bg-purple-100 text-purple-800";
      case "SUCCEEDED":
        return "bg-green-100 text-green-800";
      case "FAILED":
        return "bg-red-100 text-red-800";
      case "REJECTED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Refund Approvals</h1>
        <p className="text-gray-600">Review and approve refund requests</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="">All Status</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="PROCESSING">Processing</option>
            <option value="SUCCEEDED">Succeeded</option>
            <option value="FAILED">Failed</option>
            <option value="REJECTED">Rejected</option>
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
                      Refund ID
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
                      Approvals
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.refunds.map((refund) => (
                    <tr key={refund.id}>
                      <td className="px-6 py-4 text-sm font-mono">
                        {refund.id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>{refund.booking.user.name}</div>
                        <div className="text-xs text-gray-500">
                          {refund.booking.user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>{refund.booking.event.title}</div>
                        <div className="text-xs text-gray-500">
                          Ticket: {refund.booking.ticketNumber}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {refund.currency === "INR" ? "₹" : refund.currency}
                        {(refund.amount / 100).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`rounded px-2 py-1 text-xs ${getStatusBadgeClass(refund.status)}`}
                        >
                          {refund.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`text-xs ${refund.organizerApprovedAt ? "text-green-600" : "text-gray-400"}`}
                          >
                            Organizer:{" "}
                            {refund.organizerApprovedAt
                              ? "Approved"
                              : "Pending"}
                          </span>
                          <span
                            className={`text-xs ${refund.adminApprovedAt ? "text-green-600" : "text-gray-400"}`}
                          >
                            Admin:{" "}
                            {refund.adminApprovedAt ? "Approved" : "Pending"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {new Date(refund.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {refund.status === "PENDING_APPROVAL" &&
                          !refund.adminApprovedAt && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(refund.id)}
                                disabled={approveMutation.isPending}
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReject(refund.id)}
                                disabled={rejectMutation.isPending}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        {refund.adminApprovedAt &&
                          refund.status === "PENDING_APPROVAL" && (
                            <span className="text-xs text-gray-500">
                              Awaiting organizer
                            </span>
                          )}
                      </td>
                    </tr>
                  ))}
                  {data?.refunds.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-8 text-center text-gray-500"
                      >
                        No refund requests found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {data && data.total > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.total)}{" "}
            of {data.total} refund requests
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
