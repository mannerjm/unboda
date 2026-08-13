import type { AnalysisProductRecommendation } from "@/app/lib/analysisProductRecommendations";
import { getPremiumProduct } from "@/app/lib/premiumProductRegistry";
import Link from "next/link";
interface Props {
  recommendations: AnalysisProductRecommendation[];
  currentProductId: string;
  profileId?: string;
}

export default function ProductRecommendationsCard({
  recommendations,
  currentProductId,
  profileId,
}: Props) {
  const filteredRecommendations = recommendations.filter(
  (recommendation) =>
    recommendation.productId !== currentProductId
);
  return (
    <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-6">
      <h2 className="text-xl font-bold text-stone-900">
        추천 상품
      </h2>

      <p className="mt-2 text-sm leading-6 text-stone-600">
        분석 결과를 바탕으로 추천 상품이 표시됩니다.
      </p>

      <div className="mt-5 space-y-3">
  {filteredRecommendations.map((recommendation, index) => {
     const product = getPremiumProduct(recommendation.productId);

  if (!product) {
    return null;
  }

  return (
    <div
      key={recommendation.productId}
      className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-stone-500">
            추천 {index + 1}
          </p>

          <h3 className="mt-1 text-base font-bold text-stone-900">
{product.shortTitle ?? product.title}
</h3>

<p className="mt-2 text-sm leading-6 text-stone-600">
  {product.description}
</p>
        </div>

        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-stone-700">
          점수 {recommendation.score}
        </span>
      </div>

      <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-600">
        {recommendation.reasons.map((reason: string) => (
          <li key={reason}>• {reason}</li>
        ))}
      </ul>

      <Link
  href={`/paid-analysis/${recommendation.productId}${profileId ? `?profileId=${profileId}` : ""}`}
  className="mt-4 inline-flex rounded-xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-stone-800"
>
  심층 분석 보기
</Link>

    </div>
  );
})}
</div>
    </div>
  );
}