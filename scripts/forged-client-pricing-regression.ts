import { readFileSync } from "node:fs";
import { resolvePurchasableProduct } from "../app/lib/purchases/products";
import { getProductPricing } from "../app/lib/productPricing";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const requestRoute = readFileSync("app/api/orders/route.ts", "utf8");
assert(!requestRoute.includes("body.amount"), "order API must ignore client amount");
assert(!requestRoute.includes("body.family"), "order API must ignore client family");
assert(!requestRoute.includes("body.discount"), "order API must ignore client discount");

const resolved = resolvePurchasableProduct("money-leak-risk");
assert(resolved.ok, "known product must resolve");
assert(resolved.ok && resolved.amount === getProductPricing("money-leak-risk").amount, "server must derive amount");
assert(resolved.ok && resolved.family === "DEEP", "server must derive family");

const forgedPayload = {
  productId: "money-leak-risk",
  amount: 100,
  family: "CORE",
  discount: 99,
};
const authoritative = getProductPricing(forgedPayload.productId);
assert(authoritative.amount !== forgedPayload.amount, "forged amount must not become authoritative");
assert(authoritative.family !== forgedPayload.family, "forged family must not become authoritative");

console.log("forged client pricing regression passed");
