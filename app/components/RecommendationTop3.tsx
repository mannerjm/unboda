import Image from "next/image";
import Link from "next/link";
import { PREMIUM_PRODUCT_PHOTOS } from "@/app/lib/premiumProductPhotos";
import { getPremiumProductDisplayTitle } from "@/app/lib/premiumPresentation";
import { getProductPricing } from "@/app/lib/productPricing";
import { resolveCanonicalRecommendationProduct, toCanonicalRecommendations } from "@/app/lib/analysisProductRecommendations";
import type { AnalysisProductRecommendation } from "@/app/lib/analysisProductRecommendations";
import { getPaidAnalysisTopicConfig } from "@/app/lib/paidAnalysisTopicConfig";
import { getReadablePaidQuestion } from "@/app/lib/premiumQuestionDisplay";

type RecommendationTop3Props = {
  recommendations: readonly AnalysisProductRecommendation[];
  profileId: string;
  guestMode?: boolean;
};

type CanonicalRecommendation = {
  recommendation: AnalysisProductRecommendation;
  product: NonNullable<ReturnType<typeof resolveCanonicalRecommendationProduct>>;
};

function getReadableRecommendationReason(
  recommendation: AnalysisProductRecommendation | undefined,
): string {
  const readableReason = recommendation?.reasons.find((reason) =>
    !/^[a-z0-9_-]+:[a-zA-Z0-9_-]+$/.test(reason)
    && !/(fortuneFlowAnalysis|elementAnalysis|elementRelations|health_stress|wealth_risk|relationship_conflict)/.test(reason),
  );
  return readableReason ?? "무료 결과에서 이 주제와 연결되는 흐름을 살펴볼 수 있어요.";
}

function getShortRecommendationReason(
  recommendation: AnalysisProductRecommendation | undefined,
): string {
  const reason = getReadableRecommendationReason(recommendation);
  // Preserve the genuine ranking; do not present raw signal counts or technical
  // jargon as a consumer-facing promise. Do not expose raw signals in the list.
  if (reason.length <= 75 && !/(연·대운|[가-힣]·[가-힣]운|신호\s*\d|[가-힣]\s*\d+건|기준\s*\d|%|element|fortuneFlow)/i.test(reason)) {
    return reason;
  }
  return "무료 분석에서 확인한 흐름과 연결돼 더 자세히 살펴볼 질문이에요.";
}

function getRecommendationQuestion(productId: string, fallback: string): string {
  return getReadablePaidQuestion(productId, getPaidAnalysisTopicConfig(productId)?.purchaseDecision.decisionQuestion ?? fallback);
}

function RecommendationPhoto({ productId, primary = false }: { productId: string; primary?: boolean }) {
  const photo = PREMIUM_PRODUCT_PHOTOS[productId];
  return (
    <span
      className={primary
        ? "relative block h-32 w-32 shrink-0 overflow-hidden rounded-[1.15rem] bg-[#e6ddf6] sm:h-44 sm:w-44"
        : "relative block h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-[#e6ddf6] sm:h-28 sm:w-28"}
    >
      {photo ? (
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={primary ? "(max-width: 640px) 128px, 176px" : "(max-width: 640px) 96px, 112px"}
          className="object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-[linear-gradient(145deg,#eee5ff_0%,#ceb7ec_100%)] text-sm font-black text-[#7154a0]">
          운보다
        </span>
      )}
    </span>
  );
}

function RecommendationCard({
  entry,
  index,
  profileId,
  guestMode,
  primary = false,
}: {
  entry: CanonicalRecommendation;
  index: number;
  profileId: string;
  guestMode: boolean;
  primary?: boolean;
}) {
  const { recommendation, product } = entry;
  const href = `/paid-analysis/${encodeURIComponent(product.id)}${guestMode ? "?from=guest-recommendation" : `?profileId=${encodeURIComponent(profileId)}`}`;
  const displayTitle = getPremiumProductDisplayTitle(product.id, product.title);
  const question = getRecommendationQuestion(product.id, product.description);
  const price = getProductPricing(product.id).amount.toLocaleString("ko-KR") + "원";
  const cardStyle = primary
    ? "border-[#a789e9] bg-[#fcfaff] shadow-[0_12px_30px_rgba(112,76,163,0.10)]"
    : "border-[#e5daf2] bg-white shadow-[0_10px_28px_rgba(90,60,125,0.055)]";

  return (
    <Link
      href={href}
      prefetch={false}
      className={"group block w-full rounded-[1.5rem] border p-4 text-left transition hover:-translate-y-0.5 hover:border-[#a789e9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8060ca] " + cardStyle + (primary ? " sm:p-5" : "")}
    >
      <div className="flex items-start gap-4">
        <RecommendationPhoto productId={product.id} primary={primary} />
        <div className="flex min-w-0 flex-1 flex-col self-stretch">
          <p className="text-xs font-extrabold tracking-[0.03em] text-[#7654b5]">
            {primary ? "01 · 가장 먼저 추천해요" : "0" + (index + 1) + " · 함께 살펴볼 분석"}
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-[#7b718b]">{displayTitle}</p>
          <h3 className={"mt-2 font-black tracking-[-0.025em] text-[#211737] " + (primary ? "text-lg leading-7 sm:text-xl sm:leading-8" : "text-[15px] leading-6 sm:text-base")}>
            {question}
          </h3>
          <p className={"mt-2 text-xs leading-5 text-[#655a75] " + (primary ? "line-clamp-2 sm:text-sm sm:leading-6" : "line-clamp-2")}>
            {primary ? product.description : getShortRecommendationReason(recommendation)}
          </p>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
            <span className="text-base font-extrabold text-[#211737]">{price}</span>
            <span className="text-xs font-black text-[#7552b1]">
              상품 자세히 보기 →
            </span>
          </div>
        </div>
      </div>
      {primary ? (
        <div className="mt-4 rounded-xl bg-[#f4eefb] px-4 py-3 text-xs leading-5 text-[#594a73] sm:text-sm sm:leading-6">
          <span className="font-black text-[#6a4ca8]">추천 이유 </span>
          {getShortRecommendationReason(recommendation)}
        </div>
      ) : null}
    </Link>
  );
}

export default function RecommendationTop3({
  recommendations,
  profileId,
  guestMode = false,
}: RecommendationTop3Props) {
  // Keep canonical ranking; detail pages resolve purchase state authoritatively.
  const validRecommendations = toCanonicalRecommendations(recommendations)
    .map((recommendation) => ({
      recommendation,
      product: resolveCanonicalRecommendationProduct(recommendation.productId),
    }))
    .filter((entry): entry is CanonicalRecommendation => Boolean(entry.product));

  return (
    <section className="mt-7" aria-labelledby="recommendation-top3-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black tracking-[0.10em] text-[#7552b1]">무료 분석 결과에서 이어보기</p>
          <h2 id="recommendation-top3-title" className="mt-2 text-2xl font-black tracking-[-0.035em] text-[#201634] sm:text-3xl">내 결과에서 이어지는 질문 3가지</h2>
        </div>
        <p className="text-xs font-medium text-[#766d85]">무료 분석과 같은 계산 근거로 선정</p>
      </div>
      <p className="mt-2 text-xs leading-5 text-[#766d85]">
        추천은 매월 실제 계산 근거로 다시 평가하며, 비슷한 흐름이면 다른 사람과 같은 질문이 나올 수도 있어요.
      </p>

      {validRecommendations[0] ? (
        <div className="mt-5">
          <RecommendationCard
            entry={validRecommendations[0]}
            index={0}
            primary
            profileId={profileId}
            guestMode={guestMode}
          />
        </div>
      ) : null}
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {validRecommendations.slice(1).map((entry, offset) => (
          <RecommendationCard
            key={entry.product.id}
            entry={entry}
            index={offset + 1}
            profileId={profileId}
            guestMode={guestMode}
          />
        ))}
      </div>
    </section>
  );
}
