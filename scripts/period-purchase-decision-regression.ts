import { listPeriodCatalogProducts } from "../app/lib/premiumCatalog";
import { getLaunchProductIds } from "../app/lib/paidAnalysisTopicConfig";
import { getProductPricing } from "../app/lib/productPricing";
import { getPremiumAnalysisHref } from "../app/lib/premiumAnalysisNavigation";
import { readFileSync } from "node:fs";

const products = listPeriodCatalogProducts();
const launchPeriodIds = getLaunchProductIds().filter((id) => products.some((product) => product.id === id));
const productIds = new Set(products.map((product) => product.id));

if (products.length !== 7 || launchPeriodIds.length !== 7) throw new Error("Expected exactly seven Launch Period products");
if (products.some((product) => !product.purchaseDecision)) throw new Error("Every Launch Period product needs purchase-decision metadata");
if (products.some((product) => !product.purchaseDecision?.primaryQuestion || product.purchaseDecision.recommendedFor.length < 1 || product.purchaseDecision.analysisScope.length < 1 || product.purchaseDecision.expectedUnderstanding.length < 1 || !product.purchaseDecision.distinction)) throw new Error("Every period metadata entry needs all required decision fields");
if (productIds.has("monthly-12months")) throw new Error("monthly-12months must remain outside the Launch catalog");
if (getPremiumAnalysisHref("monthly-current", "not_purchased", "profile-a") !== "/checkout/monthly-current?profileId=profile-a") throw new Error("Period checkout route changed");
if (getProductPricing("lifetime-overview").amount !== 39900) throw new Error("Period pricing changed");

const source = readFileSync("app/components/PremiumCatalogSection.tsx", "utf8");
for (const required of ["어느 정도의 시간 범위를 살펴보고 싶으세요?", "PeriodDetailPanel", "recommendedFor", "analysisScope", "expectedUnderstanding", "다른 기간 분석과의 차이"]) if (!source.includes(required)) throw new Error(`Missing Period UX contract: ${required}`);
if (source.includes("periodProducts.map(renderProductRow)")) throw new Error("Period mode must not use the repeated purchase-row list");

console.log("period-purchase-decision-regression: OK");