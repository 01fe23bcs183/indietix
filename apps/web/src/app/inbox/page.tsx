"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@indietix/ui";

export default function InboxPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, refetch } = trpc.inbox.list.useQuery();
  const { data: unreadCount, refetch: refetchCount } =
    trpc.inbox.unreadCount.useQuery();
  const readMutation = trpc.inbox.read.useMutation();
  const unreadMutation = trpc.inbox.unread.useMutation();
  const markAllReadMutation = trpc.inbox.markAllRead.useMutation();

  const handleMarkRead = async (notificationId: string) => {
    await readMutation.mutateAsync({ notificationId });
    refetch();
    refetchCount();
  };

  const handleMarkUnread = async (notificationId: string) => {
    await unreadMutation.mutateAsync({ notificationId });
    refetch();
    refetchCount();
  };

  const handleMarkAllRead = async () => {
    await markAllReadMutation.mutateAsync();
    refetch();
    refetchCount();
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes("booking")) return "🎫";
    if (type.includes("event")) return "📅";
    if (type.includes("waitlist")) return "⏳";
    if (type.includes("refund")) return "💰";
    if (type.includes("announcement")) return "📢";
    return "📬";
  };

  const getNotificationTitle = (
    type: string,
    payload: Record<string, unknown>
  ) => {
    if (payload.title) return payload.title as string;

    const titles: Record<string, string> = {
      booking_confirmed: "Booking Confirmed",
      booking_cancelled: "Booking Cancelled",
      refund_succeeded: "Refund Processed",
      waitlist_offer_created: "Waitlist Offer Available",
      event_reminder_T24: "Event Reminder",
      event_reminder_T2: "Event Starting Soon",
      admin_announcement: "Announcement",
      marketing_promo: "Special Offer",
    };

    return titles[type] || "Notification";
  };

  const getNotificationPreview = (
    type: string,
    payload: Record<string, unknown>
  ) => {
    if (payload.message) return payload.message as string;
    if (payload.eventTitle) return `Event: ${payload.eventTitle}`;
    return "Click to view details";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Inbox</h1>
          {unreadCount && unreadCount.count > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {unreadCount.count} unread notification
              {unreadCount.count !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        {unreadCount && unreadCount.count > 0 && (
          <Button
            variant="outline"
            onClick={handleMarkAllRead}
            disabled={markAllReadMutation.isPending}
          >
            Mark all as read
          </Button>
        )}
      </div>

      {!data?.items || data.items.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-4xl mb-4">📭</div>
          <h2 className="text-xl font-semibold text-gray-700">
            No notifications
          </h2>
          <p className="text-gray-500 mt-2">
            You&apos;re all caught up! Check back later for updates.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow divide-y">
          {data.items.map((notification) => {
            const payload = notification.payload as Record<string, unknown>;
            const isUnread = !notification.readAt;
            const isSelected = selectedId === notification.id;

            return (
              <div
                key={notification.id}
                className={`p-4 cursor-pointer transition-colors ${
                  isUnread ? "bg-blue-50" : "bg-white"
                } ${isSelected ? "ring-2 ring-blue-500 ring-inset" : ""} hover:bg-gray-50`}
                onClick={() => {
                  setSelectedId(isSelected ? null : notification.id);
                  if (isUnread) {
                    handleMarkRead(notification.id);
                  }
                }}
              >
                <div className="flex items-start gap-4">
                  <div className="text-2xl">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3
                        className={`text-sm font-medium ${
                          isUnread ? "text-gray-900" : "text-gray-700"
                        }`}
                      >
                        {getNotificationTitle(notification.type, payload)}
                      </h3>
                      {isUnread && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {getNotificationPreview(notification.type, payload)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {notification.sentAt
                        ? new Date(notification.sentAt).toLocaleString()
                        : ""}
                    </p>

                    {isSelected && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <div className="space-y-2 text-sm">
                          {Object.entries(payload).map(([key, value]) => (
                            <div key={key} className="flex">
                              <span className="text-gray-500 w-32 flex-shrink-0">
                                {key}:
                              </span>
                              <span className="text-gray-900">
                                {typeof value === "object"
                                  ? JSON.stringify(value)
                                  : String(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 flex gap-2">
                          {notification.readAt ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkUnread(notification.id);
                              }}
                            >
                              Mark as unread
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkRead(notification.id);
                              }}
                            >
                              Mark as read
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        notification.channel === "EMAIL"
                          ? "bg-blue-100 text-blue-800"
                          : notification.channel === "SMS"
                            ? "bg-green-100 text-green-800"
                            : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {notification.channel}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data?.nextCursor && (
        <div className="mt-4 text-center">
          <Button variant="outline">Load more</Button>
        </div>
      )}
    </div>
  );
}
