"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@indietix/ui";

export default function NotificationsPage() {
  const { data: preferences, isLoading } =
    trpc.notify.getPreferences.useQuery();
  const updatePreferences = trpc.notify.updatePreferences.useMutation();

  const [formData, setFormData] = useState({
    emailEnabled: preferences?.emailEnabled ?? true,
    smsEnabled: preferences?.smsEnabled ?? false,
    pushEnabled: preferences?.pushEnabled ?? true,
    transactional: preferences?.transactional ?? true,
    reminders: preferences?.reminders ?? true,
    marketing: preferences?.marketing ?? false,
  });

  if (preferences && !isLoading) {
    if (
      formData.emailEnabled !== preferences.emailEnabled ||
      formData.smsEnabled !== preferences.smsEnabled ||
      formData.pushEnabled !== preferences.pushEnabled ||
      formData.transactional !== preferences.transactional ||
      formData.reminders !== preferences.reminders ||
      formData.marketing !== preferences.marketing
    ) {
      setFormData({
        emailEnabled: preferences.emailEnabled,
        smsEnabled: preferences.smsEnabled,
        pushEnabled: preferences.pushEnabled,
        transactional: preferences.transactional,
        reminders: preferences.reminders,
        marketing: preferences.marketing,
      });
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updatePreferences.mutateAsync(formData);
      window.alert("Notification preferences updated successfully!");
    } catch {
      window.alert("Failed to update preferences. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Notification Preferences</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Notification Preferences</h1>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
        {/* Channel Preferences */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Notification Channels</h2>
          <p className="text-gray-600 mb-4">
            Choose how you want to receive notifications
          </p>

          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.emailEnabled}
                onChange={(e) =>
                  setFormData({ ...formData, emailEnabled: e.target.checked })
                }
                className="w-4 h-4"
              />
              <span>Email notifications</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.smsEnabled}
                onChange={(e) =>
                  setFormData({ ...formData, smsEnabled: e.target.checked })
                }
                className="w-4 h-4"
              />
              <span>SMS notifications</span>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.pushEnabled}
                onChange={(e) =>
                  setFormData({ ...formData, pushEnabled: e.target.checked })
                }
                className="w-4 h-4"
              />
              <span>Push notifications</span>
            </label>
          </div>
        </div>

        {/* Category Preferences */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Notification Types</h2>
          <p className="text-gray-600 mb-4">
            Choose which types of notifications you want to receive
          </p>

          <div className="space-y-3">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.transactional}
                onChange={(e) =>
                  setFormData({ ...formData, transactional: e.target.checked })
                }
                className="w-4 h-4"
              />
              <div>
                <span className="font-medium">Transactional</span>
                <p className="text-sm text-gray-600">
                  Booking confirmations, cancellations, refunds
                </p>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.reminders}
                onChange={(e) =>
                  setFormData({ ...formData, reminders: e.target.checked })
                }
                className="w-4 h-4"
              />
              <div>
                <span className="font-medium">Reminders</span>
                <p className="text-sm text-gray-600">
                  Event reminders, waitlist offers
                </p>
              </div>
            </label>

            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.marketing}
                onChange={(e) =>
                  setFormData({ ...formData, marketing: e.target.checked })
                }
                className="w-4 h-4"
              />
              <div>
                <span className="font-medium">Marketing</span>
                <p className="text-sm text-gray-600">
                  Promotional offers, new events, announcements
                </p>
              </div>
            </label>
          </div>
        </div>

        <Button
          type="submit"
          disabled={updatePreferences.isPending}
          className="w-full"
        >
          {updatePreferences.isPending ? "Saving..." : "Save Preferences"}
        </Button>
      </form>
    </div>
  );
}
