import { readFileSync } from "node:fs";
import { join } from "node:path";

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`✓ ${message}`);
}

const guestPage = read("app/guest-saju/page.tsx");
const startRoute = read("app/api/guest-free-analysis/start/route.ts");
const directRoute = read("app/api/guest-free-analysis/route.ts");
const server = read("app/lib/guestFreeAnalyses/input.ts");
const guestMigration = read("supabase/migrations/010_guest_free_analyses.sql");
const retentionMigration = read("supabase/migrations/035_bounded_guest_retention_cleanup.sql");
const loadingPage = read("app/guest-loading/page.tsx");
const resultPage = read("app/guest-result/page.tsx");

assert(server.includes(`GUEST_AGE_SELF_ATTESTATION_REQUIRED`), "stable Guest age self-attestation error code exists");
assert(server.includes("=== true"), "server requires the attestation value to be the boolean true");
assert(startRoute.includes("hasGuestAgeSelfAttestation") && directRoute.includes("hasGuestAgeSelfAttestation"), "both Guest execution endpoints enforce the attestation");
assert(startRoute.includes("guestAgeSelfAttestationError") && directRoute.includes("guestAgeSelfAttestationError") && startRoute.includes("{ status: 400 }") && directRoute.includes("{ status: 400 }"), "both endpoints return the bounded 400 contract");
assert(guestPage.includes('id="guest-age-confirmation"') && guestPage.includes('htmlFor="guest-age-confirmation"') && guestPage.includes("checked={age14OrOlderConfirmed}") && guestPage.includes("useState(false)"), "Guest checkbox is explicit, associated, and unchecked by default");
assert(guestPage.includes("age14OrOlderConfirmed: true") && guestPage.includes("/api/guest-free-analysis/start"), "checked UI sends only the request attestation to the existing start endpoint");
assert(guestPage.includes("document.getElementById(\"guest-age-confirmation\")?.focus()") && guestPage.includes('role="alert"') && guestPage.includes("aria-describedby"), "unchecked execution is blocked with accessible inline validation");
assert(guestPage.includes("서비스 이용자 기준이며, 분석 대상의 나이와는 다릅니다."), "UI distinguishes service user age from analysis subject age");
assert(!guestMigration.includes("age14OrOlderConfirmed") && !retentionMigration.includes("age14OrOlderConfirmed"), "attestation is absent from Guest schema and retention migration");
assert(loadingPage.includes('fetch("/api/guest-free-analysis/generate"') && resultPage.includes('fetch("/api/guest-free-analysis")'), "loading and result routes remain unchanged");

assert(guestPage.includes('{ value: "child", label: "자녀" }'), "under-14 analysis subject option remains available");
assert(server.includes("hasGuestAgeSelfAttestation") && server.includes("typeof input === \"object\""), "attestation validation is a server-only pure request contract");
assert(server.includes("return validated;") && !guestMigration.includes("age14OrOlderConfirmed") && !retentionMigration.includes("age14OrOlderConfirmed"), "profile validation remains independent and persistence surfaces omit the attestation");

console.log("guest-age-self-attestation-regression passed ✓");
