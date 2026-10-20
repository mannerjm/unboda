import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { HOME_WEATHER_REGIONS, getHomeWeatherRegion } from "../app/lib/homeWeatherRegions";

const home = readFileSync("app/components/HomeExperience.tsx", "utf8");
const widget = readFileSync("app/components/HomeWeatherLine.tsx", "utf8");
const api = readFileSync("app/api/home/weather-summary/route.ts", "utf8");

assert(home.includes('import HomeWeatherLine from "./HomeWeatherLine"'), "weather import");
assert(home.indexOf("<HomeWeatherLine />") < home.indexOf("<Link href={aiHref}"), "left of AI 상담");
assert(home.includes("<Link href={accountHref}"), "account navigation intact");
assert(HOME_WEATHER_REGIONS.length === 17, "17 regions");
assert(new Set(HOME_WEATHER_REGIONS.map(x => x.id)).size === 17, "unique region IDs");
assert(!getHomeWeatherRegion("bogus"), "unknown region cannot be selected");
assert(widget.includes("window.localStorage.getItem") && widget.includes("window.localStorage.setItem"), "browser-local persistence");
assert(widget.includes("controller.abort()") && widget.includes("setWeather(null)"), "no cross-region stale data");
assert(widget.includes('aria-label="날씨 지역 변경"'), "accessible picker");
assert(widget.includes("whitespace-nowrap") && widget.includes("lg:flex"), "single line header");
assert(!widget.includes(">MET 예보") && !widget.includes(">CC BY"), "no raw source labels in header");
assert(home.includes("https://creativecommons.org/licenses/by/4.0/") && home.includes("MET Norway"), "attribution preserved in footer");
assert(api.includes("if (!region)") && api.includes("status: 400"), "invalid region safe response");
assert(widget.includes("https://www.airkorea.or.kr/"), "dust official link fallback");
assert(api.includes("if (!key || !region.airStation) return empty"), "no fake dust stations");
assert(api.includes("if (!forecast) return new NextResponse(null, { status: 204"), "no fake weather");
assert(!widget.includes("navigator.geolocation"), "no browser location permission");
console.log("home weather region regression: PASS");
