import TeacherPortrait from "@/app/components/TeacherPortrait";

type Variant = "list" | "detail" | "report" | "closing";

export default function NewYearTeacherCard({ variant, conclusion, immediateAction, scope = "new-year" }: { variant: Variant; scope?: "new-year" | "period"; conclusion?: string; immediateAction?: string }) {
  const closing = variant === "closing";
  return (
    <section data-new-year-teacher={variant} aria-label={scope === "period" ? "기간별 분석 담당 AI 명리 선생님 태운" : "신년운세 담당 AI 명리 선생님 태운"}
      className="my-4 overflow-hidden rounded-[1.35rem] border border-[#ecd7bf] bg-[linear-gradient(120deg,#fffdf9,#fff1df)] text-[#30203e] shadow-[0_10px_26px_rgba(78,49,115,.06)]">
      <div className="flex items-center gap-3 px-3 py-3 sm:gap-5 sm:px-6 sm:py-5">
        <TeacherPortrait name="taeun" label="태운 AI 명리 선생님의 생성형 인물 이미지" variant={variant} borderColor="#ecd7bf" backgroundColor="#fff1df" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-[#975a33]">운보다 · {scope === "period" ? "기간별 분석 전문 선생님" : "신년운세 전문 AI 명리 선생님"}</p>
          <h2 className="mt-1 break-keep text-base font-black tracking-tight text-[#4e3027] sm:text-xl">{closing ? "태운 선생님의 마무리" : scope === "period" ? "태운 선생님의 기간별 운세 풀이" : "태운(泰運) 선생님"}</h2>
          <p className="mt-2 break-keep text-[13px] font-medium leading-6 text-[#54445b] sm:text-[15px]">{scope === "period" ? "이번 달부터 평생까지, 시기에 따른 변화와 준비할 일을 쉽게 풀어드립니다." : closing ? "한 해의 중요한 방향과 실천할 내용을 다시 살펴보세요." : variant === "report" ? "구매하신 신년운세의 총운, 분야별 흐름과 열두 달의 준비 방향을 함께 살펴봅니다." : "고객님의 사주를 바탕으로 새해 총운과 분야별 흐름, 열두 달의 실천 방향을 안내합니다."}</p>
          {!closing ? <p className="mt-3 border-t border-[#ecd7bf] pt-3 text-xs leading-5 text-[#735b50]">사주 풀이를 바탕으로 일상에서 확인할 기준을 안내합니다. 구매 후 상담은 운담 AI 상담에서 이어갈 수 있습니다.</p> : null}
        </div>
      </div>
      {closing && (conclusion || immediateAction) ? <div className="mx-4 mb-4 space-y-3 rounded-xl border border-[#ecd7bf] bg-white/90 px-4 py-4 text-sm leading-7 text-[#463752] sm:mx-6 sm:px-5">
        {conclusion ? <p><strong className="mr-2 text-[#975a33]">이번 분석의 결론</strong>{conclusion}</p> : null}
        {immediateAction ? <p><strong className="mr-2 text-[#975a33]">실천할 한 가지</strong>{immediateAction}</p> : null}
      </div> : null}
    </section>
  );
}
