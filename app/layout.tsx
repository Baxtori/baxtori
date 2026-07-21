import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "Baxtori — Notes from your repositories";
const description =
  "A concise record of what changed, why it matters, and the code behind it.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const forwardedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol = forwardedProtocol ?? (host?.startsWith("localhost") ? "http" : "https");
  const metadataBase = host ? new URL(`${protocol}://${host}`) : undefined;
  const image = metadataBase ? new URL("/og.png", metadataBase).toString() : "/og.png";

  return {
    metadataBase,
    title,
    description,
    icons: {
      apple: "/botanical/flower-mark.svg",
      icon: "/botanical/flower-mark.svg",
      shortcut: "/botanical/flower-mark.svg",
    },
    openGraph: {
      type: "website",
      title,
      description,
      images: [{ url: image, width: 1536, height: 1024, alt: "Baxtori — Notes from your repositories." }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

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
