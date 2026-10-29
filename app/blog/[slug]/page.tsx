import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import StructuredData from "@/app/components/StructuredData";
import { getMagazineArticle, getPublishedMagazineArticles } from "@/app/lib/magazine";
import { SITE_ORIGIN, SITE_NAME, buildPublicMetadata } from "@/app/lib/seo";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({params}:PageProps):Promise<Metadata> {
  const {slug}=await params;
  const article=getMagazineArticle(slug);
  if (!article) return {robots:{index:false,follow:false}};
  const meta=buildPublicMetadata({title:article.title,description:article.description,path:`/blog/${article.slug}`});
  return {...meta,
    openGraph:{...meta.openGraph,type:"article",publishedTime:article.publishedAt,modifiedTime:article.updatedAt,
      images:[{url:article.cover,width:1200,height:630,alt:article.coverAlt}]},
    twitter:{card:"summary_large_image",title:article.title,description:article.description,
      images:[article.cover]}};
}

export default async function MagazineArticlePage({params}:PageProps) {
  const {slug}=await params;
  const article=getMagazineArticle(slug);
  if(!article)notFound();
  const related=getPublishedMagazineArticles().filter(item=>item.slug!==article.slug).slice(0,2);
  const data={
    "@context":"https://schema.org","@type":"BlogPosting",
    headline:article.title,description:article.description,
    image:`${SITE_ORIGIN}${article.cover}`,
    datePublished:article.publishedAt,dateModified:article.updatedAt,
    inLanguage:"ko-KR",url:`${SITE_ORIGIN}/blog/${article.slug}`,
    author:{"@type":"Organization",name:SITE_NAME,url:SITE_ORIGIN},
    publisher:{"@type":"Organization",name:SITE_NAME,url:SITE_ORIGIN},
    mainEntityOfPage:{"@type":"WebPage","@id":`${SITE_ORIGIN}/blog/${article.slug}`},
  };
  return <main className="min-h-screen bg-[#f5f7fc] text-[#172039]">
    <StructuredData data={data}/>
    <header className="border-b border-slate-200 bg-[#0e1733] px-5 py-5 text-white sm:px-8">
      <nav className="mx-auto flex max-w-4xl items-center justify-between" aria-label="매거진 위치">
        <Link href="/" className="font-extrabold">운보다</Link>
        <Link href="/blog" className="text-sm font-bold text-[#ddd5ff]">매거진 전체 보기</Link>
      </nav>
    </header>
    <article className="mx-auto max-w-4xl px-5 pb-16 pt-10 sm:px-8">
      <nav className="mb-5 text-xs font-semibold text-[#6754bc]" aria-label="현재 위치">
        <Link href="/">운보다</Link> / <Link href="/blog">매거진</Link> / {article.category}
      </nav>
      <p className="text-sm font-bold text-[#6652c7]">{article.category}</p>
      <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">{article.title}</h1>
      <p className="mt-5 text-base leading-8 text-slate-600">{article.description}</p>
      <div className="mt-5 flex flex-wrap gap-3 text-xs text-slate-500">
        <span>작성: 운보다</span>
        <time dateTime={article.publishedAt}>{new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",year:"numeric",month:"long",day:"numeric"}).format(new Date(article.publishedAt))}</time>
      </div>
      <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-[1.5rem] bg-[#ebedf7]">
        <Image src={article.cover} alt={article.coverAlt} fill priority sizes="(max-width:900px) 100vw, 900px" className="object-cover"/>
      </div>
      <p className="mt-8 rounded-2xl border border-[#dcd7f5] bg-[#f1effc] p-5 text-base leading-8 text-[#322963]">{article.lead}</p>
      {article.sections.map((section,i)=><section key={section.heading} className="mt-11">
        <h2 className="text-xl font-extrabold leading-8">{i+1}. {section.heading}</h2>
        {section.paragraphs.map(text=><p key={text} className="mt-4 text-[15px] leading-8 text-slate-700">{text}</p>)}
      </section>)}
      <aside className="mt-11 rounded-2xl border-l-4 border-[#6d5bd9] bg-white p-6">
        <h2 className="font-extrabold">오늘 기억할 한 가지</h2>
        <p className="mt-2 text-sm leading-7 text-slate-700">{article.keyPoint}</p>
      </aside>
      <p className="mt-7 text-xs leading-6 text-slate-500">이 글은 운보다에서 자체 작성한 일반 정보입니다. 전통 사주의 해석은 문화적 참고이며, 의학적·금융적 판단이나 결과를 보장하지 않습니다. AI를 활용한 내용 제작·정리가 포함될 수 있습니다.</p>
      <div className="mt-10 flex flex-col gap-3 rounded-3xl bg-[#171c43] p-7 text-white sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-7"><strong className="block text-lg">{article.relatedLabel}</strong>관심 있는 내용을 운보다에서 이어서 살펴보세요.</p>
        <Link href={article.relatedHref} className="shrink-0 rounded-full bg-white px-5 py-3 text-center text-sm font-bold text-[#262357]">운보다에서 보기</Link>
      </div>
      {related.length>0&&<section className="mt-12">
        <h2 className="text-xl font-extrabold">다른 글도 읽어보세요</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">{related.map(a=><li key={a.slug}><Link href={`/blog/${a.slug}`} className="block rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold leading-6 hover:border-[#8876d9]">{a.title}</Link></li>)}</ul>
      </section>}
    </article>
  </main>;
}
