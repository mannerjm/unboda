import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path: string): string => readFileSync(path, "utf8");
const report = read("app/paid-analysis/[productId]/PaidAnalysisDetailV2Client.tsx");
const page = read("app/paid-analysis/[productId]/report/page.tsx");
const card = read("app/paid-analysis/[productId]/report/AiConsultingEntryCard.tsx");
const session = read("app/lib/aiConsulting/session.ts");
const banner = read("app/components/PurchasedAnalysesListMultiEdition.tsx");

assert(report.includes('window.dispatchEvent(new CustomEvent("unboda:paid-report-ready"'), "only a successfully stored report response should announce completion");
assert(report.indexOf('window.dispatchEvent(new CustomEvent("unboda:paid-report-ready"') > report.indexOf('const generatedDetail ='), "completion signal must follow successful result retrieval, never the request start");
assert(page.includes('reportCompleted={Boolean(initialDetail)}'), "stored completed reports must enter with verified completion state");
assert(page.includes('key={`${profileId}:${productId}:${exactEdition}`}') && page.includes("<AiConsultingEntryCard"), "consulting status must reset for every exact purchased edition");
assert(card.includes('window.addEventListener("unboda:paid-report-ready"') && card.includes('window.removeEventListener("unboda:paid-report-ready"'), "consultation status must refresh on report completion without leaking listeners");
assert(card.includes("detail?.profileId !== profileId") && card.includes("detail.productId !== productId") && card.includes("detail.edition !== edition"), "another user's local tab, profile, report or edition cannot trigger this report card");
assert(card.includes('lastState === "report_required"') && card.includes('void refreshSession()') && card.includes('cache: "no-store"'), "stale generating session must be rechecked without generating another report");
assert(card.includes('session?.state === "ready"') && card.includes('session?.state === "credit_required"'), "only the server may provide the actual question-rights state");
assert(card.includes("if (!reportAvailable) return null;"), "do not display a follow-up CTA while the report is genuinely incomplete");
assert(!card.includes("리포트가 완성되면 상담할 수 있어요.") && !card.includes("리포트 준비 중"), "a completed report must never advertise a second analysis waiting period");
assert(card.includes("새 답변을 받으려면 질문권이 필요해요."), "do not disguise zero-credit state as free consultation");
assert(session.includes('report.status !== "completed"') && session.includes("getAiConsultingCreditBalance"), "keep persisted completion and question-credit authorization server-side");
assert(banner.includes("리포트 읽고 끝내지 말고, AI에게 바로 물어보세요") && banner.includes("통합 AI 상담 바로가기"), "retain the previously requested short purchased-library consultation banner");
console.log("paid consulting report-completion synchronization regression: PASS");
