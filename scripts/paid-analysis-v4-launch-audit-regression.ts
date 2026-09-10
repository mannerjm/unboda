import { assertPaidAnalysisV4LaunchCatalogReady } from "../app/lib/paidAnalysisV4LaunchAudit";
import { getLaunchProductIds } from "../app/lib/paidAnalysisTopicConfig";

const report = assertPaidAnalysisV4LaunchCatalogReady();

if (report.launchProductCount !== 54) {
  throw new Error(`expected 54 launch products, got ${report.launchProductCount}`);
}
if (report.topicProductCount !== 47) {
  throw new Error(`expected 47 topic products, got ${report.topicProductCount}`);
}
if (report.periodProductCount !== 7) {
  throw new Error(`expected 7 period products, got ${report.periodProductCount}`);
}

const auditedIds = new Set(report.products.map((item) => item.productId));
const launchIds = getLaunchProductIds();
if (auditedIds.size !== launchIds.length || launchIds.some((id) => !auditedIds.has(id))) {
  throw new Error("every Launch product must be included in the V4 static audit");
}

console.log(
  `[v4-launch-audit] PASS total=${report.launchProductCount} topic=${report.topicProductCount} period=${report.periodProductCount}`,
);
