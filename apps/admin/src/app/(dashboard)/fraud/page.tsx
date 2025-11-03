"use client";

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@indietix/ui";

export default function FraudDashboardPage() {
  const { data: stats, isLoading } = trpc.admin.fraud.getDashboardStats.useQuery();

  if (isLoading) {
    return <div className="p-6">Loading fraud dashboard...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Fraud & Risk Management</h1>
        <p className="text-gray-600 mt-2">
          Monitor booking attempts, manage rules, and review flagged cases
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Attempts (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalAttempts24h || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attempts (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.totalAttempts7d || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">
              {stats?.openCases || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution (7d)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Low (0-24)</span>
                <span className="font-semibold">
                  {stats?.riskDistribution.low || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Medium (25-49)</span>
                <span className="font-semibold">
                  {stats?.riskDistribution.medium || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>High (50-74)</span>
                <span className="font-semibold text-orange-600">
                  {stats?.riskDistribution.high || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Critical (75-100)</span>
                <span className="font-semibold text-red-600">
                  {stats?.riskDistribution.critical || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top IPs (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats?.topIps.slice(0, 5).map((item) => (
                <div key={item.ip} className="flex justify-between">
                  <span className="font-mono text-sm">{item.ip}</span>
                  <span className="font-semibold">{item.count}</span>
                </div>
              ))}
              {!stats?.topIps.length && (
                <p className="text-gray-500 text-sm">No data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a
          href="/fraud/rules"
          className="block p-6 bg-white border rounded-lg hover:shadow-md transition"
        >
          <h3 className="font-semibold text-lg">Rules</h3>
          <p className="text-gray-600 text-sm mt-1">
            Manage fraud detection rules
          </p>
        </a>
        <a
          href="/fraud/blacklists"
          className="block p-6 bg-white border rounded-lg hover:shadow-md transition"
        >
          <h3 className="font-semibold text-lg">Blacklists</h3>
          <p className="text-gray-600 text-sm mt-1">
            Manage email, phone, and IP blacklists
          </p>
        </a>
        <a
          href="/fraud/cases"
          className="block p-6 bg-white border rounded-lg hover:shadow-md transition"
        >
          <h3 className="font-semibold text-lg">Review Queue</h3>
          <p className="text-gray-600 text-sm mt-1">
            Review and resolve flagged bookings
          </p>
        </a>
      </div>
    </div>
  );
}
