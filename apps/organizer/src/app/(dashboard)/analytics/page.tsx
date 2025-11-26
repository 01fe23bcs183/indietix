"use client";

import { useState } from "react";
import { trpc } from "../../../lib/trpc";
import { formatINR } from "@indietix/utils";
import { Button } from "@indietix/ui";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type DateRange = "7" | "30" | "90" | "custom";

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>("30");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const getDateRange = () => {
    if (dateRange === "custom" && customFrom && customTo) {
      return {
        from: new Date(customFrom).toISOString(),
        to: new Date(customTo).toISOString(),
      };
    }

    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - parseInt(dateRange));

    return {
      from: from.toISOString(),
      to: to.toISOString(),
    };
  };

  const { from, to } = getDateRange();

  const { data: summary, isLoading: summaryLoading } =
    trpc.organizer.analytics.summary.useQuery({ from, to });

  const { data: timeseries, isLoading: timeseriesLoading } =
    trpc.organizer.analytics.timeseries.useQuery({
      from,
      to,
      interval: dateRange === "7" ? "day" : "day",
    });

  const { data: topEvents, isLoading: topEventsLoading } =
    trpc.organizer.analytics.topEvents.useQuery({
      from,
      to,
      by: "revenue",
      limit: 10,
    });

  const { data: funnel, isLoading: funnelLoading } =
    trpc.organizer.analytics.funnel.useQuery({ from, to });

  const { refetch: exportCsv, isFetching: exportLoading } =
    trpc.organizer.analytics.exportCsv.useQuery(
      { from, to },
      { enabled: false }
    );

  const handleExport = async () => {
    const result = await exportCsv();
    if (result.data) {
      const blob = new Blob([result.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `analytics-${from.split("T")[0]}-to-${to.split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  };

  const isLoading =
    summaryLoading || timeseriesLoading || topEventsLoading || funnelLoading;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-muted-foreground">
          Track your event performance and revenue
        </p>
      </div>

      <div className="mb-8 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium mb-2">Date Range</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="custom">Custom</option>
          </select>
        </div>

        {dateRange === "custom" && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">From</label>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">To</label>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-3 py-2 border rounded-md"
              />
            </div>
          </>
        )}

        <Button onClick={handleExport} disabled={exportLoading}>
          {exportLoading ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="border rounded-lg p-6 bg-card">
              <p className="text-sm text-muted-foreground mb-1">
                Total Revenue
              </p>
              <p className="text-3xl font-bold">
                {formatINR(summary?.revenue || 0)}
              </p>
            </div>

            <div className="border rounded-lg p-6 bg-card">
              <p className="text-sm text-muted-foreground mb-1">Bookings</p>
              <p className="text-3xl font-bold">{summary?.bookings || 0}</p>
            </div>

            <div className="border rounded-lg p-6 bg-card">
              <p className="text-sm text-muted-foreground mb-1">
                Avg Ticket Price
              </p>
              <p className="text-3xl font-bold">
                {formatINR(summary?.avgTicket || 0)}
              </p>
            </div>

            <div className="border rounded-lg p-6 bg-card">
              <p className="text-sm text-muted-foreground mb-1">Seats Sold</p>
              <p className="text-3xl font-bold">{summary?.seatsSold || 0}</p>
            </div>

            <div className="border rounded-lg p-6 bg-card">
              <p className="text-sm text-muted-foreground mb-1">Events Live</p>
              <p className="text-3xl font-bold">{summary?.eventsLive || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold mb-4">Revenue Over Time</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeseries || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="t" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => formatINR(value)}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8884d8"
                    name="Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold mb-4">Bookings Over Time</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeseries || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="t" />
                  <YAxis />
                  <Tooltip labelFormatter={(label) => `Date: ${label}`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="bookings"
                    stroke="#82ca9d"
                    name="Bookings"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold mb-4">Conversion Funnel</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    { stage: "Views", count: funnel?.views || 0 },
                    { stage: "Detail Views", count: funnel?.detailViews || 0 },
                    { stage: "Add to Cart", count: funnel?.addToCart || 0 },
                    { stage: "Bookings", count: funnel?.bookings || 0 },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#8884d8" name="Count" />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 text-sm text-muted-foreground">
                <p>
                  Conversion Rate:{" "}
                  {funnel?.views && funnel?.bookings
                    ? ((funnel.bookings / funnel.views) * 100).toFixed(2)
                    : 0}
                  %
                </p>
              </div>
            </div>

            <div className="border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold mb-4">
                Top Events by Revenue
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 text-sm font-medium">
                        Event
                      </th>
                      <th className="text-right py-2 text-sm font-medium">
                        Revenue
                      </th>
                      <th className="text-right py-2 text-sm font-medium">
                        Attendance
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {topEvents && topEvents.length > 0 ? (
                      topEvents.map(
                        (event: {
                          eventId: string;
                          eventTitle: string;
                          revenue: number;
                          attendance: number;
                        }) => (
                          <tr key={event.eventId} className="border-b">
                            <td className="py-2 text-sm">{event.eventTitle}</td>
                            <td className="text-right py-2 text-sm">
                              {formatINR(event.revenue)}
                            </td>
                            <td className="text-right py-2 text-sm">
                              {event.attendance}
                            </td>
                          </tr>
                        )
                      )
                    ) : (
                      <tr>
                        <td
                          colSpan={3}
                          className="py-4 text-center text-sm text-muted-foreground"
                        >
                          No events found for this period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
