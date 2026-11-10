type MysticLoadingScreenProps = {
  eyebrow?: string;
  title?: string;
  description?: string;
  steps?: readonly string[];
  /** Allow the same visual inside a purchased-report page that already has a main element. */
  asSection?: boolean;
  showAnimation?: boolean;
  children?: React.ReactNode;
};

export default function MysticLoadingScreen({
  eyebrow = "운보다 AI 분석 중",
  title = "당신의 흐름을 읽고 있어요.",
  description = "입력한 출생 정보를 바탕으로 명리 구조와 현재 흐름을 차근차근 확인하고 있습니다.",
  steps = ["사주 구조 확인", "현재 흐름 계산", "다음 질문 찾기"],
  asSection = false,
  showAnimation = true,
  children,
}: MysticLoadingScreenProps) {
  const Container = asSection ? "section" : "main";
  return (
    <Container className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_50%_30%,#ffffff_0%,#faf5ff_48%,#eee5ff_100%)] px-4 py-5 text-center sm:px-6 sm:py-8 text-[#281744]">
      <div className="pointer-events-none absolute inset-0 opacity-50" style={{ backgroundImage: "radial-gradient(circle, rgba(185,152,236,0.36) 0 1px, transparent 1.3px)", backgroundSize: "44px 44px" }} />
      <div className="relative flex w-full max-w-xl flex-col items-center rounded-[2.25rem] border border-white/90 bg-white/85 px-5 py-6 shadow-[0_24px_70px_rgba(126,82,189,.14)] backdrop-blur-xl sm:px-9 sm:py-8">
        <div className="relative h-40 w-40 sm:h-44 sm:w-44" aria-hidden="true">
          <div className="absolute inset-[18px] rounded-full border border-[#ae8aec]/50" />
          <div className={`absolute inset-[35px] ${showAnimation ? "animate-pulse" : ""} rounded-full bg-[radial-gradient(circle,#af75f6_0%,rgba(177,121,242,0.23)_45%,transparent_72%)]`} />
          <div className="absolute inset-[46px] flex items-center justify-center rounded-full border border-[#dbb6ff] bg-[radial-gradient(circle_at_30%_20%,#dcaeff_0%,#a46af0_46%,#6940c7_100%)] text-white shadow-[0_0_40px_rgba(155,101,237,0.38),inset_0_2px_7px_rgba(255,255,255,.44)]">
            <div>
              <p className="text-[10px] font-bold tracking-[0.16em] text-[#fff3ff]">운보다</p>
              <p className="mt-1 text-3xl font-black">나</p>
            </div>
          </div>
          <div className={`absolute left-1/2 top-1/2 h-[108px] w-[148px] sm:h-[122px] sm:w-[166px] -translate-x-1/2 -translate-y-1/2 rotate-[-16deg] ${showAnimation ? "animate-[spin_9s_linear_infinite]" : ""} rounded-[50%] border border-dashed border-[#ab7df5]/70`} />
          <span className="absolute right-4 top-10 h-3 w-3 rounded-full bg-[#8c72ff] shadow-[0_0_20px_rgba(140,114,255,0.55)]" />
          <span className="absolute bottom-8 left-5 h-2.5 w-2.5 rounded-full bg-[#ff8bac] shadow-[0_0_18px_rgba(255,139,172,0.7)]" />
        </div>

        <p className="mt-3 text-xs font-black tracking-[0.16em] text-[#8b4acb] sm:mt-4">{eyebrow}</p>
        <h1 className="mt-3 max-w-[26ch] break-keep text-balance text-2xl font-black leading-snug tracking-[-0.04em] sm:text-3xl">{title}</h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-[#59466f] sm:text-base sm:leading-7">{description}</p>

        <div className="mt-5 grid w-full gap-2 sm:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step} className="rounded-2xl border border-[#e9dcfa] bg-[linear-gradient(145deg,#ffffff,#f7f0ff)] px-3 py-2.5 shadow-[0_7px_18px_rgba(100,63,171,.06)]">
              <p className="text-[10px] font-black tracking-[0.12em] text-[#8251ca]">0{index + 1}</p>
              <p className="mt-1 text-xs font-bold text-[#3d2b61]">{step}</p>
            </div>
          ))}
        </div>
        {showAnimation ? <p className="mt-4 text-xs font-medium leading-6 text-[#574270]">완료되면 결과 화면으로 자동 이동합니다.</p> : null}
        {children ? <div className="mt-3 w-full">{children}</div> : null}
      </div>
    </Container>
  );
}
