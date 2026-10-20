"use client";

import { useEffect, useState } from "react";

type HomeWeather = {
  region: string;
  temperatureC: number;
  condition: string;
  symbol: string;
  forecastAt: string;
  dustGrade: string | null;
  dustStation: string | null;
  dustObservedAt: string | null;
};

function validWeather(value: unknown): value is HomeWeather {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<HomeWeather>;
  return item.region === "서울"
    && typeof item.temperatureC === "number"
    && Number.isFinite(item.temperatureC)
    && item.temperatureC > -60
    && item.temperatureC < 60
    && typeof item.condition === "string"
    && typeof item.symbol === "string"
    && typeof item.forecastAt === "string";
}

/** Informational-only header badge. It never reads location, account or checkout data. */
export default function HomeWeatherLine() {
  const [weather, setWeather] = useState<HomeWeather | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/home/weather-summary", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => res.ok && res.status !== 204 ? res.json() as Promise<unknown> : null)
      .then((value) => {
        if (!controller.signal.aborted && validWeather(value)) setWeather(value);
      })
      .catch(() => { /* Fail closed: keep the existing header intact. */ });

    return () => controller.abort();
  }, []);

  if (!weather) return null;

  return (
    <div
      className="hidden items-center gap-1.5 whitespace-nowrap rounded-full border border-white/15 bg-white/[0.065] px-3 py-2 text-[11px] font-semibold text-[#e0e4f5] backdrop-blur-lg lg:flex"
      aria-label="서울 날씨 예보 및 미세먼지 정보"
    >
      <span className="font-bold text-white">{weather.region}</span>
      <span aria-hidden="true" className="text-white/40">·</span>
      <span aria-hidden="true">{weather.symbol}</span>
      <span>{weather.temperatureC}°C</span>
      <span>{weather.condition}</span>
      <span aria-hidden="true" className="text-white/40">·</span>
      <span>미세먼지 {weather.dustGrade ?? "정보 없음"}</span>
      <a
        href="https://api.met.no/"
        target="_blank"
        rel="noopener noreferrer"
        className="ml-1 text-[10px] font-normal text-[#b9b6e9] underline-offset-2 hover:underline"
        title="날씨는 실측이 아닌 MET Norway 예보이며, 기온·날씨 시각은 예보 기준입니다. 미세먼지는 제공되는 경우 에어코리아 중구 측정소 기준입니다."
      >
        MET 예보
      </a>
      <a
        href="https://creativecommons.org/licenses/by/4.0/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[9px] font-normal text-[#aaa3d4] underline-offset-2 hover:underline"
        title="MET Norway 날씨 예보를 운보다가 한국어로 요약하여 제공 · CC BY 4.0"
      >CC BY</a>
      {weather.dustGrade && (
        <a
          href="https://www.airkorea.or.kr/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] font-normal text-[#aaa3d4] underline-offset-2 hover:underline"
          title="미세먼지: 에어코리아 서울 중구 측정소"
        >에어코리아</a>
      )}
    </div>
  );
}
