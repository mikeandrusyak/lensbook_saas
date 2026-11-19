import type { Metadata } from "next";
import { connection } from "next/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lensbook",
  description: "CRM for photographers",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Render on every request, never at build time: the CSP nonce (proxy.ts) is new for
  // each request, and a page built in advance would carry scripts without it.
  await connection();
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
