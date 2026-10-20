"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// This stores only the visitor's display preference. GPS coordinates are never stored.
const PREF_KEY = "unboda.home-weather.use-current.v2";
type Weather = {
  region: string;
  temperatureC: number;
  condition: string;
  symbol: string;
  forecastAt: string;
};

function validWeather(value: unknown, region: "서울" | "내 위치"): value is Weather {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<Weather>;
  return data.region === region
    && typeof data.temperatureC === "number" && Number.isFinite(data.temperatureC)
    && data.temperatureC > -60 && data.temperatureC < 60
    && typeof data.condition === "string" && typeof data.symbol === "string"
    && typeof data.forecastAt === "string";
}

export default function HomeWeatherLine() {
  const [ready, setReady] = useState(false);
  const [useCurrent, setUseCurrent] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "unavailable">("loading");
  const [notice, setNotice] = useState("");
  const [panel, setPanel] = useState<"weather" | "source">("weather");
  const positionRequest = useRef(0);

  const resetToSeoul = useCallback((message = "") => {
    positionRequest.current += 1;
    setUseCurrent(false);
    setCoords(null);
    setLocating(false);
    setNotice(message);
    try { window.localStorage.removeItem(PREF_KEY); } catch { /* Storage optional. */ }
  }, []);

  const locate = useCallback((isAutomatic = false) => {
    if (!navigator.geolocation) {
      resetToSeoul("이 브라우저는 위치 기능을 지원하지 않습니다.");
      setReady(true);
      return;
    }
    const requestId = ++positionRequest.current;
    setLocating(true);
    setNotice("");
    navigator.geolocation.getCurrentPosition(
      ({ coords: position }) => {
        if (requestId !== positionRequest.current) return;
        const lat = Math.round(position.latitude * 50) / 50;
        const lon = Math.round(position.longitude * 50) / 50;
        // The home widget serves domestic forecasts only; do not send raw GPS.
        if (!Number.isFinite(lat) || !Number.isFinite(lon)
            || lat < 33 || lat > 39.5 || lon < 124 || lon > 132) {
          resetToSeoul("국내 위치를 확인할 수 없어 서울 날씨를 표시합니다.");
          setReady(true);
          return;
        }
        setCoords({ lat, lon });
        setUseCurrent(true);
        setLocating(false);
        setReady(true);
        try { window.localStorage.setItem(PREF_KEY, "current"); } catch { /* Optional. */ }
      },
      () => {
        if (requestId !== positionRequest.current) return;
        resetToSeoul(isAutomatic ? "" : "위치 권한이 없거나 위치를 확인할 수 없어 서울로 표시합니다.");
        setReady(true);
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 9000 },
    );
  }, [resetToSeoul]);

  useEffect(() => {
    let cancelled = false;
    let saved = false;
    try { saved = window.localStorage.getItem(PREF_KEY) === "current"; }
    catch { /* Ignore browser storage restrictions. */ }
    if (!saved || !navigator.permissions) {
      setReady(true);
      return;
    }
    // Never show a surprise permission prompt on revisits after revocation.
    void navigator.permissions.query({ name: "geolocation" })
      .then((result) => {
        if (cancelled) return;
        if (result.state === "granted") locate(true);
        else resetToSeoul();
        if (result.state !== "granted") setReady(true);
      })
      .catch(() => { if (!cancelled) { resetToSeoul(); setReady(true); } });
    return () => { cancelled = true; positionRequest.current += 1; };
  }, [locate, resetToSeoul]);

  useEffect(() => {
    if (!ready || (useCurrent && !coords)) return;
    const controller = new AbortController();
    setWeather(null);
    setStatus("loading");
    setPanel("weather");
    const path = "/api/home/weather-summary";
    const isGps = useCurrent && coords !== null;
    void fetch(path, {
      method: isGps ? "POST" : "GET",
      headers: isGps ? { "Content-Type": "application/json" } : undefined,
      body: isGps ? JSON.stringify({ lat: coords.lat, lon: coords.lon }) : undefined,
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => response.ok && response.status !== 204
        ? response.json() as Promise<unknown> : null)
      .then((value) => {
        if (controller.signal.aborted) return;
        if (validWeather(value, isGps ? "내 위치" : "서울")) {
          setWeather(value);
          setStatus("ok");
        } else setStatus("unavailable");
      })
      .catch(() => { if (!controller.signal.aborted) setStatus("unavailable"); });
    return () => controller.abort();
  }, [ready, useCurrent, coords]);

  useEffect(() => {
    if (!weather || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => setPanel(p => p === "weather" ? "source" : "weather"), 7000);
    return () => window.clearInterval(interval);
  }, [weather]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 5500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const display = locating ? "현재 위치 확인 중"
    : notice ? "위치 확인 실패 · 서울 표시"
    : !ready || status === "loading" ? "날씨 확인 중"
    : status === "unavailable" ? "날씨 정보 없음"
    : weather && panel === "weather"
      ? weather.symbol + " " + weather.temperatureC + "°C " + weather.condition
      : "날씨 자료 · MET Norway 예보";

  return (
    <div className="hidden items-center gap-2 rounded-full border border-white/15 bg-white/[0.065] px-3 py-2 text-[11px] font-semibold text-[#e0e4f5] backdrop-blur-lg lg:flex" aria-label="서울 기본 날씨와 내 위치 날씨">
      <span className="shrink-0 font-bold text-white">{useCurrent ? "내 위치" : "서울"}</span>
      <span className="text-white/40">·</span>
      <span className="w-[176px] truncate text-left" title={weather?.forecastAt ? "예보 기준 " + weather.forecastAt : notice}>{display}</span>
      <button
        type="button"
        className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/20 px-2 py-1 text-[10px] text-[#e2ddff] transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b4a5ff]"
        onClick={() => useCurrent ? resetToSeoul() : locate(false)}
        disabled={locating}
        aria-label={useCurrent ? "서울 기본 날씨로 변경" : "현재 위치 사용을 허용하고 날씨 보기"}
        title={useCurrent ? "서울 날씨로 돌아가기" : "내 위치를 허용하면 날씨가 자동으로 변경됩니다"}
      >
        <span aria-hidden="true">⌖</span>{useCurrent ? "서울로" : "내 위치"}
      </button>
      {notice && <span className="sr-only" role="status">{notice}</span>}
    </div>
  );
}
