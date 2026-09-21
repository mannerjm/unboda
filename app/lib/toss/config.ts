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
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

  if (!secretKey || secretKey.trim().length === 0) {
    throw new Error(
      "TOSS_SECRET_KEY 환경 변수가 설정되지 않았습니다. Toss sandbox secret만 허용됩니다.",
    );
  }

  if (!clientKey || clientKey.trim().length === 0) {
    throw new Error("NEXT_PUBLIC_TOSS_CLIENT_KEY 환경 변수가 설정되지 않았습니다.");
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

export function isTossCheckoutUserAllowed(userId: string): boolean {
  const config = getTossConfig();
  if (process.env.NODE_ENV !== "production" || config.environment !== "sandbox") return true;
  return (process.env.TOSS_REVIEW_ACCOUNT_IDS ?? "")
    .split(",")
    .some((id) => id.trim().toLowerCase() === userId.toLowerCase());
}
