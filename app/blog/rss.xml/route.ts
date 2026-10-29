import { getPublishedMagazineArticles } from "@/app/lib/magazine";
import { SITE_ORIGIN } from "@/app/lib/seo";

export const dynamic="force-dynamic";
function xml(value: string): string {
  return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&apos;");
}
export function GET(): Response {
  const items=getPublishedMagazineArticles().slice(0,30);
  const body=`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>운보다 매거진</title>
<link>${SITE_ORIGIN}/blog</link>
<description>사주·궁합·재물 이야기를 일상 언어로 풀어보는 운보다 매거진</description>
<language>ko-KR</language>
${items.map(a=>`<item><title>${xml(a.title)}</title><link>${SITE_ORIGIN}/blog/${a.slug}</link><guid isPermaLink="true">${SITE_ORIGIN}/blog/${a.slug}</guid><description>${xml(a.description)}</description><pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate></item>`).join("\n")}
</channel></rss>`;
  return new Response(body,{headers:{"Content-Type":"application/rss+xml; charset=utf-8",
    "Cache-Control":"public, max-age=0, s-maxage=3600"}});
}
