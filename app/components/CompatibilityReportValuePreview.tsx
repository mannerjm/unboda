import Image from "next/image";
import { PREMIUM_PRODUCT_PHOTOS } from "@/app/lib/premiumProductPhotos";
import ProductReviewSummary from "@/app/components/ProductReviewSummary";
import {
  COMPATIBILITY_BUSINESS_PRODUCT_ID,
  COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID,
  COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID,
  COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID,
  COMPATIBILITY_FRIEND_PRODUCT_ID,
  COMPATIBILITY_ROMANTIC_PRODUCT_ID,
  COMPATIBILITY_WORKPLACE_PRODUCT_ID,
} from "@/app/lib/specialAnalysisProducts";

type CompatibilityPreviewMode = "romantic" | "workplace" | "friend" | "business" | "parent_child" | "siblings" | "other_family";

type PreviewConfig = Readonly<{
  headline: string;
  directionTitle: string;
  directionDescription: string;
  domains: readonly string[];
}>;

const PREVIEW_VISUALS: Record<CompatibilityPreviewMode, { src: string; alt: string; question: string }> = {
  romantic: {
    src: PREMIUM_PRODUCT_PHOTOS["relationship-current"].src,
    alt: PREMIUM_PRODUCT_PHOTOS["relationship-current"].alt,
    question: "우리 두 사람은 서로 어떻게 다를까요?",
  },
  workplace: {
    src: "/images/premium/career-workplace-relationships.jpg",
    alt: "함께 일하며 소통하는 직장 동료",
    question: "함께 일할 때 어떤 점이 잘 맞을까요?",
  },
  friend: {
    src: "/images/premium/relationship-friendship.jpg",
    alt: "서로 대화하며 시간을 보내는 친구들",
    question: "친구와 더 편안하게 지내려면?",
  },
  business: {
    src: "/images/premium/business-team-management.jpg",
    alt: "같이 업무를 계획하는 사업팀",
    question: "동업할 때 역할과 책임은 어떻게 맞출까요?",
  },
  parent_child: {
    src: "/images/premium/relationship-family-role.jpg",
    alt: "가족 구성원들이 함께 시간을 보내는 장면",
    question: "부모와 자녀는 무엇을 다르게 느낄까요?",
  },
  siblings: {
    src: "/images/premium/relationship-family-role.jpg",
    alt: "함께 시간을 보내는 가족",
    question: "형제자매 사이에서 놓치는 마음은 없을까요?",
  },
  other_family: {
    src: "/images/premium/relationship-family-role.jpg",
    alt: "서로 이야기를 나누는 가족",
    question: "가족 안에서 서로에게 바라는 것은 무엇일까요?",
  },
};

const REVIEW_PRODUCT_BY_MODE: Record<CompatibilityPreviewMode, string> = {
  romantic: COMPATIBILITY_ROMANTIC_PRODUCT_ID,
  workplace: COMPATIBILITY_WORKPLACE_PRODUCT_ID,
  friend: COMPATIBILITY_FRIEND_PRODUCT_ID,
  business: COMPATIBILITY_BUSINESS_PRODUCT_ID,
  parent_child: COMPATIBILITY_FAMILY_PARENT_CHILD_PRODUCT_ID,
  siblings: COMPATIBILITY_FAMILY_SIBLING_PRODUCT_ID,
  other_family: COMPATIBILITY_FAMILY_OTHER_PRODUCT_ID,
};

const PREVIEW_CONFIG: Record<CompatibilityPreviewMode, PreviewConfig> = {
  romantic: {
    headline: "연인·배우자 리포트는 이렇게 읽습니다",
    directionTitle: "내가 느끼는 마음과 상대가 느끼는 마음",
    directionDescription: "같은 관계라도 서로 다르게 체감할 수 있는 부분을 방향별로 나눠 설명합니다.",
    domains: ["마음이 통하는 순간", "대화하는 방식", "자주 다투는 이유", "오래 함께하는 방법", "다툰 뒤 마음 풀기"],
  },
  workplace: {
    headline: "직장·동료 리포트는 이렇게 읽습니다",
    directionTitle: "내가 동료에게 주는 느낌과 동료가 내게 주는 느낌",
    directionDescription: "같은 업무 관계라도 서로에게 주는 추진력과 부담이 다를 수 있어 방향별로 나눠 설명합니다.",
    domains: ["일하는 방식", "일을 나누는 방법", "함께 결정하는 방식", "오해와 대화", "오래 함께 일하는 방법"],
  },
  friend: {
    headline: "친구·지인 리포트는 이렇게 읽습니다",
    directionTitle: "나와 친구가 서로에게 주는 느낌",
    directionDescription: "친밀감과 거리감이 서로에게 어떻게 다르게 느껴지는지 양방향으로 나눠 설명합니다.",
    domains: ["마음이 가까워지는 순간", "서로 믿는 방식", "대화하는 모습", "편안한 거리", "오래 친구로 지내기"],
  },
  business: {
    headline: "사업·동업 리포트는 이렇게 읽습니다",
    directionTitle: "나와 동업자가 서로에게 주는 힘과 부담",
    directionDescription: "역할·책임·의사결정에서 서로에게 주는 보완과 부담을 방향별로 나눠 설명합니다.",
    domains: ["일을 나누는 방식", "함께 결정하는 방법", "돈을 보는 방식", "의견이 다를 때", "오래 함께 사업하기"],
  },
  parent_child: {
    headline: "부모·자녀 리포트는 이렇게 읽습니다",
    directionTitle: "부모의 마음과 자녀의 마음을 따로 살펴봐요",
    directionDescription: "보호와 기대가 자녀에게 어떻게 닿는지, 자녀의 반응이 부모에게 어떻게 느껴지는지 방향별로 나눠 설명합니다.",
    domains: ["마음이 통하는 순간", "서로의 대화", "기대와 스스로 하는 일", "도움이 부담이 되는 때", "다시 가까워지기"],
  },
  siblings: {
    headline: "형제·자매 리포트는 이렇게 읽습니다",
    directionTitle: "형제자매가 서로에게 느낄 수 있는 마음",
    directionDescription: "서로에게 힘이 되는 부분과 부담으로 느껴질 수 있는 부분을 한 방향으로 뭉개지 않고 나눠 설명합니다.",
    domains: ["마음이 통하는 순간", "서로의 대화", "비교와 경쟁", "서로 편하게 지내기", "서운함 풀기"],
  },
  other_family: {
    headline: "기타 가족 리포트는 이렇게 읽습니다",
    directionTitle: "서로에게 느껴지는 마음을 나누어 봐요",
    directionDescription: "가족 역할이 달라도 한쪽 관점만 보지 않고, 서로에게 어떻게 다르게 작용하는지 나눠 설명합니다.",
    domains: ["서로 편안한 거리", "대화하는 모습", "가족에게 바라는 것", "연락과 도움", "서운함 풀기"],
  },
};

export default function CompatibilityReportValuePreview({
  mode,
  evaluationYear,
  relationshipLabel,
}: {
  mode: CompatibilityPreviewMode;
  evaluationYear: number;
  relationshipLabel?: string | null;
}) {
  const config = PREVIEW_CONFIG[mode];
  const visual = PREVIEW_VISUALS[mode];
  const relationshipContext = mode === "other_family" && relationshipLabel
    ? `${relationshipLabel} 관계에 맞는 역할과 거리 기준을 반영합니다.`
    : null;

  return (
    <>
    <section
      data-compatibility-report-preview={mode}
      className="mt-7 overflow-hidden rounded-[28px] border border-[#dfe3ef] bg-[#f9faff] shadow-[0_12px_36px_rgba(32,38,72,0.06)]"
    >
      <div className="grid gap-6 bg-[linear-gradient(145deg,#fff6fc_0%,#f1e8ff_100%)] px-5 py-7 sm:px-7 sm:py-8 md:grid-cols-[1.12fr_0.88fr] md:items-center">
        <div>
          <p className="text-sm font-extrabold text-[#7550c7]">나와 상대방의 사주를 함께 보는 궁합 분석</p>
          <h3 className="mt-3 break-keep text-[26px] font-black leading-[1.35] tracking-[-0.04em] text-[#28163f] sm:text-[32px]">{visual.question}</h3>
          <p className="mt-4 break-keep text-[16px] leading-8 text-[#5d4f6e]">{config.directionDescription}</p>
        </div>
        <div className="relative mx-auto aspect-[5/4] w-full max-w-[320px] overflow-hidden rounded-[1.7rem] border-[5px] border-white bg-[#e9dff8] shadow-[0_12px_32px_rgba(74,43,117,.14)]">
          <Image src={visual.src} alt={visual.alt} fill sizes="(max-width: 640px) 80vw, 320px" className="object-cover" />
        </div>
      </div>

      <div className="px-5 py-7 sm:px-7">
        <p className="text-center text-sm font-extrabold text-[#7652c5]">이 궁합으로 살펴볼 세 가지</p>
        <h3 className="mt-2 break-keep text-center text-[24px] font-black text-[#26183f] sm:text-[29px]">무엇을 이해할 수 있을까요?</h3>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {config.domains.slice(0, 3).map((domain, index) => (
            <div key={domain} className="rounded-[1.4rem] border border-[#e9def4] bg-white px-5 py-6 text-center shadow-sm">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#eadfff] text-sm font-black text-[#7152c0]">0{index + 1}</span>
              <p className="mt-4 break-keep text-[18px] font-extrabold leading-7 text-[#342146]">{domain}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 break-keep text-center text-sm leading-6 text-[#746984]">
          사주를 바탕으로 관계를 돌아보는 참고용 해석이며, 실제 개인별 결과를 미리 보여주는 화면은 아닙니다.
        </p>
        {relationshipContext ? <p className="mt-2 text-center text-sm text-[#625674]">{relationshipContext}</p> : null}
      </div>
      <details className="mx-5 mb-6 rounded-2xl border border-[#e2d9ee] bg-white px-5 py-4 sm:mx-7">
        <summary className="cursor-pointer text-[16px] font-extrabold text-[#6549af]">리포트 구성과 자세한 분석 영역 펼쳐보기</summary>
      <div className="border-b border-[#e4e7f1] bg-[linear-gradient(135deg,#f3f1ff_0%,#fbfcff_72%)] px-5 py-5 sm:px-6">
        <p className="text-xs font-bold tracking-[0.14em] text-slate-500">리포트 구성 미리보기</p>
        <h3 className="mt-2 text-lg font-bold tracking-[-0.02em] text-[#11162d]">{config.headline}</h3>
      </div>

      <div className="p-5 sm:p-6">
        <ol className="grid gap-3 sm:grid-cols-3">
          <li className="rounded-2xl border border-[#dce1ef] bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#6f5ce7] text-xs font-bold text-white">1</span>
              <p className="text-xs font-bold text-slate-600">관계 핵심</p>
            </div>
            <p className="mt-3 text-sm font-bold leading-6 text-[#11162d]">두 사람의 기본 관계부터 정리</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">서로 힘이 되는 점과 조심하면 좋은 부분부터 살펴봐요.</p>
          </li>

          <li className="rounded-2xl border border-[#dce1ef] bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#6f5ce7] text-xs font-bold text-white">2</span>
              <p className="text-xs font-bold text-slate-600">서로에게 주는 느낌</p>
            </div>
            <p className="mt-3 text-sm font-bold leading-6 text-[#11162d]">{config.directionTitle}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{config.directionDescription}</p>
          </li>

          <li className="rounded-2xl border border-[#dce1ef] bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#6f5ce7] text-xs font-bold text-white">3</span>
              <p className="text-xs font-bold text-slate-600">{evaluationYear}년 흐름</p>
            </div>
            <p className="mt-3 text-sm font-bold leading-6 text-[#11162d]">올해 달라질 수 있는 관계와 작은 조언</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">기본 관계와 올해 흐름을 구분하고, 지금 해볼 행동과 줄이면 좋은 행동까지 연결합니다.</p>
          </li>
        </ol>

        <div className="mt-4 border-t border-[#dce1ef] pt-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-slate-800">관계별로 더 깊게 보는 영역</p>
              {relationshipContext ? <p className="mt-1 text-sm leading-6 text-slate-600">{relationshipContext}</p> : null}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {config.domains.map((domain) => (
              <span key={domain} className="rounded-full border border-[#d8d3ff] bg-[#f3f1ff] px-3 py-1.5 text-xs font-semibold text-slate-700">
                {domain}
              </span>
            ))}
          </div>
        </div>

      </div>
      </details>
    </section>
    <ProductReviewSummary productId={REVIEW_PRODUCT_BY_MODE[mode]} compactWhenEmpty />
    </>
  );
}
