"use client";

import { useState } from "react";
import { trpc } from "../../../lib/trpc";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@indietix/ui";

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<"CUSTOMER" | "ORGANIZER" | "ADMIN" | undefined>();

  const { data, isLoading, refetch } = trpc.admin.users.list.useQuery({
    page,
    limit: 20,
    search: search || undefined,
    role,
  });

  const banMutation = trpc.admin.users.ban.useMutation({
    onSuccess: () => refetch(),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-gray-600">Manage platform users</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Search by email, name, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-md border border-gray-300 px-3 py-2"
            />
            <select
              value={role || ""}
              onChange={(e) => setRole((e.target.value || undefined) as "CUSTOMER" | "ORGANIZER" | "ADMIN" | undefined)}
              className="rounded-md border border-gray-300 px-3 py-2"
            >
              <option value="">All Roles</option>
              <option value="CUSTOMER">Customer</option>
              <option value="ORGANIZER">Organizer</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Bookings
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data?.users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 text-sm">{user.name}</td>
                      <td className="px-6 py-4 text-sm">{user.email}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className="rounded bg-blue-100 px-2 py-1 text-xs">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`rounded px-2 py-1 text-xs ${
                            user.banned
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {user.banned ? "Banned" : "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{user._count.bookings}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              banMutation.mutate({
                                id: user.id,
                                banned: !user.banned,
                              })
                            }
                          >
                            {user.banned ? "Unban" : "Ban"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {data && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.total)} of{" "}
            {data.total} users
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page >= data.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
