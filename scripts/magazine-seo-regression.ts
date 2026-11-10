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
    assert(a.originalArtwork, "each reviewed entry needs first-party artwork");
    if (!a.approvedForPublication) {
      assert(!getPublishedMagazineArticles().some(p => p.slug === a.slug),
        "draft cannot be public until approved");
    }
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
  const entities: Record<string, string> = {amp:"&",lt:"<",gt:">",quot:'"',apos:"'"};
  const decodeEntities = (text: string) => text.replace(/&(amp|lt|gt|quot|apos);/g,
    (_, entity: string) => entities[entity]);
  const rssItems = [...rss.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(match => match[1]);
  assert.equal(rssItems.length, Math.min(current.length, 30));
  for (const article of current.slice(0, 30)) {
    const item = rssItems.find(text => text.includes(`<link>${SITE_ORIGIN}/blog/${article.slug}</link>`));
    assert(item, `published RSS item missing: ${article.slug}`);
    const description = item.match(/<description>([\s\S]*?)<\/description>/)?.[1];
    assert(description, "RSS needs full public article content");
    assert(!description.includes("<"), "HTML must stay encoded inside the XML description");
    const html = decodeEntities(description);
    const plainText = decodeEntities(html.replace(/<[^>]*>/g, " "));
    for (const text of [article.description, article.lead, article.keyPoint,
      ...article.sections.flatMap(section => [section.heading, ...section.paragraphs])]) {
      assert(plainText.includes(text), `RSS omitted public article text: ${article.slug}`);
    }
    assert(plainText.includes("AI를 활용한 내용 제작·정리가 포함될 수 있습니다."),
      "syndicated content must retain the public AI disclosure");
    assert(html.includes(`href="${SITE_ORIGIN}${article.relatedHref}"`),
      "RSS service links must resolve to the canonical site");
    assert(item.includes(`<pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>`),
      "RSS must preserve original publication dates");
  }
  const home=readFileSync("app/components/HomeExperience.tsx","utf8");
  assert(home.includes('href="/blog"') && home.includes("매거진"),
    "all homepage states need a direct magazine entry");
  const magazineHome=readFileSync("app/blog/page.tsx","utf8");
  assert(magazineHome.includes("bg-[radial-gradient(ellipse_at_50%_0%,#ffffff_0%,#faf5ff_48%,#f0e8ff_100%)]"), "magazine index must use the approved light palette");
  assert(!magazineHome.includes("bg-[#0e1733]") && !magazineHome.includes("bg-[#151c3e]"), "magazine index old navy surfaces must not return");

  const magazineHeader=magazineHome.slice(magazineHome.indexOf("<header"),magazineHome.indexOf("</header>"));
  assert(magazineHeader.includes('href="/blog" aria-current="page"'), "keep the current Magazine tab");
  assert(!magazineHeader.includes('href="/guest-saju"') && !magazineHeader.includes('href="/special-analysis/compatibility"'), "hide extra free-saju and compatibility links only in the magazine index header");
  assert(!magazineHome.includes("<footer") && !magazineHome.includes('href="/trust"') && !magazineHome.includes('href="/blog/rss.xml"'), "remove the bottom magazine link row without removing the RSS endpoint");
  assert(magazineHome.includes('href="/guest-saju" className="shrink-0') && magazineHome.includes('href="/" className="text-lg font-extrabold'), "keep free-saju promotion and logo home navigation");

  const detail=readFileSync("app/blog/[slug]/page.tsx","utf8");
  assert(detail.includes("notFound()") && detail.includes("generateMetadata"));
  assert(detail.includes("bg-[radial-gradient(ellipse_at_50%_0%,#ffffff_0%,#faf5ff_48%,#f0e8ff_100%)]"), "magazine article must use the same light palette");
  assert(!detail.includes("bg-[#0e1733]") && !detail.includes("bg-[#171c43]"), "magazine article must not retain the old navy surfaces");

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
