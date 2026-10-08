import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  COMPATIBILITY_GUIDE_SLUGS,
  getCompatibilityPublicGuide,
  getCompatibilityPublicGuidePath,
} from "@/app/lib/compatibilityPublicGuides";
import { buildPublicMetadata } from "@/app/lib/seo";

type GuidePageProps = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return COMPATIBILITY_GUIDE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getCompatibilityPublicGuide(slug);
  if (!guide) return { robots: { index: false, follow: false } };

  return buildPublicMetadata({
    title: guide.product.title,
    description: `${guide.product.description} 로그인 없이 분석 범위와 이용 방법을 확인하세요.`,
    path: getCompatibilityPublicGuidePath(guide.slug),
  });
}

export default async function CompatibilityPublicGuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getCompatibilityPublicGuide(slug);
  if (!guide) notFound();

  const { product } = guide;

  return (
    <main className="min-h-screen bg-[#f5f7fc] px-4 py-7 text-[#11162d] sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <nav className="flex flex-wrap gap-3 text-sm font-semibold text-slate-600" aria-label="경로">
          <Link href="/special-analysis/compatibility" className="underline decoration-slate-300 underline-offset-4 hover:text-[#5e4bd1]">
            ← 궁합 종류 전체 보기
          </Link>
          <Link href="/guest-saju" className="underline decoration-slate-300 underline-offset-4 hover:text-[#5e4bd1]">
            무료 사주부터 보기
          </Link>
        </nav>

        <header className="relative mt-6 overflow-hidden rounded-[2rem] border border-[#39355e] bg-[radial-gradient(circle_at_84%_13%,rgba(167,142,255,0.20),transparent_30%),linear-gradient(130deg,#10142b,#211b45)] p-6 text-white shadow-[0_24px_60px_rgba(24,29,67,0.16)] sm:p-10">
          <p className="text-xs font-bold tracking-[0.16em] text-[#c6bbff]">운보다 · 궁합 분석 안내</p>
          <h1 className="mt-4 text-3xl font-black leading-tight tracking-[-0.04em] sm:text-4xl">{product.title}</h1>
          <p className="mt-5 max-w-3xl text-[15px] leading-8 text-slate-200">{product.description}</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white">상품 가격 · {product.amount.toLocaleString("ko-KR")}원</span>
            <span className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-200">상품 설명은 로그인 없이 확인 가능</span>
          </div>
        </header>

        <section className="mt-5 rounded-[1.75rem] border border-[#e2e4ee] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-black">이런 분들이 살펴보면 좋습니다</h2>
          <p className="mt-3 text-[15px] leading-8 text-slate-700">{guide.audience}</p>
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section className="rounded-[1.75rem] border border-[#e2e4ee] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-black">어떤 질문을 살펴보나요?</h2>
            <ul className="mt-5 space-y-4">
              {guide.questions.map((question, index) => (
                <li key={question} className="flex gap-3 text-[15px] leading-7 text-slate-700">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f0edff] text-xs font-black text-[#5e4bd1]">{index + 1}</span>
                  <span>{question}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-[1.75rem] border border-[#e2e4ee] bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-black">분석에서 확인하는 내용</h2>
            <ul className="mt-5 space-y-4">
              {guide.focus.map((item) => (
                <li key={item} className="flex gap-3 text-[15px] leading-7 text-slate-700">
                  <span aria-hidden="true" className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-[#8b7cf0]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="mt-5 rounded-[1.75rem] border border-[#dcd8f5] bg-[#f8f7ff] p-6 sm:p-8">
          <h2 className="text-xl font-black">이 궁합 분석의 특징</h2>
          <p className="mt-3 text-[15px] leading-8 text-slate-700">{guide.distinction}</p>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            궁합은 관계를 이해하고 대화를 준비하는 참고 자료입니다. 상대의 마음이나 미래 결과를 확정하거나 보장하지 않습니다.
          </p>
        </section>

        <section className="mt-5 rounded-[1.75rem] border border-[#e2e4ee] bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-black">궁합 분석 이용 방법</h2>
          <ol className="mt-5 grid gap-3 sm:grid-cols-4">
            {[
              "로그인하고 내 프로필 선택",
              guide.isFamily ? "가족 관계 선택 및 상대 정보 입력" : "상대방 정보 입력",
              "분석 내용·금액 확인 후 결제",
              "완성된 결과를 구매 보관함에서 확인",
            ].map((step, index) => (
              <li key={step} className="rounded-2xl border border-[#e6e7f0] bg-[#fafbfe] px-4 py-5">
                <span className="text-xs font-black text-[#6f5ce7]">STEP {index + 1}</span>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">{step}</p>
              </li>
            ))}
          </ol>
          {guide.isFamily ? (
            <p className="mt-4 text-sm leading-7 text-slate-600">
              가족 궁합은 공통 입력 화면에서 부모·자녀, 형제·자매, 기타 가족 중 해당 관계를 직접 선택한 뒤 진행합니다.
            </p>
          ) : null}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={guide.entryPath}
              className="inline-flex justify-center rounded-xl bg-[#5e4bd1] px-6 py-3.5 text-sm font-black text-white shadow-[0_10px_25px_rgba(94,75,209,0.17)] transition hover:bg-[#4d3cb8]"
            >
              {guide.isFamily ? "가족 관계 선택 후 궁합 분석 시작 →" : "이 궁합 분석 시작하기 →"}
            </Link>
            <p className="text-xs leading-6 text-slate-500">실제 분석을 시작할 때는 로그인과 프로필이 필요합니다.</p>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-black">다른 궁합 분석 둘러보기</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {COMPATIBILITY_GUIDE_SLUGS.filter((otherSlug) => otherSlug !== slug).map((otherSlug) => {
              const other = getCompatibilityPublicGuide(otherSlug);
              if (!other) return null;
              return (
                <Link
                  key={otherSlug}
                  href={getCompatibilityPublicGuidePath(other.slug)}
                  className="rounded-full border border-[#dadfec] bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#b6a6ee] hover:text-[#5e4bd1]"
                >
                  {other.product.title}
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
