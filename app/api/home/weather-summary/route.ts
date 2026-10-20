import { NextResponse } from "next/server";
import { getHomeWeatherRegion, DEFAULT_HOME_WEATHER_REGION } from "@/app/lib/homeWeatherRegions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Weather = {
  region: string;
  temperatureC: number;
  condition: string;
  symbol: string;
  forecastAt: string;
};

function describeWeather(code: string): Pick<Weather, "condition" | "symbol"> {
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

async function fetchForecast(lat: number, lon: number, region: string): Promise<Weather | null> {
  const url = new URL("https://api.met.no/weatherapi/locationforecast/2.0/compact");
  // Round to two decimal places to limit outgoing precision and improve upstream cache reuse.
  url.searchParams.set("lat", lat.toFixed(2));
  url.searchParams.set("lon", lon.toFixed(2));
  const response = await fetch(url, {
    headers: { "User-Agent": "unboda.kr/1.0 (https://unboda.kr)", Accept: "application/json" },
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
  const now = Date.now();
  const item = json.properties?.timeseries?.find((entry) => {
    const t = typeof entry.time === "string" ? Date.parse(entry.time) : NaN;
    return Number.isFinite(t) && t >= now - 90 * 60_000 && t <= now + 150 * 60_000
      && typeof entry.data?.instant?.details?.air_temperature === "number";
  });
  const temp = item?.data?.instant?.details?.air_temperature;
  if (!item?.time || typeof temp !== "number" || !Number.isFinite(temp) || temp < -60 || temp > 60) return null;
  return {
    region,
    temperatureC: Math.round(temp),
    ...describeWeather(item.data?.next_1_hours?.summary?.symbol_code ?? ""),
    forecastAt: item.time,
  };
}

function noForecast() { return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } }); }

// Default API remains Seoul to avoid changing homepage behavior before permission.
export async function GET() {
  const seoul = getHomeWeatherRegion(DEFAULT_HOME_WEATHER_REGION)!;
  try {
    const weather = await fetchForecast(Number(seoul.lat), Number(seoul.lon), "서울");
    return weather
      ? NextResponse.json(weather, { headers: { "Cache-Control": "public, s-maxage=1800" } })
      : noForecast();
  } catch { return noForecast(); }
}

// Approximate, non-persistent browser position is sent only after visitor permission.
export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length") ?? "0") > 256) {
      return NextResponse.json({ error: "요청이 너무 큽니다." }, { status: 413 });
    }
    const raw = await request.text();
    if (raw.length > 256) return NextResponse.json({ error: "요청이 너무 큽니다." }, { status: 413 });
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return NextResponse.json({ error: "위치가 올바르지 않습니다." }, { status: 400 });
    const position = data as { lat?: unknown; lon?: unknown };
    if (typeof position.lat !== "number" || typeof position.lon !== "number"
      || !Number.isFinite(position.lat) || !Number.isFinite(position.lon)
      || position.lat < 33 || position.lat > 39.5 || position.lon < 124 || position.lon > 132) {
      return NextResponse.json({ error: "국내 위치만 지원합니다." }, { status: 400 });
    }
    const lat = Math.round(position.lat * 50) / 50;
    const lon = Math.round(position.lon * 50) / 50;
    const weather = await fetchForecast(lat, lon, "내 위치");
    return weather
      ? NextResponse.json(weather, { headers: { "Cache-Control": "private, no-store, max-age=0" } })
      : noForecast();
  } catch { return noForecast(); }
}
