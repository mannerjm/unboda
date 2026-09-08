import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(
  "supabase/migrations/043_ai_consulting_profile_credit_ledger.sql",
  "utf8",
);
const policy = fs.readFileSync(
  "app/lib/aiConsulting/commercialPolicy.ts",
  "utf8",
);

assert(migration.includes("ai_consulting_credit_ledger"));
assert(migration.includes("get_ai_consulting_credit_balance"));
assert(migration.includes("record_ai_consulting_credit_purchase"));
assert(migration.includes("service_role"));
assert(migration.includes("source_purchase_id"));
assert(migration.includes("related_message_id"));
assert(migration.includes("reversal_of_entry_id"));
assert(!migration.includes("grant execute on function public.record_ai_consulting_credit_purchase(uuid, text, integer)\n  to authenticated"));

assert(policy.includes('id: "ai-consulting-3", questions: 3, priceKrw: 2900'));
assert(policy.includes('id: "ai-consulting-5", questions: 5, priceKrw: 4900'));
assert(policy.includes('id: "ai-consulting-10", questions: 10, priceKrw: 8900'));
assert(policy.includes('scope: "PROFILE"'));
assert(policy.includes("allowAcrossPurchasedAnalyses: true"));
assert(policy.includes("requireExactAnalysisEntitlement: true"));
assert(policy.includes("deductOnlyAfterCompletedAnswer: true"));

console.log("AI consulting credit ledger regression guards passed.");
