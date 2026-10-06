import Link from "next/link";

export default function TrustPrinciplesCard({ compact = false }: { compact?: boolean }) {
  const items = [
    ["구매한 분석을 기준으로 상담", "AI 상담은 현재 계정이 실제로 보유한 리포트 범위 안에서 이어집니다."],
    ["내가 허용한 내용만 기억", "상담 내용을 임의로 장기 기억으로 저장하지 않고, 직접 저장한 내용만 다음 상담에 참고합니다."],
    ["구매 리포트는 다시 확인", "완료된 유료 리포트는 구매한 분석에서 다시 열람할 수 있습니다."],
    ["정상 답변 완료 기준으로 질문권 차감", "범위 밖 질문이나 답변 생성 실패에는 질문권이 차감되지 않습니다."],
  ] as const;

  return (
    <section className={compact
      ? "mt-4 rounded-2xl border border-[#dce1ef] bg-[#f8f9fd] px-4 py-4"
      : "mt-5 rounded-[1.5rem] border border-[#d8d3ff] bg-[linear-gradient(135deg,#ffffff_0%,#f5f3ff_100%)] p-5 shadow-sm sm:p-6"}
      aria-label="운보다 이용 신뢰 원칙"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-[0.13em] text-[#6f5ce7]">운보다 이용 원칙</p>
          <h3 className={compact ? "mt-1 text-sm font-black text-[#11162d]" : "mt-2 text-lg font-black text-[#11162d]"}>
            실제 시스템이 지키는 기준만 안내합니다.
          </h3>
        </div>
        <Link href="/trust" className="text-xs font-bold text-[#5e4bd1] underline underline-offset-4">
          자세히 보기 →
        </Link>
      </div>
      <div className={compact ? "mt-3 grid gap-2 sm:grid-cols-2" : "mt-4 grid gap-3 sm:grid-cols-2"}>
        {items.map(([title, description]) => (
          <div key={title} className="rounded-xl border border-[#e2e5ef] bg-white px-3.5 py-3">
            <p className="text-xs font-bold text-[#11162d]">{title}</p>
            {!compact ? <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
