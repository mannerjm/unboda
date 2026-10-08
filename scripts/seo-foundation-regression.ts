import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import robots from "../app/robots";
import sitemap from "../app/sitemap";
import { getLaunchProductIds } from "../app/lib/paidAnalysisTopicConfig";
import { SITE_ORIGIN } from "../app/lib/seo";

const entries = sitemap();
const urls = new Set(entries.map((entry) => entry.url));
const launchIds = getLaunchProductIds();

assert.equal(launchIds.length, 57, "SEO sitemap must track all 57 launch paid-analysis products");
assert.equal(new Set(launchIds).size, 57, "launch product IDs must stay unique");

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
  "/special-analysis/compatibility/romantic",
  "/special-analysis/compatibility/workplace",
  "/special-analysis/compatibility/friend",
  "/special-analysis/compatibility/business",
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
assert.equal(robotsConfig.sitemap, `${SITE_ORIGIN}/sitemap.xml`, "robots must advertise the canonical sitemap");

const layout = readFileSync("app/layout.tsx", "utf8");
assert(layout.includes("metadataBase: SITE_URL"), "root metadata must set metadataBase");
assert(layout.includes('template: `%s | ${SITE_NAME}`'), "root metadata must keep the title template");
assert(layout.includes('images: ["/opengraph-image"]'), "root metadata must expose the OG image");

const productPage = readFileSync("app/paid-analysis/[productId]/page.tsx", "utf8");
assert(productPage.includes("export async function generateMetadata"), "57 paid products need dynamic metadata");
assert(productPage.includes("getPremiumProductDisplayTitle"), "product metadata must use customer-facing titles");
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

for (const path of [
  "app/special-analysis/compatibility/romantic/page.tsx",
  "app/special-analysis/compatibility/workplace/page.tsx",
  "app/special-analysis/compatibility/friend/page.tsx",
  "app/special-analysis/compatibility/business/page.tsx",
]) {
  const source = readFileSync(path, "utf8");
  assert(source.includes("buildPublicMetadata"), `compatibility metadata missing: ${path}`);
}

assert(
  readFileSync("app/guest-saju/layout.tsx", "utf8").includes("buildPublicMetadata"),
  "guest free-analysis page needs public metadata",
);
assert(
  readFileSync("app/opengraph-image.tsx", "utf8").includes("1200") &&
    readFileSync("app/opengraph-image.tsx", "utf8").includes("630"),
  "default Open Graph image must remain 1200x630",
);

console.log(`seo-foundation-regression: PASS (57 paid products, ${entries.length} sitemap URLs)`);
