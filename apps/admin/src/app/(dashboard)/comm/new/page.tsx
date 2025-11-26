"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { Button } from "@indietix/ui";

type WizardStep = "channel" | "template" | "audience" | "schedule" | "review";

const TEMPLATE_KEYS = [
  "admin_announcement",
  "marketing_promo",
  "event_reminder_T24",
  "event_reminder_T2",
];

export default function NewSendPage() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>("channel");
  const [formData, setFormData] = useState({
    channel: "EMAIL" as "EMAIL" | "SMS" | "PUSH",
    templateKey: "",
    segmentId: "",
    payload: {} as Record<string, unknown>,
    scheduleNow: true,
    scheduledAt: "",
    rateLimit: undefined as number | undefined,
    utmEnabled: true,
  });

  const { data: segments } = trpc.segments.list.useQuery();
  const estimateQuery = trpc.comm.send.estimate.useQuery(
    { segmentId: formData.segmentId || undefined },
    { enabled: !!formData.segmentId }
  );
  const createMutation = trpc.comm.send.create.useMutation();

  const handleNext = () => {
    const steps: WizardStep[] = [
      "channel",
      "template",
      "audience",
      "schedule",
      "review",
    ];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]!);
    }
  };

  const handleBack = () => {
    const steps: WizardStep[] = [
      "channel",
      "template",
      "audience",
      "schedule",
      "review",
    ];
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]!);
    }
  };

  const handleSubmit = async () => {
    try {
      await createMutation.mutateAsync({
        channel: formData.channel,
        templateKey: formData.templateKey,
        segmentId: formData.segmentId || undefined,
        payload: formData.payload,
        schedule: formData.scheduleNow
          ? undefined
          : new Date(formData.scheduledAt),
        rate: formData.rateLimit,
        utmEnabled: formData.utmEnabled,
      });
      router.push("/comm");
    } catch (error) {
      window.alert(
        "Failed to create send: " +
          (error instanceof Error ? error.message : "Unknown error")
      );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6">New Send</h1>

      <div className="mb-8">
        <div className="flex items-center justify-between">
          {(
            ["channel", "template", "audience", "schedule", "review"] as const
          ).map((s, i) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s
                    ? "bg-blue-600 text-white"
                    : i <
                        [
                          "channel",
                          "template",
                          "audience",
                          "schedule",
                          "review",
                        ].indexOf(step)
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-600"
                }`}
              >
                {i + 1}
              </div>
              {i < 4 && <div className="w-16 h-1 bg-gray-200 mx-2" />}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>Channel</span>
          <span>Template</span>
          <span>Audience</span>
          <span>Schedule</span>
          <span>Review</span>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {step === "channel" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Select Channel</h2>
            <div className="grid grid-cols-3 gap-4">
              {(["EMAIL", "SMS", "PUSH"] as const).map((channel) => (
                <button
                  key={channel}
                  onClick={() => setFormData({ ...formData, channel })}
                  className={`p-6 rounded-lg border-2 text-center ${
                    formData.channel === channel
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-2xl mb-2">
                    {channel === "EMAIL"
                      ? "📧"
                      : channel === "SMS"
                        ? "📱"
                        : "🔔"}
                  </div>
                  <div className="font-medium">{channel}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === "template" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Select Template</h2>
            <div>
              <label className="block text-sm font-medium mb-2">
                Template Key
              </label>
              <select
                value={formData.templateKey}
                onChange={(e) =>
                  setFormData({ ...formData, templateKey: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select a template...</option>
                {TEMPLATE_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Payload (JSON)
              </label>
              <textarea
                value={JSON.stringify(formData.payload, null, 2)}
                onChange={(e) => {
                  try {
                    setFormData({
                      ...formData,
                      payload: JSON.parse(e.target.value),
                    });
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                className="w-full border rounded px-3 py-2 font-mono text-sm"
                rows={8}
                placeholder='{"title": "...", "message": "..."}'
              />
            </div>
          </div>
        )}

        {step === "audience" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Select Audience</h2>
            <div>
              <label className="block text-sm font-medium mb-2">Segment</label>
              <select
                value={formData.segmentId}
                onChange={(e) =>
                  setFormData({ ...formData, segmentId: e.target.value })
                }
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select a segment...</option>
                {segments?.map((segment) => (
                  <option key={segment.id} value={segment.id}>
                    {segment.name}
                  </option>
                ))}
              </select>
            </div>
            {formData.segmentId && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-800">
                  Estimated recipients:{" "}
                  <span className="font-bold">
                    {estimateQuery.isLoading
                      ? "Loading..."
                      : (estimateQuery.data?.count ?? "N/A")}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {step === "schedule" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Schedule Send</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={formData.scheduleNow}
                  onChange={() =>
                    setFormData({ ...formData, scheduleNow: true })
                  }
                />
                <span>Send immediately</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={!formData.scheduleNow}
                  onChange={() =>
                    setFormData({ ...formData, scheduleNow: false })
                  }
                />
                <span>Schedule for later</span>
              </label>
              {!formData.scheduleNow && (
                <input
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) =>
                    setFormData({ ...formData, scheduledAt: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                />
              )}
            </div>
            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium mb-2">Advanced Options</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Rate Limit (per second)
                  </label>
                  <input
                    type="number"
                    value={formData.rateLimit || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        rateLimit: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      })
                    }
                    className="w-full border rounded px-3 py-2"
                    placeholder="Default: 20 for email, 10 for SMS, 100 for push"
                  />
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.utmEnabled}
                    onChange={(e) =>
                      setFormData({ ...formData, utmEnabled: e.target.checked })
                    }
                  />
                  <span>Enable UTM tracking</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-4">Review & Send</h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Channel</span>
                <span className="font-medium">{formData.channel}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Template</span>
                <span className="font-medium">
                  {formData.templateKey || "Not selected"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Segment</span>
                <span className="font-medium">
                  {segments?.find((s) => s.id === formData.segmentId)?.name ||
                    "Not selected"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Estimated Recipients</span>
                <span className="font-medium">
                  {estimateQuery.data?.count ?? "N/A"}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Schedule</span>
                <span className="font-medium">
                  {formData.scheduleNow
                    ? "Send immediately"
                    : new Date(formData.scheduledAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">UTM Tracking</span>
                <span className="font-medium">
                  {formData.utmEnabled ? "Enabled" : "Disabled"}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6 pt-4 border-t">
          <Button
            variant="outline"
            onClick={
              step === "channel" ? () => router.push("/comm") : handleBack
            }
          >
            {step === "channel" ? "Cancel" : "Back"}
          </Button>
          {step === "review" ? (
            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creating..." : "Send"}
            </Button>
          ) : (
            <Button onClick={handleNext}>Next</Button>
          )}
        </div>
      </div>
    </div>
  );
}
