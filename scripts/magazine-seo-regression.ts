import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import sitemap from "../app/sitemap";
import { GET as getRss } from "../app/blog/rss.xml/route";
import {
  getAllMagazineReviewEntries,
  getMagazineArticle,
  getPublishedMagazineArticles,
} from "../app/lib/magazine";
import { SITE_ORIGIN } from "../app/lib/seo";

async function main() {
  const all = getAllMagazineReviewEntries();
  assert(all.length >= 3 && all.length <= 1000, "evergreen article collection must grow safely, not spike into spam");
  for (const slug of ["saju-birth-time-unknown","compatibility-conversation-first","money-fortune-budget-review"])
    assert(all.some(a=>a.slug===slug), "founding evergreen article missing: "+slug);
  assert.equal(new Set(all.map(x => x.slug)).size, all.length, "article slugs must be unique");
  assert.equal(new Set(all.map(x => x.topicKey)).size, all.length, "no repetitive topic keys");
  assert.equal(new Set(all.map(x => x.title)).size, all.length, "article titles must not repeat");
  assert.equal(new Set(all.map(x => x.cover)).size, all.length, "every topic needs a distinct original illustration");
  const duringPilot = new Date("2026-10-29T16:00:00+09:00");
  const afterQueue = new Date("2026-11-03T16:00:00+09:00");
  assert.equal(getPublishedMagazineArticles(duringPilot).filter(a=>["saju-birth-time-unknown","compatibility-conversation-first","money-fortune-budget-review"].includes(a.slug)).length, 2, "founding future article must not appear early");
  assert(getPublishedMagazineArticles(afterQueue).length >= 3, "approved, scheduled content appears automatically");
  assert.equal(getMagazineArticle("money-fortune-budget-review", duringPilot), undefined,
    "future page must not be readable or indexed early");
  assert(getMagazineArticle("money-fortune-budget-review", afterQueue));
  for (const a of all) {
    assert(/^[a-z0-9-]+$/.test(a.slug));
    assert(a.originalArtwork && a.approvedForPublication);
    assert(Date.parse(a.updatedAt) >= Date.parse(a.publishedAt));
    assert(a.description.length >= 45);
    assert(a.sections.length >= 4);
    assert(a.sections.every(s => s.paragraphs.length >= 2 && s.paragraphs.every(t => t.length >= 65)));
    assert(a.sections.reduce((n, s) => n + s.paragraphs.join(" ").length, 0) >= 700);
    assert(a.relatedHref.startsWith("/") && !a.relatedHref.startsWith("//"));
    assert(a.coverAlt.length >= 20);
    assert(existsSync("public" + a.cover), "topic matched illustration missing: " + a.cover);
    const svg = readFileSync("public" + a.cover,"utf8");
    assert(svg.includes("<svg") && svg.includes('viewBox="0 0 1200 630"'));
    assert(!/(?:href|xlink:href)\s*=\s*["']https?:|<script|<foreignObject|onerror=|onload=/i.test(svg),
      "inline artwork must not load third-party resources or execute JS");
    assert(!/수익 보장|결혼 확정|운명 확정|반드시 성공/.test(a.lead));
    assert(!/승인된 전문가|전문가 검토 완료|인증된 명리사/.test(a.lead));
  }
  const current=getPublishedMagazineArticles();
  const urls=sitemap().map(e=>e.url);
  assert(urls.includes(SITE_ORIGIN + "/blog"));
  for(const a of all) {
    assert.equal(urls.includes(SITE_ORIGIN + "/blog/" + a.slug),
      current.some(z=>z.slug===a.slug),"sitemap must reflect only published, approved articles");
  }
  for (const disallow of ["/admin", "/account", "/mypage", "/purchased-analyses", "/ai-consulting"])
    assert(!urls.some(u=>new URL(u).pathname.startsWith(disallow)));
  const response=getRss();
  assert.equal(response.status,200);
  assert((response.headers.get("content-type")||"").includes("application/rss+xml"));
  const rss=await response.text();
  assert(rss.includes("<rss version="));
  for(const a of all) assert.equal(rss.includes("/blog/" + a.slug), current.some(z=>z.slug===a.slug));
  assert(!rss.includes("<script"));
  const home=readFileSync("app/components/HomeExperience.tsx","utf8");
  assert(home.includes('href="/blog"') && home.includes("매거진"),
    "all homepage states need a direct magazine entry");
  const detail=readFileSync("app/blog/[slug]/page.tsx","utf8");
  assert(detail.includes("notFound()") && detail.includes("generateMetadata"));
  assert(detail.includes('"@type":"BlogPosting"'));
  const middleware=readFileSync("middleware.ts","utf8");
  assert(middleware.includes('pathname === "/blog"') &&
    middleware.includes('pathname.startsWith("/blog/")') &&
    middleware.includes('pathname === "/sitemap.xml"') &&
    middleware.includes('pathname === "/robots.txt"'),
    "public magazine and crawler endpoints must bypass auth cookie refresh");
  assert(middleware.includes("await supabase.auth.getClaims()") &&
    middleware.includes("createServerClient("),
    "private payment, account and consultation routes must retain original auth");
  const nextConf=readFileSync("next.config.ts","utf8");
  assert(!nextConf.includes('"/blog/:path*"'),"public magazine pages must not receive noindex");
  const robots=readFileSync("app/robots.ts","utf8");
  assert(robots.includes("SITE_ORIGIN"));
  console.log("MAGAZINE_SEO_PILOT_PASS",{
    publishedNow:current.length, reviewedQueue:all.length,
    indexablePages:urls.filter(x=>x.includes("/blog")).length,
    articles:all.map(x=>x.slug),
    externalPaidAPIs:0,
  });
}
main().catch(e=>{console.error(e);process.exitCode=1;});
