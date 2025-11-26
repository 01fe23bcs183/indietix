"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Button } from "@indietix/ui";

type TabType = "campaigns" | "outbox" | "failed";

export default function CommunicationCenterPage() {
  const [activeTab, setActiveTab] = useState<TabType>("campaigns");

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Communication Center</h1>
        <Link href="/comm/new">
          <Button>New Send</Button>
        </Link>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {(["campaigns", "outbox", "failed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "campaigns" && <CampaignsTab />}
      {activeTab === "outbox" && <OutboxTab />}
      {activeTab === "failed" && <FailedTab />}
    </div>
  );
}

function CampaignsTab() {
  const { data: campaigns, isLoading } = trpc.comm.outbox.list.useQuery();

  if (isLoading) {
    return <div className="text-center py-8">Loading campaigns...</div>;
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No campaigns found. Create a new send to get started.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Channel
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Recipients
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Scheduled
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {campaigns.map((campaign) => (
            <tr key={campaign.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {campaign.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    campaign.channel === "EMAIL"
                      ? "bg-blue-100 text-blue-800"
                      : campaign.channel === "SMS"
                        ? "bg-green-100 text-green-800"
                        : "bg-purple-100 text-purple-800"
                  }`}
                >
                  {campaign.channel}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <StatusBadge
                  status={campaign.status}
                  paused={campaign.paused}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {campaign.recipientCount}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {campaign.scheduledAt
                  ? new Date(campaign.scheduledAt).toLocaleString()
                  : "-"}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <Link
                  href={`/comm/outbox/${campaign.id}`}
                  className="text-blue-600 hover:text-blue-800"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OutboxTab() {
  const {
    data: campaigns,
    isLoading,
    refetch,
  } = trpc.comm.outbox.list.useQuery({
    status: "SENDING",
  });
  const pauseMutation = trpc.comm.send.pause.useMutation();
  const resumeMutation = trpc.comm.send.resume.useMutation();

  const handlePause = async (campaignId: string) => {
    await pauseMutation.mutateAsync({ campaignId });
    refetch();
  };

  const handleResume = async (campaignId: string) => {
    await resumeMutation.mutateAsync({ campaignId });
    refetch();
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading outbox...</div>;
  }

  if (!campaigns || campaigns.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No active sends in progress.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {campaigns.map((campaign) => (
        <div key={campaign.id} className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold">{campaign.name}</h3>
              <p className="text-sm text-gray-500">
                {campaign.channel} - {campaign.recipientCount} recipients
              </p>
            </div>
            <div className="flex gap-2">
              {campaign.paused ? (
                <Button
                  size="sm"
                  onClick={() => handleResume(campaign.id)}
                  disabled={resumeMutation.isPending}
                >
                  Resume
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePause(campaign.id)}
                  disabled={pauseMutation.isPending}
                >
                  Pause
                </Button>
              )}
            </div>
          </div>

          {campaign.stats && (
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded">
                <div className="text-2xl font-bold text-gray-700">
                  {campaign.stats.queued}
                </div>
                <div className="text-xs text-gray-500">Queued</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded">
                <div className="text-2xl font-bold text-green-700">
                  {campaign.stats.sent}
                </div>
                <div className="text-xs text-gray-500">Sent</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded">
                <div className="text-2xl font-bold text-red-700">
                  {campaign.stats.failed}
                </div>
                <div className="text-xs text-gray-500">Failed</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded">
                <div className="text-2xl font-bold text-blue-700">
                  {campaign.stats.openRate.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">Open Rate</div>
              </div>
            </div>
          )}

          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{
                  width: campaign.stats
                    ? `${((campaign.stats.sent + campaign.stats.failed) / (campaign.stats.queued + campaign.stats.sent + campaign.stats.failed)) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function FailedTab() {
  const { data: failed, isLoading, refetch } = trpc.comm.failed.list.useQuery();
  const retryMutation = trpc.comm.failed.retry.useMutation();
  const exportQuery = trpc.comm.failed.export.useQuery({});

  const handleRetry = async (notificationId: string) => {
    await retryMutation.mutateAsync({ notificationId });
    refetch();
  };

  const handleExport = () => {
    if (exportQuery.data?.csv) {
      const blob = new Blob([exportQuery.data.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `failed-notifications-${new Date().toISOString()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">Loading failed notifications...</div>
    );
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button variant="outline" onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      {!failed || failed.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No failed notifications.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Channel
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Error
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Attempts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {failed.map((notification) => (
                <tr key={notification.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {notification.to}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {notification.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {notification.channel}
                  </td>
                  <td className="px-6 py-4 text-sm text-red-600 max-w-xs truncate">
                    {notification.errorMessage}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {notification.attempts}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRetry(notification.id)}
                      disabled={retryMutation.isPending}
                    >
                      Retry
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, paused }: { status: string; paused: boolean }) {
  if (paused) {
    return (
      <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
        Paused
      </span>
    );
  }

  const colors: Record<string, string> = {
    DRAFT: "bg-gray-100 text-gray-800",
    SCHEDULED: "bg-blue-100 text-blue-800",
    SENDING: "bg-yellow-100 text-yellow-800",
    SENT: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-800"}`}
    >
      {status}
    </span>
  );
}
