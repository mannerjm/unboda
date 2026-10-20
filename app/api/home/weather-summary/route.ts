import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A single fixed city deliberately avoids location permission, visitor IP geolocation,
// browser storage, customer profiles and the checkout/payment code paths.
const SEOUL = { region: "서울", lat: "37.5665", lon: "126.9780" } as const;

type WeatherSummary = {
  region: string;
  temperatureC: number;
  condition: string;
  symbol: string;
  forecastAt: string;
  dustGrade: string | null;
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

async function fetchForecast(): Promise<Pick<WeatherSummary, "temperatureC" | "condition" | "symbol" | "forecastAt"> | null> {
  // MET Norway freely permits commercial use with attribution and a named User-Agent.
  // This endpoint returns a forecast, not a real-time observed temperature.
  const url = new URL("https://api.met.no/weatherapi/locationforecast/2.0/compact");
  url.searchParams.set("lat", SEOUL.lat);
  url.searchParams.set("lon", SEOUL.lon);
  const response = await fetch(url, {
    headers: {
      "User-Agent": "unboda.kr/1.0 (https://unboda.kr)",
      "Accept": "application/json",
    },
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
  const code = item.data?.next_1_hours?.summary?.symbol_code ?? "";
  return {
    temperatureC: Math.round(temperature),
    ...describeWeather(code),
    forecastAt: item.time!,
  };
}

function gradeText(value: unknown): string | null {
  return value === "1" ? "좋음"
    : value === "2" ? "보통"
    : value === "3" ? "나쁨"
    : value === "4" ? "매우 나쁨"
    : null;
}

async function fetchDust(): Promise<Pick<WeatherSummary, "dustGrade" | "dustStation" | "dustObservedAt">> {
  const empty = { dustGrade: null, dustStation: null, dustObservedAt: null };
  // Only enable an approved AirKorea operational key, set privately in Vercel.
  const key = process.env.AIRKOREA_SERVICE_KEY;
  if (!key) return empty;
  const url = new URL("https://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty");
  url.searchParams.set("serviceKey", key);
  url.searchParams.set("returnType", "json");
  url.searchParams.set("numOfRows", "100");
  url.searchParams.set("pageNo", "1");
  url.searchParams.set("sidoName", "서울");
  url.searchParams.set("ver", "1.3");
  const response = await fetch(url, {
    next: { revalidate: 1800 },
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) return empty;
  const json = await response.json() as {
    response?: { body?: { items?: Array<{
      stationName?: string;
      dataTime?: string;
      pm10Grade1h?: string;
      pm10Grade?: string;
    }> } };
  };
  const station = json.response?.body?.items?.find((item) => item.stationName === "중구");
  if (!station || !station.dataTime) return empty;
  const observed = Date.parse(station.dataTime.replace(" ", "T") + "+09:00");
  if (!Number.isFinite(observed) || Math.abs(Date.now() - observed) > 3 * 60 * 60_000) return empty;
  const grade = gradeText(station.pm10Grade1h ?? station.pm10Grade);
  if (!grade) return empty;
  return { dustGrade: grade, dustStation: "중구", dustObservedAt: station.dataTime };
}

export async function GET() {
  try {
    const [forecast, dust] = await Promise.all([
      fetchForecast(),
      fetchDust().catch(() => ({ dustGrade: null, dustStation: null, dustObservedAt: null })),
    ]);
    if (!forecast) return new NextResponse(null, { status: 204 });
    const body: WeatherSummary = { region: SEOUL.region, ...forecast, ...dust };
    return NextResponse.json(body, { headers: { "Cache-Control": "public, s-maxage=1800" } });
  } catch {
    // Never display invented or stale weather; failure must not affect homepage rendering.
    return new NextResponse(null, { status: 204 });
  }
}
