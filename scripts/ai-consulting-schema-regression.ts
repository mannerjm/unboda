import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migrationPath = path.resolve(
  process.cwd(),
  "supabase/migrations/039_ai_consulting_schema_foundation.sql",
);
const sql = fs.readFileSync(migrationPath, "utf8");

const mustContain = (needle: string, reason: string) => {
  assert(sql.includes(needle), `${reason}: missing ${needle}`);
};

for (const table of [
  "ai_consulting_grants",
  "ai_consulting_threads",
  "ai_consulting_messages",
  "ai_consulting_memories",
]) {
  mustContain(`create table if not exists public.${table}`, `${table} table must exist`);
  mustContain(`alter table public.${table} enable row level security`, `${table} must have RLS`);
  mustContain(`revoke insert, update, delete on public.${table} from authenticated`, `${table} must be server-write-only`);
}

mustContain(
  "ai_consulting_grants_source_purchase_boundary_fkey",
  "every consulting grant must be backed by its exact paid source purchase",
);
mustContain(
  "ai_consulting_grants_base_entitlement_boundary_fkey",
  "every consulting grant must stay pinned to its owned analysis entitlement edition",
);
mustContain(
  "base_resource_type = 'paid_analysis'",
  "consulting grants must be based on paid analysis entitlements",
);
mustContain(
  "check (role <> 'user' or length(content) <= 300)",
  "user questions need a DB-enforced 300 character ceiling",
);
mustContain(
  "check (not charged or (role = 'user' and scope_decision = 'ALLOW'))",
  "only ALLOWed user questions may ever be marked charged",
);
mustContain(
  "provenance in ('USER_STATED', 'ANALYSIS_DERIVED', 'SYSTEM_SUMMARY')",
  "long-term memory provenance must be explicit",
);
mustContain(
  "kind <> 'consultation_summary' or provenance = 'SYSTEM_SUMMARY'",
  "consultation summaries must not masquerade as user-stated facts",
);
mustContain(
  "kind <> 'analysis_interpretation' or provenance = 'ANALYSIS_DERIVED'",
  "analysis interpretations must retain analysis-derived provenance",
);
mustContain(
  "delete from public.ai_consulting_memories",
  "account closure must delete long-term consulting memory",
);
mustContain(
  "delete from public.ai_consulting_threads",
  "account closure must delete threads and cascade messages",
);
mustContain(
  "revocation_reason = 'ACCOUNT_CLOSED'",
  "account closure must revoke remaining consulting grants",
);
mustContain(
  "set search_path = public",
  "new trigger functions need an explicit search_path",
);

assert(
  !sql.includes("truncate table"),
  "AI consulting migration must be additive and must never truncate production data",
);
assert(
  !sql.includes("drop table"),
  "AI consulting migration must not drop existing tables",
);

console.log("AI consulting schema regression passed");
