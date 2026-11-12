"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Suspense } from "react";
import type { ReactNode } from "react";
import MonthlyFreeAnalysisRefreshNotice from "@/app/components/MonthlyFreeAnalysisRefreshNotice";
import BrandMark from "@/app/components/BrandMark";

type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: "home" | "chart" | "spark" | "compass" | "book" | "user" | "chat" | "sun";
};

function NavIcon({ icon }: { icon: NavItem["icon"] }) {
  const paths = {
    home: "M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M9 21v-6h6v6",
    sun: "M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z",
    chart: "M4 19V5M4 19h16M7 15l3-4 3 2 4-6",
    spark: "m12 3 1.7 6.3L20 11l-6.3 1.7L12 19l-1.7-6.3L4 11l6.3-1.7L12 3Z",
    compass: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Zm3.5-13.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z",
    book: "M5 4.5A2.5 2.5 0 0 1 7.5 2H19v17H7.5A2.5 2.5 0 0 0 5 21.5Zm0 0V19m0-14.5A2.5 2.5 0 0 1 7.5 7H19",
    user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0",
    chat: "M4 5h16v11H9l-5 4V5Z",
  } as const;

  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[icon]} />
    </svg>
  );
}

const analysisNavItems: NavItem[] = [
  { href: "/today", label: "오늘의 운보다", icon: "sun" },
  { href: "/saju", label: "내 분석", icon: "home" },
  { href: "/recommendations", label: "추천 분석", icon: "chart" },
  { href: "/deep-analysis", label: "심층 분석", icon: "spark" },
  { href: "/special-analysis", label: "전문 분석", icon: "compass" },
  { href: "/interests", label: "관심 분석", icon: "book" },
  { href: "/purchased-analyses", label: "구매한 분석", icon: "book" },
  { href: "/ai-consulting", label: "AI 상담", icon: "chat" },
];


// Navigation-only launch categories. The canonical registry still governs
// product membership, current edition ownership, pricing and eligibility.
const deepTopicMenu = [
  { category: "growth", label: "학업·성장운" },
  { category: "business", label: "사업운" },
  { category: "health", label: "건강운" },
  { category: "money", label: "재물운" },
  { category: "career", label: "직업운" },
  { category: "social", label: "대인관계운" },
  { category: "relationship", label: "연애운" },
] as const;

const deepPeriodMenu = [
  { productId: "monthly-current", label: "이번달 운" },
  { productId: "monthly-next", label: "다음달 운" },
  { productId: "yearly-current", label: "올해 흐름 종합 분석" },
  { productId: "annual-next", label: "내년 운" },
  { productId: "annual-3years", label: "향후 3년 운" },
  { productId: "daeun-current", label: "대운·10년 흐름" },
  { productId: "lifetime-overview", label: "평생운" },
] as const;

const managementNavItems: NavItem[] = [
  { href: "/mypage", label: "마이페이지", icon: "user" },
  { href: "/support", label: "고객지원 센터", icon: "book" },
];

const mobileNavItems: NavItem[] = [
  { href: "/saju", label: "내 분석", shortLabel: "내 분석", icon: "home" },
  { href: "/recommendations", label: "추천", shortLabel: "추천", icon: "chart" },
  { href: "/deep-analysis", label: "심층", shortLabel: "심층", icon: "spark" },
  { href: "/special-analysis", label: "전문 분석", shortLabel: "전문", icon: "compass" },
  { href: "/ai-consulting", label: "AI 상담", shortLabel: "AI 상담", icon: "chat" },
  { href: "/purchased-analyses", label: "구매한 분석", shortLabel: "구매", icon: "book" },
  { href: "/mypage", label: "마이페이지", shortLabel: "내 정보", icon: "user" },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/saju" && pathname.startsWith("/result")) {
    return true;
  }

  if (href === "/purchased-analyses" && pathname.startsWith("/paid-analysis/")) {
    return true;
  }

  if (href === "/mypage" && pathname.startsWith("/account")) {
    return true;
  }

  if (href.startsWith("/result#")) {
    return pathname.startsWith("/result");
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function AppShellContent({ children, activeProfileId }: { children: ReactNode; activeProfileId?: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // My Page mounts AppShell only after its authenticated account-status gate succeeds.
  // Seed that known state so a fast first click cannot be misrouted through a Guest login link.
  const [isGuest, setIsGuest] = useState<boolean | null>(pathname === "/mypage" ? false : null);
  const [hasGuestResult, setHasGuestResult] = useState(false);
  const [aiCreditBalance, setAiCreditBalance] = useState<number | null>(null);
  const [aiCreditBalanceError, setAiCreditBalanceError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/account/status")
      .then((response) => {
        if (cancelled) return null;
        if (response.ok) {
          setIsGuest(false);
          return null;
        }
        if (response.status === 401) {
          setIsGuest(true);
          return fetch("/api/guest-free-analysis");
        }
        // A transient server failure is not proof that the browser session is signed out.
        setIsGuest(null);
        setHasGuestResult(false);
        return null;
      })
      .then((response) => {
        if (!cancelled && response) setHasGuestResult(response.ok);
      })
      .catch(() => {
        if (!cancelled) {
          // Keep auth unresolved on network errors. Protected destinations verify auth server-side.
          setIsGuest(null);
          setHasGuestResult(false);
        }
      });
    return () => { cancelled = true; };
  }, []);

  const profileId = searchParams.get("profileId") || activeProfileId || null;

  useEffect(() => {
    let cancelled = false;

    if (pathname !== "/mypage" || isGuest !== false || !profileId) {
      setAiCreditBalance(null);
      setAiCreditBalanceError(false);
      return () => { cancelled = true; };
    }

    setAiCreditBalance(null);
    setAiCreditBalanceError(false);
    void fetch(`/api/ai-consulting/credits/balance?profileId=${encodeURIComponent(profileId)}`)
      .then(async (response) => {
        const body = await response.json().catch(() => null) as { balance?: number } | null;
        if (cancelled) return;
        if (!response.ok || typeof body?.balance !== "number") {
          setAiCreditBalanceError(true);
          return;
        }
        setAiCreditBalance(Math.max(0, body.balance));
      })
      .catch(() => {
        if (!cancelled) setAiCreditBalanceError(true);
      });

    return () => { cancelled = true; };
  }, [isGuest, pathname, profileId]);

  const guestContext = isGuest === true && hasGuestResult;
  const guestOrigin = guestContext ? "guest-result-navigation" : "guest-navigation";
  const recommendationHref = isGuest === true
    ? "/recommendations"
    : profileId
      ? `/recommendations?profileId=${encodeURIComponent(profileId)}`
      : isGuest === false
        ? "/mypage"
        : "/recommendations";
  const deepAnalysisHref = profileId ? `/deep-analysis?profileId=${encodeURIComponent(profileId)}` : "/deep-analysis";
  const isDeepCatalog = pathname === "/deep-analysis";
  const selectedDeepMode = searchParams.get("mode") === "period" ? "period" : "topic";
  const selectedDeepCategory = searchParams.get("category") || "money";
  const selectedDeepProduct = searchParams.get("productId");
  const deepCatalogHref = (mode: "topic" | "period", id: string): string => {
    const key = mode === "topic" ? "category" : "productId";
    const profilePart = profileId ? `&profileId=${encodeURIComponent(profileId)}` : "";
    return `/deep-analysis?mode=${mode}&${key}=${encodeURIComponent(id)}${profilePart}`;
  };
  const navigationHref = (item: NavItem): string => {
    if (isGuest === true) {
      if (item.href === "/saju") return hasGuestResult ? "/guest-result" : "/guest-saju";
      if (item.href === "/recommendations") return "/recommendations";
      if (item.href === "/deep-analysis") return "/deep-analysis";
      // A guest may browse professional products before choosing an analysis.
      // Product start, login, profile ownership and checkout remain server-gated.
      if (item.href === "/special-analysis") return "/special-analysis";
      return `/auth/login?returnTo=${encodeURIComponent(item.href)}&origin=${guestOrigin}`;
    }

    // While auth is unresolved, use canonical destinations instead of manufacturing a login URL.
    // Their server boundaries remain authoritative and redirect real Guests when necessary.
    if (item.href === "/saju") return "/saju";
    if (item.href === "/recommendations") return recommendationHref;
    if (item.href === "/deep-analysis") return deepAnalysisHref;
    return item.href;
  };
  const navigationItems = (items: NavItem[]) => items.map((item) => ({
    ...item,
    activeHref: item.href,
    href: navigationHref(item),
  }));
  const resolvedAnalysisNavItems = navigationItems(analysisNavItems);
  const resolvedMobileNavItems = navigationItems(mobileNavItems);
  const aiCreditBalanceLabel = aiCreditBalanceError
    ? "확인 불가"
    : aiCreditBalance === null
      ? "확인 중"
      : `${aiCreditBalance}회`;
  const refreshNoticeSurface = pathname === "/result"
    ? "result"
    : pathname === "/mypage" || pathname === "/recommendations"
      ? "compact"
      : null;

  return (
    <div className="unboda-detail-theme min-h-screen bg-[#f5f7fc] text-[#11162d]">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 shrink-0 overflow-y-auto border-r border-[#e9ddf6] bg-[linear-gradient(170deg,#ffffff_0%,#f8f3ff_52%,#efe7ff_100%)] px-4 py-6 text-[#281744] shadow-[8px_0_30px_rgba(111,74,169,0.07)] lg:flex lg:flex-col">
          <div className="mb-10">
            <Link href="/" className="inline-flex items-center gap-2.5 text-xl font-black tracking-tight text-[#281744]"><BrandMark />운보다</Link>
            <p className="mt-3 text-[11px] leading-5 text-[#76688c]">AI 명리 분석 플랫폼</p>
          </div>

          <nav aria-label="메인 네비게이션">
            <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.18em] text-[#8a6eb3]">매일 이용</p>
            <div className="space-y-1">
            {resolvedAnalysisNavItems.map((item) => {
              const active = isActivePath(pathname, item.activeHref);

              return (
                <div key={item.activeHref}>
                  {item.activeHref === "/saju" || item.activeHref === "/interests" ? (
                    <p className="mb-3 mt-6 px-3 text-[10px] font-semibold tracking-[0.14em] text-[#8a73b1]">
                      {item.activeHref === "/saju" ? "사주 · 분석" : "나의 분석 · 상담"}
                    </p>
                  ) : null}
                <Link
                  key={item.href}
                  href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-[linear-gradient(135deg,#f0e6ff,#e3d5ff)] text-[#5a2bad] shadow-[0_5px_15px_rgba(133,82,208,.12)] ring-1 ring-inset ring-[#cab0ef]"
                      : item.activeHref === "/ai-consulting"
                        ? "bg-[linear-gradient(135deg,#f4eaff,#ece2ff)] text-[#6833b1] ring-1 ring-inset ring-[#ddc8f6] hover:bg-[#e8d8ff] hover:text-[#4a218a]"
                        : "text-[#605372] hover:bg-white/80 hover:text-[#6033ad]"
                  }`}
                >
                  <NavIcon icon={item.icon} />{isGuest && item.activeHref !== "/saju" && item.activeHref !== "/recommendations" && item.activeHref !== "/deep-analysis" && item.activeHref !== "/special-analysis" ? <LockIcon /> : null}<span>{item.label}</span>
                  {item.activeHref === "/ai-consulting" ? <span className="ml-auto rounded-full border border-[#8f7cff]/30 bg-[#eee3ff] px-2 py-0.5 text-[9px] font-black tracking-[0.08em] text-[#7543b4]">이어가기</span> : null}
                </Link>
                {item.activeHref === "/special-analysis" && pathname.startsWith("/special-analysis") ? (
                  <div className="mb-3 ml-4 mt-2 space-y-1 border-l border-[#d8c2f1] pl-3" aria-label="전문 분석 하위 메뉴">
                    <Link
                      href="/special-analysis/compatibility"
                      aria-current={pathname.startsWith("/special-analysis/compatibility") ? "page" : undefined}
                      className={`block rounded-lg px-2.5 py-2.5 text-sm font-semibold leading-5 transition ${pathname.startsWith("/special-analysis/compatibility") ? "bg-[#e9d9ff] text-[#602ea8]" : "text-[#6b5a80] hover:bg-white/80 hover:text-[#6033ad]"}`}
                    >
                      궁합
                    </Link>
                  </div>
                ) : null}
                {item.activeHref === "/deep-analysis" && isDeepCatalog ? (
                  <div className="mb-3 ml-4 mt-2 space-y-1 border-l border-[#d8c2f1] pl-3" aria-label="심층분석 주제별 및 기간별 메뉴">
                    <p className="px-2 pb-1 pt-1 text-[11px] font-black tracking-wide text-[#8d6aa9]">주제별 분석</p>
                    {deepTopicMenu.map(({ category, label }) => {
                      const selected = selectedDeepMode === "topic" && selectedDeepCategory === category;
                      return (
                        <Link key={category} href={deepCatalogHref("topic", category)} aria-current={selected ? "page" : undefined}
                          className={`block rounded-lg px-2.5 py-2.5 text-sm font-semibold leading-5 transition ${selected ? "bg-[#e9d9ff] text-[#602ea8]" : "text-[#6b5a80] hover:bg-white/80 hover:text-[#6033ad]"}`}>
                          {label}
                        </Link>
                      );
                    })}
                    <p className="px-2 pb-1 pt-3 text-[11px] font-black tracking-wide text-[#8d6aa9]">기간별 분석</p>
                    {deepPeriodMenu.map(({ productId, label }) => {
                      const selected = selectedDeepMode === "period" && selectedDeepProduct === productId;
                      return (
                        <Link key={productId} href={deepCatalogHref("period", productId)} aria-current={selected ? "page" : undefined}
                          className={`block rounded-lg px-2.5 py-2.5 text-sm font-semibold leading-5 transition ${selected ? "bg-[#e9d9ff] text-[#602ea8]" : "text-[#6b5a80] hover:bg-white/80 hover:text-[#6033ad]"}`}>
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
                </div>
              );
            })}
            </div>
            <p className="mb-3 mt-9 px-3 text-[10px] font-semibold tracking-[0.18em] text-[#8a6eb3]">계정 · 고객지원</p>
            <div className="space-y-1">
              {managementNavItems.map((item) => {
                const active = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                      active
                        ? "bg-[linear-gradient(135deg,#f0e6ff,#e3d5ff)] text-[#5a2bad] shadow-[0_5px_15px_rgba(133,82,208,.12)] ring-1 ring-inset ring-[#cab0ef]"
                        : "text-[#605372] hover:bg-white/80 hover:text-[#6033ad]"
                    }`}
                  >
                    <NavIcon icon={item.icon} />{isGuest && item.href === "/mypage" ? <LockIcon /> : null}<span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
            {pathname === "/mypage" && isGuest === false && profileId ? (
              <div className="mx-1 mt-3 flex items-center justify-between rounded-xl border border-[#e3d4f6] bg-white/85 px-3 py-2.5">
                <span className="text-xs font-medium text-[#716284]">AI 질문권</span>
                <strong className="text-sm text-[#593098]">{aiCreditBalanceLabel}</strong>
              </div>
            ) : null}
          </nav>

          <div className="mt-auto border-t border-[#e4d8f2] pt-4">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-[#8b70ac]">SERVICE</p>
            <p className="mt-2 text-xs leading-5 text-[#706182]">
              무료 결과를 바탕으로 필요한 분석을 이어서 살펴보세요.
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex-1 lg:pl-60">
          <header className="flex h-14 items-center justify-between border-b border-[#e4d5f4] bg-white/95 px-5 text-[#281744] lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2 text-lg font-black tracking-tight text-[#281744]"><BrandMark />운보다</Link>
            {pathname === "/mypage" && isGuest === false && profileId ? (
              <span className="rounded-full border border-[#e6d7fa] bg-[#f4ebff] px-3 py-1 text-xs font-semibold text-[#65449b]">AI 질문권 {aiCreditBalanceLabel}</span>
            ) : (
              <Link href={isGuest === true ? "/auth/login?returnTo=/today" : "/today"} className="rounded-full border border-[#d6c0f3] bg-[#f2e8ff] px-3 py-1.5 text-xs font-bold text-[#6940a4]">오늘의 운보다</Link>
            )}
          </header>
          <div className="pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
            {isGuest === false && profileId && refreshNoticeSurface ? (
              <MonthlyFreeAnalysisRefreshNotice profileId={profileId} surface={refreshNoticeSurface} />
            ) : null}
            {children}
          </div>
        </div>
      </div>

      <nav
        aria-label="모바일 네비게이션"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e0d1f3] bg-white/95 text-[#3c2859] shadow-[0_-8px_28px_rgba(98,65,154,.09)] backdrop-blur-md lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid max-w-lg grid-cols-7 gap-1 px-2 py-2">
          {resolvedMobileNavItems.map((item) => {
            const active = isActivePath(pathname, item.activeHref);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex min-h-[56px] flex-col items-center justify-center rounded-xl px-1 py-2 text-[11px] font-semibold transition ${
                  active
                    ? "bg-[linear-gradient(135deg,#7b4de4,#9c72f2)] text-white shadow-[0_8px_24px_rgba(111,92,231,0.22)]"
                    : item.activeHref === "/ai-consulting"
                      ? "bg-[#f1e8ff] text-[#6842a5] hover:bg-[#e5d8ff] hover:text-[#4f288e]"
                      : "text-[#6a5c7f] hover:bg-[#f3ecff] hover:text-[#6033ad]"
                }`}
              >
                    <NavIcon icon={item.icon} />{isGuest && item.activeHref !== "/saju" && item.activeHref !== "/recommendations" && item.activeHref !== "/deep-analysis" && item.activeHref !== "/special-analysis" ? <LockIcon /> : null}<span>{item.shortLabel ?? item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function AppShell({ children, activeProfileId, seoFallback }: { children: ReactNode; activeProfileId?: string | null; seoFallback?: ReactNode }) {
  return (
    <Suspense fallback={seoFallback ?? <div className="min-h-screen bg-[#f5f7fc]" />}>
      <AppShellContent activeProfileId={activeProfileId}>{children}</AppShellContent>
    </Suspense>
  );
}

function LockIcon() {
  return <svg aria-hidden="true" className="h-3 w-3 shrink-0 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
}
