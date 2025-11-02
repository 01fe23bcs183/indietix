"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "../../../../lib/trpc";
import { Button } from "@indietix/ui";

type FormData = {
  name: string;
  channel: "email" | "sms";
  templateKey: string;
  segmentId?: string;
  scheduledAt?: string;
};

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    channel: "email",
    templateKey: "",
  });

  const { data: segments } = trpc.segments.list.useQuery();

  const createMutation = trpc.campaigns.create.useMutation({
    onSuccess: (data) => {
      router.push(`/campaigns/${data.id}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({
      ...formData,
      channel: formData.channel.toUpperCase() as "EMAIL" | "SMS",
      scheduledAt: formData.scheduledAt
        ? new Date(formData.scheduledAt)
        : undefined,
    });
  };

  const updateField = (field: keyof FormData, value: string) => {
    setFormData({ ...formData, [field]: value });
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Create New Campaign</h1>

      <div className="mb-8 flex justify-between">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`flex-1 h-2 mx-1 rounded ${
              s <= step ? "bg-blue-500" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Campaign Basics</h2>
            <div>
              <label className="block mb-2">Campaign Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="w-full border rounded px-4 py-2"
                required
                minLength={3}
                maxLength={200}
                placeholder="e.g., Early Bird Promo - Comedy Shows"
              />
            </div>
            <div>
              <label className="block mb-2">Channel *</label>
              <select
                value={formData.channel}
                onChange={(e) =>
                  updateField("channel", e.target.value as "email" | "sms")
                }
                className="w-full border rounded px-4 py-2"
                required
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
              <p className="text-sm text-gray-500 mt-2">
                {formData.channel === "email"
                  ? "Email campaigns support rich content and tracking"
                  : "SMS campaigns are limited to 160 characters"}
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Select Audience</h2>
            <div>
              <label className="block mb-2">Target Segment (optional)</label>
              <select
                value={formData.segmentId || ""}
                onChange={(e) => updateField("segmentId", e.target.value)}
                className="w-full border rounded px-4 py-2"
              >
                <option value="">All Users</option>
                {segments?.map((segment) => (
                  <option key={segment.id} value={segment.id}>
                    {segment.name}
                  </option>
                ))}
              </select>
              <p className="text-sm text-gray-500 mt-2">
                {formData.segmentId
                  ? "Campaign will be sent to users matching the selected segment"
                  : "Campaign will be sent to all users in the system"}
              </p>
            </div>
            {!segments || segments.length === 0 ? (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  No segments created yet. You can create segments to target
                  specific user groups based on city, categories, attendance
                  history, etc.
                </p>
              </div>
            ) : null}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Message Template</h2>
            <div>
              <label className="block mb-2">Template Key *</label>
              <input
                type="text"
                value={formData.templateKey}
                onChange={(e) => updateField("templateKey", e.target.value)}
                className="w-full border rounded px-4 py-2"
                required
                placeholder="e.g., promo-early-bird"
              />
              <p className="text-sm text-gray-500 mt-2">
                Template key should match a template configured in your
                notification provider (e.g., SendGrid, Twilio)
              </p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Make sure the template exists in your
                notification provider before scheduling the campaign. The system
                will use fake providers in test/CI environments.
              </p>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Schedule</h2>
            <div>
              <label className="block mb-2">
                Scheduled Send Time (optional)
              </label>
              <input
                type="datetime-local"
                value={formData.scheduledAt || ""}
                onChange={(e) => updateField("scheduledAt", e.target.value)}
                className="w-full border rounded px-4 py-2"
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-sm text-gray-500 mt-2">
                {formData.scheduledAt
                  ? "Campaign will be sent at the scheduled time"
                  : "Leave blank to save as draft (you can schedule it later)"}
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-between">
          <Button
            type="button"
            onClick={prevStep}
            disabled={step === 1}
            variant="outline"
          >
            Previous
          </Button>
          {step < 4 ? (
            <Button type="button" onClick={nextStep}>
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Create Campaign"}
            </Button>
          )}
        </div>

        {createMutation.error && (
          <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">
            Error: {createMutation.error.message}
          </div>
        )}
      </form>
    </div>
  );
}
