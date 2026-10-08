import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import robots from "../app/robots";
import sitemap from "../app/sitemap";
import { getLaunchProductIds } from "../app/lib/paidAnalysisTopicConfig";
import { getPremiumProduct } from "../app/lib/premiumProductRegistry";
import { getPremiumProductDisplayTitle } from "../app/lib/premiumPresentation";
import { SITE_ORIGIN } from "../app/lib/seo";
import { COMPATIBILITY_GUIDE_SLUGS, getCompatibilityPublicGuidePath } from "../app/lib/compatibilityPublicGuides";

const entries = sitemap();
const urls = new Set(entries.map((entry) => entry.url));
const launchIds = getLaunchProductIds();

assert.equal(launchIds.length, 57, "SEO sitemap must track all 57 launch paid-analysis products");
assert.equal(new Set(launchIds).size, 57, "launch product IDs must stay unique");

const productTitles = launchIds.map((productId) => {
  const product = getPremiumProduct(productId);
  assert(product, `missing premium product: ${productId}`);
  return getPremiumProductDisplayTitle(product.id, product.title);
});
assert.equal(new Set(productTitles).size, 57, "all 57 paid-product SEO titles must stay unique");

for (const productId of launchIds) {
  assert(
    urls.has(`${SITE_ORIGIN}/paid-analysis/${productId}`),
    `sitemap missing paid product: ${productId}`,
  );
}

for (const path of [
  "/",
  "/guest-saju",
  "/deep-analysis",
  "/special-analysis",
  "/special-analysis/compatibility",
  "/reviews",
  "/trust",
  "/privacy",
  "/terms",
  "/refund",
]) {
  assert(urls.has(`${SITE_ORIGIN}${path}`), `sitemap missing public route: ${path}`);
}

for (const forbidden of [
  "/admin",
  "/auth",
  "/account",
  "/mypage",
  "/interests",
  "/purchased-analyses",
  "/ai-consulting",
  "/checkout",
  "/result",
  "/report",
  "/support",
]) {
  assert(
    !entries.some((entry) => new URL(entry.url).pathname.startsWith(forbidden)),
    `private/personalized route leaked into sitemap: ${forbidden}`,
  );
}

const robotsConfig = robots();
const rules = Array.isArray(robotsConfig.rules) ? robotsConfig.rules : [robotsConfig.rules];
assert(
  rules.some((rule) => rule.userAgent === "*" && rule.allow === "/"),
  "robots must allow public crawling",
);
assert(
  rules.some((rule) => Array.isArray(rule.disallow) && rule.disallow.includes("/admin") && rule.disallow.includes("/api")),
  "robots must exclude admin and API roots from crawling",
);
assert.equal(robotsConfig.sitemap, `${SITE_ORIGIN}/sitemap.xml`, "robots must advertise the canonical sitemap");
assert(!("host" in robotsConfig), "robots should avoid nonstandard Host directives");

const layout = readFileSync("app/layout.tsx", "utf8");
assert(layout.includes("metadataBase: SITE_URL"), "root metadata must set metadataBase");
assert(layout.includes('template: `%s | ${SITE_NAME}`'), "root metadata must keep the title template");
assert(layout.includes('images: ["/opengraph-image"]'), "root metadata must expose the OG image");
assert(!layout.includes("robots: {\n    index: true"), "root metadata must not force index on private descendants");
assert(layout.includes('"naver-site-verification": "9156c4832376625dfc22da771745d88f2612dfbe"'),
  "Naver Search Advisor ownership tag must remain in root HTML head");
assert(layout.includes("verification: {") && layout.includes("other: {"),
  "Naver ownership token must be provided through Next.js metadata, not rendered in the page body");
assert(readFileSync("public/google4255487660cdf7be.html", "utf8").includes("google-site-verification:"),
  "Existing Google Search Console ownership verification must remain in place");

const productPage = readFileSync("app/paid-analysis/[productId]/page.tsx", "utf8");
assert(productPage.includes("export async function generateMetadata"), "57 paid products need dynamic metadata");
assert(productPage.includes("getPremiumProductDisplayTitle"), "product metadata must use customer-facing titles");
assert(productPage.includes('description: `\${displayTitle}: \${product.description}`'), "product descriptions must stay distinct and topic-specific");
assert(productPage.includes('path: `/paid-analysis/${product.id}`'), "product canonical must drop profile/query variants");

const nextConfig = readFileSync("next.config.ts", "utf8");
for (const privateRoute of [
  '"/admin/:path*"',
  '"/auth/:path*"',
  '"/account/:path*"',
  '"/mypage/:path*"',
  '"/interests/:path*"',
  '"/purchased-analyses/:path*"',
  '"/ai-consulting/:path*"',
  '"/checkout/:path*"',
  '"/paid-analysis/:productId/report"',
]) {
  assert(nextConfig.includes(privateRoute), `noindex header missing private route: ${privateRoute}`);
}
assert(
  nextConfig.includes('{ key: "X-Robots-Tag", value: "noindex, nofollow" }'),
  "private routes must send X-Robots-Tag noindex",
);

for (const path of [
  "app/page.tsx",
  "app/deep-analysis/page.tsx",
  "app/special-analysis/page.tsx",
  "app/special-analysis/compatibility/page.tsx",
  "app/reviews/page.tsx",
  "app/trust/page.tsx",
]) {
  const source = readFileSync(path, "utf8");
  assert(source.includes("buildPublicMetadata"), `public metadata missing: ${path}`);
}

for (const [route, path] of [
  ["/special-analysis/compatibility/romantic", "app/special-analysis/compatibility/romantic/page.tsx"],
  ["/special-analysis/compatibility/workplace", "app/special-analysis/compatibility/workplace/page.tsx"],
  ["/special-analysis/compatibility/friend", "app/special-analysis/compatibility/friend/page.tsx"],
  ["/special-analysis/compatibility/business", "app/special-analysis/compatibility/business/page.tsx"],
] as const) {
  assert(!urls.has(`${SITE_ORIGIN}${route}`), `auth-gated compatibility route leaked into sitemap: ${route}`);
  assert(nextConfig.includes(`"${route}"`), `auth-gated compatibility route needs X-Robots noindex: ${route}`);
  const source = readFileSync(path, "utf8");
  assert(source.includes("NOINDEX_METADATA"), `auth-gated compatibility page must emit noindex metadata: ${path}`);
  assert(!source.includes("buildPublicMetadata"), `auth-gated compatibility page must not emit public canonical metadata: ${path}`);
}

assert(
  readFileSync("app/guest-saju/layout.tsx", "utf8").includes("buildPublicMetadata"),
  "guest free-analysis page needs public metadata",
);
const ogImageSource = readFileSync("app/opengraph-image.tsx", "utf8");
assert(
  ogImageSource.includes("1200") && ogImageSource.includes("630"),
  "default Open Graph image must remain 1200x630",
);
assert(!ogImageSource.includes("zIndex:"), "Open Graph image must avoid unsupported ImageResponse z-index styling");

// AppShell uses client-side search params. Public static policy content must not disappear
// behind its empty Suspense fallback in the initial HTML sent to crawlers.
const appShellSource = readFileSync("app/components/AppShell.tsx", "utf8");
const trustSource = readFileSync("app/trust/page.tsx", "utf8");
assert(appShellSource.includes("seoFallback?: ReactNode"), "AppShell must accept an opt-in public SSR fallback");
assert(appShellSource.includes('fallback={seoFallback ?? <div className="min-h-screen bg-[#f5f7fc]" />}'),
  "Other AppShell pages must keep their existing fallback unchanged");
assert(trustSource.includes("const publicContent = (") && trustSource.includes("seoFallback={publicContent}"),
  "Public trust page must render its actual policy content while AppShell suspends");
assert(trustSource.includes("<h1") && trustSource.includes('href="/privacy"') && trustSource.includes('href="/terms"'),
  "Trust fallback must include the heading and useful internal links");

const originalPhaseOneUrls = entries.filter((entry) => !new URL(entry.url).pathname.startsWith("/special-analysis/compatibility/guide/"));
assert.equal(originalPhaseOneUrls.length, 67, "original phase 1 sitemap routes must remain intact");
for (const slug of COMPATIBILITY_GUIDE_SLUGS) {
  assert(urls.has(`${SITE_ORIGIN}${getCompatibilityPublicGuidePath(slug)}`), `public compatibility guide missing: ${slug}`);
}
assert.equal(entries.length, 74, "sitemap must contain 57 paid products + 10 original public routes + 7 compatibility guides");

console.log(`seo-foundation-regression: PASS (57 paid products, ${entries.length} sitemap URLs)`);
