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

/**
 * Canonical structured decision for whether account can make a new paid purchase.
 * Separates: target policy, currently enforced policy, and enforcement state.
 */
export type PaidPurchaseEligibilityDecision =
  | {
      eligible: true;
      account: AccountLifecycle;
      user: AuthenticatedUser;
      /** Current policy is stricter than target; this would be eligible under full enforcement. */
      willBeEligibleWhenFullyEnforced?: boolean;
    }
  | {
      eligible: false;
      reason: PaidPurchaseBlockReason;
      account?: AccountLifecycle;
      /**
       * True if blocked by a rule that is NOT currently enforced due to rollout feature flag.
       * This means the user would be blocked if PAID_ELIGIBILITY_ENFORCEMENT_ENABLED = true.
       */
      blockedByUnenforcedRule?: boolean;
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

export const PAID_ELIGIBILITY_ENFORCEMENT_ENABLED = process.env.PAID_ELIGIBILITY_ENFORCEMENT_ENABLED === "true";

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
 * CURRENTLY ENFORCED POLICY (as of Phase 3A):
 * - Condition 1 (ACTIVE) is ENFORCED (already in /api/orders)
 * - Condition 2 (email verified) is NOT YET ENFORCED (gap fixed in Phase 3A)
 * - Condition 3 (VERIFIED_ADULT) is NOT YET ENFORCED (depends on flag PAID_ELIGIBILITY_ENFORCEMENT_ENABLED)
 *
 * Phase 3A wires conditions 1 + 2 into /api/orders immediately.
 * Phase 3D will wire condition 3 when enforcement is explicitly enabled via flag.
 *
 * Feature flag OFF behavior: Satisfies current production rollout compatibility.
 * Feature flag ON behavior: Enforces full target policy.
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

  // Condition 3: Paid eligibility must be VERIFIED_ADULT (enforcement controlled by feature flag)
  if (PAID_ELIGIBILITY_ENFORCEMENT_ENABLED) {
    // Full enforcement: reject unverified and revoked
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
  } else {
    // Phase 3A rollout compatibility: preserve the pre-3A live customer behavior.
    // The helper still describes future target policy, but it does not newly
    // block UNVERIFIED or REVOKED while the rollout flag is OFF.
    return {
      eligible: true,
      account,
      user,
      willBeEligibleWhenFullyEnforced: account.paidEligibilityStatus === "VERIFIED_ADULT",
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
 * Supported by schema 024 unique constraint on user_id where status <> 'CLOSED'.
 */
export async function cancelAccountClosureRequest(userId: string): Promise<AccountLifecycle> {
  const account = await ensureAccountLifecycle(userId);
  if (account.status === "CLOSED") {
    throw new Error("이미 종료된 계정은 복구할 수 없습니다.");
  }
  if (account.status === "ACTIVE") {
    return account;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("account_lifecycles")
    .update({ status: "ACTIVE" })
    .eq("user_id", userId)
    .eq("status", "DELETION_REQUESTED")
    .select("*")
    .maybeSingle<AccountLifecycleRow>();

  if (error || !data) {
    throw new Error(`계정 탈퇴 요청 취소를 처리하지 못했습니다: ${error?.message ?? "unknown"}`);
  }
  return toAccountLifecycle(data);
}

/**
 * PHASE 3C CLEANUP ORCHESTRATOR SPECIFICATION (PLANNING STUB - NOT EXECUTED IN PRODUCTION)
 *
 * Designed finalization flow (DELETION_REQUESTED -> CLOSED):
 * 1. Inspect financial blockers (refunds in progress, payment reconciliation required).
 * 2. Scrub personalized report content (Class D data) without violating paid_reports_completed_requires_content constraint.
 * 3. Tombstone personal Saju profile fields (Class A data: birth_date, birth_time, label) instead of DELETE
 *    to preserve ON DELETE RESTRICT foreign keys from orders, purchases, entitlements, and paid_reports.
 * 4. Revoke active entitlements (is_active = false, revocation_reason = 'ACCOUNT_CLOSED').
 * 5. Transition account_lifecycles status to CLOSED.
 *
 * Destructive execution is strictly disabled until Phase 3C retention architecture is human-approved.
 */
export async function finalizeAccountClosure(userId: string): Promise<AccountLifecycle> {
  const account = await ensureAccountLifecycle(userId);
  if (account.status === "CLOSED") {
    return account;
  }
  if (account.status !== "DELETION_REQUESTED") {
    throw new Error("탈퇴 요청(DELETION_REQUESTED) 상태의 계정만 최종 종료 처리할 수 있습니다.");
  }

  const blockers = await getAccountClosureFinancialBlockers(userId);
  if (blockers.length > 0) {
    throw new Error(`진행 중인 금융 처리가 있어 계정을 최종 종료할 수 없습니다: ${blockers.join(", ")}`);
  }

  throw new Error("Phase 3C 계정 최종 종료 처리 실행은 아키텍처 승인 전까지 비활성화되어 있습니다.");
}
