import { NextResponse } from "next/server";
import { DEFAULT_HOME_WEATHER_REGION, getHomeWeatherRegion, type HomeWeatherRegion } from "@/app/lib/homeWeatherRegions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WeatherSummary = {
  regionId: string;
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

function describeWeather(code: string): { condition: string; symbol: string } {
  const text = code.toLowerCase();
  if (text.includes("thunder")) return { condition: "뇌우", symbol: "⛈" };
  if (text.includes("snow")) return { condition: "눈", symbol: "❄" };
  if (text.includes("sleet")) return { condition: "진눈깨비", symbol: "🌨" };
  if (text.includes("rain")) return { condition: "비", symbol: "🌧" };
  if (text.includes("fog")) return { condition: "안개", symbol: "🌫" };
  if (text.includes("partlycloudy")) return { condition: "구름 조금", symbol: "⛅" };
  if (text.includes("cloudy")) return { condition: "흐림", symbol: "☁" };
  if (text.includes("fair")) return { condition: "대체로 맑음", symbol: "🌤" };
  if (text.includes("clearsky")) return { condition: "맑음", symbol: text.includes("night") ? "☾" : "☀" };
  return { condition: "예보", symbol: "☁" };
}

async function fetchForecast(region: HomeWeatherRegion): Promise<Pick<WeatherSummary, "temperatureC" | "condition" | "symbol" | "forecastAt"> | null> {
  const url = new URL("https://api.met.no/weatherapi/locationforecast/2.0/compact");
  url.searchParams.set("lat", region.lat);
  url.searchParams.set("lon", region.lon);
  const response = await fetch(url, {
    headers: { "User-Agent": "unboda.kr/1.0 (https://unboda.kr)", "Accept": "application/json" },
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return null;
  const json = await response.json() as {
    properties?: { timeseries?: Array<{
      time?: string;
      data?: {
        instant?: { details?: { air_temperature?: number } };
        next_1_hours?: { summary?: { symbol_code?: string } };
      };
    }> };
  };
  const entries = json.properties?.timeseries;
  if (!Array.isArray(entries)) return null;
  const now = Date.now();
  const item = entries.find((entry) => {
    if (typeof entry.time !== "string") return false;
    const t = Date.parse(entry.time);
    return Number.isFinite(t) && t >= now - 90 * 60_000 && t <= now + 150 * 60_000
      && typeof entry.data?.instant?.details?.air_temperature === "number";
  });
  if (!item) return null;
  const temperature = item.data?.instant?.details?.air_temperature;
  if (typeof temperature !== "number" || !Number.isFinite(temperature) || temperature < -60 || temperature > 60) return null;
  return {
    temperatureC: Math.round(temperature),
    ...describeWeather(item.data?.next_1_hours?.summary?.symbol_code ?? ""),
    forecastAt: item.time!,
  };
}

function gradeText(value: unknown): string | null {
  return value === "1" ? "좋음" : value === "2" ? "보통" : value === "3" ? "나쁨" : value === "4" ? "매우 나쁨" : null;
}

async function fetchDust(region: HomeWeatherRegion): Promise<Pick<WeatherSummary, "dustGrade" | "dustPm25Grade" | "dustStation" | "dustObservedAt">> {
  const empty = { dustGrade: null, dustPm25Grade: null, dustStation: null, dustObservedAt: null };
  // Never substitute an unrelated measurement station. Only Seoul has a verified station mapping.
  const key = process.env.AIRKOREA_SERVICE_KEY;
  if (!key || !region.airStation) return empty;
  const url = new URL("https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty");
  url.searchParams.set("serviceKey", key);
  url.searchParams.set("returnType", "json");
  url.searchParams.set("numOfRows", "100");
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("sidoName", region.airSido);
  url.searchParams.set("ver", "1.3");
  const response = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(5000) });
  if (!response.ok) return empty;
  const json = await response.json() as {
    response?: { body?: { items?: Array<{
      stationName?: string; dataTime?: string; pm10Grade1h?: string; pm10Grade?: string;
      pm25Grade1h?: string; pm25Grade?: string;
    }> } };
  };
  const station = json.response?.body?.items?.find(item => item.stationName === region.airStation);
  if (!station || !station.dataTime) return empty;
  const observed = Date.parse(station.dataTime.replace(" ", "T") + "+09:00");
  if (!Number.isFinite(observed) || Math.abs(Date.now() - observed) > 3 * 60 * 60_000) return empty;
  const dustGrade = gradeText(station.pm10Grade1h ?? station.pm10Grade);
  const dustPm25Grade = gradeText(station.pm25Grade1h ?? station.pm25Grade);
  if (!dustGrade && !dustPm25Grade) return empty;
  return { dustGrade, dustPm25Grade, dustStation: station.stationName ?? region.airStation, dustObservedAt: station.dataTime };
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("region") ?? DEFAULT_HOME_WEATHER_REGION;
  const region = getHomeWeatherRegion(id);
  if (!region) return NextResponse.json({ error: "지원하지 않는 지역입니다." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  try {
    const [forecast, dust] = await Promise.all([
      fetchForecast(region),
      fetchDust(region).catch(() => ({ dustGrade: null, dustPm25Grade: null, dustStation: null, dustObservedAt: null })),
    ]);
    if (!forecast) return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
    const body: WeatherSummary = { regionId: region.id, region: region.label, ...forecast, ...dust };
    return NextResponse.json(body, { headers: { "Cache-Control": "public, s-maxage=1800" } });
  } catch {
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }
}
