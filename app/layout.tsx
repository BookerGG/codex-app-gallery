import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

const title = "Codex App Gallery";
const description =
  "A living portfolio hub for Codex-built apps, with live demos for the Job Hunt Tracker and Support Ticket System.";

async function getMetadataBase() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");

  return new URL(`${protocol}://${host}`);
}

export async function generateMetadata(): Promise<Metadata> {
  const metadataBase = await getMetadataBase();
  const imageUrl = new URL("/og.png", metadataBase).toString();

  return {
    metadataBase,
    title,
    description,
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title,
      description,
      siteName: title,
      url: metadataBase,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: "Codex App Gallery social preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
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
