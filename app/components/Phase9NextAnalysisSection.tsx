import { getCurrentUser } from "@/app/lib/supabase/auth";
import { getUserProfile } from "@/app/lib/profiles/server";
import { getPhase9NextAnalysisRecommendations } from "@/app/lib/phase9NextAnalysis";
import Phase9NextAnalysisCards from "@/app/components/Phase9NextAnalysisCards";

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
