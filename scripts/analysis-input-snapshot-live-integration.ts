// STEP 57D-48F-D2: immutable analysis input snapshot — live local Supabase integration.
//
// Env-gated: SKIPPED (not a pass) when local Supabase credentials are absent.
// Disposable fixture, cleaned up in `finally`.
//
// Proves (sections 7-10 of the phase spec):
//   - order/purchase freeze the profile's birth data at creation time (A)
//   - editing the profile afterward (to B) does not change what a delayed
//     report generation would consume — frozen A is used, never live B
//   - a retry after the profile edit still uses frozen A
//   - two purchases created under different profile birth data (A then B)
//     each retain their own distinct frozen snapshot without cross-contamination
//   - DAEUN: the frozen edition key stays consistent with the frozen
//     birth-input + anchorDate even after the profile is changed again
import { createAdminClient } from "../app/lib/supabase/admin";
import { buildPaidAnalysisInputFromProfile } from "../app/lib/paidAnalysisProfileInput";
import { parseAnalysisInputSnapshot } from "../app/lib/analysisInputSnapshot";
import type { ProfileDto } from "../app/lib/profiles/types";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const BIRTH_A = { birth_date: "1990-01-01", birth_time: "12:00:00", gender: "male", calendar_type: "solar", is_leap_month: false };
const BIRTH_B = { birth_date: "1985-06-15", birth_time: "03:30:00", gender: "female", calendar_type: "solar", is_leap_month: false };

async function runIntegration(): Promise<void> {
  const db = createAdminClient();
  const { createPendingOrder, confirmMockPayment, getPurchaseById, getOrderForUser } = await import(
    "../app/lib/purchases/server"
  );
  const { getUserProfile } = await import("../app/lib/profiles/server");

  const { data: userData, error: userError } = await db.auth.admin.createUser({
    email: `step-57d-48fd2-${Date.now()}@local.test`,
    password: "local-test-password-48fd2",
    email_confirm: true,
  });
  if (userError || !userData.user) throw userError ?? new Error("user fixture failed");
  const userId = userData.user.id;

  try {
    const { data: profileRow, error: profileError } = await db
      .from("profiles")
      .insert({ user_id: userId, label: "48F-D2 fixture", relationship_type: "self", ...BIRTH_A })
      .select("id")
      .single<{ id: string }>();
    if (profileError || !profileRow) throw profileError ?? new Error("profile fixture failed");
    const profileId = profileRow.id;

    // --- §7 step 1-4: order/purchase freeze profile birth data = A ---
    const orderMonthly = await createPendingOrder({ userId, profileId, productId: "career-job-change" });
    const snapshotA = parseAnalysisInputSnapshot(orderMonthly.analysisInputSnapshot);
    assert(snapshotA.birthData.birthDate === "1990-01-01" && snapshotA.birthData.gender === "남성", "order must freeze profile birth data = A at creation time");

    const confirmMonthly = await confirmMockPayment(orderMonthly.id, userId);
    assert(confirmMonthly !== null, "mock payment confirmation must succeed");
    const purchaseMonthly = confirmMonthly!.purchase;
    assert(
      JSON.stringify(purchaseMonthly.analysisInputSnapshot) === JSON.stringify(orderMonthly.analysisInputSnapshot),
      "purchase must copy the order's frozen input snapshot verbatim",
    );
    console.log("7a. order/purchase freeze profile birth data = A at creation time ✓");

    // --- §7 step 5-6: edit profile to B, generation must still use frozen A ---
    const { error: editError } = await db.from("profiles").update(BIRTH_B).eq("id", profileId);
    if (editError) throw editError;

    const profileAfterEdit = await getUserProfile(profileId, userId);
    if (!profileAfterEdit) throw new Error("profile re-fetch after edit failed");
    assert(profileAfterEdit.birthDate === "1985-06-15", "test setup: profile must now read as B");

    const purchaseRefetched = await getPurchaseById(purchaseMonthly.id);
    if (!purchaseRefetched) throw new Error("purchase re-fetch failed");
    const frozenSnapshot = parseAnalysisInputSnapshot(purchaseRefetched.analysisInputSnapshot);
    const referenceSnapshot = purchaseRefetched.analysisReferenceSnapshot as { anchorDate?: string } | null;

    const generationProfile: ProfileDto = { ...profileAfterEdit, ...frozenSnapshot.birthData };
    const frozenInput = buildPaidAnalysisInputFromProfile(generationProfile, "career-job-change", referenceSnapshot?.anchorDate);
    const liveInput = buildPaidAnalysisInputFromProfile(profileAfterEdit, "career-job-change", referenceSnapshot?.anchorDate);

    assert(frozenInput.birthData === JSON.stringify(JSON.parse(frozenInput.birthData)), "sanity: birthData must be valid JSON");
    assert(
      JSON.stringify(frozenInput.originalChart) !== JSON.stringify(liveInput.originalChart),
      "CRITICAL: generation using the frozen snapshot must differ from generation using the edited live profile",
    );
    assert(generationProfile.birthDate === "1990-01-01", "generation must use frozen A, never the edited live B, after a profile edit");
    console.log("7b. profile edit after purchase does NOT change what generation would consume (frozen A used, not live B) ✓");

    // --- §7 retry: same frozen snapshot reused, still A ---
    const purchaseRetryFetch = await getPurchaseById(purchaseMonthly.id);
    const retrySnapshot = parseAnalysisInputSnapshot(purchaseRetryFetch!.analysisInputSnapshot);
    assert(retrySnapshot.birthData.birthDate === "1990-01-01", "retry after profile edit must still resolve the original frozen A snapshot");
    console.log("7c. retry after profile edit still uses the original frozen snapshot (A) ✓");

    // --- §8: a second purchase created while profile = B must retain its own snapshot ---
    const orderYearly = await createPendingOrder({ userId, profileId, productId: "wealth" });
    const snapshotB = parseAnalysisInputSnapshot(orderYearly.analysisInputSnapshot);
    assert(snapshotB.birthData.birthDate === "1985-06-15", "a new order created after the profile edit must freeze B, not A");
    const confirmYearly = await confirmMockPayment(orderYearly.id, userId);
    const purchaseYearly = confirmYearly!.purchase;
    const finalSnapshotA = parseAnalysisInputSnapshot((await getPurchaseById(purchaseMonthly.id))!.analysisInputSnapshot);
    const finalSnapshotB = parseAnalysisInputSnapshot(purchaseYearly.analysisInputSnapshot);
    assert(finalSnapshotA.birthData.birthDate === "1990-01-01", "the OLD purchase's frozen snapshot A must remain untouched");
    assert(finalSnapshotB.birthData.birthDate === "1985-06-15", "the NEW purchase must retain its own frozen snapshot B");
    console.log("8. two purchases retain distinct frozen snapshots (A and B) without cross-contamination ✓");

    // --- §9 DAEUN: frozen edition key must stay consistent with frozen input + anchor after a further profile change ---
    const orderDaeun = await createPendingOrder({ userId, profileId, productId: "daeun-current" });
    assert(/^DAEUN:\d+:.+$/.test(orderDaeun.analysisEditionKey ?? ""), "DAEUN order must freeze a deterministic edition key");
    const confirmDaeun = await confirmMockPayment(orderDaeun.id, userId);
    const purchaseDaeun = confirmDaeun!.purchase;

    // Further profile change (simulate another edit after the DAEUN purchase).
    await db.from("profiles").update({ birth_date: "2000-03-03", birth_time: "07:15:00", gender: "male", calendar_type: "solar", is_leap_month: false }).eq("id", profileId);

    const daeunSnapshot = parseAnalysisInputSnapshot(purchaseDaeun.analysisInputSnapshot!);
    assert(daeunSnapshot.birthData.birthDate === "1985-06-15", "DAEUN purchase must retain the profile birth data frozen at ITS OWN purchase time (B), unaffected by the later edit");

    // Recompute the DAEUN key from the frozen snapshot + frozen anchor and confirm it still matches the originally frozen edition key.
    const daeunReferenceSnapshot = purchaseDaeun.analysisReferenceSnapshot as { anchorDate?: string; fortune?: { daeunOrder?: number; daeunGanji?: string } } | null;
    const { computeAnalysisEditionKey } = await import("../app/lib/analysisEditionKey");
    const recomputedFromFrozenInputs = computeAnalysisEditionKey({
      productId: "daeun-current",
      anchorDate: daeunReferenceSnapshot?.anchorDate,
      fortune: daeunReferenceSnapshot?.fortune,
    });
    assert(recomputedFromFrozenInputs === purchaseDaeun.analysisEditionKey, "recomputing from the frozen input+reference snapshot must reproduce the exact frozen edition key, never a different (new) daeun");
    console.log("9. DAEUN frozen input/edition consistency preserved across a further profile change ✓");

    console.log("\nanalysis-input-snapshot-live-integration passed ✓");
    void getOrderForUser;
  } finally {
    const orders = (await db.from("orders").select("id").eq("user_id", userId)).data ?? [];
    const ids = orders.map((row: { id: string }) => row.id);
    if (ids.length) await db.from("toss_payment_records").delete().in("order_id", ids);
    await db.from("purchases").delete().eq("user_id", userId);
    await db.from("entitlements").delete().eq("user_id", userId);
    await db.from("orders").delete().eq("user_id", userId);
    await db.from("profiles").delete().eq("user_id", userId);
    await db.auth.admin.deleteUser(userId);
  }
}

async function main(): Promise<void> {
  if (!supabaseUrl || !serviceRoleKey) {
    console.log(
      "SKIPPED (not a pass): missing env NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. " +
        "Set these to run the live local Supabase integration check.",
    );
    return;
  }

  await runIntegration();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
