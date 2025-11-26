import type { BadgeCategory } from "@indietix/db";

export interface BadgeDefinition {
  key: string;
  name: string;
  description: string;
  icon: string;
  threshold: number;
  category: BadgeCategory;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // Booking badges
  {
    key: "FIRST_BOOKING",
    name: "First Timer",
    description: "Made your first booking",
    icon: "ticket",
    threshold: 1,
    category: "BOOKINGS",
  },
  {
    key: "BOOKINGS_5",
    name: "Regular",
    description: "Made 5 bookings",
    icon: "tickets",
    threshold: 5,
    category: "BOOKINGS",
  },
  {
    key: "BOOKINGS_10",
    name: "Enthusiast",
    description: "Made 10 bookings",
    icon: "star",
    threshold: 10,
    category: "BOOKINGS",
  },
  {
    key: "BOOKINGS_25",
    name: "Super Fan",
    description: "Made 25 bookings",
    icon: "crown",
    threshold: 25,
    category: "BOOKINGS",
  },
  {
    key: "BOOKINGS_50",
    name: "Legend",
    description: "Made 50 bookings",
    icon: "trophy",
    threshold: 50,
    category: "BOOKINGS",
  },

  // Attendance badges
  {
    key: "FIRST_ATTENDANCE",
    name: "Show Up",
    description: "Attended your first event",
    icon: "check-circle",
    threshold: 1,
    category: "ATTENDANCE",
  },
  {
    key: "ATTENDANCE_5",
    name: "Reliable",
    description: "Attended 5 events",
    icon: "calendar-check",
    threshold: 5,
    category: "ATTENDANCE",
  },
  {
    key: "ATTENDANCE_10",
    name: "Dedicated",
    description: "Attended 10 events",
    icon: "medal",
    threshold: 10,
    category: "ATTENDANCE",
  },
  {
    key: "ATTENDANCE_25",
    name: "Committed",
    description: "Attended 25 events",
    icon: "award",
    threshold: 25,
    category: "ATTENDANCE",
  },
  {
    key: "STREAK_MASTER",
    name: "Streak Master",
    description: "Achieved a 5-show streak in a month",
    icon: "flame",
    threshold: 1,
    category: "ATTENDANCE",
  },

  // Karma badges
  {
    key: "KARMA_100",
    name: "Rising Star",
    description: "Earned 100 karma points",
    icon: "sparkles",
    threshold: 100,
    category: "KARMA",
  },
  {
    key: "KARMA_500",
    name: "Contributor",
    description: "Earned 500 karma points",
    icon: "zap",
    threshold: 500,
    category: "KARMA",
  },
  {
    key: "KARMA_1000",
    name: "Influencer",
    description: "Earned 1000 karma points",
    icon: "star",
    threshold: 1000,
    category: "KARMA",
  },
  {
    key: "KARMA_5000",
    name: "Champion",
    description: "Earned 5000 karma points",
    icon: "crown",
    threshold: 5000,
    category: "KARMA",
  },
  {
    key: "KARMA_10000",
    name: "Elite",
    description: "Earned 10000 karma points",
    icon: "gem",
    threshold: 10000,
    category: "KARMA",
  },

  // Special badges
  {
    key: "REFERRER",
    name: "Connector",
    description: "Referred a friend who made a booking",
    icon: "users",
    threshold: 1,
    category: "KARMA",
  },
  {
    key: "REVIEWER",
    name: "Critic",
    description: "Posted your first review",
    icon: "message-square",
    threshold: 1,
    category: "KARMA",
  },
  {
    key: "EARLY_BIRD",
    name: "Early Bird",
    description: "Booked an event 7+ days in advance",
    icon: "sunrise",
    threshold: 1,
    category: "BOOKINGS",
  },
  {
    key: "HELPER",
    name: "Community Helper",
    description: "Supported a low-sales event",
    icon: "heart",
    threshold: 1,
    category: "KARMA",
  },
];

export function getBadgeDefinition(key: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((b) => b.key === key);
}

export function getBadgesByCategory(category: BadgeCategory): BadgeDefinition[] {
  return BADGE_DEFINITIONS.filter((b) => b.category === category);
}

export function getAllBadges(): BadgeDefinition[] {
  return BADGE_DEFINITIONS;
}
