import type { NextConfig } from "next";

const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const apiNoStoreHeaders = [
  { key: "Cache-Control", value: "private, no-store, max-age=0" },
];

const privateNoIndexSources = [
  "/admin/:path*",
  "/auth/:path*",
  "/account/:path*",
  "/api/:path*",
  "/mypage/:path*",
  "/interests/:path*",
  "/my-unboda/:path*",
  "/purchased-analyses/:path*",
  "/ai-consulting/:path*",
  "/checkout/:path*",
  "/loading",
  "/result",
  "/recommendations",
  "/guest-loading",
  "/guest-result",
  "/saju",
  "/today",
  "/support",
  "/support/:path*",
  "/paid-analysis/:productId/report",
  "/special-analysis/compatibility/romantic",
  "/special-analysis/compatibility/workplace",
  "/special-analysis/compatibility/friend",
  "/special-analysis/compatibility/business",
  "/special-analysis/compatibility/report",
  "/special-analysis/compatibility/workplace/report",
  "/special-analysis/compatibility/friend/report",
  "/special-analysis/compatibility/business/report",
  "/special-analysis/compatibility/family/parent-child",
  "/special-analysis/compatibility/family/parent-child/report",
  "/special-analysis/compatibility/family/siblings/report",
  "/special-analysis/compatibility/family/other/report",
] as const;

const privateNoIndexHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/api/:path*",
        headers: apiNoStoreHeaders,
      },
      ...privateNoIndexSources.map((source) => ({
        source,
        headers: privateNoIndexHeaders,
      })),
    ];
  },
};

export default nextConfig;
