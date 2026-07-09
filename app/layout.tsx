import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Glimpse — A quieter way to understand your code",
  description:
    "A private weekly briefing for understanding the code you and your agents just made.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
