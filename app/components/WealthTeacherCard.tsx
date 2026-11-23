import Image from "next/image";

type Variant = "list" | "detail" | "report" | "closing";

export default function WealthTeacherCard({ variant }: { variant: Variant }) {
  const isList = variant === "list";
  const isClosing = variant === "closing";
  return (
    <section
      data-wealth-teacher={variant}
      aria-label="재물운 담당 금운 선생님"
      className={`relative overflow-hidden rounded-[1.35rem] border border-[#dbc6e6] bg-[linear-gradient(110deg,#fffafd_0%,#f4eafb_60%,#f0e2fa_100%)] text-[#322044] shadow-[0_10px_26px_rgba(84,49,115,.07)] ${isList ? "mb-5" : "my-4"}`}
    >
      <div className="pointer-events-none absolute -right-9 -top-14 h-40 w-40 rounded-full border border-[#c8a66a]/30" />
      <div className="relative flex items-center gap-3 px-4 py-3 sm:gap-5 sm:px-6 sm:py-4">
        <div className={`relative shrink-0 overflow-hidden rounded-2xl border-2 border-[#c8a66a]/60 bg-[#efe4f5] ${isList ? "h-24 w-24 sm:h-28 sm:w-28" : "h-16 w-16 sm:h-20 sm:w-20"}`}>
          <Image src="/teachers/geumun.svg" alt="짙은 자주색 한복을 입은 금운 선생님" fill sizes={isList ? "112px" : "80px"} className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold tracking-[0.08em] text-[#8966a2]">재물운 전문 선생님</p>
          <h2 className={`mt-1 font-black tracking-tight text-[#47244d] ${isList ? "text-lg sm:text-2xl" : "text-base sm:text-xl"}`}>
            {isList ? "금운 선생님의 재물운 풀이" : isClosing ? "금운 선생님의 마무리" : "금운 선생님"}
          </h2>
          <p className="mt-1 break-keep text-xs leading-5 text-[#64526c] sm:text-sm sm:leading-6">
            {isList
              ? "재물운 상품 10종을 주제별로 살펴보세요. 각 상품의 기존 분석 내용은 그대로 제공됩니다."
              : isClosing
                ? "이번 레포트의 결론과 행동 제안을 다시 확인해 보세요."
                : variant === "report"
                  ? "구매하신 재물운 레포트를 안내합니다."
                  : "이 상품에서 살펴볼 재물운 분석을 안내합니다."}
          </p>
        </div>
      </div>
    </section>
  );
}
