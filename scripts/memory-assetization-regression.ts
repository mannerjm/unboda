import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const client = read("app/ai-consulting/AiConsultingPortfolioClient.tsx");
const memoryRoute = read("app/api/ai-consulting/memories/route.ts");
const memoryService = read("app/lib/aiConsulting/memory.ts");
const longTermMemoryMigration = read("supabase/migrations/041_ai_consulting_long_term_memory.sql");
const journey = read("app/lib/aiConsulting/journey.ts");
const journeyPage = read("app/my-unboda/page.tsx");
const mypage = read("app/mypage/page.tsx");
const adminServer = read("app/lib/analytics/customerJourney.ts");
const adminSummary = read("app/admin/AdminCustomerJourneyOverview.tsx");
const migration = read("supabase/migrations/20261002113000_memory_asset_metrics.sql");

for (const copy of [
  "다음 상담에서도 기억할까요?",
  "내가 허용한 내용만 장기 기억으로 남습니다.",
  "현재 상황",
  "최근 변화",
  "목표",
  "내 기준",
  "이번만 사용",
  "기억하기",
]) {
  assert(client.includes(copy), `missing phase-1 memory asset UX: ${copy}`);
}
assert(client.includes("setMemoryDraftContent(message.content.slice(0, 300))"), "memory candidate must start from the customer's own message");
assert(!client.includes("saveAiConsultingMemory("), "client must never directly auto-save model/user content");

assert(memoryRoute.includes("supersedesMemoryId: existing.id"), "memory edits must create a new version linked to the previous active memory");
assert(memoryRoute.includes('provenance: "USER_STATED"'), "only explicitly user-stated memory may be versioned by customer edit");
assert(longTermMemoryMigration.includes("set status = 'superseded'"), "database memory RPC must preserve previous versions instead of deleting them");

assert(journey.includes('.eq("profile_id", input.profileId)') && journey.includes('.eq("user_id", input.userId)'), "My Unboda timeline must remain user/profile scoped");
assert(journey.includes('"memory_update"') && journey.includes('"report"') && journey.includes('"consultation"'), "timeline must join situation changes, reports and consultations");
assert(journeyPage.includes("나의 운보다 기록") && journeyPage.includes("지금 기억하고 있는 내 상황") && journeyPage.includes("내 흐름이 어떻게 이어졌는지"), "My Unboda page must expose current state and timeline");
assert(journeyPage.includes("운보다가 결과를 맞았다고 판정하지 않습니다."), "timeline must not claim fortune accuracy from later events");
assert(mypage.includes('href="/my-unboda"') && mypage.includes("나의 운보다 기록"), "My Page must expose the personal record asset");

for (const metric of [
  "memoryActiveCount",
  "memoryUsersWithActive",
  "memorySaved30",
  "memoryChanged30",
  "memoryD7Eligible",
  "memoryD7Reconsulted",
]) {
  assert(adminServer.includes(metric) && migration.includes(metric), `missing memory asset metric: ${metric}`);
}
assert(adminSummary.includes("기억 보유 고객") && adminSummary.includes("기억 저장 후 D7 재상담"), "admin summary must surface memory adoption/retention");

console.log("memory-assetization-regression: OK");
