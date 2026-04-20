import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Training Guides",
  description: "Step-by-step training guides for the team",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
