"use client";

import { trpc } from "../../../../lib/trpc";
import { Button } from "@indietix/ui";
import { useState } from "react";

type OrgRole = "MANAGER" | "STAFF" | "SCANNER";

const ROLE_LABELS: Record<OrgRole | "OWNER", string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  STAFF: "Staff",
  SCANNER: "Scanner",
};

const ROLE_DESCRIPTIONS: Record<OrgRole | "OWNER", string> = {
  OWNER: "Full access to all organizer features",
  MANAGER: "Create/edit events, view payouts, approve refunds",
  STAFF: "View events and attendees, export data",
  SCANNER: "Check-in attendees only",
};

export default function TeamSettingsPage() {
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showScannerPassDialog, setShowScannerPassDialog] = useState(false);

  const { data: team, isLoading, refetch } = trpc.organizer.team.list.useQuery({});

  const {
    data: invites,
    refetch: refetchInvites,
  } = trpc.organizer.invite.list.useQuery({ status: "PENDING" });

  const {
    data: scannerPasses,
    refetch: refetchPasses,
  } = trpc.organizer.scanner.listPasses.useQuery({});

  const removeMutation = trpc.organizer.team.remove.useMutation({
    onSuccess: () => refetch(),
  });

  const updateRoleMutation = trpc.organizer.team.updateRole.useMutation({
    onSuccess: () => refetch(),
  });

  const cancelInviteMutation = trpc.organizer.invite.cancel.useMutation({
    onSuccess: () => refetchInvites(),
  });

  const resendInviteMutation = trpc.organizer.invite.resend.useMutation({
    onSuccess: () => refetchInvites(),
  });

  const revokePassMutation = trpc.organizer.scanner.revokePass.useMutation({
    onSuccess: () => refetchPasses(),
  });

  if (isLoading) {
    return <div className="p-8">Loading team...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Team Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowScannerPassDialog(true)}>
            Create Scanner Pass
          </Button>
          <Button onClick={() => setShowInviteDialog(true)}>Invite Member</Button>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Team Members</h2>
        <div className="space-y-4">
          {team?.map((member) => (
            <div
              key={member.id}
              className="border rounded-lg p-4 flex justify-between items-center"
            >
              <div>
                <div className="font-semibold">{member.name || member.email}</div>
                <div className="text-sm text-gray-500">{member.email}</div>
                <div className="mt-1">
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      member.role === "OWNER"
                        ? "bg-purple-100 text-purple-800"
                        : member.role === "MANAGER"
                          ? "bg-blue-100 text-blue-800"
                          : member.role === "STAFF"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {ROLE_LABELS[member.role]}
                  </span>
                </div>
              </div>
              {!member.isOwner && (
                <div className="flex gap-2">
                  <select
                    value={member.role}
                    onChange={(e) =>
                      updateRoleMutation.mutate({
                        memberId: member.id,
                        role: e.target.value as OrgRole,
                      })
                    }
                    className="border rounded px-2 py-1 text-sm"
                    disabled={updateRoleMutation.isPending}
                  >
                    <option value="MANAGER">Manager</option>
                    <option value="STAFF">Staff</option>
                    <option value="SCANNER">Scanner</option>
                  </select>
                  <Button
                    variant="outline"
                    onClick={() => removeMutation.mutate({ memberId: member.id })}
                    disabled={removeMutation.isPending}
                  >
                    Remove
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {invites && invites.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Pending Invites</h2>
          <div className="space-y-4">
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="border rounded-lg p-4 flex justify-between items-center bg-yellow-50"
              >
                <div>
                  <div className="font-semibold">{invite.email}</div>
                  <div className="text-sm text-gray-500">
                    Invited as {ROLE_LABELS[invite.role as OrgRole]}
                  </div>
                  <div className="text-xs text-gray-400">
                    Expires {new Date(invite.expiresAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => resendInviteMutation.mutate({ inviteId: invite.id })}
                    disabled={resendInviteMutation.isPending}
                  >
                    Resend
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => cancelInviteMutation.mutate({ inviteId: invite.id })}
                    disabled={cancelInviteMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {scannerPasses && scannerPasses.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Scanner Passes</h2>
          <div className="space-y-4">
            {scannerPasses.map((pass) => (
              <div
                key={pass.id}
                className="border rounded-lg p-4 flex justify-between items-center"
              >
                <div>
                  <div className="font-mono text-sm">{pass.token.slice(0, 8)}...</div>
                  <div className="text-sm text-gray-500">
                    {pass.isExpired ? (
                      <span className="text-red-500">Expired</span>
                    ) : pass.isUsed ? (
                      <span className="text-green-500">Used</span>
                    ) : (
                      <span>
                        Expires {new Date(pass.expiresAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                {!pass.isExpired && (
                  <Button
                    variant="outline"
                    onClick={() => revokePassMutation.mutate({ passId: pass.id })}
                    disabled={revokePassMutation.isPending}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border rounded-lg p-6 bg-gray-50">
        <h3 className="text-lg font-semibold mb-4">Role Permissions</h3>
        <div className="space-y-3">
          {(["OWNER", "MANAGER", "STAFF", "SCANNER"] as const).map((role) => (
            <div key={role} className="flex items-start gap-3">
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  role === "OWNER"
                    ? "bg-purple-100 text-purple-800"
                    : role === "MANAGER"
                      ? "bg-blue-100 text-blue-800"
                      : role === "STAFF"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                }`}
              >
                {ROLE_LABELS[role]}
              </span>
              <span className="text-sm text-gray-600">
                {ROLE_DESCRIPTIONS[role]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {showInviteDialog && (
        <InviteDialog
          onClose={() => setShowInviteDialog(false)}
          onSuccess={() => {
            refetchInvites();
            setShowInviteDialog(false);
          }}
        />
      )}

      {showScannerPassDialog && (
        <ScannerPassDialog
          onClose={() => setShowScannerPassDialog(false)}
          onSuccess={() => {
            refetchPasses();
            setShowScannerPassDialog(false);
          }}
        />
      )}
    </div>
  );
}

function InviteDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<OrgRole>("STAFF");

  const createMutation = trpc.organizer.invite.create.useMutation({
    onSuccess,
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-semibold mb-4">Invite Team Member</h3>

        <div className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teammate@example.com"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as OrgRole)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="MANAGER">Manager</option>
              <option value="STAFF">Staff</option>
              <option value="SCANNER">Scanner</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {ROLE_DESCRIPTIONS[role]}
            </p>
          </div>

          {createMutation.error && (
            <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
              {createMutation.error.message}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => createMutation.mutate({ email, role })}
              disabled={createMutation.isPending || !email}
            >
              {createMutation.isPending ? "Sending..." : "Send Invite"}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScannerPassDialog({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [ttlHours, setTtlHours] = useState(24);
  const [createdPass, setCreatedPass] = useState<{
    token: string;
    scannerUrl: string;
    qrData: string;
  } | null>(null);

  const createMutation = trpc.organizer.scanner.createPass.useMutation({
    onSuccess: (data) => {
      setCreatedPass({
        token: data.token,
        scannerUrl: data.scannerUrl,
        qrData: data.qrData,
      });
    },
  });

  if (createdPass) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
          <h3 className="text-xl font-semibold mb-4">Scanner Pass Created</h3>

          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded">
              <p className="text-sm text-green-800 mb-2">
                Share this link with your scanner:
              </p>
              <code className="block p-2 bg-white rounded text-sm break-all">
                {window.location.origin}{createdPass.scannerUrl}
              </code>
            </div>

            <div className="p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600 mb-2">Or use this token:</p>
              <code className="block p-2 bg-white rounded text-sm font-mono">
                {createdPass.token}
              </code>
            </div>

            <p className="text-xs text-gray-500">
              This pass will expire in {ttlHours} hours. The scanner will only
              have access to check-in attendees.
            </p>

            <Button onClick={() => { onSuccess(); onClose(); }} className="w-full">
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-semibold mb-4">Create Scanner Pass</h3>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Create a one-time scanner pass that can be used to check in
            attendees without a full account.
          </p>

          <div>
            <label className="block mb-1 text-sm font-medium">
              Expires in (hours)
            </label>
            <select
              value={ttlHours}
              onChange={(e) => setTtlHours(Number(e.target.value))}
              className="w-full border rounded px-3 py-2"
            >
              <option value={4}>4 hours</option>
              <option value={8}>8 hours</option>
              <option value={12}>12 hours</option>
              <option value={24}>24 hours</option>
              <option value={48}>48 hours</option>
              <option value={72}>72 hours</option>
            </select>
          </div>

          {createMutation.error && (
            <div className="p-3 bg-red-100 text-red-700 rounded text-sm">
              {createMutation.error.message}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => createMutation.mutate({ ttlHours })}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Pass"}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
