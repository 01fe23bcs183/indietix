"use client";

import { trpc } from "@/lib/trpc";

export default function FraudDashboardPage() {
  const { data: dashboard, isLoading } = trpc.admin.fraud.dashboard.useQuery();

  if (isLoading) {
    return <div className="p-6">Loading fraud dashboard...</div>;
  }

  if (!dashboard) {
    return <div className="p-6">Failed to load dashboard</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Fraud Detection Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Rules</h3>
          <p className="text-2xl font-bold">{dashboard.totalRules}</p>
          <p className="text-sm text-gray-600">
            {dashboard.activeRules} active
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">
            Blacklisted Entries
          </h3>
          <p className="text-2xl font-bold">{dashboard.totalBlacklisted}</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">Open Cases</h3>
          <p className="text-2xl font-bold">{dashboard.openCases}</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">
            Recent Attempts (24h)
          </h3>
          <p className="text-2xl font-bold">{dashboard.recentAttempts}</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-sm font-medium text-gray-500">
            High Risk Bookings
          </h3>
          <p className="text-2xl font-bold">{dashboard.highRiskBookings}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Top IPs (Last 7 Days)</h2>
        <div className="space-y-2">
          {dashboard.topIPs.map((item) => (
            <div
              key={item.ip}
              className="flex justify-between items-center p-2 border-b"
            >
              <span className="font-mono">{item.ip}</span>
              <span className="text-gray-600">{item.count} attempts</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href="/fraud/rules"
          className="bg-blue-500 text-white p-4 rounded-lg text-center hover:bg-blue-600"
        >
          Manage Rules
        </a>
        <a
          href="/fraud/blacklists"
          className="bg-red-500 text-white p-4 rounded-lg text-center hover:bg-red-600"
        >
          Manage Blacklists
        </a>
        <a
          href="/fraud/review"
          className="bg-yellow-500 text-white p-4 rounded-lg text-center hover:bg-yellow-600"
        >
          Review Queue
        </a>
      </div>
    </div>
  );
}
