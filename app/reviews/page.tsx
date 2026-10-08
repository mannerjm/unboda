import Link from "next/link";
import AppShell from "@/app/components/AppShell";
import { getPublicVerifiedReviewFeed } from "@/app/lib/reviews/server";
import { buildPublicMetadata } from "@/app/lib/seo";

export const metadata = buildPublicMetadata({
  title: "구매 인증 후기",
  description: "운보다 유료 리포트를 실제 구매한 이용자의 검수된 구매 인증 후기를 확인하세요.",
  path: "/reviews",
});

export const dynamic = "force-dynamic";

function stars(rating: number): string {
  return "★".repeat(Math.max(1, Math.min(5, rating))) + "☆".repeat(Math.max(0, 5 - rating));
}

function formatMonth(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).format(date);
}

export default async function VerifiedReviewsPage() {
  const reviews = await getPublicVerifiedReviewFeed(40);

  return (
    <AppShell>
      <main className="min-h-screen bg-[#f5f7fc] px-5 py-10 text-[#11162d] sm:px-8 sm:py-14">
        <div className="mx-auto w-full max-w-5xl">
          <header className="rounded-[2rem] border border-[#d8d3ff] bg-[radial-gradient(circle_at_84%_18%,rgba(113,89,233,0.14),transparent_28%),linear-gradient(145deg,#ffffff_0%,#f5f3ff_100%)] p-6 shadow-sm sm:p-8">
            <p className="text-xs font-black tracking-[0.16em] text-[#6f5ce7]">VERIFIED REVIEWS</p>
            <h1 className="mt-3 text-3xl font-black tracking-[-0.035em] sm:text-4xl">실제 구매 고객이 남긴 후기</h1>
            <p className="mt-4 max-w-3xl text-[15px] leading-7 text-slate-700">
              완료된 유료 리포트의 구매 기록이 확인된 계정만 후기를 작성할 수 있습니다.
              실명·프로필·출생정보·구매 식별자는 공개하지 않습니다.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/trust" className="rounded-xl border border-[#d8d3ff] bg-white px-4 py-2.5 text-sm font-bold text-[#5e4bd1]">운보다 이용 원칙</Link>
              <Link href="/deep-analysis" className="rounded-xl bg-[#6f5ce7] px-4 py-2.5 text-sm font-bold text-white">심층 분석 둘러보기</Link>
            </div>
          </header>

          {reviews.length === 0 ? (
            <section className="mt-5 rounded-[1.5rem] border border-[#dce1ef] bg-white p-6 text-sm leading-7 text-slate-600 shadow-sm">
              아직 공개된 구매 인증 후기가 없습니다. 후기 수를 임의로 채우지 않고 실제 구매 고객이 작성하고 검수를 마친 후기만 이곳에 표시합니다.
            </section>
          ) : (
            <section className="mt-5 grid gap-4 lg:grid-cols-2" aria-label="공개 구매 인증 후기">
              {reviews.map((review) => (
                <article key={review.id} className="rounded-[1.5rem] border border-[#dce1ef] bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-[#5e4bd1]">{review.productTitle}</p>
                      <p className="mt-2 text-sm font-bold text-[#6f5ce7]" aria-label={String(review.rating) + "점"}>
                        {stars(review.rating)}
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <span className="rounded-full bg-[#eef0f6] px-2.5 py-1 text-[11px] font-bold text-slate-600">구매 인증</span>
                      {review.aiConsultingUsed ? <span className="rounded-full bg-[#eeecff] px-2.5 py-1 text-[11px] font-bold text-[#5e4bd1]">AI 상담 이용</span> : null}
                    </div>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{review.body}</p>
                  <p className="mt-3 text-[11px] text-slate-400">{formatMonth(review.createdAt)} 작성</p>
                </article>
              ))}
            </section>
          )}
        </div>
      </main>
    </AppShell>
  );
}
