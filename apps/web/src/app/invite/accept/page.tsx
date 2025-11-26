"use client";

import { useSearchParams } from "next/navigation";
import { trpc } from "../../../lib/trpc";
import { Button } from "@indietix/ui";
import { useState, Suspense } from "react";
import Link from "next/link";

function AcceptInviteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [accepted, setAccepted] = useState(false);

  const {
    data: invite,
    isLoading,
    error,
  } = trpc.organizer.invite.getByToken.useQuery(
    { token: token || "" },
    { enabled: !!token }
  );

  const acceptMutation = trpc.organizer.invite.accept.useMutation({
    onSuccess: () => {
      setAccepted(true);
    },
  });

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4 p-8 bg-white rounded-lg shadow-lg text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-2">Invalid Invite Link</h1>
          <p className="text-gray-600 mb-6">
            This invite link is missing the required token.
          </p>
          <Link href="/">
            <Button>Go to Homepage</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4 p-8 bg-white rounded-lg shadow-lg text-center">
          <div className="text-6xl mb-4 animate-pulse">📨</div>
          <p className="text-gray-600">Loading invite details...</p>
        </div>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4 p-8 bg-white rounded-lg shadow-lg text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold mb-2">Invalid Invite</h1>
          <p className="text-gray-600 mb-6">
            {error?.message || "This invite link is invalid or has expired."}
          </p>
          <Link href="/">
            <Button>Go to Homepage</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (invite.isExpired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4 p-8 bg-white rounded-lg shadow-lg text-center">
          <div className="text-6xl mb-4">⏰</div>
          <h1 className="text-2xl font-bold mb-2">Invite Expired</h1>
          <p className="text-gray-600 mb-6">
            This invite has expired. Please contact the organizer to request a
            new invite.
          </p>
          <Link href="/">
            <Button>Go to Homepage</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full mx-4 p-8 bg-white rounded-lg shadow-lg text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold mb-2">Welcome to the Team!</h1>
          <p className="text-gray-600 mb-6">
            You have successfully joined{" "}
            <strong>{invite.organizer.name}</strong> as a{" "}
            <strong>{invite.role}</strong>.
          </p>
          <a href="/organizer">
            <Button>Go to Organizer Dashboard</Button>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-3xl mx-auto mb-4">
            🏢
          </div>
          <h1 className="text-2xl font-bold mb-2">Team Invitation</h1>
          <p className="text-gray-600">
            You&apos;ve been invited to join{" "}
            <strong>{invite.organizer.name}</strong>
          </p>
        </div>

        <div className="border rounded-lg p-4 mb-6 bg-gray-50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Email:</span>
              <div className="font-medium">{invite.email}</div>
            </div>
            <div>
              <span className="text-gray-500">Role:</span>
              <div className="font-medium">{invite.role}</div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-semibold mb-2">Role Permissions</h3>
          <p className="text-sm text-gray-600">
            {invite.role === "MANAGER" &&
              "Create/edit events, view payouts, approve refunds, access attendees"}
            {invite.role === "STAFF" &&
              "View events and attendees, export data"}
            {invite.role === "SCANNER" && "Check-in attendees only"}
          </p>
        </div>

        {acceptMutation.error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
            {acceptMutation.error.message}
          </div>
        )}

        <div className="space-y-3">
          <Button
            className="w-full"
            onClick={() => acceptMutation.mutate({ token })}
            disabled={acceptMutation.isPending}
          >
            {acceptMutation.isPending ? "Accepting..." : "Accept Invitation"}
          </Button>
          <Link href="/" className="block">
            <Button variant="outline" className="w-full">
              Decline
            </Button>
          </Link>
        </div>

        <p className="text-xs text-center text-gray-500 mt-4">
          By accepting, you agree to join this organization and follow their
          guidelines.
        </p>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full mx-4 p-8 bg-white rounded-lg shadow-lg text-center">
            <div className="text-6xl mb-4 animate-pulse">📨</div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
