import type { Metadata } from "next";
import "./globals.css";
import { TRPCProvider } from "../lib/trpc-provider";

export const metadata: Metadata = {
  title: "IndieTix Admin - Platform Management",
  description: "Admin panel for platform management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en">
      <body>
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
