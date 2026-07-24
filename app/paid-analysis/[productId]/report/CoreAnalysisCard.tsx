import type { AnalyzePremiumResponse } from "@/app/lib/analyzeApiTypes";

type CoreAnalysisCardProps = {
  fortuneBrain: AnalyzePremiumResponse["fortuneBrain"];
};

export default function CoreAnalysisCard({
  fortuneBrain,
}: CoreAnalysisCardProps) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
      <p className="text-xs font-semibold tracking-[0.2em] text-stone-500">
        CORE ANALYSIS
      </p>

      <h2 className="mt-3 text-2xl font-bold text-stone-900">
        현재 운의 핵심 구조
      </h2>

      <p className="mt-4 text-sm leading-7 text-stone-700">
        {fortuneBrain.summary}
      </p>

      <div className="mt-6">
        <h3 className="text-sm font-bold text-stone-900">강점</h3>

        <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
          {fortuneBrain.strengths.map((item, index) => (
            <li key={`${item}-${index}`}>• {item}</li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-bold text-stone-900">
          주의할 점
        </h3>

        <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
          {fortuneBrain.weaknesses.map((item, index) => (
            <li key={`${item}-${index}`}>• {item}</li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-bold text-stone-900">
          현실적인 방향
        </h3>

        <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-700">
          {fortuneBrain.recommendations.map((item, index) => (
            <li key={`${item}-${index}`}>• {item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}