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
  return <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]} /></svg>;
}

const glass = "border border-white/10 bg-white/[0.055] backdrop-blur-xl shadow-[0_16px_60px_rgba(2,8,30,0.28)]";

function BrandMark() {
  return <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-[1rem] bg-[linear-gradient(135deg,#ff6f61,#8a6dff)] text-white shadow-[0_0_30px_rgba(125,96,255,0.35)]" aria-hidden="true"><span className="absolute h-6 w-6 rounded-full border border-white/75" /><span className="absolute h-2 w-2 translate-x-[7px] -translate-y-[7px] rounded-full bg-white shadow-[0_0_10px_white]" /><span className="h-1.5 w-1.5 rounded-full bg-white" /></span>;
}

function Header({ state }: { state: LandingState }) {
  const isGuest = state.kind === "guest";
  const freeHref = isGuest ? "/guest-saju" : "/saju";
  const accountHref = isGuest ? "/auth/login?returnTo=/" : "/mypage";
  return <header className="relative z-20 flex items-center justify-between gap-4 py-1 text-white">
    <Link href="/" className="flex shrink-0 items-center gap-3 text-xl font-black tracking-[-0.045em]"><BrandMark />운보다</Link>
    <nav className="hidden items-center gap-7 text-sm font-semibold text-[#c9c8db] md:flex" aria-label="주요 메뉴">
      <Link href={freeHref} className="transition hover:text-white">무료 분석</Link><Link href="/deep-analysis" className="transition hover:text-white">심층 분석</Link><Link href="/special-analysis/compatibility" className="transition hover:text-white">궁합</Link><Link href="/purchased-analyses" className="transition hover:text-white">구매한 분석</Link>
    </nav>
    <Link href={accountHref} className="shrink-0 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-bold text-white backdrop-blur-xl transition hover:bg-white/15 sm:text-sm">{isGuest ? "로그인" : "마이페이지"}</Link>
  </header>;
}

function FlowVisual() {
  return <div className="relative mx-auto aspect-square w-full max-w-[31rem] overflow-visible" aria-label="나를 중심으로 흐름, 관계, 선택이 이어지는 운보다 상징 그래픽">
    <div className="absolute left-[8%] right-[8%] top-[13%] h-[60%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(157,128,255,0.34),rgba(73,70,160,0.12)_45%,transparent_72%)] blur-xl" />
    <div className="absolute bottom-[9%] left-[10%] right-[8%] h-[28%] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(255,135,169,0.16),transparent_70%)] blur-2xl" />
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 500 500" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="mysticOrbit" x1="55" y1="72" x2="440" y2="425"><stop stopColor="#90B5FF"/><stop offset="0.42" stopColor="#AA8CFF"/><stop offset="0.72" stopColor="#FF9BC9"/><stop offset="1" stopColor="#FFC06E"/></linearGradient>
        <radialGradient id="moonGlow"><stop stopColor="#FFF8FF"/><stop offset="0.18" stopColor="#D9CEFF"/><stop offset="0.48" stopColor="#7D68DF" stopOpacity="0.75"/><stop offset="1" stopColor="#4B3E9B" stopOpacity="0"/></radialGradient>
        <linearGradient id="horizonGlow" x1="110" y1="0" x2="390" y2="0"><stop stopColor="#6E5BCE" stopOpacity="0"/><stop offset="0.5" stopColor="#FFB2D3" stopOpacity="0.9"/><stop offset="1" stopColor="#6E5BCE" stopOpacity="0"/></linearGradient>
      </defs>
      <path d="M78 351C134 318 184 303 250 303C320 303 369 321 425 353" stroke="#8176D9" strokeOpacity="0.22" strokeWidth="1.2"/>
      <path d="M96 375C154 343 198 334 252 334C313 334 354 345 410 376" stroke="#735FC6" strokeOpacity="0.16" strokeWidth="1"/>
      <path d="M120 395C170 369 208 362 253 362C303 362 340 370 388 395" stroke="#5F52A4" strokeOpacity="0.13" strokeWidth="1"/>
      <ellipse cx="250" cy="245" rx="191" ry="116" transform="rotate(-22 250 245)" stroke="url(#mysticOrbit)" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="2 9"/>
      <ellipse cx="250" cy="245" rx="151" ry="205" transform="rotate(31 250 245)" stroke="#B9ADFF" strokeOpacity="0.4" strokeWidth="1.7"/>
      <circle cx="250" cy="245" r="103" fill="url(#moonGlow)"/>
      <circle cx="250" cy="245" r="66" fill="#E9E2FF" fillOpacity="0.12" stroke="#E3DAFF" strokeOpacity="0.34"/>
      <circle cx="250" cy="245" r="47" fill="#121A3A" stroke="#C4B8FF" strokeOpacity="0.72"/>
      <path d="M121 329H379" stroke="url(#horizonGlow)" strokeWidth="3" strokeLinecap="round"/>
      <path d="M204 355C224 344 239 338 250 335C261 338 276 344 296 355" stroke="#F6B1CF" strokeOpacity="0.24" strokeWidth="5" strokeLinecap="round"/>
      <circle cx="391" cy="143" r="16" fill="#8C75FF"/><circle cx="103" cy="287" r="12" fill="#FF9EBF"/><circle cx="326" cy="405" r="9" fill="#FFB76B"/><circle cx="170" cy="101" r="7" fill="#9BC4FF"/>
    </svg>
    <div className="absolute inset-[13%] motion-safe:animate-[spin_28s_linear_infinite]" aria-hidden="true"><span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-[#b19dff] shadow-[0_0_20px_6px_rgba(169,145,255,0.65)]" /></div>
    <div className="absolute left-1/2 top-[49%] grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-[#0e1635]/88 text-center shadow-[0_0_44px_rgba(161,139,255,0.34)] backdrop-blur-xl"><div><span className="block text-[10px] font-black tracking-[0.2em] text-[#c6bcff]">운보다</span><strong className="mt-1 block text-3xl font-black tracking-[-0.08em] text-white">나</strong></div></div>
    {[['흐름','left-[5%] top-[18%]'],['관계','right-[2%] top-[39%]'],['선택','bottom-[14%] left-[18%]']].map(([label,pos]) => <span key={label} className={`absolute ${pos} rounded-full border border-white/12 bg-[#111a38]/88 px-3 py-2 text-[11px] font-black text-[#ddd8ff] shadow-lg backdrop-blur-xl`}>{label}</span>)}
    <div className="absolute bottom-[1%] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-[#0b132d]/90 px-4 py-2 text-[10px] font-bold text-[#c8c9db] shadow-lg backdrop-blur">지금 · 관계 · 선택을 한 흐름으로</div>
  </div>;
}

function HeroActions({ state, copy }: { state: LandingState; copy: LandingCopy }) {
  const showDirectFinder = state.kind === "guest" || state.kind === "analysis_ready" || state.kind === "no_profiles" || state.kind === "needs_profile_selection";
  return <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
    <Link href={copy.primaryHref} className="inline-flex min-h-13 items-center justify-center gap-3 rounded-2xl bg-[linear-gradient(135deg,#795cff,#9d78ff)] px-6 py-3.5 text-sm font-black text-white shadow-[0_0_30px_rgba(126,93,255,0.38)] transition hover:-translate-y-0.5 hover:brightness-110">{copy.primary}<Icon name="arrow" /></Link>
    {showDirectFinder ? <Link href="/deep-analysis" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.07] px-6 py-3.5 text-sm font-black text-white backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/10">원하는 분석 바로 찾기<Icon name="search" /></Link> : <Link href={copy.secondaryHref} className="inline-flex min-h-13 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.07] px-6 py-3.5 text-sm font-black text-white backdrop-blur-xl transition hover:bg-white/10">{copy.secondary}</Link>}
  </div>;
}

function QuickRoutes({ state }: { state: LandingState }) {
  const guest = state.kind === "guest";
  const routes = [
    { icon: "spark" as const, title: "무료 분석", detail: "먼저 지금의 나부터", href: guest ? "/guest-saju" : "/saju", tone: "text-[#ff9cae]" },
    { icon: "search" as const, title: "심층 분석", detail: "궁금한 주제로 바로", href: "/deep-analysis", tone: "text-[#a695ff]" },
    { icon: "people" as const, title: "두 사람 궁합", detail: "관계의 차이를 함께", href: "/special-analysis/compatibility", tone: "text-[#ff99cc]" },
    { icon: "folder" as const, title: "구매한 분석", detail: "저장한 리포트 이어보기", href: guest ? "/auth/login?returnTo=/purchased-analyses" : "/purchased-analyses", tone: "text-[#f0c57a]" },
  ];
  return <section className="mx-auto grid w-full max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="운보다 주요 진입 경로">{routes.map(route => <Link key={route.title} href={route.href} className={`group flex items-center gap-4 rounded-[1.45rem] p-4 transition hover:-translate-y-1 hover:border-[#8d7cff]/35 ${glass}`}><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/[0.07] ${route.tone}`}><Icon name={route.icon}/></span><span className="min-w-0"><strong className="block text-sm font-black text-white">{route.title}</strong><span className="mt-1 block text-xs leading-5 text-[#9ea5bc]">{route.detail}</span></span><Icon name="arrow" className="ml-auto h-4 w-4 shrink-0 text-[#707997] transition group-hover:translate-x-1 group-hover:text-[#b8a8ff]"/></Link>)}</section>;
}

function CardScene({ scene }: { scene: "sunset" | "city" | "wealth" | "growth" | "people" | "path" }) {
  if (scene === "sunset") return <div className="absolute inset-x-0 top-0 h-28 overflow-hidden opacity-80"><div className="absolute right-8 top-4 h-16 w-16 rounded-full bg-[#ff8eb3]/40 blur-sm"/><div className="absolute inset-x-0 bottom-0 h-14 bg-[linear-gradient(180deg,transparent,#6f315f55)]"/><div className="absolute bottom-5 left-[12%] right-[10%] h-px bg-[linear-gradient(90deg,transparent,#ffbdd6,transparent)]"/></div>;
  if (scene === "city") return <div className="absolute inset-x-0 top-0 h-28 overflow-hidden opacity-70"><div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_20%,rgba(91,141,255,.34),transparent_45%)]"/><div className="absolute bottom-0 left-[8%] h-12 w-[9%] bg-[#91a8e8]/12"/><div className="absolute bottom-0 left-[20%] h-20 w-[12%] bg-[#91a8e8]/12"/><div className="absolute bottom-0 left-[35%] h-15 w-[8%] bg-[#91a8e8]/12"/><div className="absolute bottom-0 left-[47%] h-24 w-[15%] bg-[#91a8e8]/12"/><div className="absolute bottom-0 left-[66%] h-16 w-[10%] bg-[#91a8e8]/12"/></div>;
  if (scene === "wealth") return <div className="absolute inset-x-0 top-0 h-28 overflow-hidden opacity-75"><div className="absolute right-10 top-4 h-20 w-20 rounded-full bg-[#f3c779]/16 blur-xl"/><span className="absolute right-12 top-10 h-7 w-16 rounded-full border border-[#f1c376]/25"/><span className="absolute right-16 top-16 h-7 w-16 rounded-full border border-[#f1c376]/20"/><span className="absolute right-20 top-[5.5rem] h-7 w-16 rounded-full border border-[#f1c376]/15"/></div>;
  if (scene === "growth") return <div className="absolute inset-x-0 top-0 h-28 overflow-hidden opacity-75"><div className="absolute right-10 top-7 h-20 w-20 rounded-full bg-[#66d4ba]/12 blur-xl"/><div className="absolute right-[18%] top-8 h-16 w-px rotate-[18deg] bg-[#7fe0c7]/30"/><span className="absolute right-[17%] top-8 h-7 w-12 rotate-[-28deg] rounded-[70%_30%_70%_30%] border border-[#7fe0c7]/25"/><span className="absolute right-[21%] top-14 h-7 w-12 rotate-[25deg] rounded-[30%_70%_30%_70%] border border-[#7fe0c7]/20"/></div>;
  if (scene === "people") return <div className="absolute inset-x-0 top-0 h-28 overflow-hidden opacity-75"><div className="absolute right-12 top-5 h-20 w-20 rounded-full bg-[#9e7dff]/15 blur-xl"/><span className="absolute right-24 top-8 h-9 w-9 rounded-full border border-[#ccbaff]/22"/><span className="absolute right-11 top-12 h-9 w-9 rounded-full border border-[#ffabc9]/22"/><span className="absolute right-[4.5rem] top-[4.5rem] h-px w-14 rotate-[-8deg] bg-[linear-gradient(90deg,#ccbaff55,#ffabc955)]"/></div>;
  return <div className="absolute inset-x-0 top-0 h-28 overflow-hidden opacity-80"><div className="absolute right-5 top-0 h-28 w-40 bg-[radial-gradient(ellipse_at_center,rgba(255,143,166,.2),transparent_65%)]"/><svg className="absolute right-5 top-5 h-24 w-44" viewBox="0 0 176 96" fill="none" aria-hidden="true"><path d="M8 88C32 68 47 61 71 57C95 53 107 37 124 29C139 22 153 22 168 7" stroke="#F3A0BD" strokeOpacity="0.35" strokeWidth="6" strokeLinecap="round"/><path d="M8 88C32 68 47 61 71 57C95 53 107 37 124 29C139 22 153 22 168 7" stroke="#B7A4FF" strokeOpacity="0.55" strokeWidth="1.5" strokeLinecap="round"/></svg></div>;
}

function CuriositySection() {
  const items = [
    { icon:"heart" as const,label:"연애",question:"요즘 내 연애, 왜 자꾸 같은 고민이 생길까?",accent:"from-[#7c315e]/52 via-[#401f50]/38 to-[#111833]", scene:"sunset" as const },
    { icon:"briefcase" as const,label:"일 · 커리어",question:"지금 이 선택이 나한테 맞는 방향일까?",accent:"from-[#284a83]/52 via-[#17274d]/42 to-[#111833]", scene:"city" as const },
    { icon:"wallet" as const,label:"재물 · 돈",question:"내 돈의 흐름은 어디에서 막히고 열릴까?",accent:"from-[#78583a]/52 via-[#3d2f38]/38 to-[#111833]", scene:"wealth" as const },
    { icon:"study" as const,label:"학업 · 성장",question:"나는 어떤 방식으로 해야 성과가 날까?",accent:"from-[#194b48]/52 via-[#1a303f]/38 to-[#111833]", scene:"growth" as const },
    { icon:"relation" as const,label:"관계",question:"왜 같은 관계 문제가 반복되는 걸까?",accent:"from-[#513a82]/52 via-[#2f2857]/38 to-[#111833]", scene:"people" as const },
    { icon:"calendar" as const,label:"앞으로의 흐름",question:"지금부터 무엇이 달라지고 언제 움직일까?",accent:"from-[#70415f]/52 via-[#352843]/38 to-[#111833]", scene:"path" as const },
  ];
  return <section className="relative mx-auto w-full max-w-6xl py-16 sm:py-20"><div className="pointer-events-none absolute -left-32 top-16 h-80 w-80 rounded-full bg-[#274b84]/10 blur-3xl"/><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div className="max-w-2xl"><p className="text-xs font-black tracking-[0.16em] text-[#9988ff]">지금 마음에 걸리는 것</p><h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-white sm:text-4xl">요즘, 어떤 게 가장 궁금하세요?</h2><p className="mt-4 text-sm leading-7 text-[#9da5bd] sm:text-base">상품 이름을 먼저 알 필요는 없어요. 마음에 걸리는 질문에서 시작하면 관련 분석을 직접 찾아볼 수 있어요.</p></div><p className="hidden rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-bold text-[#aeb3c6] sm:block">하나만 골라도 괜찮아요</p></div><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(item => <Link key={item.label} href={item.label === "관계" ? "/special-analysis/compatibility" : "/deep-analysis"} className={`group relative min-h-44 overflow-hidden rounded-[1.8rem] border border-white/10 bg-gradient-to-br ${item.accent} p-6 shadow-[0_16px_48px_rgba(0,0,0,0.22)] transition hover:-translate-y-1.5 hover:border-[#a491ff]/40 hover:shadow-[0_22px_60px_rgba(0,0,0,0.32)]`}><CardScene scene={item.scene}/><div className="relative flex items-center justify-between"><span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-[#0d1530]/45 text-[#ddd6ff] backdrop-blur"><Icon name={item.icon}/></span><Icon name="arrow" className="h-4 w-4 text-[#7e86a3] transition group-hover:translate-x-1 group-hover:text-white"/></div><div className="relative mt-6"><p className="text-xs font-black tracking-[0.12em] text-[#b6adea]">{item.label}</p><p className="mt-2 max-w-[18rem] text-lg font-black leading-7 tracking-[-0.025em] text-white">{item.question}</p></div></Link>)}</div></section>;
}

function CompatibilityVisual() {
  return <div className="relative mx-auto h-64 w-full max-w-md sm:h-72" aria-label="서로 다른 두 흐름이 만나고 겹치는 궁합 상징 그래픽">
    <div className="absolute left-[13%] top-[18%] h-44 w-44 rounded-full bg-[#ff88b7]/10 blur-2xl"/><div className="absolute right-[10%] top-[28%] h-40 w-40 rounded-full bg-[#8b7cff]/12 blur-2xl"/>
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 420 280" fill="none" aria-hidden="true">
      <defs><linearGradient id="pairA" x1="55" y1="50" x2="210" y2="225"><stop stopColor="#FF8EBB"/><stop offset="1" stopColor="#B36BAE"/></linearGradient><linearGradient id="pairB" x1="210" y1="45" x2="365" y2="225"><stop stopColor="#B39AFF"/><stop offset="1" stopColor="#6F62D8"/></linearGradient></defs>
      <ellipse cx="155" cy="138" rx="100" ry="73" transform="rotate(-18 155 138)" stroke="url(#pairA)" strokeWidth="7" strokeOpacity="0.56"/>
      <ellipse cx="270" cy="144" rx="96" ry="70" transform="rotate(18 270 144)" stroke="url(#pairB)" strokeWidth="7" strokeOpacity="0.62"/>
      <ellipse cx="155" cy="138" rx="126" ry="91" transform="rotate(28 155 138)" stroke="#FF9BC4" strokeWidth="1.5" strokeOpacity="0.2" strokeDasharray="3 8"/>
      <ellipse cx="270" cy="144" rx="122" ry="89" transform="rotate(-28 270 144)" stroke="#A694FF" strokeWidth="1.5" strokeOpacity="0.24" strokeDasharray="3 8"/>
      <path d="M116 210C156 193 186 188 210 190C238 192 266 201 307 220" stroke="#E7B8E2" strokeOpacity="0.22" strokeWidth="4" strokeLinecap="round"/>
      <circle cx="210" cy="141" r="44" fill="#0E1733" stroke="#B9AAFF" strokeOpacity="0.44"/>
      <circle cx="66" cy="92" r="7" fill="#FF96BE"/><circle cx="350" cy="190" r="7" fill="#9D89FF"/>
    </svg>
    <div className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/15 bg-[#101935]/92 text-[#d6ccff] shadow-[0_0_38px_rgba(157,130,255,0.28)]"><Icon name="people" className="h-8 w-8"/></div>
    <div className="absolute bottom-[4%] left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-[#0e1733]/92 px-4 py-2 text-[10px] font-black text-[#b4bad0]">서로 다른 두 흐름이 만나는 지점</div>
  </div>;
}

function CompatibilitySection() {
  return <section className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-[2.4rem] border border-[#8b75c8]/18 bg-[linear-gradient(135deg,#1b1d3b_0%,#25172f_45%,#171d3b_100%)] px-6 py-9 shadow-[0_22px_75px_rgba(0,0,0,0.28)] sm:px-9 sm:py-11 lg:px-12"><div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#ad6fae]/10 blur-3xl"/><div className="grid items-center gap-8 lg:grid-cols-[1fr_0.9fr]"><div className="relative"><p className="text-xs font-black tracking-[0.16em] text-[#c29cff]">두 사람의 흐름</p><h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-white sm:text-4xl">혼자 보는 사주와<br/>두 사람이 함께 보는 궁합은 달라요.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-[#aab0c7] sm:text-base">몇 점짜리 관계인지보다, 서로 무엇을 다르게 느끼고 어디에서 잘 맞거나 부딪히는지를 살펴봐요.</p><div className="mt-6 flex flex-wrap gap-2 text-xs font-bold text-[#d3cee5]">{["연인 · 배우자","부모 · 자녀","형제 · 자매","가족"].map(label => <span key={label} className="rounded-full border border-white/10 bg-white/[0.055] px-3.5 py-2">{label}</span>)}</div><Link href="/special-analysis/compatibility" className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#7459ed,#9678ff)] px-5 py-3.5 text-sm font-black text-white shadow-[0_0_28px_rgba(117,91,237,0.32)] transition hover:-translate-y-0.5 hover:brightness-110">우리 관계 살펴보기<Icon name="arrow"/></Link></div><CompatibilityVisual/></div></section>;
}

function AiConsultingSection({ state }: { state: LandingState }) {
  const guest = state.kind === "guest";
  const purchasedHref = guest ? "/auth/login?returnTo=/purchased-analyses" : "/purchased-analyses";
  return <section className="relative mx-auto mt-6 w-full max-w-6xl overflow-hidden rounded-[2.4rem] border border-[#5e78c5]/20 bg-[linear-gradient(135deg,#10182f_0%,#171631_48%,#10203a_100%)] px-6 py-9 text-white shadow-[0_20px_70px_rgba(0,0,0,0.28)] sm:px-9 sm:py-10 lg:px-12"><div className="pointer-events-none absolute -right-16 top-0 h-60 w-60 rounded-full bg-[#5578dc]/10 blur-3xl"/><div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center"><div className="relative"><p className="text-xs font-black tracking-[0.16em] text-[#9db1ff]">리포트 다음 질문</p><h2 className="mt-3 text-3xl font-black tracking-[-0.045em] sm:text-4xl">분석을 읽고도<br/>궁금한 게 남는다면?</h2><p className="mt-4 max-w-lg text-sm leading-7 text-[#afb7cf] sm:text-base">운보다 AI 상담은 아무 질문이나 받는 챗봇이 아니라, 구매한 리포트의 범위를 바탕으로 그 다음 질문을 이어가는 상담이에요.</p><Link href={purchasedHref} className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-sm font-black text-[#18172a] transition hover:-translate-y-0.5 hover:bg-[#eeeaff]">구매한 분석에서 이어보기<Icon name="arrow"/></Link></div><div className="relative space-y-3 rounded-[1.8rem] border border-white/10 bg-white/[0.045] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-6"><div className="max-w-[86%] rounded-[1.35rem] rounded-bl-md bg-white/10 px-4 py-3 text-sm leading-6 text-[#eeeefe]">상대와 이야기할 때 왜 자꾸 같은 부분에서 부딪히는 것 같지?</div><div className="ml-auto max-w-[92%] rounded-[1.35rem] rounded-br-md bg-[linear-gradient(135deg,#7158e9,#8b70ff)] px-4 py-3 text-sm leading-6 text-white shadow-[0_12px_30px_rgba(92,70,205,0.25)]">구매한 궁합 리포트에서는 두 사람이 갈등을 받아들이는 방식에 차이가 보여요. 먼저 반복되는 상황을 기준으로 대화 순서를 나눠볼게요.</div><div className="flex items-center gap-2 pt-2 text-xs font-semibold text-[#9da6bd]"><Icon name="check" className="h-4 w-4 text-[#b19fff]"/>구매한 분석 범위 안에서 이어서 질문</div></div></div></section>;
}

function TrustSection() {
  const items = [
    { icon:"spark" as const,step:"01",title:"먼저 무료로",body:"지금의 흐름을 보고 무엇이 더 궁금한지 확인해요." },
    { icon:"search" as const,step:"02",title:"궁금한 곳을 깊게",body:"내 결과에서 이어지는 추천이나 원하는 분석을 골라요." },
    { icon:"chat" as const,step:"03",title:"리포트에서 이어서",body:"유료 리포트를 읽고 남은 질문은 AI 상담으로 이어가요." },
  ];
  return <section className="relative mx-auto w-full max-w-6xl py-16 sm:py-20"><div className="pointer-events-none absolute left-1/2 top-1/2 h-60 w-[70%] -translate-x-1/2 rounded-full bg-[#5748b8]/8 blur-3xl"/><div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black tracking-[0.16em] text-[#9b89ff]">운보다 이용 흐름</p><h2 className="mt-3 text-3xl font-black tracking-[-0.045em] text-white sm:text-4xl">쉽게 들어오고, 필요한 만큼 깊게.</h2></div><p className="max-w-sm text-sm leading-6 text-[#9da4ba]">무료 결과가 출발점이고, 궁금증이 생길 때만 다음 단계로 이어집니다.</p></div><div className="relative mt-10"><div className="absolute left-[10%] right-[10%] top-[2.35rem] hidden h-px bg-[linear-gradient(90deg,transparent,#8f7cff55,#ff9db555,#8f7cff55,transparent)] md:block"/><div className="grid gap-4 md:grid-cols-3">{items.map((item,index)=><div key={item.title} className="relative rounded-[1.8rem] border border-white/10 bg-[#101831]/75 p-6 shadow-[0_14px_42px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-7"><div className="flex items-center justify-between"><span className="relative z-10 grid h-12 w-12 place-items-center rounded-full border border-[#8f7cff]/30 bg-[#211d48] text-[#b6a8ff] shadow-[0_0_22px_rgba(134,108,255,0.2)]"><Icon name={item.icon}/></span><span className="text-xs font-black tracking-[0.14em] text-[#737d9d]">{item.step}</span></div><h3 className="mt-5 text-lg font-black text-white">{item.title}</h3><p className="mt-2 text-sm leading-7 text-[#9da4ba]">{item.body}</p>{index < items.length - 1 ? <span className="absolute -right-4 top-[2rem] z-20 hidden h-8 w-8 place-items-center rounded-full border border-white/10 bg-[#111a36] text-[#a997ff] shadow-lg md:grid"><Icon name="arrow" className="h-4 w-4"/></span> : null}</div>)}</div></div></section>;
}

function Footer() {
  return <footer className="border-t border-white/10 py-7 text-xs text-[#818aa7]"><div className="mx-auto flex w-full max-w-6xl flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div className="max-w-3xl space-y-1.5 leading-5"><p className="font-bold text-[#aeb5ca]">운보다 · 참고용 명리 분석 서비스</p><p>상호 운보다 · 대표자 반희 · 사업자등록번호 201-28-96364</p><p>사업장 소재지 충청남도 천안시 서북구 백석4길 12, 10층 1001-B52호(백석동, 거성캐슬B빌딩)</p><p>고객센터 070-4792-8900 · 공식 지원 이메일 support@unboda.kr</p></div><nav className="flex shrink-0 flex-wrap gap-4" aria-label="서비스 및 법적 문서"><Link href="/support" className="transition hover:text-white">고객지원</Link><Link href="/terms" className="transition hover:text-white">이용약관</Link><Link href="/privacy" className="transition hover:text-white">개인정보처리방침</Link><Link href="/refund" className="transition hover:text-white">환불정책</Link></nav></div></footer>;
}

function StarField() {
  return <><div className="pointer-events-none absolute inset-0 opacity-80 [background-image:radial-gradient(circle_at_12%_18%,rgba(255,255,255,.75)_0_1px,transparent_1.5px),radial-gradient(circle_at_78%_14%,rgba(174,159,255,.8)_0_1px,transparent_1.5px),radial-gradient(circle_at_65%_55%,rgba(255,255,255,.45)_0_1px,transparent_1.5px),radial-gradient(circle_at_28%_72%,rgba(130,165,255,.6)_0_1px,transparent_1.5px)] [background-size:210px_190px,260px_230px,180px_170px,300px_280px]"/><div className="pointer-events-none absolute -left-24 top-44 h-80 w-80 rounded-full bg-[#304a8b]/20 blur-3xl"/><div className="pointer-events-none absolute right-[-10%] top-[-4rem] h-[34rem] w-[34rem] rounded-full bg-[#6b4ed6]/18 blur-3xl"/></>;
}

function HomeShell({ state, copy, returning }: { state: LandingState; copy: LandingCopy; returning?: ReturningLandingState }) {
  const statusLabel = returning ? returning.kind === "analysis_stale" ? "갱신 필요" : returning.kind === "analysis_in_progress" ? "생성 중" : returning.kind === "analysis_complete" && returning.status === "needs_retry" ? "해석 재생성 필요" : "최신 상태" : null;
  return <main className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#070d20_0%,#0b1330_40%,#090f24_100%)] text-white"><StarField/><div className="relative px-5 pb-8 pt-5 sm:px-8 sm:pt-7"><div className="mx-auto w-full max-w-6xl"><Header state={state}/><section className="grid min-h-[520px] items-center gap-8 py-7 lg:min-h-[550px] lg:grid-cols-[0.94fr_1.06fr] lg:py-10"><div className="relative z-10">{returning ? <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-black text-white">{returning.profileLabel}</span><span className="rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-2 text-xs font-bold text-[#b1b6c9]">{statusLabel}</span></div> : <p className="inline-flex items-center gap-2 rounded-full border border-[#8172e6]/30 bg-[#17183a]/75 px-4 py-2 text-xs font-black tracking-[0.08em] text-[#b3a6ff] shadow-[0_0_25px_rgba(111,86,232,0.15)]"><Icon name="spark" className="h-4 w-4"/>{copy.eyebrow}</p>}<h1 className={`${returning ? "mt-4" : "mt-6"} max-w-[38rem] text-[2.75rem] font-black leading-[1.05] tracking-[-0.065em] text-white sm:text-[4.25rem] lg:text-[4.7rem]`}>{copy.title}</h1><p className="mt-6 max-w-xl text-[15px] leading-8 text-[#aeb4c9] sm:text-lg">{copy.description}</p><HeroActions state={state} copy={copy}/>{copy.secondary ? <Link href={copy.secondaryHref} className="mt-4 inline-flex text-xs font-bold text-[#969db5] underline decoration-[#59617b] underline-offset-4 transition hover:text-white">{copy.secondary}</Link> : null}{returning ? <Link href="/deep-analysis" className="ml-4 mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#969db5] underline decoration-[#59617b] underline-offset-4 transition hover:text-white">다른 심층 분석 직접 찾기<Icon name="search" className="h-4 w-4"/></Link> : null}</div><FlowVisual/></section><QuickRoutes state={state}/></div></div><div className="relative px-5 sm:px-8"><CuriositySection/><CompatibilitySection/><AiConsultingSection state={state}/><TrustSection/><Footer/></div></main>;
}

function NewHome({ state, copy }: { state: LandingState; copy: LandingCopy }) { return <HomeShell state={state} copy={copy}/>; }
function ReturningHome({ state, copy }: { state: ReturningLandingState; copy: LandingCopy }) { return <HomeShell state={state} copy={copy} returning={state}/>; }

export default function HomeExperience({ state, copy }: { state: LandingState; copy: LandingCopy }) {
  const returning = state.kind === "analysis_complete" || state.kind === "analysis_stale" || state.kind === "analysis_in_progress";
  return returning ? <ReturningHome state={state} copy={copy}/> : <NewHome state={state} copy={copy}/>;
}
