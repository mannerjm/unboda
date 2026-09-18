import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const shell = readFileSync("app/components/AppShell.tsx", "utf8");
const saju = readFileSync("app/saju/page.tsx", "utf8");

assert(shell.includes('{ href: "/saju", label: "내 분석"'), "My Analysis nav must remain the canonical /saju entry");
assert(shell.includes('if (item.href === "/saju") return "/saju";'), "member My Analysis navigation must always re-enter the current-state saju gate");
assert(!shell.includes("memberSajuHref") && !shell.includes("setMemberSajuHref"), "shell must not cache a prior /result destination across same-profile birth edits");
assert(!shell.includes('`/result?profileId=${encodeURIComponent(profileId)}`'), "shell must not bypass the saju freshness check with a cached result link");

assert(saju.includes("분석 대상: {activeProfile.label}"), "saju profile label must use the customer-facing 분석 대상 copy");
assert(!saju.includes("활성 분석 대상:"), "old active-target label must be removed");
assert(saju.includes('fetch(`/api/free-analysis/${profile.id}`)'), "saju entry must re-check the current profile result");
assert(saju.includes('router.replace(`/result?profileId=${profile.id}`)'), "valid current free result must still auto-open");
assert(saju.includes('router.push(`/loading?profileId=${activeProfile.id}`)'), "missing or stale current result must still start a fresh analysis");

console.log("my-analysis stale navigation regression passed");
