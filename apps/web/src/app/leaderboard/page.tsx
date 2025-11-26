"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  score: number;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  total: number;
}

export default function LeaderboardPage() {
  const [cities, setCities] = useState<string[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [userRank, setUserRank] = useState<{
    rank: number;
    score: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = "demo-user-id";

  useEffect(() => {
    async function fetchCitiesAndMonths() {
      try {
        const [citiesRes, monthsRes] = await Promise.all([
          fetch("/api/trpc/loyalty.leaderboard.cities"),
          fetch("/api/trpc/loyalty.leaderboard.months"),
        ]);

        if (citiesRes.ok) {
          const data = await citiesRes.json();
          const cityList = data.result?.data || [];
          setCities(cityList);
          if (cityList.length > 0) {
            setSelectedCity(cityList[0]);
          }
        }

        if (monthsRes.ok) {
          const data = await monthsRes.json();
          const monthList = data.result?.data || [];
          setMonths(monthList);
          if (monthList.length > 0) {
            setSelectedMonth(monthList[0]);
          }
        }
      } catch {
        setError("Failed to load leaderboard data");
      } finally {
        setLoading(false);
      }
    }

    fetchCitiesAndMonths();
  }, []);

  useEffect(() => {
    if (!selectedCity || !selectedMonth) return;

    async function fetchLeaderboard() {
      try {
        const [leaderboardRes, rankRes] = await Promise.all([
          fetch(
            `/api/trpc/loyalty.leaderboard.get?input=${encodeURIComponent(
              JSON.stringify({
                city: selectedCity,
                month: selectedMonth,
                limit: 50,
              })
            )}`
          ),
          fetch(
            `/api/trpc/loyalty.leaderboard.userRank?input=${encodeURIComponent(
              JSON.stringify({
                userId,
                city: selectedCity,
                month: selectedMonth,
              })
            )}`
          ),
        ]);

        if (leaderboardRes.ok) {
          const data = await leaderboardRes.json();
          setLeaderboard(data.result?.data || { entries: [], total: 0 });
        }

        if (rankRes.ok) {
          const data = await rankRes.json();
          setUserRank(data.result?.data);
        }
      } catch (err) {
        console.error("Failed to fetch leaderboard:", err);
      }
    }

    fetchLeaderboard();
  }, [selectedCity, selectedMonth]);

  const formatMonth = (monthStr: string) => {
    const parts = monthStr.split("-");
    const year = parts[0] ?? "2024";
    const month = parts[1] ?? "1";
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            href="/"
            className="text-purple-600 hover:text-purple-700 flex items-center"
          >
            <svg
              className="w-5 h-5 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Home
          </Link>
        </div>

        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg shadow-lg p-8 text-white mb-8">
          <h1 className="text-3xl font-bold mb-2">Karma Leaderboard</h1>
          <p className="text-yellow-100">
            See who&apos;s earning the most karma in your city!
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label
                htmlFor="city"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                City
              </label>
              <select
                id="city"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {cities.length === 0 ? (
                  <option value="">No cities available</option>
                ) : (
                  cities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="flex-1">
              <label
                htmlFor="month"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Month
              </label>
              <select
                id="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {months.length === 0 ? (
                  <option value="">No months available</option>
                ) : (
                  months.map((month) => (
                    <option key={month} value={month}>
                      {formatMonth(month)}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>
        </div>

        {userRank && userRank.rank > 0 && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Your Rank</p>
                <p className="text-2xl font-bold text-purple-900">
                  #{userRank.rank}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-purple-600 font-medium">
                  Your Score
                </p>
                <p className="text-2xl font-bold text-purple-900">
                  {userRank.score} karma
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Top Karma Earners
              {selectedCity && selectedMonth && (
                <span className="text-gray-500 font-normal">
                  {" "}
                  in {selectedCity} - {formatMonth(selectedMonth)}
                </span>
              )}
            </h2>
          </div>

          {!leaderboard || leaderboard.entries.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <p>No leaderboard data available yet.</p>
              <p className="text-sm mt-2">
                Start earning karma to appear on the leaderboard!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {leaderboard.entries.map((entry, index) => (
                <div
                  key={entry.userId}
                  className={`flex items-center px-6 py-4 ${
                    index < 3 ? "bg-gradient-to-r" : ""
                  } ${
                    index === 0
                      ? "from-yellow-50 to-yellow-100"
                      : index === 1
                        ? "from-gray-50 to-gray-100"
                        : index === 2
                          ? "from-orange-50 to-orange-100"
                          : ""
                  }`}
                >
                  <div className="flex-shrink-0 w-12">
                    {index === 0 ? (
                      <span className="text-3xl">🥇</span>
                    ) : index === 1 ? (
                      <span className="text-3xl">🥈</span>
                    ) : index === 2 ? (
                      <span className="text-3xl">🥉</span>
                    ) : (
                      <span className="text-xl font-bold text-gray-400">
                        #{entry.rank}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {entry.userName}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span
                      className={`text-lg font-bold ${
                        index === 0
                          ? "text-yellow-600"
                          : index === 1
                            ? "text-gray-600"
                            : index === 2
                              ? "text-orange-600"
                              : "text-purple-600"
                      }`}
                    >
                      {entry.score}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">karma</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {leaderboard && leaderboard.total > leaderboard.entries.length && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-500">
                Showing {leaderboard.entries.length} of {leaderboard.total}{" "}
                participants
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/profile/karma"
            className="inline-flex items-center text-purple-600 hover:text-purple-700 font-semibold"
          >
            View Your Karma & Rewards
            <svg
              className="w-5 h-5 ml-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
