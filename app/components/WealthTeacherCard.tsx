import Image from "next/image";

type Variant = "list" | "detail" | "report" | "closing";

const profileByVariant = {
  list: {
    intro: "금운 선생님은 재물운과 생활 속 금전 고민을 중심으로 사주 풀이를 쉽게 안내합니다.",
    focus: "수입·지출 · 저축·자산 관리 · 공동 재정 · 계약·고정비",
    method: "사주 분석 결과와 해석 근거를 바탕으로, 일상에서 확인할 기준과 우선순위를 정리합니다.",
  },
  detail: {
    intro: "이 상품의 재물운 주제를 중심으로 지금 확인할 부분을 차분히 짚어드립니다.",
    focus: "돈의 흐름 · 재정 고민 · 상품별 점검 주제",
    method: "개인별 사주 풀이와 분석 근거를 살펴보고, 무엇을 먼저 점검할지 이해하기 쉽게 정리합니다.",
  },
  report: {
    intro: "구매하신 재물운 레포트의 해석과 점검 기준을 안내합니다.",
    focus: "현재 분석의 핵심 결론 · 판단 근거 · 행동 방향",
    method: "레포트에 제시된 해석을 기준으로 내용을 읽기 쉽게 안내합니다.",
  },
} as const;

export default function WealthTeacherCard({
  variant,
  conclusion,
  immediateAction,
}: {
  variant: Variant;
  conclusion?: string;
  immediateAction?: string;
}) {
  const isList = variant === "list";
  const isClosing = variant === "closing";
  const profile = isClosing ? null : profileByVariant[variant];

  return (
    <section
      data-wealth-teacher={variant}
      aria-label="재물운 담당 금운 선생님"
      className={`relative overflow-hidden rounded-[1.35rem] border border-[#dbc6e6] bg-[linear-gradient(110deg,#fffafd_0%,#f4eafb_60%,#f0e2fa_100%)] text-[#322044] shadow-[0_10px_26px_rgba(84,49,115,.07)] ${isList ? "mb-5" : "my-4"}`}
    >
      <div className="pointer-events-none absolute -right-9 -top-14 h-40 w-40 rounded-full border border-[#c8a66a]/30" />
      <div className="relative flex items-center gap-3 px-4 py-3 sm:gap-5 sm:px-6 sm:py-4">
        <div className={`relative shrink-0 overflow-hidden rounded-2xl border-2 border-[#c8a66a]/60 bg-[#efe4f5] ${isList ? "h-24 w-24 sm:h-28 sm:w-28" : "h-16 w-16 sm:h-20 sm:w-20"}`}>
          <Image
            src="/teachers/geumun-v2.svg"
            alt="짙은 자주색 한복을 입은 금운 선생님"
            fill
            sizes={isList ? "112px" : "80px"}
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold tracking-[0.08em] text-[#8966a2]">운보다 · 재물운 풀이 담당</p>
          <h2 className={`mt-1 font-black tracking-tight text-[#47244d] ${isList ? "text-lg sm:text-2xl" : "text-base sm:text-xl"}`}>
            {isList ? "금운 선생님의 재물운 풀이" : isClosing ? "금운 선생님의 마무리" : "금운 선생님"}
          </h2>
          <p className="mt-1 break-keep text-xs leading-5 text-[#64526c] sm:text-sm sm:leading-6">
            {profile?.intro ?? "구매하신 레포트의 핵심 결론을 다시 짚어드립니다."}
          </p>
        </div>
      </div>

      {profile ? (
        <div
          data-wealth-teacher-profile="visible"
          className="relative grid gap-2 border-t border-[#dfceea] px-4 pb-4 pt-3 sm:grid-cols-2 sm:gap-3 sm:px-6"
        >
          <div className="rounded-xl bg-white/70 px-3 py-2.5">
            <p className="text-[11px] font-bold text-[#875d94]">살펴보는 분야</p>
            <p className="mt-1 break-keep text-xs leading-5 text-[#463752] sm:text-[13px]">{profile.focus}</p>
          </div>
          <div className="rounded-xl bg-white/70 px-3 py-2.5">
            <p className="text-[11px] font-bold text-[#875d94]">풀이 방식</p>
            <p className="mt-1 break-keep text-xs leading-5 text-[#463752] sm:text-[13px]">{profile.method}</p>
          </div>
        </div>
      ) : null}

      {isClosing && (conclusion || immediateAction) ? (
        <div className="relative mx-4 mb-4 space-y-3 rounded-xl border border-[#e4d4eb] bg-white/85 px-4 py-4 text-sm leading-7 text-[#463752] sm:mx-6 sm:px-5">
          {conclusion ? <p><strong className="mr-2 text-[#6d4476]">이번 분석의 결론</strong>{conclusion}</p> : null}
          {immediateAction ? <p><strong className="mr-2 text-[#6d4476]">실천할 한 가지</strong>{immediateAction}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
