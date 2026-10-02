"use client";

import { useEffect, useState, type ReactNode } from "react";

type Props = {
  productId: string;
  profileId: string;
  edition: string;
  initialCompleted: boolean;
  children: ReactNode;
};

/**
 * Prevent post-report actions and cross-sell cards from appearing before the
 * purchased report is actually persisted and visible. First purchases unlock
 * on the exact report-ready event; revisits render immediately from the server
 * verified completed snapshot.
 */
export default function ReportCompletionGate({
  productId,
  profileId,
  edition,
  initialCompleted,
  children,
}: Props) {
  const [completed, setCompleted] = useState(initialCompleted);

  useEffect(() => {
    if (initialCompleted) setCompleted(true);
  }, [initialCompleted]);

  useEffect(() => {
    if (completed) return;

    const onReportReady = (event: Event) => {
      const detail = (event as CustomEvent<{
        productId: string;
        profileId: string;
        edition?: string;
      }>).detail;

      if (
        detail?.productId !== productId
        || detail.profileId !== profileId
        || (detail.edition && detail.edition !== edition)
      ) {
        return;
      }

      setCompleted(true);
    };

    window.addEventListener("unboda:paid-report-ready", onReportReady);
    return () => window.removeEventListener("unboda:paid-report-ready", onReportReady);
  }, [completed, edition, productId, profileId]);

  if (!completed) return null;
  return <>{children}</>;
}
