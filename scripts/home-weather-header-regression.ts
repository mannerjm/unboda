import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveWeatherDistrict } from "../app/lib/weatherDistrictLookup";

const widget = readFileSync("app/components/HomeWeatherLine.tsx", "utf8");
const api = readFileSync("app/api/home/weather-summary/route.ts", "utf8");
const home = readFileSync("app/components/HomeExperience.tsx", "utf8");

assert.equal(resolveWeatherDistrict(36.82, 127.12), "충남 천안시", "Cheonan northwest district");
assert.equal(resolveWeatherDistrict(36.84, 127.18), "충남 천안시", "Cheonan southeast district");
assert.equal(resolveWeatherDistrict(37.56, 126.98), "서울 중구", "Seoul city district");
assert.equal(resolveWeatherDistrict(35.18, 129.08), "부산 연제구", "Busan district");
assert.equal(resolveWeatherDistrict(33.50, 126.54), "제주 제주시", "Jeju-si");
assert.equal(resolveWeatherDistrict(0, 0), null, "invalid position");
assert(widget.includes("onClick={locate}"), "region label click refreshes location");
assert(widget.includes("navigator.geolocation.getCurrentPosition"), "browser requests user location on click");
assert(!widget.includes("resetToSeoul") && !widget.includes("서울로"), "no separate Seoul reset");
assert(!widget.includes("<select") && !widget.includes("미세먼지"), "no selector or dust");
assert(widget.includes("window.localStorage.setItem(LAST_LOCATION_KEY"), "last coarse place saved locally");
assert(widget.includes("Math.round(value * 50) / 50"), "coordinates reduced precision before sending");
assert(widget.includes("getItem(LAST_LOCATION_KEY)") && widget.includes("fetchWeather({ lat: stored.lat, lon: stored.lon })"), "last place displayed without new permission prompt");
assert(widget.includes("이전 지역은 유지됩니다"), "permission failure preserves last selected location");
assert(widget.includes("setInterval") && widget.includes("prefers-reduced-motion"), "existing rotating weather/source continues");
assert(api.includes("resolveWeatherDistrict(lat, lon)") && api.includes('status: 422'), "city is resolved server-side, not submitted by browser");
assert(home.includes("통계청 2018 행정경계") && home.includes("MET Norway"), "data attribution preserved in footer");
assert(home.includes("<Link href={aiHref}") && home.includes("<Link href={accountHref}"), "AI 상담, account untouched");
console.log("home weather location label regression: PASS");
