"use client";

import { useState } from "react";
import { trpc } from "../../../lib/trpc";
import { Button, Card, CardContent } from "@indietix/ui";

type OrganizerData = {
  organizers: Array<{
    id: string;
    businessName: string;
    verified: boolean;
    user: { name: string; email: string };
    _count: { events: number };
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export default function OrganizersPage() {
  const [page, setPage] = useState(1);
  const [showQueue, setShowQueue] = useState(true);

  const { data: queueData, refetch: refetchQueue } =
    trpc.admin.organizers.verificationQueue.useQuery(
      { page, limit: 20 },
      { enabled: showQueue }
    ) as { data: OrganizerData | undefined; refetch: () => void };

  const { data: listData, refetch: refetchList } =
    trpc.admin.organizers.list.useQuery(
      { page, limit: 20 },
      { enabled: !showQueue }
    ) as { data: OrganizerData | undefined; refetch: () => void };

  const approveMutation = trpc.admin.organizers.approve.useMutation({
    onSuccess: () => {
      refetchQueue();
      refetchList();
    },
  });

  const rejectMutation = trpc.admin.organizers.reject.useMutation({
    onSuccess: () => {
      refetchQueue();
      refetchList();
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Organizers</h1>
        <p className="text-gray-600">Manage event organizers</p>
      </div>

      <div className="flex gap-4">
        <Button
          variant={showQueue ? "default" : "outline"}
          onClick={() => setShowQueue(true)}
        >
          Verification Queue ({queueData?.total || 0})
        </Button>
        <Button
          variant={!showQueue ? "default" : "outline"}
          onClick={() => setShowQueue(false)}
        >
          All Organizers
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {showQueue ? (
            !queueData ? (
              <div className="p-8 text-center">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Business Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Events
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {queueData.organizers.map((organizer) => (
                    <tr key={organizer.id}>
                      <td className="px-6 py-4 text-sm">
                        {organizer.businessName}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div>{organizer.user.name}</div>
                        <div className="text-xs text-gray-500">
                          {organizer.user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`rounded px-2 py-1 text-xs ${
                            organizer.verified
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {organizer.verified ? "Verified" : "Pending"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {organizer._count.events}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          {!organizer.verified && (
                            <>
                              <Button
                                size="sm"
                                onClick={() =>
                                  approveMutation.mutate({ id: organizer.id })
                                }
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  rejectMutation.mutate({ id: organizer.id })
                                }
                              >
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            !listData ? (
              <div className="p-8 text-center">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Business Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Events
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {listData.organizers.map((organizer) => (
                      <tr key={organizer.id}>
                        <td className="px-6 py-4 text-sm">
                          {organizer.businessName}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div>{organizer.user.name}</div>
                          <div className="text-xs text-gray-500">
                            {organizer.user.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <span
                            className={`rounded px-2 py-1 text-xs ${
                              organizer.verified
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {organizer.verified ? "Verified" : "Pending"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {organizer._count.events}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex gap-2">
                            {!organizer.verified && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    approveMutation.mutate({ id: organizer.id })
                                  }
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    rejectMutation.mutate({ id: organizer.id })
                                  }
                                >
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </CardContent>
      </Card>

      {showQueue && queueData && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, queueData.total)} of{" "}
            {queueData.total} organizers
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
              disabled={page >= queueData.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      
      {!showQueue && listData && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, listData.total)} of{" "}
            {listData.total} organizers
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
              disabled={page >= listData.totalPages}
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
