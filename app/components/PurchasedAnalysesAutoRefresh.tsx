"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import PurchasedAnalysesListMultiEdition from "./PurchasedAnalysesListMultiEdition";
import type { PurchasedAnalysisProductGroup } from "@/app/lib/purchasedAnalysesGrouping";
import type { PurchasedLibraryPage, PurchasedLibraryOverview } from "@/app/lib/purchasedAnalysesLibrary";
import type { Phase9NextAnalysisRecommendation } from "@/app/lib/phase9NextAnalysis";

const REFRESH_INTERVAL_MS = 4_000;

type PurchasedAnalysesAutoRefreshProps = {
  groups: readonly PurchasedAnalysisProductGroup[];
  profileId: string;
  libraryPage?: PurchasedLibraryPage;
  libraryOverview?: PurchasedLibraryOverview;
  phase9Recommendations?: readonly Phase9NextAnalysisRecommendation[];
};

export default function PurchasedAnalysesAutoRefresh({
  groups,
  profileId,
  libraryPage,
  libraryOverview,
  phase9Recommendations = [],
}: PurchasedAnalysesAutoRefreshProps) {
  const router = useRouter();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const refreshInFlight = useRef(false);
  const hasPreparingEdition = libraryOverview
    ? libraryOverview.preparingCount > 0
    : groups.some((group) => group.editions.some(
        (edition) => edition.reportStatus === "none" || edition.reportStatus === "generating",
      ));

  useEffect(() => {
    if (!hasPreparingEdition) {
      return;
    }

    const refresh = () => {
      if (document.hidden || refreshInFlight.current || isRefreshing) {
        return;
      }

      refreshInFlight.current = true;
      startRefreshTransition(() => {
        router.refresh();
      });
    };

    const intervalId = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [hasPreparingEdition, isRefreshing, router, startRefreshTransition]);

  useEffect(() => {
    if (!isRefreshing) {
      refreshInFlight.current = false;
    }
  }, [isRefreshing]);

  return <PurchasedAnalysesListMultiEdition groups={groups} profileId={profileId} libraryPage={libraryPage} libraryOverview={libraryOverview} phase9Recommendations={phase9Recommendations} />;
}
