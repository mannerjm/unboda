import { createAdminClient } from "../supabase/admin";
import { getActiveProfile } from "../profiles/activeServer";
import {
  getCanonicalPremiumProductId,
  getPremiumProduct,
} from "../premiumProductRegistry";
import type { PremiumProductDefinition } from "../premiumProductRegistry";
import { resolveAnalysisEditionForOrder } from "../analysisEditionForOrder";
import { compareEditionKeys } from "../analysisEditionLabel";
import { listUserEntitlements } from "../purchases/server";
import { PAID_ANALYSIS_RESOURCE_TYPE, type EntitlementRecord } from "../purchases/types";

export type InterestedAnalysisRecord = {
  id: string;
  userId: string;
  profileId: string;
  productId: string;
  createdAt: string;
  updatedAt: string;
};

export type InterestedAnalysisCurrentState = {
  productId: string;
  isSaved: true;
  currentEditionKey: string | null;
  ownsCurrentEdition: boolean;
  hasAnyActiveOwnedEdition: boolean;
  latestOwnedEditionKey: string | null;
};

export type InterestedAnalysisWithCurrentState = {
  record: InterestedAnalysisRecord;
  currentState: InterestedAnalysisCurrentState;
};

type InterestedAnalysisRow = {
  id: string;
  user_id: string;
  profile_id: string;
  product_id: string;
  created_at: string;
  updated_at: string;
};

function toInterestedAnalysisRecord(
  row: InterestedAnalysisRow,
): InterestedAnalysisRecord {
  return {
    id: row.id,
    userId: row.user_id,
    profileId: row.profile_id,
    productId: row.product_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listInterestedAnalysesForProfile(
  userId: string,
  profileId: string,
): Promise<InterestedAnalysisRecord[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interested_analyses")
    .select("*")
    .eq("user_id", userId)
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `관심 분석 목록을 조회하지 못했습니다: ${error.message}`,
    );
  }

  return (data ?? []).map(toInterestedAnalysisRecord);
}

/**
 * List all interested analyses for the current active profile of a user.
 * Returns empty array if no active profile exists.
 */
export async function listUserInterestedAnalyses(
  userId: string,
): Promise<InterestedAnalysisRecord[]> {
  const activeProfile = await getActiveProfile(userId);
  if (!activeProfile) {
    return [];
  }

  return listInterestedAnalysesForProfile(userId, activeProfile.id);
}

function latestOwnedEditionKey(
  entitlements: readonly EntitlementRecord[],
): string | null {
  return [...entitlements]
    .sort((left, right) =>
      compareEditionKeys(
        left.analysisEditionKey ?? "LEGACY",
        right.analysisEditionKey ?? "LEGACY",
      ) || right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id),
    )[0]?.analysisEditionKey ?? null;
}

export function deriveInterestedAnalysisCurrentState(
  record: InterestedAnalysisRecord,
  currentEditionKey: string | null,
  ownedEntitlements: readonly EntitlementRecord[],
): InterestedAnalysisCurrentState {
  return {
    productId: record.productId,
    isSaved: true,
    currentEditionKey,
    ownsCurrentEdition: currentEditionKey !== null && ownedEntitlements.some(
      (entitlement) => entitlement.analysisEditionKey === currentEditionKey,
    ),
    hasAnyActiveOwnedEdition: ownedEntitlements.length > 0,
    latestOwnedEditionKey: latestOwnedEditionKey(ownedEntitlements),
  };
}

/**
 * Read-only current-edition display state for the active profile's saved
 * products. It never writes interest rows or changes the P0 purchase guard.
 */
export async function listUserInterestedAnalysesWithCurrentState(
  userId: string,
  options: { anchorDate?: string } = {},
): Promise<InterestedAnalysisWithCurrentState[]> {
  const activeProfile = await getActiveProfile(userId);
  if (!activeProfile) {
    return [];
  }

  const [records, entitlements] = await Promise.all([
    listInterestedAnalysesForProfile(userId, activeProfile.id),
    listUserEntitlements(userId),
  ]);
  const activeEntitlementsByProductId = new Map<string, EntitlementRecord[]>();

  for (const entitlement of entitlements) {
    if (
      entitlement.profileId !== activeProfile.id ||
      entitlement.resourceType !== PAID_ANALYSIS_RESOURCE_TYPE
    ) {
      continue;
    }

    const productId = getCanonicalPremiumProductId(entitlement.resourceId);
    if (!productId) {
      continue;
    }

    const productEntitlements = activeEntitlementsByProductId.get(productId) ?? [];
    productEntitlements.push(entitlement);
    activeEntitlementsByProductId.set(productId, productEntitlements);
  }

  return Promise.all(records.map(async (record) => {
    const productId = getCanonicalPremiumProductId(record.productId);
    const ownedEntitlements = productId
      ? activeEntitlementsByProductId.get(productId) ?? []
      : [];
    let currentEditionKey: string | null = null;

    if (productId) {
      try {
        currentEditionKey = (await resolveAnalysisEditionForOrder({
          userId,
          profileId: activeProfile.id,
          profile: activeProfile,
          productId,
          anchorDate: options.anchorDate,
        })).editionKey;
      } catch {
        // An unresolved policy must never make an old entitlement look current.
        currentEditionKey = null;
      }
    }

    return { record, currentState: deriveInterestedAnalysisCurrentState(record, currentEditionKey, ownedEntitlements) };
  }));
}

/**
 * Check if a specific product is saved as an interested analysis
 * for the current active profile of a user.
 */
export async function isProductSaved(
  userId: string,
  productId: string,
): Promise<boolean> {
  const activeProfile = await getActiveProfile(userId);
  if (!activeProfile) {
    return false;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interested_analyses")
    .select("id")
    .eq("user_id", userId)
    .eq("profile_id", activeProfile.id)
    .eq("product_id", productId)
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(
      `저장 여부를 확인하지 못했습니다: ${error.message}`,
    );
  }

  return data !== null;
}

/**
 * Save an analysis as interested for the current active profile.
 * Idempotent: saving an already-saved product is safe.
 */
export async function saveInterestedAnalysis(
  userId: string,
  productId: string,
): Promise<InterestedAnalysisRecord> {
  // Resolve active profile server-side
  const activeProfile = await getActiveProfile(userId);
  if (!activeProfile) {
    throw new Error(
      "분석할 프로필이 없습니다. 마이페이지에서 프로필을 먼저 선택해 주세요.",
    );
  }

  // Validate product exists and is saveable
  const canonicalProductId = getCanonicalPremiumProductId(productId);
  if (!canonicalProductId) {
    throw new Error("알 수 없는 분석입니다.");
  }

  const product = getPremiumProduct(canonicalProductId);
  if (!product) {
    throw new Error("알 수 없는 분석입니다.");
  }

  // Product exists in current registry and is available for new saves
  // Historical products that are removed from the registry cannot be newly saved,
  // but this validation happens naturally through getPremiumProduct()
  if (!product) {
    throw new Error("이 분석은 현재 저장할 수 없습니다.");
  }

  const supabase = createAdminClient();

  // Upsert to make it idempotent: if already saved, just return it
  const { data, error } = await supabase
    .from("interested_analyses")
    .upsert(
      {
        user_id: userId,
        profile_id: activeProfile.id,
        product_id: canonicalProductId,
      },
      {
        onConflict: "user_id,profile_id,product_id",
      },
    )
    .select()
    .single<InterestedAnalysisRow>();

  if (error) {
    throw new Error(
      `관심 분석을 저장하지 못했습니다: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error("관심 분석을 저장하지 못했습니다.");
  }

  return toInterestedAnalysisRecord(data);
}

/**
 * Remove an analysis from interested for the current active profile.
 * Idempotent: removing a non-saved product is safe.
 */
export async function removeInterestedAnalysis(
  userId: string,
  productId: string,
): Promise<void> {
  // Resolve active profile server-side
  const activeProfile = await getActiveProfile(userId);
  if (!activeProfile) {
    // If no active profile, just silently succeed (nothing to remove)
    return;
  }

  const canonicalProductId = getCanonicalPremiumProductId(productId);
  if (!canonicalProductId) {
    // If product doesn't exist, just silently succeed
    return;
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("interested_analyses")
    .delete()
    .eq("user_id", userId)
    .eq("profile_id", activeProfile.id)
    .eq("product_id", canonicalProductId);

  if (error) {
    throw new Error(
      `관심 분석을 제거하지 못했습니다: ${error.message}`,
    );
  }
}

/**
 * Get product definitions for a list of interested analyses.
 * Safely filters out products that no longer exist in the registry.
 */
export function getInterestedAnalysisProducts(
  records: InterestedAnalysisRecord[],
): Array<{ record: InterestedAnalysisRecord; product: PremiumProductDefinition }> {
  return records
    .map((record) => {
      const product = getPremiumProduct(record.productId);
      return product ? { record, product } : null;
    })
    .filter(
      (item): item is { record: InterestedAnalysisRecord; product: PremiumProductDefinition } =>
        item !== null,
    );
}
