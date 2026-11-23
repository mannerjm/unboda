import TeacherPortrait from "@/app/components/TeacherPortrait";

type Variant = "list" | "detail" | "report" | "closing";

const areas = ["수입·지출", "저축·자산 관리", "공동 재정", "계약·고정비"] as const;

const profileByVariant = {
  list: {
    intro: "돈의 흐름과 생활 속 재정 고민을 알기 쉽게 풀어드립니다.",
    method: "사주 분석 근거를 살펴 핵심 결론과 생활 속 점검 기준을 정리합니다.",
  },
  detail: {
    intro: "이 상품에서 궁금한 돈의 흐름과 재정 고민을 짚어드립니다.",
    method: "사주 분석 근거를 바탕으로 이 상품에서 확인할 핵심과 실천 기준을 안내합니다.",
  },
  report: {
    intro: "구매하신 재물운 레포트의 핵심을 함께 살펴봅니다.",
    method: "레포트의 판단 근거와 결론을 읽고 일상에서 점검할 기준을 정리합니다.",
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
      className={`overflow-hidden rounded-[1.35rem] border border-[#dbc6e6] bg-[linear-gradient(110deg,#fffafd_0%,#f4eafb_60%,#f0e2fa_100%)] text-[#322044] shadow-[0_10px_26px_rgba(84,49,115,.07)] ${isList ? "mb-5" : "my-4"}`}
    >
      <div className="flex items-center gap-3 px-3 py-3 sm:gap-5 sm:px-6 sm:py-5">
        <TeacherPortrait
          name="geumun"
          label="금운 선생님, 한복과 자연스러운 배경이 함께 보이는 인물 사진"
          variant={variant}
          borderColor="#c8a66a"
          backgroundColor="#efe4f5"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-[#745083]">운보다 · 재물운 풀이 담당</p>
          <h2 className={`mt-1 font-black tracking-tight text-[#47244d] ${isList ? "text-lg sm:text-2xl" : "text-base sm:text-xl"}`}>
            {isList ? "금운 선생님의 재물운 풀이" : isClosing ? "금운 선생님의 마무리" : "금운 선생님"}
          </h2>
          <p className="mt-1 break-keep text-[13px] font-medium leading-5 text-[#51405e] sm:text-[15px] sm:leading-6">
            {profile?.intro ?? "구매하신 레포트의 핵심 결론을 다시 짚어드립니다."}
          </p>
        </div>
      </div>

      {profile ? (
        <div
          data-wealth-teacher-profile="visible"
          className="space-y-3 border-t border-[#dfceea] bg-white/45 px-4 py-3 sm:px-6"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <strong className="shrink-0 text-[13px] font-bold text-[#5f3d70]">살펴보는 분야</strong>
            <div className="flex flex-wrap gap-1.5" aria-label="재물운 주요 분야">
              {areas.map((area) => (
                <span key={area} className="rounded-full border border-[#dfd0e9] bg-white px-2.5 py-1 text-[13px] font-semibold leading-5 text-[#493456]">
                  {area}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
            <strong className="shrink-0 text-[13px] font-bold text-[#5f3d70]">풀이 방식</strong>
            <p className="min-w-0 flex-1 basis-[220px] break-keep text-[13px] leading-6 text-[#493456] sm:text-sm">
              {profile.method}
            </p>
          </div>
        </div>
      ) : null}

      {isClosing && (conclusion || immediateAction) ? (
        <div className="mx-4 mb-4 space-y-3 rounded-xl border border-[#e4d4eb] bg-white/85 px-4 py-4 text-sm leading-7 text-[#463752] sm:mx-6 sm:px-5">
          {conclusion ? <p><strong className="mr-2 text-[#6d4476]">이번 분석의 결론</strong>{conclusion}</p> : null}
          {immediateAction ? <p><strong className="mr-2 text-[#6d4476]">실천할 한 가지</strong>{immediateAction}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
