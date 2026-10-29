import Image from "next/image";
import Link from "next/link";
import { getPublishedMagazineArticles } from "@/app/lib/magazine";
import { buildPublicMetadata } from "@/app/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = buildPublicMetadata({
  title: "운보다 매거진 | 사주·궁합·재물 이야기를 쉽게",
  description: "사주를 처음 보는 방법, 궁합과 대화, 재물운과 소비 습관을 현실적인 생활 질문으로 풀어보는 운보다의 공개 매거진입니다.",
  path: "/blog",
});

export default function MagazineHome() {
  const articles = getPublishedMagazineArticles();
  return <main className="min-h-screen bg-[#f5f7fc] text-[#152036]">
    <header className="border-b border-slate-200 bg-[#0e1733] text-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <Link href="/" className="font-extrabold tracking-tight">운보다</Link>
        <nav className="flex gap-4 text-sm font-semibold" aria-label="매거진 메뉴">
          <Link href="/blog" aria-current="page" className="text-[#d8ceff]">매거진</Link>
          <Link href="/guest-saju" className="hover:text-[#d8ceff]">무료 사주</Link>
          <Link href="/special-analysis/compatibility" className="hidden hover:text-[#d8ceff] sm:inline">궁합</Link>
        </nav>
      </div>
    </header>
    <section className="bg-[linear-gradient(145deg,#121d44,#292050)] px-5 py-12 text-white sm:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold tracking-[0.14em] text-[#cac1ff]">UNBODA MAGAZINE</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">운보다 매거진</h1>
        <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-200 sm:text-base">사주·관계·돈 관리처럼 누구나 궁금해하는 이야기를 일상 언어로 정리했습니다. 결과를 단정하기보다, 스스로 질문하고 선택할 때 참고해 보세요.</p>
      </div>
    </section>
    <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-extrabold">읽어볼 만한 이야기</h2>
        <span className="text-xs text-slate-500">운보다 자체 제작 콘텐츠</span>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {articles.map(article => <article key={article.slug} className="overflow-hidden rounded-[1.6rem] border border-[#e0e4ef] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
          <Link href={`/blog/${article.slug}`} className="group block">
            <div className="relative aspect-[16/9] bg-[#e8ebf7]">
              <Image src={article.cover} alt={article.coverAlt} fill sizes="(max-width:768px) 100vw, (max-width:1200px) 50vw, 33vw" className="object-cover" />
            </div>
            <div className="space-y-3 p-6">
              <span className="text-xs font-bold text-[#6652c7]">{article.category}</span>
              <h3 className="text-xl font-extrabold leading-8 group-hover:text-[#6652c7]">{article.title}</h3>
              <p className="text-sm leading-7 text-slate-600">{article.description}</p>
              <p className="text-xs text-slate-500">{new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",year:"numeric",month:"long",day:"numeric"}).format(new Date(article.publishedAt))} · 운보다</p>
            </div>
          </Link>
        </article>)}
      </div>
      {articles.length===0 ? <p className="mt-5 rounded-2xl bg-white p-6 text-sm text-slate-600">공개 검수가 끝난 새 글을 준비하고 있습니다.</p> : null}
      <div className="mt-12 flex flex-col gap-3 rounded-3xl bg-[#151c3e] p-7 text-white sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-lg font-bold">내 사주가 궁금하신가요?</h2><p className="mt-2 text-sm text-slate-200">정보 글을 읽은 다음, 무료 사주로 나의 상황도 살펴볼 수 있습니다.</p></div>
        <Link href="/guest-saju" className="shrink-0 rounded-full bg-white px-5 py-3 text-center text-sm font-bold text-[#222351]">무료 사주 보기</Link>
      </div>
      <p className="mt-6 text-xs leading-6 text-slate-500">운보다 매거진은 전통 명리를 문화적 관점으로 설명하는 공개 정보 콘텐츠입니다. 개인의 미래나 건강·금전적 결과를 보장하지 않습니다.</p>
    </section>
    <footer className="border-t border-slate-200 px-5 py-6 text-center text-xs text-slate-500"><Link href="/">운보다 홈</Link> · <Link href="/trust">서비스 이용 원칙</Link> · <Link href="/blog/rss.xml">RSS</Link></footer>
  </main>;
}
