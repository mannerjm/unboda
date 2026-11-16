"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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


/**
 * Save a public compatibility category into the existing profile-scoped library.
 * Only the five published product IDs are accepted; never store partner details.
 */
export async function saveCompatibilityInterestAction(productId: string): Promise<void> {
  const { getCompatibilityInterestCard } = await import("./compatibilityCatalog");
  if (!getCompatibilityInterestCard(productId)) {
    throw new Error("관심 분석에 저장할 수 없는 궁합 상품입니다.");
  }
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login?returnTo=/special-analysis/compatibility");
  }
  await saveInterestedAnalysis(user.id, productId);
  revalidatePath("/interests");
  revalidatePath("/special-analysis/compatibility");
}
