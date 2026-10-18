"use client";

import { useEffect, useState } from "react";

type DeferredInstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{outcome: "accepted"|"dismissed"}> };

export default function PwaInstallGuide() {
  const [prompt, setPrompt] = useState<DeferredInstallPrompt | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    setIsMobile(/Android|iPhone|iPad|iPod/i.test(ua));
    setIsIos(/iPhone|iPad|iPod/i.test(ua));
    const standalone = window.matchMedia("(display-mode: standalone)").matches
      || ("standalone" in navigator && (navigator as Navigator & {standalone?: boolean}).standalone === true);
    setInstalled(standalone);
    const onPrompt = (event: Event) => { event.preventDefault(); setPrompt(event as DeferredInstallPrompt); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); setHelpOpen(false); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  if (!isMobile || installed) return null;

  async function requestInstall() {
    if (!prompt) { setHelpOpen(true); return; }
    const pending = prompt;
    setPrompt(null);
    try { await pending.prompt(); await pending.userChoice; } catch { setHelpOpen(true); }
  }

  return <div className="relative z-20 mt-4 max-w-xl rounded-xl border border-white/15 bg-white/[0.06] px-4 py-3 text-sm text-white">
    <div className="flex flex-wrap items-center gap-3">
      <span className="min-w-0 flex-1 text-xs text-[#dad6f6]">운보다를 홈 화면에 추가해 앱처럼 이용해 보세요.</span>
      <button type="button" onClick={requestInstall} className="shrink-0 rounded-lg bg-[#8e71fa] px-3 py-2 text-xs font-bold text-white">홈 화면에 추가</button>
    </div>
    {helpOpen ? <div className="mt-3 border-t border-white/15 pt-3 text-xs leading-6 text-[#dad6f6]">
      {isIos ? "iPhone Safari에서 공유 버튼을 누른 후 ‘홈 화면에 추가’를 선택하세요. 다른 브라우저에서는 Safari로 열어 주세요."
        : "Chrome 메뉴(⋮)에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택하세요. 브라우저에 따라 메뉴 이름이 다를 수 있습니다."}
      <button type="button" onClick={() => setHelpOpen(false)} className="ml-3 font-bold text-white underline">닫기</button>
    </div> : null}
  </div>;
}
