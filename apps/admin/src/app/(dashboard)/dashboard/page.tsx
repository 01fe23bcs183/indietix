"use client";

import { trpc } from "../../../lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@indietix/ui";

export default function DashboardPage() {
  const { data: kpis, isLoading: kpisLoading } =
    trpc.admin.dashboard.kpis.useQuery();
  const { data: revenue } = trpc.admin.dashboard.revenueLast30Days.useQuery();
  const { data: bookingsByCategory } =
    trpc.admin.dashboard.bookingsByCategory.useQuery();
  const { data: topCities } = trpc.admin.dashboard.topCities.useQuery({
    limit: 10,
  });
  const { data: recentActivity } =
    trpc.admin.dashboard.recentActivity.useQuery({ limit: 20 });

  if (kpisLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600">Platform overview and key metrics</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              GMV Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{((kpis?.gmvToday || 0) / 100).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Revenue Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{((kpis?.revenueToday || 0) / 100).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis?.activeUsers || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Bookings (Last Hour)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpis?.bookingsLastHour || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis?.uptime || "N/A"}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 overflow-auto">
              {revenue && revenue.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 text-left">Date</th>
                      <th className="pb-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenue.map((item) => (
                      <tr key={item.date} className="border-b">
                        <td className="py-2">{item.date}</td>
                        <td className="py-2 text-right">
                          ₹{(item.revenue / 100).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-gray-500">No revenue data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bookings by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bookingsByCategory && bookingsByCategory.length > 0 ? (
                bookingsByCategory.map((item) => (
                  <div
                    key={item.category}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm font-medium">{item.category}</span>
                    <span className="text-sm text-gray-600">{item.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No booking data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Cities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topCities && topCities.length > 0 ? (
                topCities.map((item) => (
                  <div
                    key={item.city}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm font-medium">{item.city}</span>
                    <span className="text-sm text-gray-600">{item.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No city data available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 space-y-3 overflow-auto">
              {recentActivity && recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start justify-between border-b pb-2"
                  >
                    <div className="flex-1">
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`rounded px-2 py-1 text-xs ${
                        activity.status === "CONFIRMED" ||
                        activity.status === "PUBLISHED"
                          ? "bg-green-100 text-green-800"
                          : activity.status === "PENDING" ||
                            activity.status === "DRAFT"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {activity.status}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
