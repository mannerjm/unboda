import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const read = (path: string) => readFileSync(path, "utf8");
const migration = read("supabase/migrations/20261006195500_resolve_legacy_birth_time_certainty.sql");
const profileRoute = read("app/api/profiles/route.ts");

assert(
  migration.includes("birth_time_known is null")
    && migration.includes("birth_time <> time '12:00'"),
  "legacy certainty backfill must only confirm non-noon legacy profile times",
);
assert(
  migration.includes("far.profile_snapshot->>'birthTimeKnown' is null")
    && migration.includes("far.profile_snapshot->>'birthTime'")
    && migration.includes("hourPillarHanja"),
  "free-analysis metadata may only be aligned when the stored result already used the same hour input",
);
assert(
  migration.includes("profile_snapshot = jsonb_set")
    && migration.includes("profile_fingerprint = legacy.confirmed_fingerprint")
    && migration.includes("{profile,birthTimeKnown}"),
  "legacy free-result snapshot, fingerprint and content metadata must move together",
);
assert(
  !migration.includes("update public.paid_reports")
    && !migration.includes("update public.purchases")
    && !migration.includes("update public.orders"),
  "purchase-time snapshots and paid reports must remain frozen",
);
assert(
  migration.includes("Do not silently infer legacy 12:00 rows"),
  "real noon and historical default noon must never be conflated",
);
assert(
  profileRoute.includes("validation.value.birthTimeKnown == null")
    && profileRoute.includes("출생 시간을 알고 있는지 선택해 주세요."),
  "new profile creation must reject missing birth-time certainty instead of creating new legacy null rows",
);

const canonical = {
  birthDate: "1987-02-03",
  birthTime: "22:40",
  birthTimeKnown: true,
  gender: "남성",
  calendarType: "양력",
  isLeapMonth: false,
};
const expected = createHash("sha256")
  .update(JSON.stringify(canonical))
  .digest("hex");
assert.equal(
  expected,
  "216823be6ba225dd3a496bcb394bd95b43e86b89dc865e5824299c1aa3583a96",
  "regression fixture must match the canonical production fingerprint format",
);

console.log("legacy-birth-time-certainty-regression: PASS");
