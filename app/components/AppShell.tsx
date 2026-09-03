"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Suspense } from "react";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: "home" | "chart" | "spark" | "book" | "user";
};

function NavIcon({ icon }: { icon: NavItem["icon"] }) {
  const paths = {
    home: "M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M9 21v-6h6v6",
    chart: "M4 19V5M4 19h16M7 15l3-4 3 2 4-6",
    spark: "m12 3 1.7 6.3L20 11l-6.3 1.7L12 19l-1.7-6.3L4 11l6.3-1.7L12 3Z",
    book: "M5 4.5A2.5 2.5 0 0 1 7.5 2H19v17H7.5A2.5 2.5 0 0 0 5 21.5Zm0 0V19m0-14.5A2.5 2.5 0 0 1 7.5 7H19",
    user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 9a7 7 0 0 1 14 0",
  } as const;

  return (
    <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[icon]} />
    </svg>
  );
}

const analysisNavItems: NavItem[] = [
  { href: "/saju", label: "내 분석", icon: "home" },
  { href: "/recommendations", label: "추천 분석", icon: "chart" },
  { href: "/deep-analysis", label: "심층 분석", icon: "spark" },
  { href: "/interests", label: "관심 분석", icon: "book" },
  { href: "/purchased-analyses", label: "구매한 분석", icon: "book" },
];

const managementNavItems: NavItem[] = [
  { href: "/mypage", label: "마이페이지", icon: "user" },
];

const mobileNavItems: NavItem[] = [
  { href: "/saju", label: "내 분석", shortLabel: "내 분석", icon: "home" },
  { href: "/recommendations", label: "추천", shortLabel: "추천", icon: "chart" },
  { href: "/deep-analysis", label: "심층", shortLabel: "심층", icon: "spark" },
  { href: "/interests", label: "관심 분석", shortLabel: "관심", icon: "book" },
  { href: "/purchased-analyses", label: "구매한 분석", shortLabel: "구매", icon: "book" },
  { href: "/mypage", label: "마이페이지", shortLabel: "내 정보", icon: "user" },
];

function isActivePath(pathname: string, href: string): boolean {
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
  const [isGuest, setIsGuest] = useState<boolean | null>(null);
  const [hasGuestResult, setHasGuestResult] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/account/status")
      .then((response) => {
        if (!cancelled) setIsGuest(!response.ok);
        return response.ok ? null : fetch("/api/guest-free-analysis");
      })
      .then((response) => {
        if (!cancelled && response) setHasGuestResult(response.ok);
      })
      .catch(() => {
        if (!cancelled) { setIsGuest(true); setHasGuestResult(false); }
      });
    return () => { cancelled = true; };
  }, []);
  const profileId = searchParams.get("profileId") || activeProfileId || null;
  const guestContext = isGuest === true && hasGuestResult;
  const guestOrigin = guestContext ? "guest-result-navigation" : "guest-navigation";
  const recommendationHref = isGuest !== false
    ? `/auth/login?returnTo=/recommendations${guestContext ? "&origin=guest-result-navigation" : "&origin=guest-navigation"}`
    : profileId ? `/recommendations?profileId=${encodeURIComponent(profileId)}` : "/mypage";
  const deepAnalysisHref = profileId ? `/deep-analysis?profileId=${encodeURIComponent(profileId)}` : "/deep-analysis";
  const navigationHref = (item: NavItem): string => {
    if (isGuest === false) return item.href === "/recommendations" ? recommendationHref : item.href === "/deep-analysis" ? deepAnalysisHref : item.href;
    if (item.href === "/saju") return hasGuestResult ? "/guest-result" : "/guest-saju";
    if (item.href === "/recommendations") return recommendationHref;
    if (item.href === "/deep-analysis") return "/deep-analysis";
    return `/auth/login?returnTo=${encodeURIComponent(item.href)}&origin=${guestOrigin}`;
  };
  const navigationItems = (items: NavItem[]) => items.map((item) => ({
    ...item,
    activeHref: item.href,
    href: navigationHref(item),
  }));
  const resolvedAnalysisNavItems = navigationItems(analysisNavItems);
  const resolvedMobileNavItems = navigationItems(mobileNavItems);

  return (
    <div className="min-h-screen bg-[#fbfbfa] text-stone-900">
      <div className="flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 shrink-0 border-r border-stone-200 bg-[#f8f6f1] px-4 py-6 lg:flex lg:flex-col">
          <div className="mb-10">
            <Link href="/" className="text-xl font-bold tracking-tight text-stone-900">운보다</Link>
            <p className="mt-2 text-[11px] leading-5 text-stone-500">AI 명리 분석 플랫폼</p>
          </div>

          <nav aria-label="메인 네비게이션">
            <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.18em] text-stone-400">분석</p>
            <div className="space-y-1">
            {resolvedAnalysisNavItems.map((item) => {
              const active = isActivePath(pathname, item.activeHref);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-[#e8ddc8] text-stone-900"
                      : "text-stone-600 hover:bg-white/70 hover:text-stone-900"
                  }`}
                >
                  <NavIcon icon={item.icon} />{isGuest && item.activeHref !== "/saju" && item.activeHref !== "/deep-analysis" ? <LockIcon /> : null}<span>{item.label}</span>
                </Link>
              );
            })}
            </div>
            <p className="mb-3 mt-9 px-3 text-[10px] font-semibold tracking-[0.18em] text-stone-400">관리</p>
            <div className="space-y-1">
              {managementNavItems.map((item) => {
                const active = isActivePath(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                      active
                        ? "bg-[#e8ddc8] text-stone-900"
                        : "text-stone-600 hover:bg-white/70 hover:text-stone-900"
                    }`}
                  >
                    <NavIcon icon={item.icon} />{isGuest ? <LockIcon /> : null}<span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          <div className="mt-auto border-t border-stone-200 pt-4">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-stone-500">SERVICE</p>
            <p className="mt-2 text-xs leading-5 text-stone-500">
              무료 결과를 바탕으로 필요한 분석을 이어서 살펴보세요.
            </p>
          </div>
        </aside>

        <div className="min-w-0 flex-1 lg:pl-60">
          <header className="flex h-14 items-center justify-between border-b border-stone-200 bg-white px-5 lg:hidden">
            <Link href="/" className="text-lg font-bold tracking-tight text-stone-900">운보다</Link>
            <span className="text-xs font-medium text-stone-500">명리 분석</span>
          </header>
          <div className="pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-0">
            {children}
          </div>
        </div>
      </div>

      <nav
        aria-label="모바일 네비게이션"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-[#f8f4ee]/95 backdrop-blur-sm lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid max-w-md grid-cols-6 gap-1 px-2 py-2">
          {resolvedMobileNavItems.map((item) => {
            const active = isActivePath(pathname, item.activeHref);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex min-h-[56px] flex-col items-center justify-center rounded-xl px-1 py-2 text-[11px] font-semibold transition ${
                  active
                    ? "bg-stone-900 text-white"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                    <NavIcon icon={item.icon} />{isGuest && item.activeHref !== "/saju" && item.activeHref !== "/deep-analysis" ? <LockIcon /> : null}<span>{item.shortLabel ?? item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export default function AppShell({ children, activeProfileId }: { children: ReactNode; activeProfileId?: string | null }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#fbfbfa]" />}>
      <AppShellContent activeProfileId={activeProfileId}>{children}</AppShellContent>
    </Suspense>
  );
}

function LockIcon() {
  return <svg aria-hidden="true" className="h-3 w-3 shrink-0 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
}