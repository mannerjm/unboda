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
  const isProductionRequest =
    process.env.NODE_ENV === "production" ||
    process.env.TOSS_ENVIRONMENT === "production" ||
    process.env.TOSS_ALLOW_LIVE === "true";

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