import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const today = readFileSync("app/today/page.tsx", "utf8");
const home = readFileSync("app/components/HomeExperience.tsx", "utf8");
const dailyServer = readFileSync("app/lib/dailyUnboda/server.ts", "utf8");

for (const cue of [
  "매일 무료 · DAILY UNBODA",
  "오늘의 운보다",
  "오늘의 분석 대상",
  "오늘의 흐름 확인하기",
  "TODAY'S NOTE · 오늘의 흐름",
  "오늘의 한 가지 제안",
  "내일도, 새로운 오늘이 열려요.",
]) assert(today.includes(cue), `missing daily visit experience element: ${cue}`);

assert(today.includes("bg-[linear-gradient(180deg,#070d20_0%,#0b1330_48%,#090f24_100%)]"));
assert(today.includes("radial-gradient(circle_at_12%_18%") && home.includes("radial-gradient(circle_at_12%_18%"), "daily detail should share home night-sky art direction");
assert(today.includes("bg-[#f7e0af]") && home.includes("bg-[#f7e0af]"), "daily CTA should share home gold event accent");
assert(today.includes("sm:") && today.includes("md:grid-cols-[1fr_16rem]"), "event card must work in narrow and wide layouts");
assert(today.includes("focus-visible:outline") && today.includes('aria-labelledby="today-action"'), "action and keyboard accessibility must remain");
assert(today.indexOf("{reading.topic}") < today.indexOf("{reading.flow}") && today.indexOf("{reading.flow}") < today.indexOf("{reading.action}"), "single daily topic, flow and practical action remain in original order");
assert(today.includes('date={date}') && today.includes("const day = Number(date.slice(8, 10))") && today.includes('timeZone: "Asia/Seoul"'), "hero must use live Korean date without baked-in date");
assert(today.includes("getProfileFreeAnalysisFoundationStatus(user.id, activeProfile)") && today.includes("if (!isFreeAnalysisFoundationReady(freeAnalysisStatus))") && today.includes("getCachedTodayReading(user.id, activeProfile, date)"), "daily cannot bypass same-profile free-saju foundation");
assert(today.indexOf("if (!isFreeAnalysisFoundationReady(freeAnalysisStatus))") < today.indexOf("getCachedTodayReading(user.id, activeProfile, date)"));
assert(today.includes("if (!activeProfile)") && today.includes("마이페이지에서 분석 대상 선택하기"), "no-selection route must still be useful");
assert(today.includes('freeAnalysisStatus === "stale"') && today.includes('isGenerating ? "무료 사주 분석 진행 상황 보기"'), "stale and loading must keep original routes");
assert(today.includes("계산 결과가 확인되지 않아 임의의 운세를 보여드리지 않습니다."), "missing calculation must never show fabricated fortune");
assert(today.includes('href="#today-topic"') && today.includes('id="today-topic"'), "read-today action must lead to real content");
assert(!today.includes('aria-label="오늘의 운보다 이동"') && !today.includes("← 운보다 홈"), "daily detail must not show redundant top home navigation");
assert(!today.includes("<footer className="), "daily detail must not show redundant footer home navigation");
assert(today.includes('sm:mt-0">운보다 홈으로 →</Link>'), "single return action after the daily reading must stay available");

assert(!today.includes("requestPayment(") && !today.includes("/ai-consulting") && !today.includes("/checkout/") && !today.includes("/deep-analysis"), "free daily visit must not become paid funnel");
assert(!today.includes("localStorage") && !today.includes("streak") && !today.includes("출석 보상") && !today.includes("알림 신청") && !today.includes("내일 알림"), "do not invent retention rewards or persistence");
assert(dailyServer.includes("DAILY_COPY_VERSION") && dailyServer.includes("fingerprint") && dailyServer.includes("date"), "profile, birth and date scoped cache contract unchanged");
console.log("daily-unboda-event-experience-regression: OK");
