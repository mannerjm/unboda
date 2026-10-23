"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Last approximate location (roughly 1–2 km precision) is stored only in this browser.
const LAST_LOCATION_KEY = "unboda.home-weather.last-location.v3";
type ApproxLocation = { lat: number; lon: number; label: string };
type Weather = {
  region: string;
  temperatureC: number;
  condition: string;
  symbol: string;
  forecastAt: string;
};

function validCoords(value: unknown): value is { lat: number; lon: number } {
  if (!value || typeof value !== "object") return false;
  const p = value as { lat?: unknown; lon?: unknown };
  return typeof p.lat === "number" && Number.isFinite(p.lat) && p.lat >= 33 && p.lat <= 39.5
    && typeof p.lon === "number" && Number.isFinite(p.lon) && p.lon >= 124 && p.lon <= 132;
}

function validStored(value: unknown): value is ApproxLocation {
  if (!validCoords(value)) return false;
  const p = value as ApproxLocation;
  return typeof p.label === "string" && p.label.length > 1 && p.label.length < 25
    && /^[가-힣·\s]+$/.test(p.label);
}

function validWeather(value: unknown): value is Weather {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<Weather>;
  return typeof p.region === "string" && p.region.length > 1 && p.region.length < 25
    && /^[가-힣·\s]+$/.test(p.region)
    && typeof p.temperatureC === "number" && Number.isFinite(p.temperatureC)
    && p.temperatureC > -60 && p.temperatureC < 60
    && typeof p.condition === "string" && typeof p.symbol === "string"
    && typeof p.forecastAt === "string";
}

function coarsen(value: number) {
  return Math.round(value * 50) / 50;
}

/** The region label itself is the location action. No separate Seoul/reset button. */
export default function HomeWeatherLine() {
  const [selected, setSelected] = useState<ApproxLocation | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "unavailable">("loading");
  const [locating, setLocating] = useState(false);
  const [notice, setNotice] = useState("");
  const [panel, setPanel] = useState<"weather" | "source">("weather");
  const requestRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(false);

  const fetchWeather = useCallback(async (position: { lat: number; lon: number } | null, save = false) => {
    const requestId = ++requestRef.current;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus("loading");
    setPanel("weather");
    try {
      const res = await fetch("/api/home/weather-summary", {
        method: position ? "POST" : "GET",
        headers: position ? { "Content-Type": "application/json" } : undefined,
        body: position ? JSON.stringify(position) : undefined,
        cache: "no-store",
        signal: controller.signal,
      });
      if (!res.ok || res.status === 204) throw new Error("weather unavailable");
      const body: unknown = await res.json();
      if (!mountedRef.current || controller.signal.aborted || requestId !== requestRef.current) return false;
      if (!validWeather(body)) throw new Error("invalid weather");
      setWeather(body);
      setStatus("ok");
      if (position) {
        const stored = { ...position, label: body.region };
        setSelected(stored);
        if (save) {
          try { window.localStorage.setItem(LAST_LOCATION_KEY, JSON.stringify(stored)); }
          catch { /* Location is still usable during this visit. */ }
        }
      }
      return true;
    } catch {
      if (mountedRef.current && requestId === requestRef.current && !controller.signal.aborted) {
        setStatus(weather ? "ok" : "unavailable");
        setNotice("지역 날씨를 확인하지 못했습니다.");
      }
      return false;
    }
  }, [weather]);

  useEffect(() => {
    mountedRef.current = true;
    let stored: ApproxLocation | null = null;
    try {
      const text = window.localStorage.getItem(LAST_LOCATION_KEY);
      if (text) {
        const parsed: unknown = JSON.parse(text);
        if (validStored(parsed)) stored = parsed;
      }
    } catch { /* Private browsing: Seoul default. */ }
    if (stored) {
      setSelected(stored);
      void fetchWeather({ lat: stored.lat, lon: stored.lon });
    } else {
      void fetchWeather(null);
    }
    return () => {
      mountedRef.current = false;
      ++requestRef.current;
      controllerRef.current?.abort();
    };
    // One initial load. A location update is handled directly in the click callback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const locate = () => {
    if (!navigator.geolocation) {
      setNotice("위치 기능을 지원하지 않는 브라우저입니다.");
      return;
    }
    setLocating(true);
    setNotice("");
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        if (!mountedRef.current) return;
        const position = { lat: coarsen(coords.latitude), lon: coarsen(coords.longitude) };
        if (!validCoords(position)) {
          setLocating(false);
          setNotice("지원 지역의 위치를 확인하지 못했습니다.");
          return;
        }
        const success = await fetchWeather(position, true);
        if (mountedRef.current) {
          setLocating(false);
          if (!success) setNotice("지역 확인에 실패했습니다. 이전 지역은 유지됩니다.");
        }
      },
      () => {
        if (!mountedRef.current) return;
        setLocating(false);
        setNotice("위치 권한이 없거나 확인하지 못했습니다. 이전 지역은 유지됩니다.");
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 9000 },
    );
  };

  useEffect(() => {
    if (!weather || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setPanel(p => p === "weather" ? "source" : "weather"), 7000);
    return () => window.clearInterval(id);
  }, [weather]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(""), 5500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const regionLabel = weather?.region ?? selected?.label ?? "서울";
  const display = locating ? "현재 위치 확인 중"
    : status === "loading" ? "날씨 확인 중"
    : notice ? notice
    : status === "unavailable" ? "날씨 정보 없음"
    : weather && panel === "weather"
      ? weather.symbol + " " + weather.temperatureC + "°C " + weather.condition
      : "날씨 자료 · MET Norway 예보";

  return (
    <div className="flex w-full min-w-0 items-center gap-2 rounded-full border border-white/15 bg-white/[0.065] px-3 py-2 text-[11px] font-semibold text-[#e0e4f5] backdrop-blur-lg lg:w-auto" aria-label="지역별 날씨 정보">
      <button
        type="button"
        onClick={locate}
        disabled={locating}
        className="inline-flex max-w-[47%] min-w-0 shrink-0 items-center gap-1 whitespace-nowrap rounded text-white transition hover:text-[#c5baff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b4a5ff] lg:max-w-none"
        aria-label={regionLabel + " 지역을 눌러 현재 위치 새로 확인"}
        title="지역명을 누르면 현재 위치를 다시 확인합니다"
      >
        <span className="truncate">{regionLabel}</span><span aria-hidden="true" className="shrink-0 text-[9px] text-[#c2b6ff]">⌄</span>
      </button>
      <span className="text-white/40">·</span>
      <span className="min-w-0 flex-1 truncate text-right lg:w-[164px] lg:flex-none lg:text-left" role="status" title={weather?.forecastAt ? "예보 기준 " + weather.forecastAt : notice}>{display}</span>
      {/* Keep the weather provider and map-data credits next to the feature,
          without placing a long technical notice under the business footer. */}
      <details className="group relative shrink-0">
        <summary
          className="flex h-5 w-5 cursor-pointer list-none items-center justify-center rounded-full border border-white/20 text-[10px] font-black text-[#c9c2ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b4a5ff] [&::-webkit-details-marker]:hidden"
          aria-label="날씨 자료 출처"
          title="날씨 자료 출처"
        >ⓘ</summary>
        <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(19rem,calc(100vw-3rem))] rounded-xl border border-white/20 bg-[#13192e] p-3 text-left text-[11px] font-medium leading-5 text-[#d0d4e5] shadow-2xl">
          날씨: <a href="https://www.met.no/en" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white">MET Norway</a> 예보를 운보다가 한국어로 요약·변경 (<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white">CC BY 4.0</a>)
          <p className="mt-2">지역명: <a href="https://sgis.kostat.go.kr/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white">통계청 2018 행정경계(공공누리 제1유형)</a> 참고</p>
        </div>
      </details>
    </div>
  );
}
