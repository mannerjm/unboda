"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "../supabase/auth";
import {
  removeInterestedAnalysis,
  saveInterestedAnalysis,
} from "./server";

/**
 * Server action to save an interested analysis.
 * Requires authentication.
 */
export async function saveAnalysisAction(productId: string): Promise<void> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?returnTo=/deep-analysis");
  }

  await saveInterestedAnalysis(user.id, productId);
}

/**
 * Server action to remove an interested analysis.
 * Requires authentication.
 */
export async function removeAnalysisAction(productId: string): Promise<void> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login?returnTo=/deep-analysis");
  }

  await removeInterestedAnalysis(user.id, productId);
}
