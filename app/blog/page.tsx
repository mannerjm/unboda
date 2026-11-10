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
  return <main className="min-h-screen bg-[radial-gradient(ellipse_at_50%_0%,#ffffff_0%,#faf5ff_48%,#f0e8ff_100%)] text-[#281744]">
    <header className="border-b border-[#e9ddf8] bg-white/85 text-[#281744] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <Link href="/" className="text-lg font-extrabold tracking-tight text-[#4b267e]">운보다</Link>
        <nav className="flex gap-4 text-sm font-semibold" aria-label="매거진 메뉴">
          <Link href="/blog" aria-current="page" className="rounded-full bg-[#f1e5ff] px-3 py-2 text-[#7140b8]">매거진</Link>
          <Link href="/guest-saju" className="transition hover:text-[#8550d0]">무료 사주</Link>
          <Link href="/special-analysis/compatibility" className="hidden transition hover:text-[#8550d0] sm:inline">궁합</Link>
        </nav>
      </div>
    </header>
    <section className="relative overflow-hidden bg-[radial-gradient(circle_at_82%_18%,rgba(206,169,255,.55),transparent_32%),linear-gradient(135deg,#ffffff_0%,#fbf6ff_46%,#e9d9ff_100%)] px-5 py-12 text-[#281744] sm:px-8 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-bold tracking-[0.14em] text-[#8552c0]">UNBODA MAGAZINE</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-5xl">운보다 매거진</h1>
        <p className="mt-4 max-w-2xl text-sm leading-8 text-[#5d5170] sm:text-base">사주·관계·돈 관리처럼 누구나 궁금해하는 이야기를 일상 언어로 정리했습니다. 결과를 단정하기보다, 스스로 질문하고 선택할 때 참고해 보세요.</p>
      </div>
    </section>
    <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-2xl font-extrabold text-[#2f1a4b]">읽어볼 만한 이야기</h2>
        <span className="text-xs text-[#786988]">운보다 자체 제작 콘텐츠</span>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {articles.map(article => <article key={article.slug} className="overflow-hidden rounded-[1.8rem] border border-[#e7d9f7] bg-white/95 shadow-[0_12px_36px_rgba(108,67,171,.09)] transition hover:-translate-y-1 hover:border-[#ceb4f1] hover:shadow-[0_18px_48px_rgba(108,67,171,.17)]">
          <Link href={`/blog/${article.slug}`} className="group block">
            <div className="relative aspect-[16/9] bg-[#f1e9fb]">
              <Image src={article.cover} alt={article.coverAlt} fill sizes="(max-width:768px) 100vw, (max-width:1200px) 50vw, 33vw" className="object-cover" />
            </div>
            <div className="space-y-3 p-6">
              <span className="text-xs font-bold text-[#8751cb]">{article.category}</span>
              <h3 className="text-xl font-extrabold leading-8 text-[#2f1a4b] transition group-hover:text-[#8751cb]">{article.title}</h3>
              <p className="text-sm leading-7 text-[#605470]">{article.description}</p>
              <p className="text-xs text-[#786988]">{new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",year:"numeric",month:"long",day:"numeric"}).format(new Date(article.publishedAt))} · 운보다</p>
            </div>
          </Link>
        </article>)}
      </div>
      {articles.length===0 ? <p className="mt-5 rounded-2xl border border-[#e6daf5] bg-white p-6 text-sm text-[#625274]">공개 검수가 끝난 새 글을 준비하고 있습니다.</p> : null}
      <div className="mt-12 flex flex-col gap-3 rounded-[1.8rem] border border-[#e3d0f8] bg-[linear-gradient(120deg,#ffffff,#f1e2ff)] p-7 text-[#2f1a4b] shadow-[0_12px_35px_rgba(104,62,166,.1)] sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-lg font-bold">내 사주가 궁금하신가요?</h2><p className="mt-2 text-sm text-[#635474]">정보 글을 읽은 다음, 무료 사주로 나의 상황도 살펴볼 수 있습니다.</p></div>
        <Link href="/guest-saju" className="shrink-0 rounded-full bg-[linear-gradient(135deg,#8853dc,#6b3fc2)] px-5 py-3 text-center text-sm font-bold text-white shadow-[0_8px_22px_rgba(111,66,189,.2)] transition hover:brightness-110">무료 사주 보기</Link>
      </div>
      <p className="mt-6 text-xs leading-6 text-[#786988]">운보다 매거진은 전통 명리를 문화적 관점으로 설명하는 공개 정보 콘텐츠입니다. 개인의 미래나 건강·금전적 결과를 보장하지 않습니다.</p>
    </section>
    <footer className="border-t border-[#e6d8f4] bg-white/70 px-5 py-6 text-center text-xs text-[#786988]"><Link href="/">운보다 홈</Link> · <Link href="/trust">서비스 이용 원칙</Link> · <Link href="/blog/rss.xml">RSS</Link></footer>
  </main>;
}
