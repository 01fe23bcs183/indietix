"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@indietix/ui";

export default function OutboxDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const { data: campaign, isLoading, refetch } = trpc.comm.outbox.detail.useQuery({
    campaignId,
  });
  const pauseMutation = trpc.comm.send.pause.useMutation();
  const resumeMutation = trpc.comm.send.resume.useMutation();
  const refreshMutation = trpc.comm.outbox.refresh.useMutation();

  const handlePause = async () => {
    await pauseMutation.mutateAsync({ campaignId });
    refetch();
  };

  const handleResume = async () => {
    await resumeMutation.mutateAsync({ campaignId });
    refetch();
  };

  const handleRefresh = async () => {
    await refreshMutation.mutateAsync({ campaignId });
    refetch();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading campaign details...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-600">Campaign not found</div>
      </div>
    );
  }

  const stats = campaign.stats as {
    queued: number;
    sent: number;
    failed: number;
    openRate: number;
    clickRate: number;
  } | null;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <button
            onClick={() => router.push("/comm")}
            className="text-blue-600 hover:text-blue-800 text-sm mb-2"
          >
            Back to Communication Center
          </button>
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={refreshMutation.isPending}>
            Refresh Stats
          </Button>
          {campaign.paused ? (
            <Button onClick={handleResume} disabled={resumeMutation.isPending}>
              Resume
            </Button>
          ) : (
            <Button variant="outline" onClick={handlePause} disabled={pauseMutation.isPending}>
              Pause
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Campaign Info</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Channel</span>
              <span className="font-medium">{campaign.channel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status</span>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  campaign.paused
                    ? "bg-yellow-100 text-yellow-800"
                    : campaign.status === "SENT"
                      ? "bg-green-100 text-green-800"
                      : campaign.status === "SENDING"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                }`}
              >
                {campaign.paused ? "Paused" : campaign.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Template</span>
              <span className="font-medium">{campaign.templateKey}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Recipients</span>
              <span className="font-medium">{campaign.recipientCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Scheduled</span>
              <span className="font-medium">
                {campaign.scheduledAt
                  ? new Date(campaign.scheduledAt).toLocaleString()
                  : "Immediate"}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold mb-4">Progress</h2>
          {stats ? (
            <>
              <div className="grid grid-cols-5 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 rounded">
                  <div className="text-2xl font-bold text-gray-700">{stats.queued}</div>
                  <div className="text-xs text-gray-500">Queued</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded">
                  <div className="text-2xl font-bold text-green-700">{stats.sent}</div>
                  <div className="text-xs text-gray-500">Sent</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded">
                  <div className="text-2xl font-bold text-red-700">{stats.failed}</div>
                  <div className="text-xs text-gray-500">Failed</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded">
                  <div className="text-2xl font-bold text-blue-700">
                    {stats.openRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">Open Rate</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded">
                  <div className="text-2xl font-bold text-purple-700">
                    {stats.clickRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">Click Rate</div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full"
                  style={{
                    width: `${((stats.sent + stats.failed) / (stats.queued + stats.sent + stats.failed)) * 100}%`,
                  }}
                />
              </div>
            </>
          ) : (
            <p className="text-gray-500">No stats available</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">Recent Notifications</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sent At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attempts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Error
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaign.notifications?.map((notification: {
                id: string;
                to: string;
                status: string;
                sentAt: string | null;
                attempts: number;
                errorMessage: string | null;
              }) => (
                <tr key={notification.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {notification.to}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        notification.status === "SENT"
                          ? "bg-green-100 text-green-800"
                          : notification.status === "FAILED"
                            ? "bg-red-100 text-red-800"
                            : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {notification.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {notification.sentAt
                      ? new Date(notification.sentAt).toLocaleString()
                      : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {notification.attempts}
                  </td>
                  <td className="px-6 py-4 text-sm text-red-600 max-w-xs truncate">
                    {notification.errorMessage || "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
