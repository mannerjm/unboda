import { getPublishedMagazineArticles, type MagazineArticle } from "@/app/lib/magazine";
import { SITE_ORIGIN } from "@/app/lib/seo";

export const dynamic="force-dynamic";
function xml(value: string): string {
  return value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&apos;");
}

function articleBody(article: MagazineArticle): string {
  // RSS descriptions may contain encoded HTML. Escape article text before
  // building that HTML, then escape the complete HTML for the XML text node.
  return [
    `<p>${xml(article.description)}</p>`,
    `<p>${xml(article.lead)}</p>`,
    ...article.sections.flatMap((section, index) => [
      `<h2>${index + 1}. ${xml(section.heading)}</h2>`,
      ...section.paragraphs.map(text => `<p>${xml(text)}</p>`),
    ]),
    "<h2>오늘 기억할 한 가지</h2>",
    `<p>${xml(article.keyPoint)}</p>`,
    "<p>작성: 운보다</p>",
    "<p>이 글은 운보다에서 자체 작성한 일반 정보입니다. 전통 사주의 해석은 문화적 참고이며, 의학적·금융적 판단이나 결과를 보장하지 않습니다. AI를 활용한 내용 제작·정리가 포함될 수 있습니다.</p>",
    `<p><a href="${xml(SITE_ORIGIN + article.relatedHref)}">${xml(article.relatedLabel)}</a></p>`,
  ].join("\n");
}

export function GET(): Response {
  const items=getPublishedMagazineArticles().slice(0,30);
  const body=`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel><title>운보다 매거진</title>
<link>${SITE_ORIGIN}/blog</link>
<description>사주·궁합·재물 이야기를 일상 언어로 풀어보는 운보다 매거진</description>
<language>ko-KR</language>
${items.map(a=>`<item><title>${xml(a.title)}</title><link>${SITE_ORIGIN}/blog/${a.slug}</link><guid isPermaLink="true">${SITE_ORIGIN}/blog/${a.slug}</guid><description>${xml(articleBody(a))}</description><pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate></item>`).join("\n")}
</channel></rss>`;
  return new Response(body,{headers:{"Content-Type":"application/rss+xml; charset=utf-8",
    "Cache-Control":"public, max-age=0, s-maxage=3600"}});
}
