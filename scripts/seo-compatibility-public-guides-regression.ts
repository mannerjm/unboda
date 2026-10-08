import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import sitemap from "../app/sitemap";
import { SITE_ORIGIN } from "../app/lib/seo";
import {
  COMPATIBILITY_GUIDE_SLUGS,
  getCompatibilityPublicGuide,
  getCompatibilityPublicGuidePath,
} from "../app/lib/compatibilityPublicGuides";
import { getSpecialAnalysisProduct } from "../app/lib/specialAnalysisProducts";

const urls = sitemap().map((item) => item.url);
assert.equal(COMPATIBILITY_GUIDE_SLUGS.length, 7, "seven distinct compatibility guides are required");
assert.equal(new Set(COMPATIBILITY_GUIDE_SLUGS).size, 7, "guide slugs must be unique");
const titles = new Set<string>();
const ids = new Set<string>();
const paths = new Set<string>();
let familyCount = 0;

for (const slug of COMPATIBILITY_GUIDE_SLUGS) {
  const guide = getCompatibilityPublicGuide(slug);
  assert(guide, `missing guide: ${slug}`);
  const { product } = guide;
  assert.equal(getSpecialAnalysisProduct(product.id), product, `use canonical product registry: ${slug}`);
  assert.equal(product.amount, 19_900, `do not change prices: ${slug}`);
  assert.equal(product.currency, "KRW");
  assert(!titles.has(product.title), `duplicate SEO title: ${product.title}`);
  assert(!ids.has(product.id), `duplicate product: ${product.id}`);
  assert(guide.questions.length >= 3 && guide.focus.length >= 3, `insufficient unique information: ${slug}`);
  assert(guide.questions.every((q) => q.trim().length > 15));
  assert(guide.focus.every((q) => q.trim().length > 3));
  assert(guide.audience.length > 20 && guide.distinction.length > 20);
  const path = getCompatibilityPublicGuidePath(slug);
  assert(!paths.has(path), `duplicate URL: ${path}`);
  assert(urls.includes(`${SITE_ORIGIN}${path}`), `public guide not in sitemap: ${path}`);
  assert(path.startsWith("/special-analysis/compatibility/guide/"));
  assert(guide.entryPath.startsWith("/special-analysis/compatibility/"));
  assert(!guide.entryPath.includes("/guide/"), "purchase must use original authenticated flow");
  if (guide.isFamily) {
    familyCount++;
    assert.equal(guide.entryPath, "/special-analysis/compatibility/family/parent-child#family-relationship-selector");
  } else {
    assert.equal(guide.entryPath, `/special-analysis/compatibility/${slug}`);
  }
  titles.add(product.title);
  ids.add(product.id);
  paths.add(path);
}
assert.equal(familyCount, 3);
assert.equal(titles.size, 7);
assert.equal(urls.length, 74, "sitemap must have 74 URLs");

const guidePage = readFileSync("app/special-analysis/compatibility/guide/[slug]/page.tsx", "utf8");
assert(guidePage.includes("generateStaticParams"), "guide should be statically enumerated");
assert(guidePage.includes("dynamicParams = false"), "unknown guide URL must 404");
assert(guidePage.includes("buildPublicMetadata"), "public guide needs title, description, canonical and index");
assert(guidePage.includes("getCompatibilityPublicGuidePath(guide.slug)"), "canonical must use clean guide URL");
assert(guidePage.includes('href={guide.entryPath}'), "CTA must lead to original authenticated entry");
assert(guidePage.includes("실제 분석을 시작할 때는 로그인과 프로필이 필요합니다"), "login gating must be explained");
assert(!guidePage.includes("getCurrentUser") && !guidePage.includes("getActiveProfile"),
  "public guide must not require user or profile information");
assert(!guidePage.includes("redirect(") && !guidePage.includes("PaidCompatibilityAnalysisClient"),
  "public guide must not perform authentication or expose any personalized analysis");

const hub = readFileSync("app/special-analysis/compatibility/page.tsx", "utf8");
assert(hub.includes("getCompatibilityPublicGuidePath(slug)"), "public hub must link all seven guide pages");
for (const protectedRoute of [
  "/special-analysis/compatibility/romantic",
  "/special-analysis/compatibility/workplace",
  "/special-analysis/compatibility/friend",
  "/special-analysis/compatibility/business",
  "/special-analysis/compatibility/family/parent-child",
]) {
  assert(hub.includes(protectedRoute), `keep direct authenticated discovery route: ${protectedRoute}`);
  assert(!urls.includes(`${SITE_ORIGIN}${protectedRoute}`), `private analysis entry leaked to sitemap: ${protectedRoute}`);
}

const pair = readFileSync("app/special-analysis/compatibility/PairCompatibilityPage.tsx", "utf8");
const family = readFileSync("app/special-analysis/compatibility/family/parent-child/page.tsx", "utf8");
assert(pair.includes("redirect(`/auth/login?returnTo=${entryPath}`)"), "pair login gate must stay");
assert(family.includes('redirect("/auth/login?returnTo=/special-analysis/compatibility/family/parent-child")'),
  "family login gate must stay");
const config = readFileSync("next.config.ts", "utf8");
assert(!config.includes('"/special-analysis/compatibility/guide/'), "guide routes must not carry private X-Robots-Tag");
for (const slug of ["romantic", "workplace", "friend", "business"]) {
  assert(config.includes(`"/special-analysis/compatibility/${slug}"`),
    `original authenticated entry must remain noindex: ${slug}`);
}
for (const p of [
  "app/special-analysis/compatibility/romantic/page.tsx",
  "app/special-analysis/compatibility/workplace/page.tsx",
  "app/special-analysis/compatibility/friend/page.tsx",
  "app/special-analysis/compatibility/business/page.tsx",
]) {
  assert(readFileSync(p, "utf8").includes("NOINDEX_METADATA"), `original auth page still noindex: ${p}`);
}
console.log("seo-compatibility-public-guides-regression: PASS (7 public guides, 7 unique products, 74 sitemap URLs, existing auth gates protected)");
