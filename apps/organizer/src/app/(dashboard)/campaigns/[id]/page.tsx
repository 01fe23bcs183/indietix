"use client";

import { useParams, useRouter } from "next/navigation";
import { trpc } from "../../../../lib/trpc";
import { Button } from "@indietix/ui";

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const { data: campaign, isLoading } = trpc.campaigns.detail.useQuery({
    id: campaignId,
  });

  const cancelMutation = trpc.campaigns.cancel.useMutation({
    onSuccess: () => {
      router.push("/campaigns");
    },
  });

  const handleCancel = async () => {
    if (
      window.confirm(
        "Are you sure you want to cancel this campaign? This action cannot be undone."
      )
    ) {
      await cancelMutation.mutateAsync({ id: campaignId });
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading campaign...</div>;
  }

  if (!campaign) {
    return <div className="p-8">Campaign not found</div>;
  }

  const stats = campaign.metrics || {
    totalRecipients: 0,
    sent: 0,
    opened: 0,
    clicked: 0,
    openRate: 0,
    clickRate: 0,
    conversions: 0,
  };

  const openRate =
    stats.sent > 0 ? ((stats.opened / stats.sent) * 100).toFixed(1) : "0.0";
  const clickRate =
    stats.sent > 0 ? ((stats.clicked / stats.sent) * 100).toFixed(1) : "0.0";

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{campaign.name}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/campaigns")}>
            Back to Campaigns
          </Button>
          {campaign.status === "SCHEDULED" && (
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? "Cancelling..." : "Cancel Campaign"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Campaign Details</h2>
          <div className="space-y-3">
            <div>
              <span className="text-gray-600">Status:</span>
              <span
                className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                  campaign.status === "SENT"
                    ? "bg-green-100 text-green-800"
                    : campaign.status === "SENDING"
                      ? "bg-yellow-100 text-yellow-800"
                      : campaign.status === "FAILED"
                        ? "bg-red-100 text-red-800"
                        : campaign.status === "SCHEDULED"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-gray-100 text-gray-800"
                }`}
              >
                {campaign.status}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Channel:</span>
              <span className="ml-2 font-medium">{campaign.channel}</span>
            </div>
            <div>
              <span className="text-gray-600">Template:</span>
              <span className="ml-2 font-mono text-sm">
                {campaign.templateKey}
              </span>
            </div>
            {campaign.scheduledAt && (
              <div>
                <span className="text-gray-600">Scheduled For:</span>
                <span className="ml-2 font-medium">
                  {new Date(campaign.scheduledAt).toLocaleString()}
                </span>
              </div>
            )}
            <div>
              <span className="text-gray-600">Created:</span>
              <span className="ml-2">
                {new Date(campaign.createdAt).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Performance Metrics</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Recipients</span>
              <span className="text-2xl font-bold">{stats.totalRecipients}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Sent</span>
              <span className="text-2xl font-bold text-blue-600">
                {stats.sent}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Opened</span>
              <span className="text-2xl font-bold text-green-600">
                {stats.opened}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Clicked</span>
              <span className="text-2xl font-bold text-purple-600">
                {stats.clicked}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Open Rate</h2>
          <div className="text-center">
            <div className="text-5xl font-bold text-green-600 mb-2">
              {openRate}%
            </div>
            <p className="text-gray-600">
              {stats.opened} of {stats.sent} recipients opened
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Click-Through Rate</h2>
          <div className="text-center">
            <div className="text-5xl font-bold text-purple-600 mb-2">
              {clickRate}%
            </div>
            <p className="text-gray-600">
              {stats.clicked} of {stats.sent} recipients clicked
            </p>
          </div>
        </div>
      </div>

      {campaign.status === "DRAFT" && (
        <div className="mt-8 p-6 bg-blue-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Next Steps</h3>
          <p className="text-gray-700 mb-4">
            This campaign is in draft status. You can schedule it to send at a
            specific time or send it immediately.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => window.alert("Schedule feature coming soon")}
            >
              Schedule Campaign
            </Button>
            <Button
              variant="outline"
              onClick={() => window.alert("Send now feature coming soon")}
            >
              Send Now
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
