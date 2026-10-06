import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { requireOperator } from "@/app/lib/operators/server";
import { getPremiumProduct } from "@/app/lib/premiumProductRegistry";
import { getSpecialAnalysisProduct } from "@/app/lib/specialAnalysisProducts";
import { createAdminClient } from "@/app/lib/supabase/admin";

export type ReviewStatus = "PENDING" | "PUBLISHED" | "HIDDEN";

export type PublicProductReview = {
  id: string;
  rating: number;
  easyToUnderstand: number;
  helpfulness: number;
  aiConsultingUsed: boolean;
  aiConsultingHelpfulness: number | null;
  body: string;
  createdAt: string;
};

export type PublicProductReviewSummary = {
  productId: string;
  productTitle: string;
  count: number;
  averageRating: number | null;
  reviews: PublicProductReview[];
};

export type OwnVerifiedReview = PublicProductReview & {
  status: ReviewStatus;
  moderationReason: string | null;
  updatedAt: string;
};

export type VerifiedReviewContext = {
  eligible: boolean;
  aiConsultingUsed: boolean;
  ownReview: OwnVerifiedReview | null;
};

export type AdminReviewItem = {
  id: string;
  productId: string;
  productTitle: string;
  analysisEditionKey: string;
  rating: number;
  easyToUnderstand: number;
  helpfulness: number;
  aiConsultingUsed: boolean;
  aiConsultingHelpfulness: number | null;
  body: string;
  status: ReviewStatus;
  moderationReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AdminReviewDashboard = {
  total: number;
  pending: number;
  published: number;
  hidden: number;
  averagePublishedRating: number | null;
  completedPurchases: number;
  reviewWriteRate: number | null;
  aiConsultingReviewCount: number;
  recent30: number;
  items: AdminReviewItem[];
};

type ReviewRow = {
  id: string;
  product_id: string;
  analysis_edition_key: string;
  rating: number;
  easy_to_understand: number;
  helpfulness: number;
  ai_consulting_used: boolean;
  ai_consulting_helpfulness: number | null;
  body: string;
  status: ReviewStatus;
  moderation_reason: string | null;
  created_at: string;
  updated_at: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_CHARS = 500;
const MIN_BODY_CHARS = 10;

function productTitle(productId: string): string | null {
  return getSpecialAnalysisProduct(productId)?.title
    ?? getPremiumProduct(productId)?.title
    ?? null;
}

export function isReviewableProduct(productId: unknown): productId is string {
  return typeof productId === "string"
    && productId.length > 0
    && productId.length <= 120
    && Boolean(productTitle(productId));
}

function isScore(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
}

function normalizeEdition(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length >= 1 && normalized.length <= 180 ? normalized : null;
}

function toPublicReview(row: ReviewRow): PublicProductReview {
  return {
    id: row.id,
    rating: row.rating,
    easyToUnderstand: row.easy_to_understand,
    helpfulness: row.helpfulness,
    aiConsultingUsed: row.ai_consulting_used,
    aiConsultingHelpfulness: row.ai_consulting_helpfulness,
    body: row.body,
    createdAt: row.created_at,
  };
}

function toOwnReview(row: ReviewRow): OwnVerifiedReview {
  return {
    ...toPublicReview(row),
    status: row.status,
    moderationReason: row.moderation_reason,
    updatedAt: row.updated_at,
  };
}

async function getCompletedPurchase(input: {
  userId: string;
  profileId: string;
  productId: string;
  analysisEditionKey: string;
}) {
  const { data, error } = await createAdminClient()
    .from("paid_reports")
    .select("purchase_id")
    .eq("user_id", input.userId)
    .eq("profile_id", input.profileId)
    .eq("product_id", input.productId)
    .eq("analysis_edition_key", input.analysisEditionKey)
    .eq("status", "completed")
    .not("purchase_id", "is", null)
    .maybeSingle<{ purchase_id: string | null }>();

  if (error) throw new Error("REVIEW_REPORT_LOOKUP_FAILED");
  if (!data?.purchase_id) return null;

  const { data: purchase, error: purchaseError } = await createAdminClient()
    .from("purchases")
    .select("id")
    .eq("id", data.purchase_id)
    .eq("user_id", input.userId)
    .eq("profile_id", input.profileId)
    .eq("product_id", input.productId)
    .eq("analysis_edition_key", input.analysisEditionKey)
    .maybeSingle<{ id: string }>();

  if (purchaseError) throw new Error("REVIEW_PURCHASE_LOOKUP_FAILED");
  return purchase?.id ?? null;
}

async function hasUsedAiConsulting(input: {
  userId: string;
  profileId: string;
  productId: string;
  analysisEditionKey: string;
}): Promise<boolean> {
  const { count, error } = await createAdminClient()
    .from("ai_consulting_threads")
    .select("id", { count: "exact", head: true })
    .eq("user_id", input.userId)
    .eq("profile_id", input.profileId)
    .eq("base_product_id", input.productId)
    .eq("analysis_edition_key", input.analysisEditionKey);
  if (error) return false;
  return (count ?? 0) > 0;
}

export async function getPublicProductReviewSummary(
  productId: string,
  limit = 4,
): Promise<PublicProductReviewSummary> {
  const title = productTitle(productId);
  if (!title) throw new Error("REVIEW_PRODUCT_INVALID");

  const { data, error } = await createAdminClient()
    .from("paid_product_reviews")
    .select("id,product_id,analysis_edition_key,rating,easy_to_understand,helpfulness,ai_consulting_used,ai_consulting_helpfulness,body,status,moderation_reason,created_at,updated_at")
    .eq("product_id", productId)
    .eq("status", "PUBLISHED")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw new Error("REVIEW_PUBLIC_LOOKUP_FAILED");

  const rows = (data ?? []) as ReviewRow[];
  const count = rows.length;
  const averageRating = count > 0
    ? rows.reduce((sum, row) => sum + row.rating, 0) / count
    : null;

  return {
    productId,
    productTitle: title,
    count,
    averageRating,
    reviews: rows.slice(0, Math.max(1, Math.min(limit, 12))).map(toPublicReview),
  };
}

export async function getVerifiedReviewContext(input: {
  userId: string;
  profileId: string;
  productId: string;
  analysisEditionKey: string;
}): Promise<VerifiedReviewContext> {
  const purchaseId = await getCompletedPurchase(input);
  if (!purchaseId) return { eligible: false, aiConsultingUsed: false, ownReview: null };

  const [aiConsultingUsed, reviewResult] = await Promise.all([
    hasUsedAiConsulting(input),
    createAdminClient()
      .from("paid_product_reviews")
      .select("id,product_id,analysis_edition_key,rating,easy_to_understand,helpfulness,ai_consulting_used,ai_consulting_helpfulness,body,status,moderation_reason,created_at,updated_at")
      .eq("purchase_id", purchaseId)
      .eq("user_id", input.userId)
      .maybeSingle<ReviewRow>(),
  ]);
  if (reviewResult.error) throw new Error("REVIEW_OWN_LOOKUP_FAILED");

  return {
    eligible: true,
    aiConsultingUsed,
    ownReview: reviewResult.data ? toOwnReview(reviewResult.data) : null,
  };
}

export async function saveVerifiedReview(input: {
  userId: string;
  profileId: unknown;
  productId: unknown;
  analysisEditionKey: unknown;
  rating: unknown;
  easyToUnderstand: unknown;
  helpfulness: unknown;
  aiConsultingHelpfulness: unknown;
  body: unknown;
}): Promise<OwnVerifiedReview> {
  if (
    typeof input.profileId !== "string"
    || !UUID_PATTERN.test(input.profileId)
    || !isReviewableProduct(input.productId)
  ) {
    throw new Error("REVIEW_INPUT_INVALID");
  }
  const edition = normalizeEdition(input.analysisEditionKey);
  const body = typeof input.body === "string" ? input.body.trim() : "";
  if (
    !edition
    || !isScore(input.rating, 1, 5)
    || !isScore(input.easyToUnderstand, 1, 3)
    || !isScore(input.helpfulness, 1, 3)
    || body.length < MIN_BODY_CHARS
    || body.length > MAX_BODY_CHARS
  ) {
    throw new Error("REVIEW_INPUT_INVALID");
  }

  const purchaseId = await getCompletedPurchase({
    userId: input.userId,
    profileId: input.profileId,
    productId: input.productId,
    analysisEditionKey: edition,
  });
  if (!purchaseId) throw new Error("REVIEW_NOT_ELIGIBLE");

  const aiConsultingUsed = await hasUsedAiConsulting({
    userId: input.userId,
    profileId: input.profileId,
    productId: input.productId,
    analysisEditionKey: edition,
  });
  const aiScore = aiConsultingUsed && isScore(input.aiConsultingHelpfulness, 1, 3)
    ? input.aiConsultingHelpfulness
    : null;

  const { data, error } = await createAdminClient()
    .from("paid_product_reviews")
    .upsert({
      user_id: input.userId,
      profile_id: input.profileId,
      purchase_id: purchaseId,
      product_id: input.productId,
      analysis_edition_key: edition,
      rating: input.rating,
      easy_to_understand: input.easyToUnderstand,
      helpfulness: input.helpfulness,
      ai_consulting_used: aiConsultingUsed,
      ai_consulting_helpfulness: aiScore,
      body,
      status: "PENDING",
      moderation_reason: null,
      moderated_at: null,
      moderated_by_operator_id: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "purchase_id" })
    .select("id,product_id,analysis_edition_key,rating,easy_to_understand,helpfulness,ai_consulting_used,ai_consulting_helpfulness,body,status,moderation_reason,created_at,updated_at")
    .single<ReviewRow>();

  if (error || !data) throw new Error("REVIEW_SAVE_FAILED");
  return toOwnReview(data);
}

export async function deleteVerifiedReview(input: {
  userId: string;
  profileId: unknown;
  productId: unknown;
  analysisEditionKey: unknown;
}): Promise<void> {
  if (
    typeof input.profileId !== "string"
    || !UUID_PATTERN.test(input.profileId)
    || !isReviewableProduct(input.productId)
  ) {
    throw new Error("REVIEW_INPUT_INVALID");
  }
  const edition = normalizeEdition(input.analysisEditionKey);
  if (!edition) throw new Error("REVIEW_INPUT_INVALID");

  const purchaseId = await getCompletedPurchase({
    userId: input.userId,
    profileId: input.profileId,
    productId: input.productId,
    analysisEditionKey: edition,
  });
  if (!purchaseId) throw new Error("REVIEW_NOT_ELIGIBLE");

  const { error } = await createAdminClient()
    .from("paid_product_reviews")
    .delete()
    .eq("purchase_id", purchaseId)
    .eq("user_id", input.userId);
  if (error) throw new Error("REVIEW_DELETE_FAILED");
}

export async function getAdminReviewDashboard(): Promise<AdminReviewDashboard> {
  await requireOperator();
  const client = createAdminClient();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();

  const [reviewsResult, completedResult] = await Promise.all([
    client
      .from("paid_product_reviews")
      .select("id,product_id,analysis_edition_key,rating,easy_to_understand,helpfulness,ai_consulting_used,ai_consulting_helpfulness,body,status,moderation_reason,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(100),
    client
      .from("paid_reports")
      .select("purchase_id", { count: "exact", head: true })
      .eq("status", "completed")
      .not("purchase_id", "is", null),
  ]);
  if (reviewsResult.error || completedResult.error) throw new Error("REVIEW_ADMIN_LOOKUP_FAILED");

  const rows = (reviewsResult.data ?? []) as ReviewRow[];
  const total = rows.length;
  const publishedRows = rows.filter((row) => row.status === "PUBLISHED");
  const completedPurchases = completedResult.count ?? 0;
  return {
    total,
    pending: rows.filter((row) => row.status === "PENDING").length,
    published: publishedRows.length,
    hidden: rows.filter((row) => row.status === "HIDDEN").length,
    averagePublishedRating: publishedRows.length
      ? publishedRows.reduce((sum, row) => sum + row.rating, 0) / publishedRows.length
      : null,
    completedPurchases,
    reviewWriteRate: completedPurchases > 0 ? total / completedPurchases : null,
    aiConsultingReviewCount: rows.filter((row) => row.ai_consulting_used).length,
    recent30: rows.filter((row) => row.created_at >= thirtyDaysAgo).length,
    items: rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      productTitle: productTitle(row.product_id) ?? row.product_id,
      analysisEditionKey: row.analysis_edition_key,
      rating: row.rating,
      easyToUnderstand: row.easy_to_understand,
      helpfulness: row.helpfulness,
      aiConsultingUsed: row.ai_consulting_used,
      aiConsultingHelpfulness: row.ai_consulting_helpfulness,
      body: row.body,
      status: row.status,
      moderationReason: row.moderation_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  };
}

export async function moderateReview(input: {
  reviewId: unknown;
  status: unknown;
  reason: unknown;
}): Promise<void> {
  const operator = await requireOperator();
  if (
    typeof input.reviewId !== "string"
    || !UUID_PATTERN.test(input.reviewId)
    || (input.status !== "PUBLISHED" && input.status !== "HIDDEN")
  ) {
    throw new Error("REVIEW_MODERATION_INVALID");
  }
  const reason = typeof input.reason === "string" ? input.reason.trim() : "";
  if (reason.length > 240) throw new Error("REVIEW_MODERATION_INVALID");

  const targetHash = createHash("sha256").update(input.reviewId).digest("hex");
  const { error } = await createAdminClient().rpc("operator_moderate_paid_product_review", {
    p_operator_id: operator.operatorId,
    p_operator_auth_user_id: operator.authUserId,
    p_review_id: input.reviewId,
    p_status: input.status,
    p_reason: reason || null,
    p_target_reference_hash: targetHash,
    p_correlation_id: randomUUID(),
  });
  if (error) throw new Error(error.message.includes("REVIEW_NOT_FOUND") ? "REVIEW_NOT_FOUND" : "REVIEW_MODERATION_FAILED");
}
