import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IndieTix Organizer - Event Management",
  description: "Organizer dashboard for event management",
  manifest: "/manifest.json",
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
