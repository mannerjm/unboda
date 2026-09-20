"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import PaidReportPreparing from "./PaidReportPreparing";

export default function CompatibilityPaidReportPreparing({ failed = false }: { failed?: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (failed) return;
    const timer = window.setInterval(() => router.refresh(), 4_000);
    return () => window.clearInterval(timer);
  }, [failed, router]);

  return <PaidReportPreparing kind="compatibility" failed={failed} />;
}
