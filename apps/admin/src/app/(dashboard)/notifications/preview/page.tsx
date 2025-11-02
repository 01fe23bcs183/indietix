"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@indietix/ui";

const TEMPLATE_TYPES = [
  "booking_confirmed",
  "booking_cancelled",
  "refund_succeeded",
  "waitlist_offer_created",
  "event_reminder_T24",
  "event_reminder_T2",
  "organizer_payout_completed",
  "admin_announcement",
];

const SAMPLE_PAYLOADS: Record<string, Record<string, unknown>> = {
  booking_confirmed: {
    userName: "John Doe",
    eventTitle: "Tech Conference 2025",
    eventDate: "March 15, 2025 at 10:00 AM",
    eventVenue: "Convention Center, Mumbai",
    seats: 2,
    ticketNumber: "TIX123456",
    finalAmount: 2500,
  },
  booking_cancelled: {
    userName: "John Doe",
    eventTitle: "Tech Conference 2025",
    ticketNumber: "TIX123456",
    refundAmount: 2400,
  },
  refund_succeeded: {
    userName: "John Doe",
    eventTitle: "Tech Conference 2025",
    ticketNumber: "TIX123456",
    refundAmount: 2400,
  },
  waitlist_offer_created: {
    userName: "John Doe",
    eventTitle: "Tech Conference 2025",
    eventDate: "March 15, 2025 at 10:00 AM",
    quantity: 2,
    offerUrl: "https://indietix.com/offers/abc123",
    expiresAt: "March 10, 2025 at 5:00 PM",
  },
  event_reminder_T24: {
    userName: "John Doe",
    eventTitle: "Tech Conference 2025",
    eventDate: "March 15, 2025 at 10:00 AM",
    eventVenue: "Convention Center, Mumbai",
    ticketNumber: "TIX123456",
  },
  event_reminder_T2: {
    userName: "John Doe",
    eventTitle: "Tech Conference 2025",
    eventDate: "March 15, 2025 at 10:00 AM",
    eventVenue: "Convention Center, Mumbai",
    ticketNumber: "TIX123456",
  },
  organizer_payout_completed: {
    organizerName: "Event Organizers Inc",
    amount: 50000,
    periodStart: "Feb 1, 2025",
    periodEnd: "Feb 28, 2025",
    payoutId: "PO123456",
  },
  admin_announcement: {
    userName: "John Doe",
    title: "Platform Maintenance Notice",
    message:
      "We will be performing scheduled maintenance on March 20, 2025 from 2:00 AM to 4:00 AM IST. The platform will be temporarily unavailable during this time.",
  },
};

export default function NotificationPreviewPage() {
  const [selectedType, setSelectedType] = useState(TEMPLATE_TYPES[0]!);
  const [selectedChannel, setSelectedChannel] = useState<"EMAIL" | "SMS" | "PUSH">("EMAIL");
  const [payloadJson, setPayloadJson] = useState(
    JSON.stringify(SAMPLE_PAYLOADS[TEMPLATE_TYPES[0]!], null, 2)
  );
  const [preview, setPreview] = useState<{
    subject?: string;
    html?: string;
    text?: string;
    body?: string;
    title?: string;
    data?: Record<string, unknown>;
  } | null>(null);

  const previewMutation = trpc.notify.preview.useMutation();
  const sendMutation = trpc.notify.send.useMutation();

  const handlePreview = async () => {
    try {
      const payload = JSON.parse(payloadJson);
      const result = await previewMutation.mutateAsync({
        type: selectedType,
        channel: selectedChannel,
        payload,
      });
      setPreview(result as typeof preview);
    } catch (error) {
      alert("Failed to preview notification. Check your JSON payload.");
    }
  };

  const handleSendTest = async () => {
    try {
      const payload = JSON.parse(payloadJson);
      const testEmail = prompt("Enter your email address for test:");
      if (!testEmail) return;

      await sendMutation.mutateAsync({
        type: selectedType,
        channel: "EMAIL",
        category: "TRANSACTIONAL",
        to: testEmail,
        payload,
      });

      alert("Test notification sent! Check your email.");
    } catch (error) {
      alert("Failed to send test notification.");
    }
  };

  const handleTemplateChange = (type: string) => {
    setSelectedType(type);
    setPayloadJson(JSON.stringify(SAMPLE_PAYLOADS[type], null, 2));
    setPreview(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Notification Preview</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Configuration */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Template Configuration</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Template Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => handleTemplateChange(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  {TEMPLATE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Channel</label>
                <select
                  value={selectedChannel}
                  onChange={(e) =>
                    setSelectedChannel(e.target.value as "EMAIL" | "SMS" | "PUSH")
                  }
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                  <option value="PUSH">Push</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Payload (JSON)
                </label>
                <textarea
                  value={payloadJson}
                  onChange={(e) => setPayloadJson(e.target.value)}
                  className="w-full border rounded px-3 py-2 font-mono text-sm"
                  rows={15}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handlePreview}
                  disabled={previewMutation.isPending}
                  className="flex-1"
                >
                  {previewMutation.isPending ? "Loading..." : "Preview"}
                </Button>
                <Button
                  onClick={handleSendTest}
                  disabled={sendMutation.isPending}
                  variant="outline"
                  className="flex-1"
                >
                  {sendMutation.isPending ? "Sending..." : "Send Test"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Preview */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Preview</h2>

          {!preview && (
            <p className="text-gray-500">
              Click Preview to see the rendered notification
            </p>
          )}

          {preview && selectedChannel === "EMAIL" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Subject</label>
                <div className="border rounded px-3 py-2 bg-gray-50">
                  {preview.subject}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">HTML</label>
                <div
                  className="border rounded p-4 bg-white overflow-auto max-h-96"
                  dangerouslySetInnerHTML={{ __html: preview.html || "" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Plain Text
                </label>
                <pre className="border rounded px-3 py-2 bg-gray-50 text-sm whitespace-pre-wrap">
                  {preview.text}
                </pre>
              </div>
            </div>
          )}

          {preview && selectedChannel === "SMS" && (
            <div>
              <label className="block text-sm font-medium mb-2">Message</label>
              <div className="border rounded px-3 py-2 bg-gray-50">
                {preview.body}
              </div>
            </div>
          )}

          {preview && selectedChannel === "PUSH" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <div className="border rounded px-3 py-2 bg-gray-50">
                  {preview.title}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Body</label>
                <div className="border rounded px-3 py-2 bg-gray-50">
                  {preview.body}
                </div>
              </div>
              {preview.data && (
                <div>
                  <label className="block text-sm font-medium mb-2">Data</label>
                  <pre className="border rounded px-3 py-2 bg-gray-50 text-sm">
                    {JSON.stringify(preview.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
