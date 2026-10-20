"use client";

import { useEffect, useState, type ChangeEvent } from "react";
import {
  DEFAULT_HOME_WEATHER_REGION, HOME_WEATHER_REGIONS,
  getHomeWeatherRegion, type HomeWeatherRegionId,
} from "@/app/lib/homeWeatherRegions";

const STORAGE_KEY = "unboda.home-weather.region.v1";

type HomeWeather = {
  regionId: HomeWeatherRegionId;
  region: string;
  temperatureC: number;
  condition: string;
  symbol: string;
  forecastAt: string;
  dustGrade: string | null;
  dustPm25Grade: string | null;
  dustStation: string | null;
  dustObservedAt: string | null;
};

function validWeather(value: unknown, id: HomeWeatherRegionId): value is HomeWeather {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<HomeWeather>;
  const region = getHomeWeatherRegion(id);
  return !!region && item.regionId === id && item.region === region.label
    && typeof item.temperatureC === "number" && Number.isFinite(item.temperatureC)
    && item.temperatureC > -60 && item.temperatureC < 60
    && typeof item.condition === "string"
    && typeof item.symbol === "string"
    && typeof item.forecastAt === "string";
}

/** Informational-only header; no account, birth profile, checkout or GPS data. */
export default function HomeWeatherLine() {
  const [regionId, setRegionId] = useState<HomeWeatherRegionId>(DEFAULT_HOME_WEATHER_REGION);
  const [ready, setReady] = useState(false);
  const [weather, setWeather] = useState<HomeWeather | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "unavailable">("loading");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const region = getHomeWeatherRegion(saved);
      if (region) setRegionId(region.id);
    } catch { /* Browser storage disabled: Seoul fallback. */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const controller = new AbortController();
    setWeather(null); // Never show previous city data during a change.
    setState("loading");
    void fetch("/api/home/weather-summary?region=" + encodeURIComponent(regionId), {
      cache: "no-store", signal: controller.signal,
    })
      .then(async (response) => response.ok && response.status !== 204
        ? response.json() as Promise<unknown> : null)
      .then((value) => {
        if (controller.signal.aborted) return;
        if (validWeather(value, regionId)) { setWeather(value); setState("ok"); }
        else setState("unavailable");
      })
      .catch(() => { if (!controller.signal.aborted) setState("unavailable"); });
    return () => controller.abort();
  }, [ready, regionId]);

  const selectRegion = (event: ChangeEvent<HTMLSelectElement>) => {
    const region = getHomeWeatherRegion(event.target.value);
    if (!region) return;
    setRegionId(region.id);
    try { window.localStorage.setItem(STORAGE_KEY, region.id); }
    catch { /* Keep selected region in memory this session. */ }
  };

  return (
    <div className="hidden items-center gap-1.5 whitespace-nowrap rounded-full border border-white/15 bg-white/[0.065] px-2.5 py-2 text-[11px] font-semibold text-[#e0e4f5] backdrop-blur-lg lg:flex" aria-label="선택 지역 날씨 예보 및 미세먼지 정보">
      <select
        aria-label="날씨 지역 변경"
        title="지역 선택 (대표 도시 기준)"
        className="max-w-[99px] cursor-pointer rounded bg-transparent text-[11px] font-bold text-white outline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#b4a5ff] [&>option]:bg-[#152043] [&>option]:text-white"
        value={regionId} onChange={selectRegion}
      >
        {HOME_WEATHER_REGIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <span aria-hidden="true" className="text-white/40">·</span>
      {state === "loading" && <span role="status">날씨 확인 중</span>}
      {state === "unavailable" && <span role="status">날씨 정보 없음</span>}
      {state === "ok" && weather && (
        <>
          <span aria-hidden="true">{weather.symbol}</span>
          <span title={weather.forecastAt + " 기준 예보"}>{weather.temperatureC}°C</span>
          <span>{weather.condition}</span>
          <span aria-hidden="true" className="text-white/40">·</span>
          {weather.dustGrade
            ? <span title={(weather.dustStation ?? weather.region) + " 측정소 " + (weather.dustObservedAt ?? "") + " 관측"}>미세먼지 {weather.dustGrade}</span>
            : <a href="https://www.airkorea.or.kr/" target="_blank" rel="noopener noreferrer" className="text-[#d9d3ff] underline underline-offset-2" title="전국 실시간 대기정보에서 선택 지역 확인">미세먼지 확인 ↗</a>}
          {weather.dustPm25Grade && <span>· 초미세먼지 {weather.dustPm25Grade}</span>}
        </>
      )}
    </div>
  );
}
