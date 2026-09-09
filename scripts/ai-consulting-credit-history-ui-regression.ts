import { readFileSync } from "fs";
import { join } from "path";

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const history = read("app/lib/aiConsulting/creditHistory.ts");
assert(history.includes('.from("ai_consulting_credit_ledger")'), "history must read the append-only credit ledger");
assert(history.includes('.eq("user_id", input.userId)'), "history must be scoped to the authenticated user");
assert(history.includes('.eq("profile_id", input.profileId)'), "history must be scoped to one profile");
assert(history.includes("Math.min(100"), "history reads must stay bounded");
assert(history.includes('.order("created_at", { ascending: false })'), "history must show newest ledger entries first");

const page = read("app/ai-consulting/credits/page.tsx");
assert(page.includes("listAiConsultingCreditHistory"), "credit management page must load ledger history server-side");
assert(page.includes("질문권 구매·사용 내역"), "credit management page must expose purchase/use history");
assert(page.includes("현재 잔액"), "credit management page must show current shared balance");
assert(page.includes("정상 AI 답변이 저장되어 실제 차감된 경우에만"), "UI must explain success-only charging");
assert(page.includes("limit: 50"), "UI history must remain bounded");

const chat = read("app/ai-consulting/AiConsultingChatClient.tsx");
assert(chat.includes("질문권 내역"), "AI chat must expose credit history even when checkout is dormant");
assert(chat.includes("creditCheckoutHref"), "AI chat history link must preserve profile/product/edition context");

console.log("ai consulting credit history UI regression passed");
