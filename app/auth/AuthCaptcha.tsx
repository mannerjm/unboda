"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

export const AUTH_CAPTCHA_ENABLED =
  process.env.NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED === "true";

const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

type TurnstileWidgetOptions = {
  sitekey: string;
  theme: "light";
  size: "flexible";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileWidgetOptions) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type AuthCaptchaProps = {
  onToken: (token: string | null) => void;
  resetSignal?: number;
};

export function AuthCaptcha({ onToken, resetSignal = 0 }: AuthCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [scriptReady, setScriptReady] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!AUTH_CAPTCHA_ENABLED) return;
    if (window.turnstile) setScriptReady(true);
  }, []);

  useEffect(() => {
    if (
      !AUTH_CAPTCHA_ENABLED
      || !TURNSTILE_SITE_KEY
      || !scriptReady
      || !containerRef.current
      || !window.turnstile
      || widgetIdRef.current
    ) {
      return;
    }

    const api = window.turnstile;
    widgetIdRef.current = api.render(containerRef.current, {
      sitekey: TURNSTILE_SITE_KEY,
      theme: "light",
      size: "flexible",
      callback: (token) => onTokenRef.current(token),
      "expired-callback": () => onTokenRef.current(null),
      "error-callback": () => onTokenRef.current(null),
    });

    return () => {
      const widgetId = widgetIdRef.current;
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
      widgetIdRef.current = null;
    };
  }, [scriptReady]);

  useEffect(() => {
    if (!AUTH_CAPTCHA_ENABLED || resetSignal === 0) return;
    const widgetId = widgetIdRef.current;
    if (widgetId && window.turnstile) {
      window.turnstile.reset(widgetId);
      onTokenRef.current(null);
    }
  }, [resetSignal]);

  if (!AUTH_CAPTCHA_ENABLED) return null;

  if (!TURNSTILE_SITE_KEY) {
    return (
      <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
        보안 확인 설정이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <Script
        id="auth-turnstile-script"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() => setScriptFailed(true)}
      />
      <div ref={containerRef} className="min-h-[65px] w-full" />
      {scriptFailed ? (
        <p role="alert" className="text-xs leading-5 text-red-700">
          보안 확인을 불러오지 못했습니다. 네트워크 상태를 확인한 뒤 새로고침해 주세요.
        </p>
      ) : (
        <p className="text-xs leading-5 text-stone-500">
          자동화된 접근을 막기 위한 보안 확인입니다.
        </p>
      )}
    </div>
  );
}
