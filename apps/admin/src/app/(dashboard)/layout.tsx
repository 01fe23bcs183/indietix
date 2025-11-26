"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@indietix/ui";

const navigation = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Users", href: "/users" },
  { name: "Organizers", href: "/organizers" },
  { name: "Events", href: "/events" },
  { name: "Transactions", href: "/transactions" },
  { name: "Payouts", href: "/payouts" },
  { name: "Fraud Detection", href: "/fraud" },
  { name: "Communication", href: "/comm" },
  { name: "Experiments", href: "/experiments" },
  { name: "CMS", href: "/cms" },
  { name: "Settings", href: "/settings" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-md">
        <div className="p-6">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
        </div>
        <nav className="mt-6">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`block px-6 py-3 text-sm font-medium ${
                  isActive
                    ? "bg-blue-50 text-blue-600 border-r-4 border-blue-600"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 w-64 p-6">
          <Button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            variant="outline"
            className="w-full"
          >
            Sign Out
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
