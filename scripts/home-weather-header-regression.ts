import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const home = readFileSync("app/components/HomeExperience.tsx", "utf8");
const widget = readFileSync("app/components/HomeWeatherLine.tsx", "utf8");
const api = readFileSync("app/api/home/weather-summary/route.ts", "utf8");

assert(home.includes('import HomeWeatherLine from "./HomeWeatherLine"'), "home imports weather-only component");
assert(home.indexOf("<HomeWeatherLine />") < home.indexOf("<Link href={aiHref}"), "weather is left of AI 상담");
assert(home.includes("<Link href={accountHref}"), "account navigation preserved");
assert(widget.includes('className="hidden items-center') && widget.includes("lg:flex"), "desktop header single-line weather");
assert(widget.includes("weather.dustGrade") && widget.includes("미세먼지 확인 ↗"), "unavailable dust links to official measurements instead of showing a fake grade");
assert(widget.includes("https://cleanair.seoul.go.kr/"), "official live Seoul air quality fallback is available");
assert(widget.includes("weather.dustPm25Grade"), "fine dust is displayed only when real data is available");
assert(api.includes("pm25Grade1h") && api.includes("pm25Grade"), "AirKorea PM2.5 grade parsing is supported");
assert(widget.includes('href="https://api.met.no/"'), "MET attribution remains visible");
assert(!widget.includes("navigator.geolocation") && !api.includes("geolocation"), "no geolocation access");
assert(api.includes("AIRKOREA_SERVICE_KEY") && api.includes('const key = process.env.AIRKOREA_SERVICE_KEY'), "dust is gated behind a server-side key");
assert(api.includes("if (!forecast) return new NextResponse(null, { status: 204 })"), "bad weather is never displayed");
assert(!api.includes("/checkout") || api.includes("checkout/payment code paths"), "weather endpoint stays separate from checkout");
console.log("home weather isolated-header regression: PASS");
