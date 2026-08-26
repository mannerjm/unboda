import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const DISPOSABLE_URL = "http://127.0.0.1:55321";
const EVIDENCE_URL = "http://127.0.0.1:54321";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function readRuntime(): Record<string, string> {
  const artifact = "supabase-r6-disposable/supabase/.temp/start-secrets/supabase_edge_runtime_unboda-r6-disposable/env/docker.env";
  const values: Record<string, string> = {};
  for (const line of readFileSync(artifact, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
    if (match) values[match[1]] = match[2].trim().replace(/^(['"])(.*)\1$/, "$2");
  }
  return values;
}

function safeRpcClassification(error: { code?: string; message?: string } | null, rowCount: number, rowShapeValid: boolean): string {
  if (!error && rowShapeValid && rowCount > 0) return "SUCCESS";
  const message = (error?.message ?? "").toLowerCase();
  if (message.includes("does not exist") || message.includes("function")) return "FUNCTION_MISSING";
  if (message.includes("argument") || message.includes("signature") || message.includes("parameter")) return "SIGNATURE_MISMATCH";
  if (message.includes("permission") || message.includes("rls") || message.includes("denied")) return "PERMISSION_FAILURE";
  if (message.includes("constraint")) return "CONSTRAINT_FAILURE";
  if (rowCount === 0) return "ENTITLEMENT_NOT_FOUND";
  if (!rowShapeValid) return "RETURN_SHAPE_MISMATCH";
  return "OTHER_SAFE_ERROR";
}

function inspectLiveRpc(): { exists: boolean; signature: string | null; returnType: string | null; definitionPresent: boolean; securityDefiner: boolean } {
  const dockerPath = process.env.DOCKER_EXE ?? [
    "C:\\Users\\manne\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe",
    "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe",
  ].find((candidate) => existsSync(candidate));
  if (!dockerPath) return { exists: false, signature: null, returnType: null, definitionPresent: false, securityDefiner: false };
  const query = "select p.prosecdef, pg_get_function_identity_arguments(p.oid), pg_get_function_result(p.oid), pg_get_functiondef(p.oid) from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = 'revoke_refund_entitlement';";
  try {
    const output = execFileSync(dockerPath, ["exec", "supabase_db_unboda-r6-disposable", "psql", "-U", "postgres", "-d", "postgres", "-At", "-F", "|", "-c", query], { encoding: "utf8" }).trim();
    const fields = output.split("|");
    return {
      exists: fields.length >= 4 && fields[0] === "t",
      signature: fields[1] || null,
      returnType: fields[2] || null,
      definitionPresent: fields[3]?.includes("revoke_refund_entitlement") === true,
      securityDefiner: fields[0] === "t",
    };
  } catch {
    return { exists: false, signature: null, returnType: null, definitionPresent: false, securityDefiner: false };
  }
}

function isExpectedRpcContract(signature: string | null, returnType: string | null): boolean {
  const expectedArguments = [
    ["target_order_id", "uuid"],
    ["claim_token", "uuid"],
    ["reason", "text"],
  ];
  const actualArguments = (signature ?? "").split(", ").map((argument) => argument.trim().split(" "));
  return returnType === "SETOF entitlements"
    && actualArguments.length === expectedArguments.length
    && actualArguments.every(([name, type], index) => name === expectedArguments[index][0] && type === expectedArguments[index][1]);
}

async function main(): Promise<void> {
  const runtime = readRuntime();
  assert(runtime.SUPABASE_INTERNAL_HOST_PORT === "55321", "disposable host identity is required");
  assert(runtime.SUPABASE_DB_URL.includes("supabase_db_unboda-r6-disposable"), "disposable DB identity is required");
  assert(runtime.SUPABASE_SERVICE_ROLE_KEY.length > 0, "disposable service-role credential is required");
  process.env.NEXT_PUBLIC_SUPABASE_URL = DISPOSABLE_URL;
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = runtime.SUPABASE_INTERNAL_PUBLISHABLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = runtime.SUPABASE_SERVICE_ROLE_KEY;
  assert(process.env.NEXT_PUBLIC_SUPABASE_URL !== EVIDENCE_URL, "resolved evidence target is forbidden");

  const liveRpc = inspectLiveRpc();
  const signatureValid = isExpectedRpcContract(liveRpc.signature, liveRpc.returnType);
  console.log(JSON.stringify({
    target: DISPOSABLE_URL,
    disposableIdentity: true,
    liveRpcExists: liveRpc.exists,
    liveRpcSignature: liveRpc.signature,
    liveRpcReturnType: liveRpc.returnType,
    signatureValid,
    migration023FunctionBodyPresent: liveRpc.definitionPresent,
    securityDefiner: liveRpc.securityDefiner,
  }));
  if (!liveRpc.exists) {
    console.log(JSON.stringify({ classification: "FUNCTION_MISSING" }));
    return;
  }
  if (!signatureValid || !liveRpc.definitionPresent || !liveRpc.securityDefiner) {
    console.log(JSON.stringify({ classification: "SIGNATURE_MISMATCH" }));
    return;
  }

  const { createAdminClient } = await import("../app/lib/supabase/admin");
  const db = createAdminClient();
  const baseline = await Promise.all(["orders", "purchases", "entitlements", "toss_payment_records", "refund_workflows"].map(async (table) => ((await db.from(table).select("id")).data ?? []).length));
  assert(baseline.every((count) => count === 0), "diagnostic disposable database must be empty");
  let userId = "";
  let profileId = "";
  let orderId = "";
  try {
    const user = (await db.auth.admin.createUser({ email: `step-57d-r10d-r5-${Date.now()}@local.test`, password: "local-test-password-r10d-r5", email_confirm: true })).data.user;
    if (!user) throw new Error("diagnostic user creation failed");
    userId = user.id;
    const profile = (await db.from("profiles").insert({ user_id: userId, label: "R10D R5 RPC trace", relationship_type: "other", birth_date: "1990-01-01", birth_time: "12:00:00", gender: "male", calendar_type: "solar", is_leap_month: false }).select("id").single()).data as { id: string };
    if (!profile) throw new Error("diagnostic profile creation failed");
    profileId = profile.id;
    const order = (await db.from("orders").insert({ user_id: userId, profile_id: profileId, product_id: "money-leak-risk", amount: 16900, status: "paid", payment_provider: "toss", transaction_id: "r10d-r5-trace", paid_at: new Date().toISOString() }).select("id").single()).data as { id: string };
    if (!order) throw new Error("diagnostic order creation failed");
    orderId = order.id;
    const payment = (await db.from("toss_payment_records").insert({ order_id: orderId, payment_key: "pay_r10d_r5_trace", provider_order_id: orderId, expected_amount: 16900, confirmed_amount: 16900, currency: "KRW", provider_status: "DONE", reconciliation_status: "externally_confirmed" }).select("id").single()).data as { id: string };
    if (!payment) throw new Error("diagnostic payment creation failed");
    const purchase = (await db.from("purchases").insert({ user_id: userId, profile_id: profileId, product_id: "money-leak-risk", order_id: orderId }).select("id").single()).data as { id: string };
    if (!purchase) throw new Error("diagnostic purchase creation failed");
    const entitlement = await db.from("entitlements").insert({ user_id: userId, profile_id: profileId, resource_id: "money-leak-risk", resource_type: "paid_analysis", is_active: true, source: "purchase", purchase_id: purchase.id });
    if (entitlement.error) throw entitlement.error;
    const refund = (await db.from("refund_workflows").insert({ order_id: orderId, payment_record_id: payment.id, user_id: userId, profile_id: profileId, product_id: "money-leak-risk", requested_amount: 16900, currency: "KRW", reason_category: "CHANGE_OF_MIND", status: "REFUND_PROCESSING", next_retry_at: new Date(Date.now() - 1000).toISOString() }).select("id").single()).data as { id: string };
    if (!refund) throw new Error("diagnostic workflow creation failed");

    const claimAResult = await db.rpc("claim_refund_workflows", { requested_limit: 1, claim_token: crypto.randomUUID(), lease_seconds: 300 });
    const claimA = (Array.isArray(claimAResult.data) ? claimAResult.data : [])[0] as { reconciliation_claim_token: string } | undefined;
    assert(Boolean(claimA?.reconciliation_claim_token), "Worker A claim must exist");
    const tokenA = claimA!.reconciliation_claim_token;
    await db.from("refund_workflows").update({ reconciliation_claim_expires_at: new Date(Date.now() - 1000).toISOString() }).eq("id", refund.id).eq("reconciliation_claim_token", tokenA);
    const claimBResult = await db.rpc("claim_refund_workflows", { requested_limit: 1, claim_token: crypto.randomUUID(), lease_seconds: 300 });
    const claimB = (Array.isArray(claimBResult.data) ? claimBResult.data : [])[0] as { reconciliation_claim_token: string } | undefined;
    assert(Boolean(claimB?.reconciliation_claim_token) && claimB!.reconciliation_claim_token !== tokenA, "Worker B claim must replace Worker A claim");
    const tokenB = claimB!.reconciliation_claim_token;

    const workflow = (await db.from("refund_workflows").select("id,order_id,status,reconciliation_claim_token,reconciliation_claim_expires_at,user_id,profile_id,product_id").eq("id", refund.id).single()).data as {
      id: string;
      order_id: string;
      status: string;
      reconciliation_claim_token: string | null;
      reconciliation_claim_expires_at: string | null;
      user_id: string;
      profile_id: string;
      product_id: string;
    };
    assert(workflow.order_id === orderId && workflow.status === "REFUND_PROCESSING", "Worker B workflow must remain canonical");
    const workerBTokenMatchesDb = workflow.reconciliation_claim_token === tokenB;
    const leaseValid = Boolean(workflow.reconciliation_claim_expires_at && new Date(workflow.reconciliation_claim_expires_at).getTime() > Date.now());
    assert(workerBTokenMatchesDb && leaseValid, "Worker B ownership must be valid before direct RPC");
    const directRpc = await db.rpc("revoke_refund_entitlement", { target_order_id: orderId, claim_token: tokenB, reason: "R10D_RPC_TRACE" });
    const directRows = Array.isArray(directRpc.data) ? directRpc.data : [];
    const directShapeValid = directRows.every((row: any) => typeof row.id === "string" && row.is_active === false);
    const directClassification = safeRpcClassification(directRpc.error, directRows.length, directShapeValid);
    assert(!directRpc.error && directRows.length >= 1 && directShapeValid, `valid Worker B RPC must succeed: ${directClassification}`);
    const staleRpc = await db.rpc("revoke_refund_entitlement", { target_order_id: orderId, claim_token: tokenA, reason: "STALE_R10D_RPC_TRACE" });
    const staleRows = Array.isArray(staleRpc.data) ? staleRpc.data : [];
    assert(!staleRpc.error && staleRows.length === 0, "stale Worker A RPC must be a no-op");
    const revoked = (await db.from("entitlements").select("id,is_active,revoked_at").eq("user_id", userId).eq("profile_id", profileId).eq("resource_id", "money-leak-risk").single()).data as { id: string; is_active: boolean; revoked_at: string | null };
    assert(revoked.is_active === false && Boolean(revoked.revoked_at), "valid direct RPC must revoke entitlement");
    console.log(JSON.stringify({ target: DISPOSABLE_URL, disposableIdentity: true, liveRpcExists: liveRpc.exists, liveRpcSignature: liveRpc.signature, liveRpcReturnType: liveRpc.returnType, migration023FunctionBodyPresent: liveRpc.definitionPresent, securityDefiner: liveRpc.securityDefiner, workflowExists: true, workerAClaimPresent: true, workerBClaimPresent: true, claimTokenChanged: tokenA !== tokenB, workerBTokenMatchesDb, leaseValid, entitlementExists: true, entitlementActiveBeforeRpc: true, purchaseCount: 1, directRpc: "EXECUTED_ONCE", rpcSuccess: true, rpcErrorCode: null, returnedRowCount: directRows.length, entitlementRevoked: true, revokedAtPresent: true, staleRpcNoOp: true, staleRpcReturnedRowCount: staleRows.length, staleRpcErrorCode: null }));
  } finally {
    const orders = (await db.from("orders").select("id").eq("user_id", userId)).data ?? [];
    const ids = orders.map((row: { id: string }) => row.id);
    await db.from("refund_workflows").delete().eq("user_id", userId);
    if (ids.length) await db.from("toss_payment_records").delete().in("order_id", ids);
    await db.from("purchases").delete().eq("user_id", userId);
    await db.from("entitlements").delete().eq("user_id", userId);
    await db.from("orders").delete().eq("user_id", userId);
    await db.from("profiles").delete().eq("user_id", userId);
    if (userId) await db.auth.admin.deleteUser(userId);
  }
  return;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "SAFE_TRACE_ERROR");
  process.exitCode = 1;
});
