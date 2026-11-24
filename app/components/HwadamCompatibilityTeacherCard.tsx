import Image from "next/image";

type Placement = "catalog" | "detail" | "report" | "closing";

const AREAS = ["연인·배우자", "가족", "직장·동료", "친구·지인", "사업·동업"] as const;

export const HWADAM_COLORS = {
  accent: "#77558F",
  deep: "#342340",
  deepEnd: "#4C355D",
  pale: "#F4ECF8",
  border: "#E1CEE9",
} as const;

export const HWADAM_REPORT_DARK_STYLE = {
  borderColor: HWADAM_COLORS.deep,
  backgroundImage: `radial-gradient(circle at 88% 15%,rgba(181,140,211,.20),transparent 35%),linear-gradient(140deg,${HWADAM_COLORS.deep} 0%,${HWADAM_COLORS.deepEnd} 100%)`,
} as const;

export default function HwadamCompatibilityTeacherCard({
  placement,
  relationship,
  conclusion,
  action,
}: {
  placement: Placement;
  relationship?: string;
  conclusion?: string;
  action?: string;
}) {
  const isClosing = placement === "closing";
  const isCatalog = placement === "catalog";
  const compact = placement === "report" || isClosing;

  return (
    <section
      data-compatibility-teacher={placement}
      aria-label="궁합 풀이 담당 화담 선생님"
      className={`overflow-hidden rounded-[1.35rem] border border-[#e1cee9] bg-[linear-gradient(110deg,#fffafc_0%,#f4ecf8_65%,#eae0f2_100%)] text-[#32223c] shadow-[0_10px_26px_rgba(66,39,93,.07)] ${isCatalog ? "mb-5 mt-5" : "my-4"}`}
    >
      <div className="flex items-center gap-3 px-3 py-3 sm:gap-5 sm:px-6 sm:py-5">
        <div
          data-teacher-portrait="full"
          data-portrait-fit="balanced"
          className={`relative aspect-[1/2] shrink-0 self-start overflow-hidden rounded-2xl border border-[#d8c2dd] bg-[#efe3f3] shadow-[0_6px_16px_rgba(44,28,50,.09)] ${isCatalog ? "w-[88px] sm:w-[112px]" : "w-[80px] sm:w-[100px]"}`}
        >
          <Image
            src="/teachers/hwadam.webp"
            alt="자수정빛 한복과 전통 서재 배경이 함께 보이는 화담 선생님 사진"
            fill
            sizes={isCatalog ? "(max-width: 640px) 88px, 112px" : "(max-width: 640px) 80px, 100px"}
            className="object-cover object-center"
            priority={isCatalog}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-[#77558f]">운보다 · 궁합 풀이 담당</p>
          <h2 className={`mt-1 break-keep font-black tracking-tight text-[#3b254a] ${isCatalog ? "text-lg sm:text-2xl" : "text-base sm:text-xl"}`}>
            {isClosing ? "화담 선생님의 관계 정리" : isCatalog ? "화담 선생님의 궁합 풀이" : "화담 선생님"}
          </h2>
          <p className="mt-2 break-keep text-[13px] font-medium leading-6 text-[#5c4d63] sm:text-[15px]">
            {isClosing
              ? "이번 레포트의 결론과 실천할 내용을 다시 짚어봅니다."
              : placement === "report"
                ? "두 사람의 관계에서 잘 맞는 점과 서로 이해할 부분을 살펴봅니다."
                : relationship
                  ? `${relationship}에서 서로 다른 성향과 대화의 흐름을 이해하기 쉽게 안내합니다.`
                  : "서로 다른 두 사람의 성향과 대화 방식, 관계의 균형을 살펴봅니다."}
          </p>
          {!compact ? (
            <div data-compatibility-teacher-profile="visible" className="mt-4 space-y-3 border-t border-[#e0cee9] pt-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <strong className="shrink-0 text-[13px] font-bold text-[#77558f]">살펴보는 관계</strong>
                <div className="flex flex-wrap gap-1.5">
                  {AREAS.map((item) => (
                    <span key={item} className="rounded-full border border-[#e0cce8] bg-white px-2.5 py-1 text-[13px] font-semibold leading-5 text-[#594364]">{item}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
                <strong className="shrink-0 text-[13px] font-bold text-[#77558f]">풀이 방식</strong>
                <p className="min-w-0 flex-1 basis-[220px] break-keep text-[13px] leading-6 text-[#5a4a62] sm:text-sm">
                  두 사람의 사주를 함께 살펴 잘 맞는 점, 다른 점, 관계에서 확인할 기준을 정리합니다.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      {isClosing && (conclusion || action) ? (
        <div className="mx-4 mb-4 space-y-3 rounded-xl border border-[#e1cee9] bg-white/90 px-4 py-4 text-sm leading-7 text-[#463650] sm:mx-6 sm:px-5">
          {conclusion ? <p className="break-keep"><strong className="mr-2 text-[#77558f]">이번 궁합의 결론</strong>{conclusion}</p> : null}
          {action ? <p className="break-keep"><strong className="mr-2 text-[#77558f]">실천할 한 가지</strong>{action}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
