import Link from "next/link";
import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getUserProfile } from "@/app/lib/profiles/server";
import {
  getPhase9NextAnalysisRecommendations,
  type Phase9NextAnalysisRecommendation,
} from "@/app/lib/phase9NextAnalysis";

export function Phase9NextAnalysisCards({
  recommendations,
  compact = false,
}: {
  recommendations: readonly Phase9NextAnalysisRecommendation[];
  compact?: boolean;
}) {
  if (recommendations.length === 0) return null;

  return (
    <div className={compact ? "mt-4 grid gap-3 md:grid-cols-2" : "mt-5 grid gap-4 md:grid-cols-2"}>
      {recommendations.map((item) => (
        <article key={`${item.kind}:${item.productId}:${item.analysisEditionKey ?? "pair"}`} className="rounded-[1.5rem] border border-[#dce1ef] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#f3f1ff] px-2.5 py-1 text-xs font-bold text-[#5e4bd1]">{item.categoryLabel}</span>
            {item.editionLabel ? (
              <span className="rounded-full bg-[#eef0f6] px-2.5 py-1 text-xs font-semibold text-slate-600">{item.editionLabel}</span>
            ) : null}
          </div>
          <h3 className="mt-3 text-lg font-black text-[#11162d]">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{item.reason}</p>
          {!compact ? <p className="mt-2 text-xs leading-5 text-slate-500">{item.description}</p> : null}
          <Link href={item.href} className="mt-4 inline-flex rounded-xl bg-[#171a3d] px-4 py-2.5 text-xs font-bold text-white transition hover:bg-[#242957]">
            이 분석 살펴보기 →
          </Link>
        </article>
      ))}
    </div>
  );
}

export default async function Phase9NextAnalysisSection({
  profileId,
  sourceProductId,
  sourceEditionKey,
}: {
  profileId?: string;
  sourceProductId: string;
  sourceEditionKey?: string | null;
}) {
  if (!profileId) return null;
  const user = await getCurrentUser();
  if (!user) return null;
  const profile = await getUserProfile(profileId, user.id);
  if (!profile) return null;

  const recommendations = await getPhase9NextAnalysisRecommendations({
    userId: user.id,
    profile,
    source: {
      productId: sourceProductId,
      analysisEditionKey: sourceEditionKey ?? null,
    },
  });
  if (recommendations.length === 0) return null;

  return (
    <section data-phase9-next-analysis className="mx-auto mb-8 mt-5 max-w-4xl px-4 sm:px-8">
      <div className="rounded-[1.8rem] border border-[#d8d3ff] bg-[#f9faff] p-5 shadow-sm sm:p-7">
        <p className="text-xs font-black tracking-[0.15em] text-[#6f5ce7]">NEXT ANALYSIS</p>
        <h2 className="mt-2 text-xl font-black text-[#11162d]">이 리포트 다음에 이어볼 분석</h2>
        <p className="mt-2 text-sm leading-7 text-slate-700">
          이미 보유한 동일 exact edition은 제외하고, 지금 이어서 볼 수 있는 다음 분석만 최대 2개 보여드립니다.
        </p>
        <Phase9NextAnalysisCards recommendations={recommendations} />
      </div>
    </section>
  );
}
