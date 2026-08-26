import { readFileSync } from "fs";
import { join } from "path";
import { getTossConfig } from "../app/lib/toss/config";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

function read(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), "utf-8");
}

const env = process.env as Record<string, string | undefined>;
env.TOSS_SECRET_KEY = "test_sk_123456789";
env.NEXT_PUBLIC_TOSS_CLIENT_KEY = "test_ck_123456789";
if (!env.NODE_ENV) {
  env.NODE_ENV = "development";
}

const config = getTossConfig();
assert(config.environment === "sandbox", "Toss config must stay sandbox-only");
assert(config.apiBaseUrl.includes("tosspayments.com"), "sandbox API URL must point to Toss");
assert(!config.secretKey.startsWith("live_"), "live keys must be rejected");
assert(config.secretKey.startsWith("test_sk_"), "API-individual TEST secret key must be accepted");

const mockRoute = read("app/api/orders/[orderId]/mock-confirm/route.ts");
assert(mockRoute.includes('NODE_ENV === "production"'), "mock-confirm must fail closed in production");
assert(mockRoute.includes("status: 403"), "mock-confirm production path must be blocked");

const confirmRoute = read("app/api/orders/[orderId]/confirm-payment/route.ts");
assert(confirmRoute.includes("getCurrentUser"), "confirm-payment must authenticate the user");
assert(confirmRoute.includes("status: 404"), "confirm-payment must reject unknown order");
assert(confirmRoute.includes("order.amount !== resolved.amount"), "confirm-payment must compare canonical server amount");
assert(confirmRoute.includes("provider.totalAmount !== order.amount"), "confirm-payment must guard against provider amount mismatch");
assert(confirmRoute.includes("provider.orderId !== order.id"), "confirm-payment must guard against order reference mismatch");

const configSource = read("app/lib/toss/config.ts");
assert(configSource.includes("TOSS_SECRET_KEY"), "config must require a server-side secret key");
assert(!configSource.includes("NEXT_PUBLIC_TOSS_SECRET_KEY"), "secret key must never be public");

const ordersRoute = read("app/api/orders/route.ts");
assert(ordersRoute.includes("paymentProvider: \"toss\""), "server order creation must use the Toss sandbox provider");

console.log("toss sandbox payment foundation regression passed");