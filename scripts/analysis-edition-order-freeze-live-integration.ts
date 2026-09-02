// STEP 57D-48F-C: order/purchase edition freeze — live local Supabase integration.
//
// Env-gated exactly like the Phase 3B integration block: SKIPPED (not a pass)
// when local Supabase credentials are absent. Never contacts remote Supabase.
// Disposable fixture (own throwaway user+profiles), cleaned up in `finally`.
import { createAdminClient } from "../app/lib/supabase/admin";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function runIntegration(): Promise<void> {
  const db = createAdminClient();
  const { createPendingOrder, confirmMockPayment, hasActiveEntitlementForProfile } = await import(
    "../app/lib/purchases/server"
  );

  const { data: userData, error: userError } = await db.auth.admin.createUser({
    email: `step-57d-48fc-${Date.now()}@local.test`,
    password: "local-test-password-48fc",
    email_confirm: true,
  });
  if (userError || !userData.user) throw userError ?? new Error("user fixture failed");
  const userId = userData.user.id;

  try {
    const { data: profile, error: profileError } = await db
      .from("profiles")
      .insert({ user_id: userId, label: "48F-C fixture A", relationship_type: "self", birth_date: "1990-01-01", birth_time: "12:00:00", gender: "male", calendar_type: "solar", is_leap_month: false })
      .select("id")
      .single<{ id: string }>();
    if (profileError || !profile) throw profileError ?? new Error("profile fixture failed");
    const profileId = profile.id;

    const { data: profile2, error: profile2Error } = await db
      .from("profiles")
      .insert({ user_id: userId, label: "48F-C fixture B", relationship_type: "spouse", birth_date: "1985-06-15", birth_time: "03:30:00", gender: "female", calendar_type: "solar", is_leap_month: false })
      .select("id")
      .single<{ id: string }>();
    if (profile2Error || !profile2) throw profile2Error ?? new Error("second profile fixture failed");
    const otherProfileId = profile2.id;

    // 1. YEARLY-policy product: order freezes YEAR:YYYY, purchase copies it exactly.
    const yearlyOrder = await createPendingOrder({ userId, profileId, productId: "wealth" });
    assert(typeof yearlyOrder.analysisEditionKey === "string" && /^YEAR:\d{4}$/.test(yearlyOrder.analysisEditionKey), "YEARLY order must freeze YEAR:YYYY");
    const yearlyConfirm = await confirmMockPayment(yearlyOrder.id, userId);
    assert(yearlyConfirm !== null, "mock payment confirmation must succeed");
    assert(yearlyConfirm!.purchase.analysisEditionKey === yearlyOrder.analysisEditionKey, "purchase must copy the exact frozen YEARLY order edition");
    console.log(`1. YEARLY freeze verified live: ${yearlyOrder.analysisEditionKey} ✓`);

    // 2. DAEUN-policy product: order resolves from server-owned profile fortune (never client input).
    const daeunOrder = await createPendingOrder({ userId, profileId, productId: "daeun-current" });
    assert(typeof daeunOrder.analysisEditionKey === "string" && /^DAEUN:\d+:.+$/.test(daeunOrder.analysisEditionKey), "DAEUN order must freeze DAEUN:<order>:<ganji>");
    const daeunConfirm = await confirmMockPayment(daeunOrder.id, userId);
    assert(daeunConfirm!.purchase.analysisEditionKey === daeunOrder.analysisEditionKey, "purchase must copy the exact frozen DAEUN order edition");
    console.log(`2. DAEUN freeze verified live: ${daeunOrder.analysisEditionKey} ✓`);

    // 3. a DIFFERENT profile's DAEUN order may safely produce a different edition.
    const daeunOrderOtherProfile = await createPendingOrder({ userId, profileId: otherProfileId, productId: "daeun-current" });
    assert(typeof daeunOrderOtherProfile.analysisEditionKey === "string", "different profile's DAEUN order must still freeze an edition");
    console.log(`3. different profile DAEUN edition: ${daeunOrderOtherProfile.analysisEditionKey} (profile A was ${daeunOrder.analysisEditionKey}) ✓`);

    // 4. P0 guard still blocks a same-profile/product repeat order after entitlement is active.
    let blocked = false;
    try {
      await createPendingOrder({ userId, profileId, productId: "wealth" });
    } catch (error) {
      blocked = error instanceof Error && error.name === "AlreadyOwnedError";
    }
    assert(blocked, "P0 guard must still block a repeat order for the now-entitled profile/product");
    assert(await hasActiveEntitlementForProfile(userId, profileId, "wealth"), "entitlement must be active after confirmation");
    console.log("4. P0 guard remains active after edition freeze activation ✓");

    console.log("\nanalysis-edition-order-freeze-live-integration passed ✓");
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
      `SKIPPED (not a pass): missing env NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. ` +
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
