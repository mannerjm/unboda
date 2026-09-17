type MysticLoadingScreenProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  steps?: readonly string[];
};

export default function MysticLoadingScreen({
  eyebrow = "운보다 AI 분석 중",
  title = "당신의 흐름을 읽고 있어요.",
  description = "입력한 출생 정보를 바탕으로 명리 구조와 현재 흐름을 차근차근 확인하고 있습니다.",
  steps = ["사주 구조 확인", "현재 흐름 계산", "다음 질문 찾기"],
}: MysticLoadingScreenProps) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_35%,#17204a_0%,#0b122b_38%,#071025_76%)] px-6 py-12 text-center text-white">
      <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle, rgba(180,188,255,0.55) 0 1px, transparent 1.3px)", backgroundSize: "44px 44px" }} />
      <div className="relative flex w-full max-w-lg flex-col items-center">
        <div className="relative h-44 w-44" aria-hidden="true">
          <div className="absolute inset-[18px] rounded-full border border-[#786be5]/45" />
          <div className="absolute inset-[35px] animate-pulse rounded-full bg-[radial-gradient(circle,#7663e7_0%,rgba(118,99,231,0.22)_45%,transparent_72%)]" />
          <div className="absolute inset-[54px] flex items-center justify-center rounded-full border border-white/10 bg-[#0c1430] shadow-[0_0_40px_rgba(118,99,231,0.35)]">
            <div>
              <p className="text-[10px] font-bold tracking-[0.16em] text-[#9184e8]">운보다</p>
              <p className="mt-1 text-3xl font-black">나</p>
            </div>
          </div>
          <div className="absolute left-1/2 top-1/2 h-[122px] w-[166px] -translate-x-1/2 -translate-y-1/2 rotate-[-16deg] animate-[spin_9s_linear_infinite] rounded-[50%] border border-dashed border-[#9aa8ff]/70" />
          <span className="absolute right-4 top-10 h-3 w-3 rounded-full bg-[#8c72ff] shadow-[0_0_20px_rgba(140,114,255,0.8)]" />
          <span className="absolute bottom-8 left-5 h-2.5 w-2.5 rounded-full bg-[#ff8bac] shadow-[0_0_18px_rgba(255,139,172,0.7)]" />
        </div>

        <p className="mt-6 text-xs font-black tracking-[0.16em] text-[#a99cff]">{eyebrow}</p>
        <h1 className="mt-4 text-3xl font-black leading-tight tracking-[-0.04em] sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-md text-sm leading-7 text-[#aeb7d2] sm:text-base">{description}</p>

        <div className="mt-8 grid w-full gap-2 sm:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step} className="rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-3">
              <p className="text-[10px] font-black tracking-[0.12em] text-[#7769d7]">0{index + 1}</p>
              <p className="mt-1 text-xs font-bold text-[#d9ddef]">{step}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs leading-6 text-[#737f9f]">완료되면 결과 화면으로 자동 이동합니다.</p>
      </div>
    </main>
  );
}
