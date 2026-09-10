import { assertPaidAnalysisV4PriceTiersReady } from "../app/lib/paidAnalysisV4PriceTierAudit";

const report = assertPaidAnalysisV4PriceTiersReady();
const { CORE, DEEP, LONG_RANGE, SIGNATURE } = report.familyCounts;

console.log(
  `[v4-price-tier-audit] PASS total=${report.launchProductCount} CORE=${CORE} DEEP=${DEEP} LONG_RANGE=${LONG_RANGE} SIGNATURE=${SIGNATURE}`,
);
