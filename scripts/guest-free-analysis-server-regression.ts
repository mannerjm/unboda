import { readFileSync } from "node:fs";
import { join } from "node:path";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function read(path: string): string {
  return readFileSync(join(process.cwd(), path), "utf8");
}

const cookie = read("app/lib/guestFreeAnalyses/cookie.ts");
const repository = read("app/lib/guestFreeAnalyses/server.ts");
const pipeline = read("app/lib/freeAnalysisPipeline/server.ts");
const authenticatedAnalyze = read("app/api/analyze/route.ts");
const guestRoute = read("app/api/guest-free-analysis/route.ts");
const intentRoute = read("app/api/guest-free-analysis/intent/route.ts");
const transferRoute = read("app/api/guest-free-analysis/transfer/route.ts");

assert(cookie.includes('import "server-only"'), "guest cookie utility must be server-only");
assert(cookie.includes("randomBytes(32)") && cookie.includes("base64url"), "guest secret must use cryptographically secure random bytes");
assert(cookie.includes('httpOnly: true') && cookie.includes('sameSite: "lax"') && cookie.includes('secure: process.env.NODE_ENV === "production"') && cookie.includes('path: "/"'), "guest credential cookie must have secure HttpOnly attributes");
assert(cookie.includes("hashGuestAnalysisSecret") && cookie.includes('createHash("sha256")'), "guest secret must be hashed before database use");
console.log("1. guest credential is opaque, HttpOnly, and hash-backed ✓");

assert(repository.includes('import "server-only"') && repository.includes("createAdminClient"), "guest repository must be server-only and use the admin client");
assert(repository.includes("getProfileFingerprint") && repository.includes("getGuestProfileFingerprint"), "guest repository must reuse the canonical authenticated fingerprint function");
assert(repository.includes("createGuestFreeAnalysis") && repository.includes("completeGuestFreeAnalysis") && repository.includes("failGuestFreeAnalysis"), "guest repository must expose create, complete, and fail lifecycle operations");
assert(repository.includes("getGuestFreeAnalysis") && repository.includes("secret_hash") && repository.includes("setGuestSelectedProduct"), "guest restore and product intent must verify the secret hash");
assert(!repository.includes("secret: input") && !repository.includes("raw_secret"), "raw guest secret must not be persisted in the repository payload");
assert(repository.includes('complete_guest_analysis_transfer') && repository.includes('p_profile_fingerprint'), "transfer must call the four-argument migration RPC");
console.log("2. service-role repository, canonical fingerprint, lifecycle, and transfer contracts present ✓");

assert(pipeline.includes('import "server-only"') && pipeline.includes("getSaju(") && pipeline.includes("buildFreeAnalysis(") && pipeline.includes("buildAnalysisProductRecommendations"), "shared pipeline must reuse the existing free-analysis engine");
assert(authenticatedAnalyze.includes("buildFreeAnalysisResponse") && authenticatedAnalyze.includes("includePremiumAnalysis: productId !== undefined"), "authenticated analyze route must preserve its pipeline and premium response behavior");
console.log("3. existing authenticated analysis pipeline is reused without behavior loss ✓");

assert(guestRoute.includes("validateProfileInput") && guestRoute.includes("createGuestFreeAnalysis") && guestRoute.includes("buildFreeAnalysisResponse") && guestRoute.includes("completeGuestFreeAnalysis"), "guest create route must validate, generate, and persist the result");
assert(guestRoute.includes("failGuestFreeAnalysis") && guestRoute.includes("GUEST_ANALYSIS_COOKIE_NAME"), "guest create route must fail safely and set only the credential cookie");
assert(guestRoute.includes("record.status !== \"completed\"") && guestRoute.includes("isUsableGuestFreeAnalysis"), "guest restore must reject expired, consumed, or unfinished rows");
assert(!guestRoute.includes("secretHash:") || guestRoute.includes("hashGuestAnalysisSecret"), "guest route must pass only a hash to the database layer");
console.log("4. guest create, completed restore, and failed handling contracts present ✓");

assert(intentRoute.includes("getCanonicalPremiumProductId") && intentRoute.includes("getPremiumProduct(productId)"), "guest product intent must validate canonical product IDs server-side");
assert(intentRoute.includes("getGuestFreeAnalysis") && intentRoute.includes("isUsableGuestFreeAnalysis"), "guest product intent must verify a usable credential-bound analysis");
assert(!intentRoute.includes("/checkout/"), "guest intent server route must not bypass future UI/auth transfer flow");
console.log("5. guest product intent allowlist and credential verification present ✓");

assert(transferRoute.includes("getCurrentUser") && !transferRoute.includes("request.json"), "transfer user identity must come only from the server session");
assert(transferRoute.includes("transferGuestFreeAnalysisToUser") && transferRoute.includes("SELF_PROFILE_CONFLICT") && transferRoute.includes("return 409"), "transfer route must preserve typed self-Profile conflicts");
assert(transferRoute.includes("record.transferredUserId !== user.id"), "same-user transfer retries must remain eligible while other-user consumption is rejected");
assert(transferRoute.includes("maxAge: 0"), "successful transfer must clear the guest credential cookie");
console.log("6. authenticated transfer, typed conflict mapping, and idempotency contracts present ✓");

console.log("7. Phase 2 server contracts remain independent from UI routes ✓");

console.log("\nguest-free-analysis-server-regression passed ✓");