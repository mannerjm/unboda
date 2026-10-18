export type TossSandboxConfig = {
  environment: "sandbox" | "production";
  apiBaseUrl: string;
  secretKey: string;
  clientKey: string;
  isProduction: boolean;
};

export function hasTossSandboxConfig(): boolean {
  return Boolean(process.env.TOSS_SECRET_KEY);
}

export function getTossConfig(): TossSandboxConfig {
  // Next.js uses NODE_ENV=production for every deployed build, including Toss review.
  // A production-hosted TEST checkout must be an explicit, reviewer-only sandbox.
  const reviewSandboxRequested = process.env.TOSS_ENVIRONMENT === "sandbox"
    && process.env.TOSS_REVIEW_MODE === "enabled"
    && process.env.TOSS_ALLOW_LIVE !== "true";
  const isProductionRequest = !reviewSandboxRequested && (
    process.env.NODE_ENV === "production" ||
    process.env.TOSS_ENVIRONMENT === "production" ||
    process.env.TOSS_ALLOW_LIVE === "true"
  );

  const secretKey = process.env.TOSS_SECRET_KEY;
  // TOSS_CLIENT_KEY is server-runtime configuration; NEXT_PUBLIC_ may be absent from an earlier build.
  const clientKey = process.env.TOSS_CLIENT_KEY || process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

  if (!secretKey || secretKey.trim().length === 0) {
    throw new Error(
      "TOSS_SECRET_KEY 환경 변수가 설정되지 않았습니다. Toss sandbox secret만 허용됩니다.",
    );
  }

  if (!clientKey || clientKey.trim().length === 0) {
    throw new Error("TOSS_CLIENT_KEY 환경 변수가 설정되지 않았습니다.");
  }

  const isTestPair = clientKey.startsWith("test_ck_") && secretKey.startsWith("test_sk_");
  const isLivePair = clientKey.startsWith("live_ck_") && secretKey.startsWith("live_sk_");

  if (isProductionRequest) {
    if (!isLivePair) {
      throw new Error("Production Toss requires a matching live_ck_ and live_sk_ pair.");
    }
    return {
      environment: "production",
      apiBaseUrl: "https://api.tosspayments.com/v1",
      secretKey,
      clientKey,
      isProduction: true,
    };
  }

  if (!isTestPair) {
    throw new Error("Sandbox Toss requires a matching test_ck_ and test_sk_ pair.");
  }
  if (process.env.NODE_ENV === "production") {
    if (!reviewSandboxRequested || !hasTossReviewAccountAllowlist()) {
      throw new Error("Production TEST checkout requires explicit review mode and reviewer account allowlist.");
    }
  }

  return {
    environment: "sandbox",
    apiBaseUrl: process.env.TOSS_API_BASE_URL?.startsWith("http://127.0.0.1:")
      ? process.env.TOSS_API_BASE_URL
      : "https://api.tosspayments.com/v1",
    secretKey,
    clientKey,
    isProduction: false,
  };
}
/** Do not allow a production TEST payment to mint paid access for ordinary visitors. */
function hasTossReviewAccountAllowlist(): boolean {
  return (process.env.TOSS_REVIEW_ACCOUNT_IDS ?? "")
    .split(",")
    .some((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id.trim()));
}


/** An optional, fail-closed account split. No user can enable it from a browser. */
export function isTossHybridRoutingEnabled() {
  return process.env.NODE_ENV === "production"
    && process.env.TOSS_HYBRID_ROUTING_ENABLED === "true";
}

function isTossLivePilotAccount(userId: string): boolean {
  if (process.env.TOSS_LIVE_PILOT_ENABLED !== "true") return false;
  return (process.env.TOSS_LIVE_PILOT_ACCOUNT_IDS ?? "")
    .split(",")
    .map((id) => id.trim().toLowerCase())
    .filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))
    .includes(userId.toLowerCase());
}

export function getTossConfigForAccount(userId: string, purpose: "checkout" | "settlement" = "checkout"): TossSandboxConfig {
  if (!isTossHybridRoutingEnabled()) return getTossConfig();
  const testId = process.env.TOSS_TEST_ACCOUNT_ID?.trim().toLowerCase();
  if (!testId || !/^[0-9a-f-]{36}$/.test(testId)) throw new Error("TOSS_TEST_ACCOUNT_ID_REQUIRED");
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new Error("TOSS_ACCOUNT_ID_REQUIRED");
  if (userId.toLowerCase() === testId) {
    const config = getTossConfig();
    if (config.environment !== "sandbox") throw new Error("TOSS_TEST_ACCOUNT_MUST_USE_SANDBOX");
    const allowlisted = (process.env.TOSS_REVIEW_ACCOUNT_IDS ?? "").split(",")
      .some((id) => id.trim().toLowerCase() === testId);
    if (!allowlisted) throw new Error("TOSS_TEST_ACCOUNT_ALLOWLIST_MISMATCH");
    return config;
  }
  if (purpose === "checkout" && process.env.TOSS_LIVE_CHECKOUT_ENABLED !== "true" && !isTossLivePilotAccount(userId)) {
    throw new Error("TOSS_LIVE_CHECKOUT_NOT_APPROVED");
  }
  const clientKey = process.env.TOSS_LIVE_CLIENT_KEY?.trim();
  const secretKey = process.env.TOSS_LIVE_SECRET_KEY?.trim();
  // This integration uses SDK .payment(), not .widgets(); gck/gsk are incompatible.
  if (!clientKey?.startsWith("live_ck_") || !secretKey?.startsWith("live_sk_")) {
    throw new Error("TOSS_LIVE_INDIVIDUAL_KEY_PAIR_REQUIRED");
  }
  return { environment: "production", apiBaseUrl: "https://api.tosspayments.com/v1",
    clientKey, secretKey, isProduction: true };
}

export function isTossCheckoutUserAllowed(userId: string): boolean {
  if (isTossHybridRoutingEnabled()) {
    const config = getTossConfigForAccount(userId, "settlement");
    return (config.environment === "production" && (process.env.TOSS_LIVE_CHECKOUT_ENABLED === "true" || isTossLivePilotAccount(userId))) ||
      userId.toLowerCase() === process.env.TOSS_TEST_ACCOUNT_ID?.trim().toLowerCase();
  }
  const config = getTossConfig();
  if (process.env.NODE_ENV !== "production" || config.environment !== "sandbox") return true;
  return (process.env.TOSS_REVIEW_ACCOUNT_IDS ?? "")
    .split(",")
    .some((id) => id.trim().toLowerCase() === userId.toLowerCase());
}
