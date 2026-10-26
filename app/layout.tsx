import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AnalyticsVisitTracker from "@/app/components/AnalyticsVisitTracker";
import PwaRegistration from "@/app/components/PwaRegistration";
import StructuredData from "@/app/components/StructuredData";
import { getSiteStructuredData } from "@/app/lib/structuredData";
import {
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_TITLE,
  SITE_NAME,
  SITE_URL,
} from "@/app/lib/seo";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  applicationName: SITE_NAME,
  title: {
    default: DEFAULT_SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_SITE_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/unboda-icon.svg", type: "image/svg+xml", sizes: "any" }],
    shortcut: "/unboda-icon.svg",
    apple: "/apple-icon",
  },
  verification: {
    other: {
      "naver-site-verification": "9156c4832376625dfc22da771745d88f2612dfbe",
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: SITE_NAME,
    url: "/",
    title: DEFAULT_SITE_TITLE,
    description: DEFAULT_SITE_DESCRIPTION,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: SITE_NAME,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_SITE_TITLE,
    description: DEFAULT_SITE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f5f7fc] text-[#11162d]">
        <StructuredData data={getSiteStructuredData()} />
        <AnalyticsVisitTracker />
        <PwaRegistration />
        {children}
      </body>
    </html>
  );
}
