/**
 * Read the public Toss client key from our authenticated server endpoint at request time.
 * NEXT_PUBLIC_ keys compiled into Next.js bundles can be missing after a Vercel env change.
 * The secret key is never exposed to the browser.
 */
export async function getTossCheckoutClientKey(): Promise<{
  clientKey: string;
  environment: "sandbox" | "production";
}> {
  const response = await fetch("/api/payments/toss/client-config", {
    cache: "no-store",
    credentials: "same-origin",
  });
  const payload = await response.json().catch(() => null) as {
    clientKey?: unknown;
    environment?: unknown;
    error?: unknown;
  } | null;
  if (!response.ok) {
    throw new Error(typeof payload?.error === "string"
      ? payload.error
      : "토스 결제창을 준비하지 못했습니다.");
  }
  const clientKey = payload?.clientKey;
  const environment = payload?.environment;
  if (typeof clientKey !== "string" ||
      !/^(?:test|live)_ck_[A-Za-z0-9_-]+$/.test(clientKey) ||
      (environment !== "sandbox" && environment !== "production") ||
      (environment === "sandbox" && !clientKey.startsWith("test_ck_")) ||
      (environment === "production" && !clientKey.startsWith("live_ck_"))) {
    throw new Error("토스 결제 키를 확인하지 못했습니다.");
  }
  return { clientKey, environment };
}
