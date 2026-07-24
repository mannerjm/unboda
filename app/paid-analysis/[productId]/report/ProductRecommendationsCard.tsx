import type { AnalysisProductRecommendation } from "@/app/lib/analysisProductRecommendations";

interface Props {
  recommendations: AnalysisProductRecommendation[];
}

export default function ProductRecommendationsCard({
  recommendations,
}: Props) {
  return (
    <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6">
      <h2 className="text-xl font-bold text-stone-900">
        추천 상품
      </h2>

      <p className="mt-2 text-sm leading-6 text-stone-600">
        분석 결과를 바탕으로 추천 상품이 표시됩니다.
      </p>

      <p className="mt-4 text-sm text-stone-500">
        추천 결과 {recommendations.length}개
      </p>
    </div>
  );
}