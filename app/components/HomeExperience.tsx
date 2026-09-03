import Link from "next/link";

type LandingState =
  | { kind: "guest" }
  | { kind: "no_profiles" }
  | { kind: "needs_profile_selection" }
  | { kind: "analysis_ready"; profileId: string }
  | { kind: "analysis_in_progress"; profileId: string; profileLabel: string }
  | { kind: "analysis_stale"; profileId: string; profileLabel: string }
  | { kind: "analysis_complete"; profileId: string; profileLabel: string; status: "completed" | "needs_retry" };

type LandingCopy = {
  eyebrow: string;
  title: string;
  description: string;
  primary: string;
  primaryHref: string;
  secondary: string;
  secondaryHref: string;
};

type ReturningLandingState = Extract<LandingState, { kind: "analysis_complete" | "analysis_stale" | "analysis_in_progress" }>;

function Icon({ name }: { name: "person" | "bars" | "folder" | "book" | "arrow" }) {
  const paths = {
    person: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0",
    bars: "M5 19V9m7 10V5m7 14v-7",
    folder: "M3.5 7.5h6l2-2h9v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-9Z",
    book: "M5 5.5A2.5 2.5 0 0 1 7.5 3H19v17H7.5A2.5 2.5 0 0 0 5 22.5Zm0 0V20m0-14.5A2.5 2.5 0 0 1 7.5 8H19",
    arrow: "M5 12h13m-5-5 5 5-5 5",
  } as const;

  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}

function Header({ returning }: { returning: boolean }) {
  return (
    <header className="relative z-10 flex items-center justify-between border-b border-[#e7dece] pb-5 lg:border-0 lg:pb-0">
      <Link href="/" className="flex items-center gap-3 text-xl font-bold tracking-[-0.04em] text-[#191817]">
        <span className="grid h-9 w-9 place-items-center text-[#b18132]" aria-hidden="true">
          <svg viewBox="0 0 32 32" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
            <path d="m16 3 4.2 7.1L27 13l-6.8 3 2.3 7.3L16 20l-6.5 3.3L12 16 5 13l6.8-2.9L16 3Z" />
            <path d="M16 8v16M8 16h16" strokeOpacity=".7" />
          </svg>
        </span>
        운보다
      </Link>
      {returning ? (
        <nav className="flex items-center gap-7 text-sm font-medium text-[#625b50]" aria-label="주요 메뉴">
          <Link href="/saju" className="transition hover:text-[#191817]">내 분석</Link>
          <Link href="/recommendations" className="transition hover:text-[#191817]">추천 분석</Link>
          <Link href="/deep-analysis" className="transition hover:text-[#191817]">심층 분석</Link>
          <Link href="/mypage" className="transition hover:text-[#191817]">마이페이지</Link>
        </nav>
      ) : null}
    </header>
  );
}

function EditorialVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[34rem] overflow-visible px-3 sm:px-4">
      <img src="/unboda-hero-art.png" alt="" className="relative block h-auto w-full max-w-full object-contain" />
    </div>
  );
}

function Benefits() {
  const items = [
    { icon: "person" as const, title: "무료 사주 분석", detail: "간편하게 나의 기본 흐름을 확인" },
    { icon: "bars" as const, title: "AI 심층 분석", detail: "직업, 재물, 관계 등 더 깊은 분석" },
    { icon: "folder" as const, title: "프로필 관리", detail: "여러 분석 대상을 한곳에서 관리" },
    { icon: "book" as const, title: "안전한 데이터", detail: "분석 데이터를 안전하게 관리" },
  ];

  return (
    <section className="grid overflow-hidden rounded-[1.35rem] border border-[#eadfce] bg-white/75 shadow-[0_14px_35px_rgba(88,66,32,0.07)] backdrop-blur-sm sm:grid-cols-2 lg:grid-cols-4" aria-label="운보다에서 할 수 있는 일">
      {items.map((item, index) => (
        <div key={item.title} className={`flex items-center gap-4 px-5 py-5 sm:px-6 lg:border-r lg:border-[#eee5d7] lg:last:border-0 ${index > 1 ? "border-t border-[#eee5d7] sm:border-t-0" : ""}`}>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#d8b36f] text-[#b18132]"><Icon name={item.icon} /></span>
          <div>
            <h2 className="text-sm font-bold text-[#2d2923]">{item.title}</h2>
            <p className="mt-1 text-xs leading-5 text-[#766c5e]">{item.detail}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

function Footer() {
  return (
    <footer className="flex flex-col gap-3 border-t border-[#e7dece] pt-5 text-xs text-[#82786a] sm:flex-row sm:items-center sm:justify-between">
      <p>운보다 · 참고용 명리 분석 서비스</p>
      <nav className="flex gap-4" aria-label="법적 문서">
        <Link href="/terms" className="transition hover:text-[#2d2923]">이용약관</Link>
        <Link href="/privacy" className="transition hover:text-[#2d2923]">개인정보처리방침</Link>
        <Link href="/refund" className="transition hover:text-[#2d2923]">환불정책</Link>
      </nav>
    </footer>
  );
}

function ReturningHome({ state, copy }: { state: ReturningLandingState; copy: LandingCopy }) {
  const statusLabel = state.kind === "analysis_stale"
    ? "갱신 필요"
    : state.kind === "analysis_in_progress"
      ? "생성 중"
      : state.kind === "analysis_complete" && state.status === "needs_retry"
        ? "해석 재생성 필요"
        : "최신 상태";

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f1e7] px-5 py-6 text-[#191817] sm:px-8 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl flex-col gap-12">
        <Header returning />
        <section className="grid flex-1 items-center gap-12 py-4 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
          <div id="my-analysis" className="relative z-10">
            <p className="text-xs font-bold tracking-[0.22em] text-[#a47735]">내 운보다 · {statusLabel}</p>
            <h1 className="mt-5 max-w-xl text-5xl font-bold leading-[1.08] tracking-[-0.06em] sm:text-7xl">내 분석을<br /><span className="text-[#ae7f34]">이어가세요</span></h1>
            <p className="mt-6 max-w-lg text-base leading-8 text-[#6f665a] sm:text-lg">{copy.description}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3 text-sm">
              <span className="rounded-full bg-[#2b2721] px-4 py-2 font-semibold text-white">{state.profileLabel}</span>
              <span className="text-[#776e61]">현재 분석 대상</span>
            </div>
            {state.kind === "analysis_stale" ? <p className="mt-4 text-sm font-semibold text-[#a06f28]">출생 정보 또는 평가 기간이 달라 분석 갱신이 필요합니다.</p> : null}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={copy.primaryHref} className="inline-flex items-center justify-center gap-3 rounded-full bg-[#b8893c] px-6 py-4 text-sm font-bold text-white shadow-[0_12px_25px_rgba(159,113,42,0.2)] transition hover:bg-[#9d722d]">{copy.primary}<Icon name="arrow" /></Link>
              <Link href={copy.secondaryHref} className="inline-flex items-center justify-center rounded-full border border-[#d8c7aa] bg-white/70 px-6 py-4 text-sm font-bold text-[#51483c] transition hover:bg-white">{copy.secondary}</Link>
            </div>
          </div>
          <EditorialVisual />
        </section>
        <Benefits />
        <Footer />
      </div>
    </main>
  );
}

function NewHome({ state, copy }: { state: LandingState; copy: LandingCopy }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fcfaf6] px-5 py-5 text-[#191817] sm:px-8 sm:py-7">
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full max-w-[1240px] flex-col gap-5 sm:gap-6">
        <Header returning={false} />
        <section className="grid min-h-[470px] items-center gap-2 py-0 lg:grid-cols-[0.84fr_1.16fr] lg:gap-0 xl:gap-1">
          <div className="relative z-10 lg:pl-7">
            <p className="inline-flex rounded-full border border-[#dfcda9] bg-white/45 px-4 py-2 text-xs font-bold tracking-[0.18em] text-[#a47735]">AI 명리 분석 플랫폼</p>
            <h1 className="mt-5 max-w-[28rem] font-serif text-[2.65rem] font-semibold leading-[1.12] tracking-[-0.045em] text-[#191817] sm:text-[3.35rem]">내 사주의 <span className="text-[#b8893c]">흐름</span>을<br />정확하고 깊이 있게</h1>
            <p className="mt-5 max-w-[25rem] text-[14px] leading-7 text-[#6f665a] sm:text-[15px]">전통 명리의 해석과 AI 분석을 바탕으로<br className="hidden sm:block" /> 삶의 흐름과 필요한 분석을 함께 살펴봅니다.</p>
            <div className="mt-7 flex max-w-[17.5rem] flex-col gap-2.5">
              <Link href={copy.primaryHref} className="inline-flex h-11 items-center justify-center gap-3 rounded-xl bg-[#b8893c] px-5 text-sm font-bold text-white shadow-[0_10px_22px_rgba(159,113,42,0.17)] transition hover:bg-[#9d722d]">무료 사주 분석 시작하기<Icon name="arrow" /></Link>
              <Link href={copy.secondaryHref} className="inline-flex h-11 items-center justify-center rounded-xl border border-[#dfcfb5] bg-white/75 px-5 text-sm font-bold text-[#51483c] transition hover:bg-white">{copy.secondary}</Link>
            </div>
          </div>
          <div className="flex items-center justify-end lg:-mr-5 xl:-mr-8">
            <EditorialVisual />
          </div>
        </section>
        <div className="-mt-1">
          <Benefits />
        </div>
        <Footer />
      </div>
    </main>
  );
}

export default function HomeExperience({ state, copy }: { state: LandingState; copy: LandingCopy }) {
  const returning = state.kind === "analysis_complete" || state.kind === "analysis_stale" || state.kind === "analysis_in_progress";
  return returning ? <ReturningHome state={state} copy={copy} /> : <NewHome state={state} copy={copy} />;
}
