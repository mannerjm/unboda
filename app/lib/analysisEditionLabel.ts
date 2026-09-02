/**
 * STEP 57D-48F-G: Multi-edition paid analysis display labels and utilities.
 */

import type { AnalysisReferenceSnapshot } from "./analysisEditionForOrder";

/**
 * Customer-facing label for an analysis edition.
 * Never exposes raw edition keys; prefers semantic labels from reference metadata.
 */
export function formatAnalysisEditionLabel(
  editionKey: string,
  referenceSnapshot?: AnalysisReferenceSnapshot | null,
): string {
  // Extract policy from edition key format
  const parts = editionKey.split(":");

  switch (parts[0]) {
    case "MONTH":
      // MONTH:2026-09 → 2026년 9월 분석
      if (/^\d{4}-(0[1-9]|1[0-2])$/.test(parts[1] ?? "")) {
        const [year, month] = parts[1].split("-");
        return `${year}년 ${Number(month)}월 분석`;
      }
      return "구매한 분석";

    case "YEAR":
      // YEAR:2026 → 2026년 분석
      return /^\d{4}$/.test(parts[1] ?? "") ? `${parts[1]}년 분석` : "구매한 분석";

    case "TARGET_MONTH":
      // TARGET_MONTH:2026-10 → 2026년 10월 대상 분석
      if (/^\d{4}-(0[1-9]|1[0-2])$/.test(parts[1] ?? "")) {
        const [year, month] = parts[1].split("-");
        return `${year}년 ${Number(month)}월 대상 분석`;
      }
      return "구매한 분석";

    case "TARGET_YEAR":
      // TARGET_YEAR:2027 → 2027년 대상 분석
      return /^\d{4}$/.test(parts[1] ?? "") ? `${parts[1]}년 대상 분석` : "구매한 분석";

    case "RANGE":
      // RANGE:2026-2028 → 2026~2028년 분석
      if (/^\d{4}-\d{4}$/.test(parts[1] ?? "")) {
        const [start, end] = parts[1].split("-");
        return `${start}~${end}년 분석`;
      }
      return "구매한 분석";

    case "DAEUN":
      // DAEUN:3:계유 → 현재 대운 분석
      // Use reference metadata if available for more accurate label
      if (referenceSnapshot?.fortune?.daeunOrder !== undefined) {
        return `${referenceSnapshot.fortune.daeunOrder}번째 대운 분석`;
      }
      return /^\d+:[^:]+$/.test(parts.slice(1).join(":")) ? "대운 분석" : "구매한 분석";

    case "LIFETIME":
      // LIFETIME → 평생 분석
      return "평생 분석";

    case "LEGACY":
      // LEGACY → 기존 구매 분석
      return "기존 구매 분석";

    default:
      return "구매한 분석";
  }
}

/**
 * Semantic sort key for edition ordering.
 * Returns a tuple for deterministic comparison.
 * Later editions should sort before earlier editions (descending).
 */
export function getEditionSortKey(editionKey: string): [number, string] {
  const parts = editionKey.split(":");

  switch (parts[0]) {
    case "MONTH": {
      // MONTH:2026-09 → sort descending by year-month
      // [1] = type order, "-2026-09" = descending string sort
      const dateStr = parts[1] || "0000-00";
      return [1, dateStr];
    }

    case "YEAR": {
      // YEAR:2026 → sort descending by year
      const year = parts[1] || "0000";
      return [2, year];
    }

    case "TARGET_MONTH": {
      // TARGET_MONTH:2026-10 → sort descending by target year-month
      const dateStr = parts[1] || "0000-00";
      return [3, dateStr];
    }

    case "TARGET_YEAR": {
      // TARGET_YEAR:2027 → sort descending by target year
      const year = parts[1] || "0000";
      return [4, year];
    }

    case "RANGE": {
      // RANGE:2026-2028 → sort descending by end year, then start year
      const [start, end] = (parts[1] || "0000-0000").split("-");
      return [5, `${end}-${start}`];
    }

    case "DAEUN": {
      // DAEUN:3:계유 → sort descending by daeun order
      const order = parts[1] || "0";
      return [6, order.padStart(2, "0")];
    }

    case "LIFETIME":
      // LIFETIME → single edition, sorts highest
      return [7, ""];

    case "LEGACY":
      // LEGACY → historical fallback, sorts lowest
      return [0, ""];

    default:
      // Unknown editions sort between LEGACY and MONTH
      return [0, editionKey];
  }
}

/**
 * Compare two edition keys for sorting.
 * Returns negative if a < b, positive if a > b, 0 if equal.
 * Higher sort keys should appear first (descending).
 */
export function compareEditionKeys(a: string, b: string): number {
  const [aType, aKey] = getEditionSortKey(a);
  const [bType, bKey] = getEditionSortKey(b);

  if (aType !== bType) {
    return bType - aType; // Later types first (descending)
  }

  return bKey.localeCompare(aKey);
}
