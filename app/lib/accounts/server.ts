import { createAdminClient } from "../supabase/admin";
import { getCurrentUser, type AuthenticatedUser } from "../supabase/auth";

export type AccountLifecycleStatus = "ACTIVE" | "DELETION_REQUESTED" | "CLOSED";
export type PaidEligibilityStatus = "UNVERIFIED" | "VERIFIED_ADULT" | "REVOKED";
export type AccountClosureFinancialBlocker = "REFUND_IN_PROGRESS" | "REFUND_OWNER_REVIEW" | "PAYMENT_RECONCILIATION_REQUIRED";

export type AccountLifecycle = {
  userId: string;
  generation: number;
  status: AccountLifecycleStatus;
  paidEligibilityStatus: PaidEligibilityStatus;
  paidEligibilityMethod: "DECLARATION" | "EXTERNAL_PROVIDER" | null;
  paidEligibilityProvider: string | null;
  paidEligibleAt: string | null;
  paidEligibilityPolicyVersion: string | null;
  paidEligibilityInvalidatedAt: string | null;
  finalizationStartedAt?: string | null;
  dataScrubbedAt?: string | null;
  finalizedAt?: string | null;
};

/**
 * Machine-readable reasons why account service access is blocked.
 * Used in AccountAccessDecision for structured error reporting.
 */
export type AccountAccessBlockReason =
  | "AUTHENTICATION_REQUIRED"
  | "ACCOUNT_NOT_ACTIVE"
  | "ACCOUNT_DELETED"
  | "EMAIL_NOT_VERIFIED"
  | "PAID_ELIGIBILITY_UNVERIFIED"
  | "PAID_ELIGIBILITY_REVOKED"
  | "UNKNOWN_ERROR";

/**
 * Canonical structured decision for whether account can access a service.
 * Allows clear separation of: internal error state, machine reason, and policy decision.
 */
export type AccountAccessDecision =
  | { allowed: true; account: AccountLifecycle; user: AuthenticatedUser }
  | { allowed: false; reason: AccountAccessBlockReason; account?: AccountLifecycle };

/**
 * Machine-readable reasons why paid purchase is blocked.
 * Used in PaidPurchaseEligibilityDecision for structured error reporting.
 */
export type PaidPurchaseBlockReason =
  | "AUTHENTICATION_REQUIRED"
  | "ACCOUNT_NOT_ACTIVE"
  | "ACCOUNT_DELETED"
  | "EMAIL_NOT_VERIFIED"
  | "PAID_ELIGIBILITY_UNVERIFIED"
  | "PAID_ELIGIBILITY_REVOKED"
  | "UNKNOWN_ERROR";

export class PaidPurchaseEligibilityError extends Error {
  constructor(readonly reason: PaidPurchaseBlockReason) {
    super(reason);
    this.name = "PaidPurchaseEligibilityError";
  }
}

/**
 * Canonical structured decision for whether account can make a new paid purchase.
 * Separates: target policy, currently enforced policy, and enforcement state.
 */
export type PaidPurchaseEligibilityDecision =
  | {
      eligible: true;
      account: AccountLifecycle;
      user: AuthenticatedUser;
    }
  | {
      eligible: false;
      reason: PaidPurchaseBlockReason;
      account?: AccountLifecycle;
    };

export class AccountAccessError extends Error {
  constructor(readonly code: "AUTHENTICATION_REQUIRED" | "ACCOUNT_NOT_ACTIVE" | "EMAIL_NOT_VERIFIED" | "PAID_ELIGIBILITY_REQUIRED") {
    super(code);
    this.name = "AccountAccessError";
  }
}

type AccountLifecycleRow = {
  id: string;
  user_id: string;
  generation: number;
  status: AccountLifecycleStatus;
  paid_eligibility_status: PaidEligibilityStatus;
  paid_eligibility_method: AccountLifecycle["paidEligibilityMethod"];
  paid_eligibility_provider: string | null;
  paid_eligible_at: string | null;
  paid_eligibility_policy_version: string | null;
  paid_eligibility_invalidated_at: string | null;
  finalization_started_at?: string | null;
  data_scrubbed_at?: string | null;
  finalized_at?: string | null;
  // Migration 027: account closure durable retry + claim/lease columns.
  closure_retry_count: number;
  closure_next_retry_at?: string | null;
  closure_last_attempt_at?: string | null;
  closure_last_error_code?: string | null;
  closure_owner_review_required: boolean;
  closure_claim_token?: string | null;
  closure_claimed_at?: string | null;
  closure_claim_expires_at?: string | null;
};

function toAccountLifecycle(row: AccountLifecycleRow): AccountLifecycle {
  return {
    userId: row.user_id,
    generation: row.generation,
    status: row.status,
    paidEligibilityStatus: row.paid_eligibility_status,
    paidEligibilityMethod: row.paid_eligibility_method,
    paidEligibilityProvider: row.paid_eligibility_provider,
    paidEligibleAt: row.paid_eligible_at,
    paidEligibilityPolicyVersion: row.paid_eligibility_policy_version,
    paidEligibilityInvalidatedAt: row.paid_eligibility_invalidated_at,
    finalizationStartedAt: row.finalization_started_at ?? null,
    dataScrubbedAt: row.data_scrubbed_at ?? null,
    finalizedAt: row.finalized_at ?? null,
  };
}

export async function ensureAccountLifecycle(userId: string): Promise<AccountLifecycle> {
  const supabase = createAdminClient();
  const { data: existing, error: existingError } = await supabase
    .from("account_lifecycles")
    .select("*")
    .eq("user_id", userId)
    .order("generation", { ascending: false })
    .limit(1)
    .maybeSingle<AccountLifecycleRow>();
  if (existingError) throw new Error(`怨꾩젙 ?곹깭瑜?議고쉶?섏? 紐삵뻽?듬땲?? ${existingError.message}`);
  if (existing) return toAccountLifecycle(existing);

  const { data, error } = await supabase
    .from("account_lifecycles")
    .insert({ user_id: userId, generation: 1 })
    .select("*")
    .single<AccountLifecycleRow>();
  if (!error && data) return toAccountLifecycle(data);

  const { data: raced, error: raceError } = await supabase
    .from("account_lifecycles")
    .select("*")
    .eq("user_id", userId)
    .order("generation", { ascending: false })
    .limit(1)
    .maybeSingle<AccountLifecycleRow>();
  if (raceError || !raced) throw new Error(`怨꾩젙 ?곹깭瑜??앹꽦?섏? 紐삵뻽?듬땲?? ${error?.message ?? raceError?.message ?? "unknown"}`);
  return toAccountLifecycle(raced);
}

export async function getAccountLifecycle(userId: string): Promise<AccountLifecycle | null> {
  const { data, error } = await createAdminClient()
    .from("account_lifecycles")
    .select("*")
    .eq("user_id", userId)
    .order("generation", { ascending: false })
    .limit(1)
    .maybeSingle<AccountLifecycleRow>();
  if (error) throw new Error(`怨꾩젙 ?곹깭瑜?議고쉶?섏? 紐삵뻽?듬땲?? ${error.message}`);
  return data ? toAccountLifecycle(data) : null;
}

export async function requireActiveAccount(): Promise<AuthenticatedUser & { account: AccountLifecycle }> {
  const user = await getCurrentUser();
  if (!user) throw new AccountAccessError("AUTHENTICATION_REQUIRED");
  const account = await ensureAccountLifecycle(user.id);
  if (account.status !== "ACTIVE") throw new AccountAccessError("ACCOUNT_NOT_ACTIVE");
  return { ...user, account };
}

export async function requireVerifiedEmailAccount(): Promise<AuthenticatedUser & { account: AccountLifecycle }> {
  const user = await getCurrentUser();
  if (!user) throw new AccountAccessError("AUTHENTICATION_REQUIRED");
  const authUser = await (await import("../supabase/server")).createClient();
  const { data, error } = await authUser.auth.getUser();
  if (error || !data.user?.email_confirmed_at) throw new AccountAccessError("EMAIL_NOT_VERIFIED");
  const account = await ensureAccountLifecycle(user.id);
  if (account.status !== "ACTIVE") throw new AccountAccessError("ACCOUNT_NOT_ACTIVE");
  return { ...user, account };
}

export async function requirePaidEligibleAccount(): Promise<AuthenticatedUser & { account: AccountLifecycle }> {
  const result = await requireVerifiedEmailAccount();
  if (result.account.paidEligibilityStatus !== "VERIFIED_ADULT") throw new AccountAccessError("PAID_ELIGIBILITY_REQUIRED");
  return result;
}

export async function getAccountClosureFinancialBlockers(userId: string): Promise<AccountClosureFinancialBlocker[]> {
  const supabase = createAdminClient();
  const blockers = new Set<AccountClosureFinancialBlocker>();
  const { data: refunds, error: refundError } = await supabase.from("refund_workflows").select("status").eq("user_id", userId).in("status", ["REFUND_REQUESTED", "REFUND_PROCESSING", "REFUND_FAILED_RETRYING", "OWNER_REVIEW_REQUIRED"]);
  const { data: orders, error: orderError } = await supabase.from("orders").select("id").eq("user_id", userId);
  if (refundError) throw new Error(`?섎텋 ?곹깭瑜??뺤씤?섏? 紐삵뻽?듬땲?? ${refundError.message}`);
  if (orderError) throw new Error(`二쇰Ц ?곹깭瑜??뺤씤?섏? 紐삵뻽?듬땲?? ${orderError.message}`);
  for (const row of refunds ?? []) blockers.add(row.status === "OWNER_REVIEW_REQUIRED" ? "REFUND_OWNER_REVIEW" : "REFUND_IN_PROGRESS");
  const orderIds = (orders ?? []).map((row) => row.id);
  if (orderIds.length > 0) {
    const { data: payments, error: paymentError } = await supabase.from("toss_payment_records").select("reconciliation_status").in("order_id", orderIds).in("reconciliation_status", ["reconciliation_required", "reconciliation_failed"]);
    if (paymentError) throw new Error(`寃곗젣 ?곹깭瑜??뺤씤?섏? 紐삵뻽?듬땲?? ${paymentError.message}`);
    if ((payments ?? []).length > 0) blockers.add("PAYMENT_RECONCILIATION_REQUIRED");
  }
  return [...blockers];
}

// ============================================================================
// PHASE 3A CANONICAL POLICY DECISION HELPERS
// ============================================================================

/**
 * Reads whether authenticated Supabase user has verified email.
 * Uses trusted server-side auth state; never trusts client-submitted emailVerified.
 * Returns null if not authenticated.
 */
export async function getEmailVerificationState(): Promise<{ emailVerified: boolean } | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await (await import("../supabase/server")).createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  return { emailVerified: data.user.email_confirmed_at !== null && data.user.email_confirmed_at !== undefined };
}

/**
 * Reads the canonical paid eligibility status for an account.
 * Fails closed: unknown/missing state returns UNVERIFIED when enforcement is active.
 * Never derives from: profile DOB, relationship type, Toss payment, purchase history, client input.
 */
export async function getPaidEligibilityState(account: AccountLifecycle): Promise<{ status: PaidEligibilityStatus }> {
  // If enforcement is OFF, treat missing eligibility data as fully compatible (no blocking).
  // If enforcement is ON, missing/unknown state is treated as UNVERIFIED (blocked).
  // The account_lifecycles table default is UNVERIFIED, so the only way this happens
  // is if the account row is corrupted or the enforcement flag was just enabled
  // on an old account. Fail closed in that case.
  return { status: account.paidEligibilityStatus };
}

/**
 * TARGET PAID PURCHASE POLICY (Phase 3A canonical definition):
 *
 * For a NEW paid purchase to be eligible, ALL three conditions must be met:
 * 1. Account lifecycle status = ACTIVE
 * 2. Email is verified (email_confirmed_at is not null)
 * 3. Paid eligibility status = VERIFIED_ADULT
 *
 * All three conditions are enforced at the paid order boundary. A missing,
 * malformed, or unavailable configuration must not create a bypass.
 */
export async function evaluatePaidPurchaseEligibility(): Promise<PaidPurchaseEligibilityDecision> {
  // Read authenticated user
  const user = await getCurrentUser();
  if (!user) {
    return {
      eligible: false,
      reason: "AUTHENTICATION_REQUIRED",
    };
  }

  // Read account lifecycle
  let account: AccountLifecycle;
  try {
    account = await ensureAccountLifecycle(user.id);
  } catch {
    return {
      eligible: false,
      reason: "UNKNOWN_ERROR",
    };
  }

  // Condition 1: Account must be ACTIVE (already enforced in /api/orders)
  if (account.status === "DELETION_REQUESTED") {
    return {
      eligible: false,
      reason: "ACCOUNT_NOT_ACTIVE",
      account,
    };
  }
  if (account.status === "CLOSED") {
    return {
      eligible: false,
      reason: "ACCOUNT_DELETED",
      account,
    };
  }
  // Only ACTIVE passes through.
  if (account.status !== "ACTIVE") {
    return {
      eligible: false,
      reason: "ACCOUNT_NOT_ACTIVE",
      account,
    };
  }

  // Condition 2: Email must be verified (Phase 3A canonical enforcement)
  const emailState = await getEmailVerificationState();
  if (!emailState || !emailState.emailVerified) {
    return {
      eligible: false,
      reason: "EMAIL_NOT_VERIFIED",
      account,
    };
  }

  if (account.paidEligibilityStatus === "REVOKED") {
    return {
      eligible: false,
      reason: "PAID_ELIGIBILITY_REVOKED",
      account,
    };
  }

  if (account.paidEligibilityStatus !== "VERIFIED_ADULT") {
    return {
      eligible: false,
      reason: "PAID_ELIGIBILITY_UNVERIFIED",
      account,
    };
  }

  // All conditions passed; eligible for paid purchase.
  return {
    eligible: true,
    account,
    user,
  };
}

/**
 * The service-layer paid-order trust boundary. The session identity from
 * Supabase Auth must match the caller's persisted user identity.
 */
export async function assertPaidPurchaseEligibility(
  expectedUserId: string,
): Promise<AuthenticatedUser & { account: AccountLifecycle }> {
  const decision = await evaluatePaidPurchaseEligibility();

  if (!decision.eligible) {
    throw new PaidPurchaseEligibilityError(decision.reason);
  }

  if (decision.user.id !== expectedUserId) {
    throw new PaidPurchaseEligibilityError("AUTHENTICATION_REQUIRED");
  }

  return { ...decision.user, account: decision.account };
}

/**
 * Canonical decision helper for ordinary account service access.
 * This is separate from new paid purchase eligibility.
 *
 * General/free service access must NOT depend on:
 * - VERIFIED_ADULT
 * - profile DOB
 * - relationship=self
 * - Toss payment state
 *
 * Account lifecycle remains authoritative.
 */
export async function evaluateAccountServiceAccess(): Promise<AccountAccessDecision> {
  // Read authenticated user
  const user = await getCurrentUser();
  if (!user) {
    return {
      allowed: false,
      reason: "AUTHENTICATION_REQUIRED",
    };
  }

  // Read account lifecycle
  let account: AccountLifecycle;
  try {
    account = await ensureAccountLifecycle(user.id);
  } catch {
    return {
      allowed: false,
      reason: "UNKNOWN_ERROR",
    };
  }

  // Condition 1: Account must be ACTIVE
  if (account.status === "DELETION_REQUESTED") {
    return {
      allowed: false,
      reason: "ACCOUNT_NOT_ACTIVE",
      account,
    };
  }
  if (account.status === "CLOSED") {
    return {
      allowed: false,
      reason: "ACCOUNT_DELETED",
      account,
    };
  }
  if (account.status !== "ACTIVE") {
    return {
      allowed: false,
      reason: "ACCOUNT_NOT_ACTIVE",
      account,
    };
  }

  // General/free service access remains lifecycle-scoped only.
  // Email verification and paid eligibility are separate policy concerns for the
  // paid boundary and are intentionally not enforced here.
  return {
    allowed: true,
    account,
    user,
  };
}

/**
 * Self-service helper: transition account lifecycle from ACTIVE to DELETION_REQUESTED.
 * Performs safe validation:
 * - Checks financial blockers (e.g. pending refunds or reconciliation required).
 * - Never deletes auth.users, profiles, reports, purchases, orders, payments, or refunds.
 * - Only transitions ACTIVE -> DELETION_REQUESTED.
 */
export async function requestAccountClosure(userId: string): Promise<AccountLifecycle> {
  const account = await ensureAccountLifecycle(userId);
  if (account.status === "CLOSED") {
    throw new Error("이미 종료된 계정입니다.");
  }
  if (account.status === "DELETION_REQUESTED") {
    return account;
  }

  const blockers = await getAccountClosureFinancialBlockers(userId);
  if (blockers.length > 0) {
    throw new Error("진행 중인 환불이나 결제 확인 건이 있어 탈퇴 요청을 완료할 수 없습니다.");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("account_lifecycles")
    .update({ status: "DELETION_REQUESTED" })
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .select("*")
    .maybeSingle<AccountLifecycleRow>();

  if (error || !data) {
    throw new Error(`계정 탈퇴 요청을 처리하지 못했습니다: ${error?.message ?? "unknown"}`);
  }
  return toAccountLifecycle(data);
}

/**
 * Self-service helper: transition account lifecycle from DELETION_REQUESTED back to ACTIVE.
 * Customer self-service withdrawal of closure request.
 * Disallowed once finalization_started_at is non-null.
 */
export async function cancelAccountClosureRequest(userId: string): Promise<AccountLifecycle> {
  const account = await ensureAccountLifecycle(userId);
  if (account.status === "CLOSED") {
    throw new Error("이미 종료된 계정은 복구할 수 없습니다.");
  }
  if (account.status === "ACTIVE") {
    return account;
  }
  if (account.finalizationStartedAt) {
    throw new Error("계정 탈퇴 처리가 이미 시작되어 요청을 취소할 수 없습니다.");
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("account_lifecycles")
    .update({ status: "ACTIVE" })
    .eq("user_id", userId)
    .eq("status", "DELETION_REQUESTED")
    .is("finalization_started_at", null)
    .select("*")
    .maybeSingle<AccountLifecycleRow>();

  if (error || !data) {
    throw new Error(`계정 탈퇴 요청 취소를 처리하지 못했습니다: ${error?.message ?? "unknown"}`);
  }
  return toAccountLifecycle(data);
}

/**
 * Server-side helper: start account closure finalization by atomically setting finalization_started_at.
 * Re-checks financial blockers before setting the lock.
 * Lock is race-safe against cancelAccountClosureRequest.
 */
export async function startAccountClosureFinalization(userId: string): Promise<AccountLifecycle> {
  const account = await ensureAccountLifecycle(userId);
  if (account.status === "CLOSED") {
    return account;
  }
  if (account.status !== "DELETION_REQUESTED") {
    throw new Error("탈퇴 요청(DELETION_REQUESTED) 상태의 계정만 최종 처리를 시작할 수 있습니다.");
  }
  if (account.finalizationStartedAt) {
    return account;
  }

  const blockers = await getAccountClosureFinancialBlockers(userId);
  if (blockers.length > 0) {
    throw new Error(`진행 중인 금융 처리가 있어 계정 최종 처리를 시작할 수 없습니다: ${blockers.join(", ")}`);
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("account_lifecycles")
    .update({ finalization_started_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "DELETION_REQUESTED")
    .is("finalization_started_at", null)
    .select("*")
    .maybeSingle<AccountLifecycleRow>();

  if (error || !data) {
    const current = await getAccountLifecycle(userId);
    if (current?.finalizationStartedAt) {
      return current;
    }
    throw new Error(`계정 탈퇴 처리 시작 잠금을 설정하지 못했습니다: ${error?.message ?? "unknown"}`);
  }
  return toAccountLifecycle(data);
}

/**
 * STEP 57D-46 PHASE 3D-1: Transactional Account Closure Database Cleanup Execution.
 *
 * Re-checks financial blockers, locks finalization_started_at, and executes atomic DB cleanup
 * (active_profiles deletion, profile tombstoning, paid report scrub, entitlement revocation)
 * via server-only RPC `execute_account_closure_db_cleanup`.
 *
 * Stops at `data_scrubbed_at IS NOT NULL`. Status remains DELETION_REQUESTED.
 * Does NOT mutate auth.users email, auth.identities, or set finalized_at.
 */
export async function executeAccountClosureDbCleanup(userId: string): Promise<AccountLifecycle> {
  const lockedAccount = await startAccountClosureFinalization(userId);
  if (lockedAccount.status === "CLOSED" || lockedAccount.dataScrubbedAt) {
    return lockedAccount;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("execute_account_closure_db_cleanup", {
    p_user_id: userId,
  });

  if (error || !data) {
    throw new Error(`계정 데이터 정리(DB cleanup) 처리 중 오류가 발생했습니다: ${error?.message ?? "unknown"}`);
  }

  return toAccountLifecycle(data as AccountLifecycleRow);
}

/**
 * STEP 57D-46 PHASE 3D-2: Production Auth Tombstone Primitive & DB Finalization.
 *
 * Preconditions:
 * 1. Account lifecycle status = DELETION_REQUESTED (or CLOSED with finalizedAt set for idempotency).
 * 2. finalization_started_at IS NOT NULL.
 * 3. data_scrubbed_at IS NOT NULL (DB cleanup complete).
 *
 * Execution:
 * 1. Verifies preconditions (fails closed with NOT_READY_FOR_AUTH_FINALIZATION if DB cleanup is incomplete).
 * 2. If status === CLOSED and finalizedAt is non-null, returns idempotent current lifecycle.
 * 3. Fetches Auth user via admin.getUserById(userId) (fails closed with AUTH_USER_NOT_FOUND if missing).
 * 4. Generates deterministic tombstone email: `tombstone_${userId}@deleted.unboda.internal`.
 * 5. If Auth user email !== expectedTombstoneEmail:
 *    Mutates email to tombstone email and clears user_metadata via admin.updateUserById(userId, { email, user_metadata: {} }).
 *    Re-fetches and verifies Auth user email.
 * 6. Atomically transitions account_lifecycles status to CLOSED and sets finalized_at = now().
 */
export async function finalizeAccountClosureAuthIdentity(userId: string): Promise<AccountLifecycle> {
  const account = await ensureAccountLifecycle(userId);
  if (account.status === "CLOSED" && account.finalizedAt) {
    return account;
  }

  if (account.status !== "DELETION_REQUESTED") {
    throw new Error("NOT_READY_FOR_AUTH_FINALIZATION: 계정 탈퇴 요청(DELETION_REQUESTED) 상태가 아닙니다.");
  }
  if (!account.finalizationStartedAt) {
    throw new Error("NOT_READY_FOR_AUTH_FINALIZATION: 계정 탈퇴 처리(finalization_started_at)가 시작되지 않았습니다.");
  }
  if (!account.dataScrubbedAt) {
    throw new Error("NOT_READY_FOR_AUTH_FINALIZATION: 계정 DB 데이터 정리(data_scrubbed_at)가 완료되지 않았습니다.");
  }

  const expectedTombstoneEmail = `tombstone_${userId}@deleted.unboda.internal`;
  const supabase = createAdminClient();

  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
  if (userError || !userData.user) {
    throw new Error(`AUTH_USER_NOT_FOUND: Auth 계정을 찾을 수 없습니다 (${userId})`);
  }

  const currentUser = userData.user;

  if (currentUser.email !== expectedTombstoneEmail) {
    const scrubbedMetadata: Record<string, null> = {};
    if (currentUser.user_metadata) {
      for (const key of Object.keys(currentUser.user_metadata)) {
        scrubbedMetadata[key] = null;
      }
    }

    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      email: expectedTombstoneEmail,
      user_metadata: scrubbedMetadata,
    });

    if (updateError || !updateData.user) {
      if (
        updateError?.message?.toLowerCase().includes("already") ||
        updateError?.message?.toLowerCase().includes("duplicate") ||
        updateError?.message?.toLowerCase().includes("conflict") ||
        updateError?.message?.toLowerCase().includes("error updating user") ||
        updateError?.status === 422 ||
        updateError?.status === 400 ||
        updateError?.status === 500
      ) {
        throw new Error(`TOMBSTONE_EMAIL_CONFLICT: tombstone 이메일이 이미 다른 Auth 계정에 할당되어 있습니다 (${updateError.message})`);
      }
      throw new Error(`AUTH_UPDATE_FAILED: Auth 계정 이메일 변경에 실패했습니다: ${updateError?.message ?? "unknown"}`);
    }

    const { data: verifyData, error: verifyError } = await supabase.auth.admin.getUserById(userId);
    if (verifyError || !verifyData.user || verifyData.user.email !== expectedTombstoneEmail) {
      throw new Error("AUTH_VERIFICATION_FAILED: Auth 계정 이메일 변경 검증에 실패했습니다.");
    }
  }

  const now = new Date().toISOString();
  const { data: finalizedRow, error: finalizationError } = await supabase
    .from("account_lifecycles")
    .update({
      status: "CLOSED",
      finalized_at: now,
      updated_at: now,
    })
    .eq("user_id", userId)
    .eq("status", "DELETION_REQUESTED")
    .not("finalization_started_at", "is", null)
    .not("data_scrubbed_at", "is", null)
    .is("finalized_at", null)
    .select("*")
    .maybeSingle<AccountLifecycleRow>();

  if (finalizationError) {
    throw new Error(`DB_FINALIZATION_FAILED: 계정 최종 종료 DB 처리 중 오류가 발생했습니다: ${finalizationError.message}`);
  }

  if (!finalizedRow) {
    const currentLifecycle = await getAccountLifecycle(userId);
    if (currentLifecycle?.status === "CLOSED" && currentLifecycle.finalizedAt) {
      return currentLifecycle;
    }
    throw new Error("DB_FINALIZATION_FAILED: 계정 최종 종료 상태 전환 실패.");
  }

  return toAccountLifecycle(finalizedRow);
}

/**
 * STEP 57D-46 PHASE 3D-2: Full Account Closure Finalization Orchestrator.
 *
 * 1. Executes Phase 3D-1 DB cleanup (executeAccountClosureDbCleanup).
 * 2. Executes Phase 3D-2 Auth tombstoning & DB status = CLOSED transition (finalizeAccountClosureAuthIdentity).
 */
export async function finalizeAccountClosure(userId: string): Promise<AccountLifecycle> {
  await executeAccountClosureDbCleanup(userId);
  return finalizeAccountClosureAuthIdentity(userId);
}

// ============================================================================
// PHASE 3E-2 SERVER-ONLY ACCOUNT CLOSURE BATCH RECONCILIATION WORKER
// ============================================================================

export type AccountClosureReconciliationResult = {
  runId: string;
  startedAt: string;
  claimed: number;
  scanned: number;
  eligible: number;
  finalized: number;
  alreadyClosed: number;
  retryScheduled: number;
  waitingFinancial: number;
  ownerReview: number;
  claimLost: number;
  failed: number;
  durationMs: number;
  results: Array<{
    userId: string;
    outcome:
      | "finalized"
      | "already_closed"
      | "retry_scheduled"
      | "waiting_financial"
      | "owner_review"
      | "claim_lost"
      | "failed";
    errorCode?: string;
  }>;
};

export const MAX_ACCOUNT_CLOSURE_RETRIES = 5;

/**
 * STEP 57D-46 PHASE 3E-2: Server-Only Account Closure Batch Reconciliation Worker.
 *
 * Claims a bounded batch of closure-candidate accounts via migration 027 RPC
 * and attempts finalization for each account independently.
 *
 * Error & Retry Policy:
 * - Happy / already closed -> Releases claim token, records outcome 'finalized' or 'already_closed'.
 * - Financial Wait -> Schedules retry with exponential backoff if retry count < MAX_ACCOUNT_CLOSURE_RETRIES.
 * - Retryable technical errors (DB/Auth transient errors) -> Schedules retry with backoff if retry count < MAX_ACCOUNT_CLOSURE_RETRIES.
 * - Non-retryable / Ambiguous / Exhausted errors (TOMBSTONE_EMAIL_CONFLICT, AUTH_USER_NOT_FOUND, OWNER_REVIEW_REQUIRED, max retries reached) -> Escalates to owner review (`closure_owner_review_required = true`).
 */
export async function reconcileAccountClosureFinalizations(options?: {
  batchLimit?: number;
  leaseSeconds?: number;
}): Promise<AccountClosureReconciliationResult> {
  const startedAt = Date.now();
  const runId = crypto.randomUUID();
  const claimToken = crypto.randomUUID();
  const batchLimit = options?.batchLimit ?? 10;
  const leaseSeconds = options?.leaseSeconds ?? 300;

  const supabase = createAdminClient();

  const { data: claimedRows, error: claimError } = await supabase.rpc(
    "claim_account_closure_finalizations",
    {
      requested_limit: batchLimit,
      claim_token: claimToken,
      lease_seconds: leaseSeconds,
    }
  );

  if (claimError || !claimedRows) {
    throw new Error(`계정 탈퇴 재조정 배치 작업 선점에 실패했습니다: ${claimError?.message ?? "unknown"}`);
  }

  const candidateRows = claimedRows as AccountLifecycleRow[];
  const claimedCount = candidateRows.length;

  let finalized = 0;
  let alreadyClosed = 0;
  let retryScheduled = 0;
  let waitingFinancial = 0;
  let ownerReview = 0;
  let claimLost = 0;
  let failed = 0;

  const results: AccountClosureReconciliationResult["results"] = [];

  for (const row of candidateRows) {
    const userId = row.user_id;
    const currentRetryCount = row.closure_retry_count ?? 0;
    const wasAlreadyClosed = row.status === "CLOSED" || Boolean(row.finalized_at);

    try {
      await finalizeAccountClosure(userId);

      // Release claim token upon completion
      await supabase.rpc("release_account_closure_claim", {
        p_user_id: userId,
        p_claim_token: claimToken,
      });

      if (wasAlreadyClosed) {
        alreadyClosed += 1;
        results.push({ userId, outcome: "already_closed" });
      } else {
        finalized += 1;
        results.push({ userId, outcome: "finalized" });
      }
    } catch (err: unknown) {
      const rawMessage = err instanceof Error ? err.message : "UNKNOWN_FAILURE";

      let sanitizedCode = "UNKNOWN_ERROR";
      let isFinancialWait = false;
      let isOwnerReview = false;

      if (
        rawMessage.includes("진행 중인 금융 처리") ||
        rawMessage.includes("financial blockers") ||
        rawMessage.includes("REFUND_IN_PROGRESS") ||
        rawMessage.includes("PAYMENT_RECONCILIATION_REQUIRED") ||
        rawMessage.includes("WAITING_FINANCIAL")
      ) {
        sanitizedCode = "WAITING_FINANCIAL";
        isFinancialWait = true;
      } else if (rawMessage.includes("TOMBSTONE_EMAIL_CONFLICT")) {
        sanitizedCode = "TOMBSTONE_EMAIL_CONFLICT";
        isOwnerReview = true;
      } else if (rawMessage.includes("AUTH_USER_NOT_FOUND")) {
        sanitizedCode = "AUTH_USER_NOT_FOUND";
        isOwnerReview = true;
      } else if (rawMessage.includes("REFUND_OWNER_REVIEW") || rawMessage.includes("OWNER_REVIEW_REQUIRED")) {
        sanitizedCode = "REFUND_OWNER_REVIEW";
        isOwnerReview = true;
      } else if (rawMessage.includes("NOT_READY_FOR_AUTH_FINALIZATION")) {
        sanitizedCode = "NOT_READY_FOR_AUTH_FINALIZATION";
      } else if (rawMessage.includes("AUTH_UPDATE_FAILED")) {
        sanitizedCode = "AUTH_UPDATE_FAILED";
      } else if (rawMessage.includes("AUTH_VERIFICATION_FAILED")) {
        sanitizedCode = "AUTH_VERIFICATION_FAILED";
      } else if (rawMessage.includes("DB_FINALIZATION_FAILED")) {
        sanitizedCode = "DB_FINALIZATION_FAILED";
      }

      const nextRetryIndex = currentRetryCount + 1;
      const isExhausted = nextRetryIndex >= MAX_ACCOUNT_CLOSURE_RETRIES;

      if (isOwnerReview || (isExhausted && !isFinancialWait)) {
        const finalErrorCode = isExhausted && !isOwnerReview ? `RETRY_EXHAUSTED_${sanitizedCode}` : sanitizedCode;
        const { data: escalateData } = await supabase.rpc("escalate_account_closure_owner_review", {
          p_user_id: userId,
          p_claim_token: claimToken,
          p_error_code: finalErrorCode,
        });

        const updatedRow = escalateData as AccountLifecycleRow | null;
        if (!updatedRow || (updatedRow.closure_owner_review_required !== true && updatedRow.closure_last_error_code !== finalErrorCode)) {
          claimLost += 1;
          failed += 1;
          results.push({ userId, outcome: "claim_lost", errorCode: "CLAIM_LOST" });
        } else {
          ownerReview += 1;
          failed += 1;
          results.push({ userId, outcome: "owner_review", errorCode: finalErrorCode });
        }
      } else if (isFinancialWait) {
        const backoffMs = Math.min(60 * 60 * 1000, 60 * 1000 * Math.pow(2, Math.min(currentRetryCount, 6)));
        const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();

        const { data: retryData } = await supabase.rpc("record_account_closure_retry", {
          p_user_id: userId,
          p_claim_token: claimToken,
          p_error_code: sanitizedCode,
          p_next_retry_at: nextRetryAt,
        });

        const updatedRow = retryData as AccountLifecycleRow | null;
        if (!updatedRow || (updatedRow.closure_retry_count !== currentRetryCount + 1 && updatedRow.closure_last_error_code !== sanitizedCode)) {
          claimLost += 1;
          failed += 1;
          results.push({ userId, outcome: "claim_lost", errorCode: "CLAIM_LOST" });
        } else {
          waitingFinancial += 1;
          failed += 1;
          results.push({ userId, outcome: "waiting_financial", errorCode: sanitizedCode });
        }
      } else {
        const backoffMs = Math.min(60 * 60 * 1000, 60 * 1000 * Math.pow(2, Math.min(currentRetryCount, 6)));
        const nextRetryAt = new Date(Date.now() + backoffMs).toISOString();

        const { data: retryData } = await supabase.rpc("record_account_closure_retry", {
          p_user_id: userId,
          p_claim_token: claimToken,
          p_error_code: sanitizedCode,
          p_next_retry_at: nextRetryAt,
        });

        const updatedRow = retryData as AccountLifecycleRow | null;
        if (!updatedRow || (updatedRow.closure_retry_count !== currentRetryCount + 1 && updatedRow.closure_last_error_code !== sanitizedCode)) {
          claimLost += 1;
          failed += 1;
          results.push({ userId, outcome: "claim_lost", errorCode: "CLAIM_LOST" });
        } else {
          retryScheduled += 1;
          failed += 1;
          results.push({ userId, outcome: "retry_scheduled", errorCode: sanitizedCode });
        }
      }
    }
  }

  return {
    runId,
    startedAt: new Date(startedAt).toISOString(),
    claimed: claimedCount,
    scanned: claimedCount,
    eligible: claimedCount,
    finalized,
    alreadyClosed,
    retryScheduled,
    waitingFinancial,
    ownerReview,
    claimLost,
    failed,
    durationMs: Date.now() - startedAt,
    results,
  };
}
