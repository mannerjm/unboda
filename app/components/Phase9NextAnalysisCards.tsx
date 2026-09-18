import Link from "next/link";
import type { Phase9NextAnalysisRecommendation } from "@/app/lib/phase9NextAnalysis";

export default function Phase9NextAnalysisCards({
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
