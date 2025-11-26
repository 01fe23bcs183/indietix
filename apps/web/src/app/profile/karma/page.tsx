"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface KarmaData {
  karma: number;
  profileCompleted: boolean;
  referralCode: string | null;
}

interface KarmaTransaction {
  id: string;
  delta: number;
  type: string;
  reason: string;
  refId: string | null;
  held: boolean;
  createdAt: string;
}

interface RewardProgress {
  key: string;
  name: string;
  description: string;
  cost: number;
  type: string;
  unlocked: boolean;
  progress: number;
}

interface Badge {
  key: string;
  name: string;
  description: string;
  icon: string;
  threshold: number;
  category: string;
}

interface UserBadge {
  badgeKey: string;
  earnedAt: string;
  badge: Badge;
}

const REASON_LABELS: Record<string, string> = {
  BOOK: "Booked a ticket",
  ATTEND: "Attended an event",
  REFERRAL: "Referred a friend",
  REVIEW: "Posted a review",
  EARLY_BIRD: "Early bird booking",
  PROFILE: "Completed profile",
  SHARE: "Shared an event",
  STREAK: "Streak bonus",
  LOW_SALES_HELP: "Helped a low-sales event",
  REWARD_REDEEM: "Redeemed a reward",
  ADMIN_ADJUST: "Admin adjustment",
};

export default function KarmaPage() {
  const [karmaData, setKarmaData] = useState<KarmaData | null>(null);
  const [transactions, setTransactions] = useState<KarmaTransaction[]>([]);
  const [rewards, setRewards] = useState<RewardProgress[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  const userId = "demo-user-id";

  useEffect(() => {
    async function fetchData() {
      try {
        const [karmaRes, historyRes, rewardsRes, badgesRes, userBadgesRes] =
          await Promise.all([
            fetch(`/api/trpc/loyalty.getKarma?input=${encodeURIComponent(JSON.stringify({ userId }))}`),
            fetch(`/api/trpc/loyalty.history?input=${encodeURIComponent(JSON.stringify({ userId, limit: 20 }))}`),
            fetch(`/api/trpc/loyalty.rewards.catalog?input=${encodeURIComponent(JSON.stringify({ userId }))}`),
            fetch(`/api/trpc/loyalty.badges.list`),
            fetch(`/api/trpc/loyalty.badges.userBadges?input=${encodeURIComponent(JSON.stringify({ userId }))}`),
          ]);

        if (karmaRes.ok) {
          const data = await karmaRes.json();
          setKarmaData(data.result?.data);
        }

        if (historyRes.ok) {
          const data = await historyRes.json();
          setTransactions(data.result?.data?.transactions || []);
        }

        if (rewardsRes.ok) {
          const data = await rewardsRes.json();
          setRewards(data.result?.data || []);
        }

        if (badgesRes.ok) {
          const data = await badgesRes.json();
          setBadges(data.result?.data || []);
        }

        if (userBadgesRes.ok) {
          const data = await userBadgesRes.json();
          setUserBadges(data.result?.data || []);
        }
      } catch (err) {
        setError("Failed to load karma data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const handleRedeem = async (rewardKey: string) => {
    setRedeeming(rewardKey);
    try {
      const response = await fetch("/api/trpc/loyalty.redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, rewardKey }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.result?.data?.success) {
          setKarmaData((prev) =>
            prev ? { ...prev, karma: data.result.data.newBalance } : null
          );
          alert(
            data.result.data.promoCode
              ? `Reward redeemed! Your promo code: ${data.result.data.promoCode}`
              : "Reward redeemed successfully!"
          );
        }
      }
    } catch (err) {
      alert("Failed to redeem reward");
    } finally {
      setRedeeming(null);
    }
  };

  const earnedBadgeKeys = new Set(userBadges.map((ub) => ub.badgeKey));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your karma...</p>
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
            href="/profile"
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
            Back to Profile
          </Link>
        </div>

        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-lg p-8 text-white mb-8">
          <h1 className="text-3xl font-bold mb-2">Karma & Rewards</h1>
          <div className="flex items-baseline">
            <span className="text-6xl font-bold">{karmaData?.karma ?? 0}</span>
            <span className="text-2xl ml-2 text-purple-200">karma points</span>
          </div>
          {karmaData?.referralCode && (
            <div className="mt-4 bg-white/10 rounded-lg p-3">
              <p className="text-sm text-purple-200">Your referral code:</p>
              <p className="text-xl font-mono font-bold">
                {karmaData.referralCode}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Available Rewards
            </h2>
            <div className="space-y-4">
              {rewards.map((reward) => (
                <div
                  key={reward.key}
                  className={`border rounded-lg p-4 ${
                    reward.unlocked
                      ? "border-purple-200 bg-purple-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {reward.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {reward.description}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold ${
                        reward.unlocked ? "text-purple-600" : "text-gray-400"
                      }`}
                    >
                      {reward.cost} karma
                    </span>
                  </div>
                  <div className="mb-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          reward.unlocked ? "bg-purple-600" : "bg-gray-400"
                        }`}
                        style={{ width: `${Math.min(reward.progress, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {reward.progress}% complete
                    </p>
                  </div>
                  <button
                    onClick={() => handleRedeem(reward.key)}
                    disabled={!reward.unlocked || redeeming === reward.key}
                    className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors ${
                      reward.unlocked
                        ? "bg-purple-600 text-white hover:bg-purple-700"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    {redeeming === reward.key
                      ? "Redeeming..."
                      : reward.unlocked
                        ? "Redeem"
                        : "Locked"}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Recent Activity
            </h2>
            {transactions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No karma transactions yet
              </p>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className={`flex justify-between items-center p-3 rounded-lg ${
                      tx.held ? "bg-yellow-50" : "bg-gray-50"
                    }`}
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {REASON_LABELS[tx.reason] || tx.reason}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(tx.createdAt).toLocaleDateString()}
                        {tx.held && (
                          <span className="ml-2 text-yellow-600">
                            (Under review)
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`font-bold ${
                        tx.delta > 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {tx.delta > 0 ? "+" : ""}
                      {tx.delta}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Badges</h2>
            <span className="text-sm text-gray-500">
              {earnedBadgeKeys.size} / {badges.length} earned
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {badges.map((badge) => {
              const earned = earnedBadgeKeys.has(badge.key);
              return (
                <div
                  key={badge.key}
                  className={`text-center p-4 rounded-lg border ${
                    earned
                      ? "border-purple-200 bg-purple-50"
                      : "border-gray-200 bg-gray-50 opacity-50"
                  }`}
                  title={badge.description}
                >
                  <div className="text-4xl mb-2">{badge.icon}</div>
                  <p
                    className={`text-sm font-medium ${
                      earned ? "text-gray-900" : "text-gray-500"
                    }`}
                  >
                    {badge.name}
                  </p>
                  {!earned && (
                    <p className="text-xs text-gray-400 mt-1">
                      {badge.threshold}+ to unlock
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            How to Earn Karma
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-2xl mr-3">🎫</span>
              <div>
                <p className="font-medium">Book a ticket</p>
                <p className="text-sm text-green-600">+10 karma</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-2xl mr-3">🎉</span>
              <div>
                <p className="font-medium">Attend an event</p>
                <p className="text-sm text-green-600">+50 karma</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-2xl mr-3">👥</span>
              <div>
                <p className="font-medium">Refer a friend</p>
                <p className="text-sm text-green-600">+100 karma</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-2xl mr-3">⭐</span>
              <div>
                <p className="font-medium">Post a review</p>
                <p className="text-sm text-green-600">+20 karma</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-2xl mr-3">🐦</span>
              <div>
                <p className="font-medium">Early bird booking</p>
                <p className="text-sm text-green-600">+30 karma</p>
              </div>
            </div>
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-2xl mr-3">🔥</span>
              <div>
                <p className="font-medium">5 shows in a month</p>
                <p className="text-sm text-green-600">+200 karma</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/leaderboard"
            className="inline-flex items-center text-purple-600 hover:text-purple-700 font-semibold"
          >
            View Leaderboard
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
