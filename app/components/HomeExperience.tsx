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

type IconName = "spark" | "search" | "people" | "folder" | "arrow" | "heart" | "briefcase" | "wallet" | "study" | "relation" | "calendar" | "chat" | "check";

function Icon({ name, className = "h-5 w-5" }: { name: IconName; className?: string }) {
  const paths: Record<IconName, string> = {
    spark: "M12 3.5l1.7 4.8 4.8 1.7-4.8 1.7-1.7 4.8-1.7-4.8L5.5 10l4.8-1.7L12 3.5Zm6.5 10.5.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6Z",
    search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm5.2 12.2L21 21",
    people: "M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-1a3 3 0 1 0 0-6m-14 16a6 6 0 0 1 12 0m2-7a5 5 0 0 1 4 5",
    folder: "M3.5 7.5h6l2-2h9v11a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-9Z",
    arrow: "M5 12h13m-5-5 5 5-5 5",
    heart: "M12 20s-7-4.2-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.8-7 9-7 9Z",
    briefcase: "M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7m-12 4h16m-15-4h14a2 2 0 0 1 2 2v9H3V9a2 2 0 0 1 2-2Z",
    wallet: "M4 7.5A2.5 2.5 0 0 1 6.5 5H19v14H6.5A2.5 2.5 0 0 1 4 16.5v-9Zm0 2h15m-4 4h4",
    study: "M4 6.5 12 3l8 3.5-8 3.5-8-3.5Zm3 2.8V15c2.7 2 7.3 2 10 0V9.3M20 7v6",
    relation: "M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2.5 20a5.5 5.5 0 0 1 11 0m-3 0a5.5 5.5 0 0 1 11 0",
    calendar: "M5 5h14a2 2 0 0 1 2 2v13H3V7a2 2 0 0 1 2-2Zm2-2v4m10-4v4M3 10h18m-14 4h3m4 0h3m-10 3h3",
    chat: "M4 5h16v11H9l-5 4V5Z",
    check: "m5 12 4 4 10-10",
  };

  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}

function BrandMark() {
  return (
    <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-[1rem] bg-[#ff735f] text-white shadow-[0_8px_24px_rgba(255,115,95,0.28)]" aria-hidden="true">
      <span className="absolute h-6 w-6 rounded-full border border-white/70" />
      <span className="absolute h-2 w-2 translate-x-[7px] -translate-y-[7px] rounded-full bg-white" />
      <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
    </span>
  );
}

function Header({ state }: { state: LandingState }) {
  const isGuest = state.kind === "guest";
  const freeHref = isGuest ? "/guest-saju" : "/saju";
  const accountHref = isGuest ? "/auth/login?returnTo=/" : "/mypage";
  const accountLabel = isGuest ? "로그인" : "마이페이지";

  return (
    <header className="relative z-20 flex items-center justify-between gap-4 py-1">
      <Link href="/" className="flex shrink-0 items-center gap-3 text-xl font-black tracking-[-0.045em] text-[#231f26]">
        <BrandMark />
        운보다
      </Link>
      <nav className="hidden items-center gap-7 text-sm font-semibold text-[#665f68] md:flex" aria-label="주요 메뉴">
        <Link href={freeHref} className="transition hover:text-[#ff6753]">무료 분석</Link>
        <Link href="/deep-analysis" className="transition hover:text-[#ff6753]">심층 분석</Link>
        <Link href="/special-analysis/compatibility" className="transition hover:text-[#ff6753]">궁합</Link>
        <Link href="/purchased-analyses" className="transition hover:text-[#ff6753]">구매한 분석</Link>
      </nav>
      <Link href={accountHref} className="shrink-0 rounded-full border border-[#e8dfdb] bg-white/80 px-4 py-2.5 text-xs font-bold text-[#413b43] shadow-sm transition hover:border-[#ffc5ba] hover:text-[#e95543] sm:text-sm">
        {accountLabel}
      </Link>
    </header>
  );
}

function FlowVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[34rem]">
      <div className="absolute inset-[7%] rounded-full bg-[radial-gradient(circle_at_40%_35%,#fff_0%,#fff8f2_34%,#ffe3d8_68%,#ffd3c7_100%)] shadow-[0_35px_90px_rgba(206,104,83,0.20)]" />
      <div className="absolute left-[4%] top-[14%] h-24 w-24 rounded-full bg-[#fff0a8]/80 blur-2xl" />
      <div className="absolute bottom-[8%] right-[0%] h-28 w-28 rounded-full bg-[#cfc8ff]/55 blur-3xl" />
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 500 500" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="orbitA" x1="70" y1="90" x2="430" y2="410" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF765E" />
            <stop offset="0.5" stopColor="#FFB46D" />
            <stop offset="1" stopColor="#8B7CFF" />
          </linearGradient>
          <linearGradient id="orbitB" x1="90" y1="390" x2="420" y2="100" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF90A5" />
            <stop offset="1" stopColor="#FF735F" />
          </linearGradient>
        </defs>
        <ellipse cx="250" cy="250" rx="184" ry="112" transform="rotate(-22 250 250)" stroke="url(#orbitA)" strokeWidth="3" strokeLinecap="round" strokeDasharray="3 9" />
        <ellipse cx="250" cy="250" rx="154" ry="205" transform="rotate(31 250 250)" stroke="url(#orbitB)" strokeWidth="2" strokeOpacity="0.72" />
        <circle cx="250" cy="250" r="72" fill="#FFF8F4" stroke="#FF9A84" strokeWidth="2" />
        <circle cx="250" cy="250" r="45" fill="#FF735F" fillOpacity="0.10" />
        <circle cx="250" cy="250" r="11" fill="#FF735F" />
        <circle cx="388" cy="145" r="17" fill="#8B7CFF" />
        <circle cx="102" cy="292" r="13" fill="#FFB46D" />
        <circle cx="326" cy="410" r="10" fill="#FF90A5" />
        <circle cx="169" cy="104" r="7" fill="#FF735F" />
        <path d="M134 350C205 314 290 328 372 279" stroke="#FF735F" strokeOpacity="0.35" strokeWidth="8" strokeLinecap="round" />
      </svg>
      <div className="absolute left-[11%] top-[18%] rounded-full border border-white/80 bg-white/80 px-3 py-2 text-[11px] font-bold text-[#6b6168] shadow-sm backdrop-blur">지금의 흐름</div>
      <div className="absolute right-[5%] top-[39%] rounded-full border border-white/80 bg-white/80 px-3 py-2 text-[11px] font-bold text-[#6b6168] shadow-sm backdrop-blur">관계</div>
      <div className="absolute bottom-[14%] left-[22%] rounded-full border border-white/80 bg-white/80 px-3 py-2 text-[11px] font-bold text-[#6b6168] shadow-sm backdrop-blur">선택</div>
    </div>
  );
}

function HeroActions({ state, copy }: { state: LandingState; copy: LandingCopy }) {
  const showDirectFinder = state.kind === "guest" || state.kind === "analysis_ready" || state.kind === "no_profiles" || state.kind === "needs_profile_selection";

  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <Link href={copy.primaryHref} className="inline-flex min-h-13 items-center justify-center gap-3 rounded-2xl bg-[#ff735f] px-6 py-3.5 text-sm font-black text-white shadow-[0_16px_35px_rgba(255,115,95,0.28)] transition hover:-translate-y-0.5 hover:bg-[#f46350]">
        {copy.primary}<Icon name="arrow" />
      </Link>
      {showDirectFinder ? (
        <Link href="/deep-analysis" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-[#eaded9] bg-white/90 px-6 py-3.5 text-sm font-black text-[#3d363e] shadow-sm transition hover:-translate-y-0.5 hover:border-[#ffc2b7] hover:text-[#e65745]">
          원하는 분석 바로 찾기<Icon name="search" />
        </Link>
      ) : (
        <Link href={copy.secondaryHref} className="inline-flex min-h-13 items-center justify-center rounded-2xl border border-[#eaded9] bg-white/90 px-6 py-3.5 text-sm font-black text-[#3d363e] shadow-sm transition hover:-translate-y-0.5 hover:border-[#ffc2b7] hover:text-[#e65745]">
          {copy.secondary}
        </Link>
      )}
    </div>
  );
}

function QuickRoutes({ state }: { state: LandingState }) {
  const guest = state.kind === "guest";
  const routes = [
    { icon: "spark" as const, title: "무료 분석", detail: "먼저 지금의 나부터", href: guest ? "/guest-saju" : "/saju", tone: "bg-[#fff0e9] text-[#e75d49]" },
    { icon: "search" as const, title: "심층 분석", detail: "궁금한 주제로 바로", href: "/deep-analysis", tone: "bg-[#f0edff] text-[#6d60df]" },
    { icon: "people" as const, title: "두 사람 궁합", detail: "관계의 차이를 함께", href: "/special-analysis/compatibility", tone: "bg-[#fff0f4] text-[#d95b7a]" },
    { icon: "folder" as const, title: "구매한 분석", detail: "저장한 리포트 이어보기", href: guest ? "/auth/login?returnTo=/purchased-analyses" : "/purchased-analyses", tone: "bg-[#fff7d9] text-[#a77b16]" },
  ];

  return (
    <section className="mx-auto grid w-full max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="운보다 주요 진입 경로">
      {routes.map((route) => (
        <Link key={route.title} href={route.href} className="group flex items-center gap-4 rounded-[1.6rem] border border-[#eee7e3] bg-white/90 p-4 shadow-[0_12px_35px_rgba(68,46,39,0.06)] transition hover:-translate-y-1 hover:border-[#ffd0c7] hover:shadow-[0_18px_45px_rgba(68,46,39,0.10)]">
          <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ${route.tone}`}><Icon name={route.icon} /></span>
          <span className="min-w-0">
            <strong className="block text-sm font-black text-[#2f2930]">{route.title}</strong>
            <span className="mt-1 block text-xs leading-5 text-[#80777f]">{route.detail}</span>
          </span>
          <Icon name="arrow" className="ml-auto h-4 w-4 shrink-0 text-[#bbb0b6] transition group-hover:translate-x-1 group-hover:text-[#ff735f]" />
        </Link>
      ))}
    </section>
  );
}

function CuriositySection() {
  const items = [
    { icon: "heart" as const, label: "연애", question: "요즘 내 연애, 왜 자꾸 같은 고민이 생길까?", tone: "from-[#fff0f4] to-[#fff8fa] text-[#d75c7c]" },
    { icon: "briefcase" as const, label: "일 · 커리어", question: "지금 이 선택이 나한테 맞는 방향일까?", tone: "from-[#eff3ff] to-[#f9faff] text-[#5970cf]" },
    { icon: "wallet" as const, label: "재물 · 돈", question: "내 돈의 흐름은 어디에서 막히고 열릴까?", tone: "from-[#fff6da] to-[#fffbef] text-[#a87a12]" },
    { icon: "study" as const, label: "학업 · 성장", question: "나는 어떤 방식으로 해야 성과가 날까?", tone: "from-[#edfbf7] to-[#f8fffd] text-[#3a947c]" },
    { icon: "relation" as const, label: "관계", question: "왜 같은 관계 문제가 반복되는 걸까?", tone: "from-[#f5efff] to-[#fbf9ff] text-[#8060c9]" },
    { icon: "calendar" as const, label: "앞으로의 흐름", question: "지금부터 무엇이 달라지고 언제 움직일까?", tone: "from-[#fff0e8] to-[#fff9f5] text-[#db6b45]" },
  ];

  return (
    <section className="mx-auto w-full max-w-6xl py-20 sm:py-24">
      <div className="max-w-2xl">
        <p className="text-xs font-black tracking-[0.18em] text-[#ff735f]">FIND YOUR QUESTION</p>
        <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[#29232a] sm:text-4xl">요즘, 어떤 게 가장 궁금하세요?</h2>
        <p className="mt-4 text-sm leading-7 text-[#746b73] sm:text-base">상품 이름을 먼저 알 필요는 없어요. 마음에 걸리는 질문에서 시작하면 관련 분석을 직접 찾아볼 수 있어요.</p>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link key={item.label} href={item.label === "관계" ? "/special-analysis/compatibility" : "/deep-analysis"} className={`group rounded-[1.8rem] border border-white bg-gradient-to-br ${item.tone} p-6 shadow-[0_12px_38px_rgba(64,45,45,0.06)] transition hover:-translate-y-1.5 hover:shadow-[0_20px_48px_rgba(64,45,45,0.10)]`}>
            <div className="flex items-center justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/80 shadow-sm"><Icon name={item.icon} /></span>
              <Icon name="arrow" className="h-4 w-4 opacity-40 transition group-hover:translate-x-1 group-hover:opacity-100" />
            </div>
            <p className="mt-6 text-xs font-black tracking-[0.14em] opacity-80">{item.label}</p>
            <p className="mt-2 text-lg font-black leading-7 tracking-[-0.025em] text-[#312b31]">{item.question}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function CompatibilitySection() {
  return (
    <section className="mx-auto w-full max-w-6xl overflow-hidden rounded-[2.4rem] bg-[#fff1ed] px-6 py-8 sm:px-9 sm:py-10 lg:px-12">
      <div className="grid items-center gap-8 lg:grid-cols-[1fr_0.9fr]">
        <div>
          <p className="text-xs font-black tracking-[0.18em] text-[#d75e4b]">TWO PEOPLE, ONE RELATIONSHIP</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[#2f282d] sm:text-4xl">혼자 보는 사주와<br />두 사람이 함께 보는 궁합은 달라요.</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-[#74676d] sm:text-base">몇 점짜리 관계인지보다, 서로 무엇을 다르게 느끼고 어디에서 잘 맞거나 부딪히는지를 살펴봐요.</p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold text-[#7b5751]">
            {['연인 · 배우자', '부모 · 자녀', '형제 · 자매', '가족'].map((label) => <span key={label} className="rounded-full bg-white/85 px-3.5 py-2 shadow-sm">{label}</span>)}
          </div>
          <Link href="/special-analysis/compatibility" className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[#2c2529] px-5 py-3.5 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#191619]">우리 관계 살펴보기<Icon name="arrow" /></Link>
        </div>
        <div className="relative mx-auto h-64 w-full max-w-md sm:h-72">
          <div className="absolute left-[14%] top-[16%] h-44 w-44 rounded-full border-[18px] border-[#ff8f7c]/65 bg-white/45 shadow-[0_20px_60px_rgba(255,115,95,0.12)]" />
          <div className="absolute right-[12%] top-[28%] h-40 w-40 rounded-full border-[18px] border-[#8b7cff]/55 bg-white/45 shadow-[0_20px_60px_rgba(139,124,255,0.12)]" />
          <div className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#ff735f] shadow-xl"><Icon name="people" className="h-8 w-8" /></div>
        </div>
      </div>
    </section>
  );
}

function AiConsultingSection({ state }: { state: LandingState }) {
  const guest = state.kind === "guest";
  const purchasedHref = guest ? "/auth/login?returnTo=/purchased-analyses" : "/purchased-analyses";

  return (
    <section className="mx-auto mt-6 w-full max-w-6xl overflow-hidden rounded-[2.4rem] bg-[#1e1a24] px-6 py-9 text-white sm:px-9 sm:py-11 lg:px-12">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <p className="text-xs font-black tracking-[0.18em] text-[#ff9d8f]">AI CONSULTING</p>
          <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] sm:text-4xl">분석을 읽고도<br />궁금한 게 남는다면?</h2>
          <p className="mt-4 max-w-lg text-sm leading-7 text-[#c9c1cc] sm:text-base">운보다 AI 상담은 아무 질문이나 받는 챗봇이 아니라, 구매한 리포트의 범위를 바탕으로 그 다음 질문을 이어가는 상담이에요.</p>
          <Link href={purchasedHref} className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-[#231f26] transition hover:-translate-y-0.5 hover:bg-[#fff1ed]">구매한 분석에서 이어보기<Icon name="arrow" /></Link>
        </div>
        <div className="space-y-3 rounded-[1.8rem] border border-white/10 bg-white/[0.055] p-5 sm:p-6">
          <div className="max-w-[86%] rounded-[1.35rem] rounded-bl-md bg-white/10 px-4 py-3 text-sm leading-6 text-[#eee9f0]">상대와 이야기할 때 왜 자꾸 같은 부분에서 부딪히는 것 같지?</div>
          <div className="ml-auto max-w-[92%] rounded-[1.35rem] rounded-br-md bg-[#ff735f] px-4 py-3 text-sm leading-6 text-white shadow-lg">구매한 궁합 리포트에서는 두 사람이 갈등을 받아들이는 방식에 차이가 보여요. 먼저 반복되는 상황을 기준으로 대화 순서를 나눠볼게요.</div>
          <div className="flex items-center gap-2 pt-2 text-xs font-semibold text-[#9d94a1]"><Icon name="check" className="h-4 w-4 text-[#ff9d8f]" />구매한 분석 범위 안에서 이어서 질문</div>
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  const items = [
    { title: "먼저 무료로", body: "지금의 흐름을 먼저 보고, 무엇이 더 궁금한지 확인한 뒤 다음 분석을 선택해요." },
    { title: "추천은 계산에서", body: "무료 결과에서 이어지는 추천은 저장된 사주 계산과 현재 흐름을 기준으로 연결돼요." },
    { title: "질문은 리포트에서", body: "유료 분석 뒤에는 해당 리포트 범위 안에서 AI 상담으로 궁금한 내용을 더 풀어갈 수 있어요." },
  ];

  return (
    <section className="mx-auto w-full max-w-6xl py-20 sm:py-24">
      <div className="text-center">
        <p className="text-xs font-black tracking-[0.18em] text-[#ff735f]">HOW UNBODA WORKS</p>
        <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-[#29232a] sm:text-4xl">쉽게 들어오고, 필요한 만큼 깊게.</h2>
      </div>
      <div className="mt-9 grid gap-4 md:grid-cols-3">
        {items.map((item, index) => (
          <div key={item.title} className="rounded-[1.8rem] border border-[#eee7e3] bg-white p-6 shadow-[0_12px_35px_rgba(68,46,39,0.05)]">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#fff0eb] text-sm font-black text-[#e75d49]">0{index + 1}</span>
            <h3 className="mt-5 text-lg font-black text-[#312b31]">{item.title}</h3>
            <p className="mt-2 text-sm leading-7 text-[#776e75]">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#ebe4df] py-8 text-xs text-[#817880]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl space-y-1.5 leading-5">
          <p className="font-bold text-[#5d545c]">운보다 · 참고용 명리 분석 서비스</p>
          <p>상호 운보다 · 대표자 반희 · 사업자등록번호 201-28-96364</p>
          <p>사업장 소재지 충청남도 천안시 서북구 백석4길 12, 10층 1001-B52호(백석동, 거성캐슬B빌딩)</p>
          <p>고객센터 070-4792-8900 · 공식 지원 이메일 support@unboda.kr</p>
        </div>
        <nav className="flex shrink-0 flex-wrap gap-4" aria-label="서비스 및 법적 문서">
          <Link href="/support" className="transition hover:text-[#302a30]">고객지원</Link>
          <Link href="/terms" className="transition hover:text-[#302a30]">이용약관</Link>
          <Link href="/privacy" className="transition hover:text-[#302a30]">개인정보처리방침</Link>
          <Link href="/refund" className="transition hover:text-[#302a30]">환불정책</Link>
        </nav>
      </div>
    </footer>
  );
}

function NewHome({ state, copy }: { state: LandingState; copy: LandingCopy }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fffaf7] text-[#231f26]">
      <div className="relative px-5 pb-10 pt-5 sm:px-8 sm:pt-7">
        <div className="pointer-events-none absolute -left-20 top-24 h-72 w-72 rounded-full bg-[#ffe9bd]/55 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 top-10 h-80 w-80 rounded-full bg-[#ffd9d3]/55 blur-3xl" />
        <div className="mx-auto w-full max-w-6xl">
          <Header state={state} />
          <section className="grid min-h-[590px] items-center gap-10 py-10 lg:grid-cols-[0.94fr_1.06fr] lg:py-14">
            <div className="relative z-10">
              <p className="inline-flex items-center gap-2 rounded-full border border-[#ffd7cf] bg-white/75 px-4 py-2 text-xs font-black tracking-[0.08em] text-[#d85b49] shadow-sm"><Icon name="spark" className="h-4 w-4" />{copy.eyebrow}</p>
              <h1 className="mt-6 max-w-[37rem] text-[2.75rem] font-black leading-[1.05] tracking-[-0.065em] text-[#241f25] sm:text-[4.25rem] lg:text-[4.7rem]">{copy.title}</h1>
              <p className="mt-6 max-w-xl text-[15px] leading-8 text-[#6e656d] sm:text-lg">{copy.description}</p>
              <HeroActions state={state} copy={copy} />
              {copy.secondary ? <Link href={copy.secondaryHref} className="mt-4 inline-flex text-xs font-bold text-[#8a8087] underline decoration-[#d8ced3] underline-offset-4 transition hover:text-[#e45f4c]">{copy.secondary}</Link> : null}
            </div>
            <FlowVisual />
          </section>
          <QuickRoutes state={state} />
        </div>
      </div>
      <CuriositySection />
      <div className="px-5 sm:px-8">
        <CompatibilitySection />
        <AiConsultingSection state={state} />
      </div>
      <TrustSection />
      <div className="px-5 sm:px-8"><Footer /></div>
    </main>
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
    <main className="min-h-screen overflow-hidden bg-[#fffaf7] text-[#231f26]">
      <div className="relative px-5 pb-10 pt-5 sm:px-8 sm:pt-7">
        <div className="pointer-events-none absolute -left-20 top-24 h-72 w-72 rounded-full bg-[#ffe9bd]/55 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 top-10 h-80 w-80 rounded-full bg-[#ded9ff]/45 blur-3xl" />
        <div className="mx-auto w-full max-w-6xl">
          <Header state={state} />
          <section className="grid min-h-[570px] items-center gap-10 py-10 lg:grid-cols-[0.94fr_1.06fr] lg:py-12">
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[#241f25] px-3.5 py-2 text-xs font-black text-white">{state.profileLabel}</span>
                <span className="rounded-full bg-white px-3.5 py-2 text-xs font-bold text-[#736970] shadow-sm">{statusLabel}</span>
              </div>
              <p className="mt-5 text-xs font-black tracking-[0.16em] text-[#ff735f]">{copy.eyebrow}</p>
              <h1 className="mt-4 max-w-[38rem] text-[2.8rem] font-black leading-[1.06] tracking-[-0.065em] text-[#241f25] sm:text-[4.3rem]">{copy.title}</h1>
              <p className="mt-6 max-w-xl text-[15px] leading-8 text-[#6e656d] sm:text-lg">{copy.description}</p>
              <HeroActions state={state} copy={copy} />
              <Link href="/deep-analysis" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#8a8087] underline decoration-[#d8ced3] underline-offset-4 transition hover:text-[#e45f4c]">다른 심층 분석 직접 찾기<Icon name="search" className="h-4 w-4" /></Link>
            </div>
            <FlowVisual />
          </section>
          <QuickRoutes state={state} />
        </div>
      </div>
      <CuriositySection />
      <div className="px-5 sm:px-8">
        <CompatibilitySection />
        <AiConsultingSection state={state} />
      </div>
      <TrustSection />
      <div className="px-5 sm:px-8"><Footer /></div>
    </main>
  );
}

export default function HomeExperience({ state, copy }: { state: LandingState; copy: LandingCopy }) {
  const returning = state.kind === "analysis_complete" || state.kind === "analysis_stale" || state.kind === "analysis_in_progress";
  return returning ? <ReturningHome state={state} copy={copy} /> : <NewHome state={state} copy={copy} />;
}
