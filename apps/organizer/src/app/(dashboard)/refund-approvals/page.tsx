"use client";

import { useState } from "react";
import { trpc } from "../../../lib/trpc";
import { Button } from "@indietix/ui";

export default function RefundApprovalsPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("PENDING_APPROVAL");

  const { data, isLoading, error, refetch } =
    trpc.refundApprovals.organizer.list.useQuery({
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
    });

  const approveMutation = trpc.refundApprovals.organizer.approve.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const rejectMutation = trpc.refundApprovals.organizer.reject.useMutation({
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

  if (isLoading) {
    return <div className="p-8">Loading refund requests...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-500">Error: {error.message}</div>;
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Refund Approvals</h1>
        <p className="text-gray-600">
          Review and approve refund requests for your events
        </p>
      </div>

      <div className="mb-6">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border rounded px-4 py-2"
        >
          <option value="">All Status</option>
          <option value="PENDING_APPROVAL">Pending Approval</option>
          <option value="APPROVED">Approved</option>
          <option value="PROCESSING">Processing</option>
          <option value="SUCCEEDED">Succeeded</option>
          <option value="FAILED">Failed</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Refund ID</th>
              <th className="border p-2 text-left">User</th>
              <th className="border p-2 text-left">Event</th>
              <th className="border p-2 text-left">Amount</th>
              <th className="border p-2 text-left">Status</th>
              <th className="border p-2 text-left">Approvals</th>
              <th className="border p-2 text-left">Date</th>
              <th className="border p-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.refunds.map((refund) => (
              <tr key={refund.id}>
                <td className="border p-2 font-mono text-sm">
                  {refund.id.slice(0, 8)}...
                </td>
                <td className="border p-2">
                  <div>{refund.booking.user.name}</div>
                  <div className="text-xs text-gray-500">
                    {refund.booking.user.email}
                  </div>
                </td>
                <td className="border p-2">
                  <div>{refund.booking.event.title}</div>
                  <div className="text-xs text-gray-500">
                    Ticket: {refund.booking.ticketNumber}
                  </div>
                </td>
                <td className="border p-2">
                  {refund.currency === "INR" ? "₹" : refund.currency}
                  {(refund.amount / 100).toLocaleString()}
                </td>
                <td className="border p-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${getStatusBadgeClass(refund.status)}`}
                  >
                    {refund.status}
                  </span>
                </td>
                <td className="border p-2">
                  <div className="flex flex-col gap-1">
                    <span
                      className={`text-xs ${refund.organizerApprovedAt ? "text-green-600" : "text-gray-400"}`}
                    >
                      Organizer:{" "}
                      {refund.organizerApprovedAt ? "Approved" : "Pending"}
                    </span>
                    <span
                      className={`text-xs ${refund.adminApprovedAt ? "text-green-600" : "text-gray-400"}`}
                    >
                      Admin: {refund.adminApprovedAt ? "Approved" : "Pending"}
                    </span>
                  </div>
                </td>
                <td className="border p-2">
                  {new Date(refund.createdAt).toLocaleDateString()}
                </td>
                <td className="border p-2">
                  {refund.status === "PENDING_APPROVAL" &&
                    !refund.organizerApprovedAt && (
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
                  {refund.organizerApprovedAt &&
                    refund.status === "PENDING_APPROVAL" && (
                      <span className="text-xs text-gray-500">
                        Awaiting admin
                      </span>
                    )}
                </td>
              </tr>
            ))}
            {data?.refunds.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="border p-8 text-center text-gray-500"
                >
                  No refund requests found
                </td>
              </tr>
            )}
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
    </div>
  );
}
