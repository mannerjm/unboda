/**
 * STEP 57D-48F-G: Utilities for displaying multiple editions of purchased analyses.
 */

import type { PaidAnalysisSummary } from "./paidReports/server";
import { compareEditionKeys, formatAnalysisEditionLabel } from "./analysisEditionLabel";

/**
 * Multi-edition product group representing all editions of one analysis.
 * Used for purchased-analyses library display.
 */
export type PurchasedAnalysisProductGroup = {
  profileId: string;
  productId: string;
  productName: string;
  latestAcquiredAt: string;
  editions: Array<{
    analysisEditionKey: string | null;
    reportStatus: "none" | "generating" | "completed" | "failed";
    editionLabel: string;
    isLatest: boolean;
    acquiredAt: string;
    acquisitionSource: "purchase" | "subscription" | "credit" | "grant";
  }>;
};

/**
 * Group multi-edition summaries by product and sort editions.
 * Newer editions appear first within each product group.
 * Products maintain their original order.
 */
export function groupPurchasedAnalysesByProduct(
  summaries: readonly PaidAnalysisSummary[],
): PurchasedAnalysisProductGroup[] {
  const groupsByProductId = new Map<
    string,
    {
      profileId: string;
      productId: string;
      productName: string;
      editions: Map<string | null, PaidAnalysisSummary>;
    }
  >();

  // Group by product
  for (const summary of summaries) {
    const key = `${summary.profileId}|${summary.productId}`;
    if (!groupsByProductId.has(key)) {
      groupsByProductId.set(key, {
        profileId: summary.profileId,
        productId: summary.productId,
        productName: summary.productName,
        editions: new Map(),
      });
    }
    const group = groupsByProductId.get(key)!;
    group.editions.set(summary.analysisEditionKey, summary);
  }

  // Convert to result type, sorting editions within each group
  return Array.from(groupsByProductId.values()).map((group) => {
    const sortedEditions = Array.from(group.editions.entries()).sort(
      ([keyA], [keyB]) => {
        // null editions (LEGACY) sort to the end
        if (keyA === null && keyB === null) return 0;
        if (keyA === null) return 1;
        if (keyB === null) return -1;
        // Compare by semantic edition ordering (newest first)
        return compareEditionKeys(keyA, keyB);
      },
    );

    const editions = sortedEditions.map(([editionKey, summary], index) => ({
      analysisEditionKey: editionKey,
      reportStatus: summary.reportStatus,
      editionLabel: formatAnalysisEditionLabel(editionKey ?? "LEGACY"),
      isLatest: index === 0, // First (most recent) edition
      acquiredAt: summary.acquiredAt,
      acquisitionSource: summary.acquisitionSource,
    }));
    const latestAcquiredAt = editions.reduce(
      (latest, edition) => edition.acquiredAt > latest ? edition.acquiredAt : latest,
      "",
    );

    return {
      profileId: group.profileId,
      productId: group.productId,
      productName: group.productName,
      latestAcquiredAt,
      editions,
    };
  }).sort((a, b) =>
    b.latestAcquiredAt.localeCompare(a.latestAcquiredAt)
      || a.productName.localeCompare(b.productName, "ko-KR"),
  );
}
