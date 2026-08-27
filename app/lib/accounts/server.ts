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
  if (existingError) throw new Error(`계정 상태를 조회하지 못했습니다: ${existingError.message}`);
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
  if (raceError || !raced) throw new Error(`계정 상태를 생성하지 못했습니다: ${error?.message ?? raceError?.message ?? "unknown"}`);
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
  if (error) throw new Error(`계정 상태를 조회하지 못했습니다: ${error.message}`);
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
  if (refundError) throw new Error(`환불 상태를 확인하지 못했습니다: ${refundError.message}`);
  if (orderError) throw new Error(`주문 상태를 확인하지 못했습니다: ${orderError.message}`);
  for (const row of refunds ?? []) blockers.add(row.status === "OWNER_REVIEW_REQUIRED" ? "REFUND_OWNER_REVIEW" : "REFUND_IN_PROGRESS");
  const orderIds = (orders ?? []).map((row) => row.id);
  if (orderIds.length > 0) {
    const { data: payments, error: paymentError } = await supabase.from("toss_payment_records").select("reconciliation_status").in("order_id", orderIds).in("reconciliation_status", ["reconciliation_required", "reconciliation_failed"]);
    if (paymentError) throw new Error(`결제 상태를 확인하지 못했습니다: ${paymentError.message}`);
    if ((payments ?? []).length > 0) blockers.add("PAYMENT_RECONCILIATION_REQUIRED");
  }
  return [...blockers];
}

export const PAID_ELIGIBILITY_ENFORCEMENT_ENABLED = process.env.PAID_ELIGIBILITY_ENFORCEMENT_ENABLED === "true";
