/* Execute the real refund/purchase services against an isolated in-memory DB.
 * All provider and database imports are replaced; no keys, network or real money.
 * The companion staging SQL test verifies the actual revocation RPC separately.
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const crypto = require("node:crypto");
const vm = require("node:vm");
const ts = require("typescript");

const BUYER = "11111111-1111-4111-8111-111111111111";
const PROFILE = "22222222-2222-4222-8222-222222222222";
const OTHER_USER = "33333333-3333-4333-8333-333333333333";
const OTHER_PROFILE = "44444444-4444-4444-8444-444444444444";

function harness(options = {}) {
  const targetOrder = crypto.randomUUID();
  const otherOrder = crypto.randomUUID();
  const targetPurchase = crypto.randomUUID();
  const otherPurchase = crypto.randomUUID();
  const paymentId = crypto.randomUUID();
  const edition = options.legacy ? null : "YEAR:2025";
  const now = new Date().toISOString();
  const state = {
    cancelCalls: 0, lookupCalls: 0, rpcCalls: 0, failRpc: false,
    failVerification: false, failPurchase: false, failWorkflowLookup: false,
    skipRevocation: false, filters: [], events: [],
    tables: {
      orders: [
        { id: targetOrder, user_id: BUYER, profile_id: PROFILE, product_id: "career",
          amount: 9900, status: "paid", payment_provider: "synthetic", transaction_id: null,
          created_at: now, paid_at: now, analysis_edition_key: edition,
          analysis_reference_snapshot: null, analysis_input_snapshot: null },
        { id: otherOrder, user_id: BUYER, profile_id: PROFILE, product_id: "career",
          amount: 9900, status: "paid", analysis_edition_key: "YEAR:2026" },
      ],
      purchases: [
        { id: targetPurchase, order_id: targetOrder, user_id: BUYER, profile_id: PROFILE,
          product_id: "career", analysis_edition_key: edition },
        { id: otherPurchase, order_id: otherOrder, user_id: BUYER, profile_id: PROFILE,
          product_id: "career", analysis_edition_key: "YEAR:2026" },
      ],
      entitlements: [
        { id: "target", user_id: BUYER, profile_id: PROFILE, resource_id: "career",
          resource_type: "paid_analysis", purchase_id: targetPurchase,
          analysis_edition_key: edition, is_active: true },
        { id: "other-edition", user_id: BUYER, profile_id: PROFILE, resource_id: "career",
          resource_type: "paid_analysis", purchase_id: otherPurchase,
          analysis_edition_key: "YEAR:2026", is_active: true },
        { id: "other-user", user_id: OTHER_USER, profile_id: OTHER_PROFILE,
          resource_id: "career", resource_type: "paid_analysis", purchase_id: otherPurchase,
          analysis_edition_key: edition, is_active: true },
        { id: "other-profile", user_id: BUYER, profile_id: OTHER_PROFILE,
          resource_id: "career", resource_type: "paid_analysis", purchase_id: otherPurchase,
          analysis_edition_key: edition, is_active: true },
      ],
      toss_payment_records: [{ id: paymentId, order_id: targetOrder,
        payment_key: "synthetic-payment-reference", provider_order_id: targetOrder,
        confirmed_amount: 9900, expected_amount: 9900, currency: "KRW", provider_status: "DONE" }],
      refund_workflows: [],
    },
  };
  const matches = (row, filters) => filters.every(([key, value]) => (row[key] ?? null) === value);
  const db = {
    from(table) {
      assert(table in state.tables, "Unexpected table: " + table);
      const filters = [];
      let mode = "select", values, maximum;
      function execute(single) {
        if (table === "purchases" && state.failPurchase)
          return { data: null, error: { message: "Synthetic purchase outage" } };
        if (table === "refund_workflows" && mode === "select" && state.failWorkflowLookup)
          return { data: null, error: { message: "Synthetic workflow outage" } };
        if (table === "entitlements" && mode === "select" && state.failVerification)
          return { data: null, error: { message: "Synthetic verification outage" } };
        let rows;
        if (mode === "insert") {
          if (table === "refund_workflows" && state.tables[table].some(row =>
            row.order_id === values.order_id && row.status !== "REFUND_COMPLETED"))
            return { data: null, error: { message: "Synthetic active order uniqueness" } };
          const row = { id: crypto.randomUUID(), requested_at: now, retry_count: 0,
            max_retry_count: 5, next_retry_at: now, ...values };
          state.tables[table].push(row);
          rows = [row];
        } else {
          rows = state.tables[table].filter(row => matches(row, filters));
          if (mode === "update") {
            state.filters.push({ table, filters: [...filters] });
            for (const row of rows) Object.assign(row, values);
          }
        }
        if (maximum !== undefined) rows = rows.slice(0, maximum);
        if (single === "single" && rows.length !== 1)
          return { data: null, error: { message: "Synthetic single row mismatch" } };
        if (single && rows.length > 1)
          return { data: null, error: { message: "Synthetic multiple rows" } };
        return { data: single ? rows[0] ?? null : rows, error: null };
      }
      const query = {
        select() { return this; },
        eq(key, value) { filters.push([key, value]); return this; },
        is(key, value) { filters.push([key, value]); return this; },
        order() { return this; },
        limit(value) { maximum = value; return this; },
        insert(value) { mode = "insert"; values = value; return this; },
        update(value) { mode = "update"; values = value; return this; },
        async maybeSingle() { return execute("maybe"); },
        async single() { return execute("single"); },
        then(resolve, reject) { return Promise.resolve(execute()).then(resolve, reject); },
      };
      return query;
    },
    async rpc(name, args) {
      assert.equal(name, "revoke_refund_entitlement");
      state.rpcCalls++;
      if (state.failRpc) return { data: null, error: { message: "Synthetic RPC outage" } };
      if (state.skipRevocation) return { data: [], error: null };
      const workflow = state.tables.refund_workflows.find(row =>
        row.order_id === args.target_order_id && row.reconciliation_claim_token === args.claim_token
        && ["REFUND_REQUESTED", "REFUND_PROCESSING", "REFUND_FAILED_RETRYING"].includes(row.status));
      const order = workflow && state.tables.orders.find(row => row.id === workflow.order_id);
      const purchase = order && state.tables.purchases.find(row => row.order_id === order.id
        && row.user_id === order.user_id && row.profile_id === order.profile_id
        && row.product_id === order.product_id && row.analysis_edition_key === order.analysis_edition_key);
      if (!workflow || !order || !purchase || workflow.user_id !== order.user_id
        || workflow.profile_id !== order.profile_id || workflow.product_id !== order.product_id)
        return { data: [], error: null };
      const rows = state.tables.entitlements.filter(row => row.is_active
        && row.purchase_id === purchase.id && row.user_id === purchase.user_id
        && row.profile_id === purchase.profile_id && row.resource_id === purchase.product_id
        && row.resource_type === "paid_analysis" && row.analysis_edition_key === purchase.analysis_edition_key);
      for (const row of rows) Object.assign(row, { is_active: false, revocation_reason: args.reason });
      return { data: rows, error: null };
    },
  };
  class TossCancellationError extends Error {
    constructor(failure) { super("Synthetic cancellation failure"); this.failure = failure; }
  }
  const provider = {
    TossCancellationError,
    async cancelPaymentWithToss(input) {
      state.cancelCalls++;
      const workflow = state.tables.refund_workflows.find(row => row.id === input.idempotencyKey);
      assert(workflow, "A persisted workflow supplies provider idempotency");
      assert(workflow.reconciliation_claim_token, "The initial request owns a claim before cancellation");
      assert(Date.parse(workflow.reconciliation_claim_expires_at) > Date.now());
      return { orderId: targetOrder, totalAmount: 9900, currency: "KRW", status: "CANCELED",
        cancels: [{ cancelAmount: 9900, cancelStatus: "DONE", transactionKey: "synthetic-cancel" }] };
    },
    async getPaymentByOrderIdFromToss() {
      state.lookupCalls++;
      return { orderId: targetOrder, totalAmount: 9900, currency: "KRW", status: "CANCELED",
        cancels: [{ cancelAmount: 9900, cancelStatus: "DONE", transactionKey: "synthetic-cancel" }] };
    },
  };
  const shared = {
    "../supabase/admin": { createAdminClient: () => db },
    "../toss/server": provider,
    "../toss/config": { getTossConfigForAccount: () => ({ environment: "mock" }) },
    "../payments/observability": { emitPaymentEvent: (name) => state.events.push(name) },
  };
  function load(path, dependencies) {
    const compiled = ts.transpileModule(fs.readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(compiled, {
      module, exports: module.exports,
      require(name) {
        assert(name in dependencies, "Unmocked import: " + name);
        return dependencies[name];
      },
      Date, process: { env: {} },
      fetch() { throw Error("Network is forbidden in this regression"); },
    }, { filename: path });
    return module.exports;
  }
  const purchases = load("app/lib/purchases/server.ts", {
    ...shared, "./products": {}, "./types": { PAID_ANALYSIS_RESOURCE_TYPE: "paid_analysis" },
    "../premiumProductRegistry": {}, "../analysisEditionForOrder": {},
    "../analysisInputSnapshot": { parseAnalysisInputSnapshot: value => value },
    "../analysisEditionLabel": {}, "../accounts/server": {},
  });
  const refunds = load("app/lib/refunds/server.ts", {
    ...shared, "node:crypto": { randomUUID: crypto.randomUUID }, "../purchases/server": purchases,
    "../purchases/types": { PAID_ANALYSIS_RESOURCE_TYPE: "paid_analysis" },
    "./policy": { assessFullRefundEligibility: async () => ({ eligible: true }) },
    "./status": { getRefundCustomerMessage: () => "Synthetic status" },
  });
  async function initial() {
    const order = await purchases.getOrderForUser(targetOrder, BUYER);
    return refunds.requestFullRefund({ order, reasonCategory: "CONTENT_NOT_PROVIDED", reasonText: "Synthetic regression only" });
  }
  function recovery() {
    if (!state.tables.refund_workflows.length) state.tables.refund_workflows.push({
      id: crypto.randomUUID(), order_id: targetOrder, payment_record_id: paymentId,
      user_id: BUYER, profile_id: PROFILE, product_id: "career", requested_amount: 9900,
      currency: "KRW", reason_category: "CONTENT_NOT_PROVIDED", status: "REFUND_PROCESSING",
      reconciliation_claim_token: crypto.randomUUID(), retry_count: 0, max_retry_count: 5,
    });
    return refunds.getRefundWorkflowForOrder(targetOrder);
  }
  function unchangedOthers() {
    assert(state.tables.entitlements.filter(row => row.id !== "target").every(row => row.is_active));
    for (const id of [targetPurchase, otherPurchase])
      assert(state.tables.purchases.some(row => row.id === id), "Original purchases remain intact");
  }
  return { state, initial, recovery, refunds, purchases, unchangedOthers,
    order: () => state.tables.orders[0], target: () => state.tables.entitlements[0] };
}

let count = 0;
async function check(name, run) {
  await run();
  count++;
  console.log("PASS " + name);
}

(async () => {
  await check("initial refund preserves other editions, profiles and users", async () => {
    const h = harness();
    assert.equal((await h.initial()).status, "REFUND_COMPLETED");
    assert.equal(h.target().is_active, false);
    h.unchangedOthers();
    assert.equal(h.state.cancelCalls, 1);
    assert.equal(h.state.rpcCalls, 1);
    await h.initial();
    assert.equal(h.state.cancelCalls, 1, "A replay cannot cancel twice");
  });
  await check("recovery completes while another edition stays active, without cancellation", async () => {
    const h = harness();
    assert.equal((await h.refunds.reconcileRefundWorkflow(await h.recovery())).status, "REFUND_COMPLETED");
    assert.equal(h.target().is_active, false);
    h.unchangedOthers();
    assert.equal(h.state.lookupCalls, 1);
    assert.equal(h.state.cancelCalls, 0);
  });
  await check("recovery tolerates an already-revoked target", async () => {
    const h = harness(); h.target().is_active = false;
    assert.equal((await h.refunds.reconcileRefundWorkflow(await h.recovery())).status, "REFUND_COMPLETED");
    h.unchangedOthers();
  });
  await check("legacy null edition recovery stays purchase-scoped", async () => {
    const h = harness({ legacy: true });
    assert.equal((await h.refunds.reconcileRefundWorkflow(await h.recovery())).status, "REFUND_COMPLETED");
    assert.equal(h.target().is_active, false); h.unchangedOthers();
  });
  await check("a replacement purchase of the same legacy edition remains accessible", async () => {
    const h = harness({ legacy: true });
    const replacementOrder = { ...h.order(), id: crypto.randomUUID() };
    const replacementPurchase = { ...h.state.tables.purchases[0],
      id: crypto.randomUUID(), order_id: replacementOrder.id };
    h.state.tables.orders.push(replacementOrder);
    h.state.tables.purchases.push(replacementPurchase);
    h.target().purchase_id = replacementPurchase.id;
    assert.equal((await h.refunds.reconcileRefundWorkflow(await h.recovery())).status, "REFUND_COMPLETED");
    assert.equal(h.target().is_active, true); h.unchangedOthers();
  });
  await check("missing purchase blocks before any provider or workflow write", async () => {
    const h = harness(); h.state.tables.purchases.shift();
    await assert.rejects(h.initial(), /REFUND_PURCHASE_SCOPE_NOT_FOUND/);
    assert.equal(h.state.cancelCalls, 0); assert.equal(h.state.tables.refund_workflows.length, 0);
  });
  await check("mismatched purchase owner blocks before cancellation", async () => {
    const h = harness(); h.state.tables.purchases[0].user_id = OTHER_USER;
    await assert.rejects(h.initial(), /REFUND_PURCHASE_SCOPE_NOT_FOUND/);
    assert.equal(h.state.cancelCalls, 0);
  });
  await check("mismatched purchase edition blocks before cancellation", async () => {
    const h = harness(); h.state.tables.purchases[0].analysis_edition_key = "YEAR:2024";
    await assert.rejects(h.initial(), /REFUND_PURCHASE_SCOPE_NOT_FOUND/);
    assert.equal(h.state.cancelCalls, 0);
  });
  await check("purchase lookup errors fail closed", async () => {
    const h = harness(); h.state.failPurchase = true;
    await assert.rejects(h.initial(), /REFUND_PURCHASE_SCOPE_NOT_FOUND/);
    assert.equal(h.state.cancelCalls, 0);
  });
  await check("workflow lookup errors are not treated as no prior refund", async () => {
    const h = harness(); h.state.failWorkflowLookup = true;
    await assert.rejects(h.initial(), /REFUND_WORKFLOW_LOOKUP_FAILED/);
    assert.equal(h.state.cancelCalls, 0);
  });
  await check("revocation outage cannot mark complete; recovery does not cancel again", async () => {
    const h = harness(); h.state.failRpc = true;
    await assert.rejects(h.initial(), /REFUND_ENTITLEMENT_REVOCATION_FAILED/);
    assert.notEqual(h.state.tables.refund_workflows[0].status, "REFUND_COMPLETED");
    assert.equal(h.target().is_active, true); h.unchangedOthers();
    h.state.failRpc = false;
    assert.equal((await h.refunds.reconcileRefundWorkflow(await h.recovery())).status, "REFUND_COMPLETED");
    assert.equal(h.state.cancelCalls, 1); assert.equal(h.state.lookupCalls, 1);
    h.unchangedOthers();
  });
  await check("verification outage cannot mark a refund complete", async () => {
    const h = harness(); h.state.failVerification = true;
    await assert.rejects(h.initial(), /REFUND_ENTITLEMENT_VERIFICATION_FAILED/);
    assert.notEqual(h.state.tables.refund_workflows[0].status, "REFUND_COMPLETED");
    h.unchangedOthers();
  });
  await check("a still-active target blocks completion", async () => {
    const h = harness(); h.state.skipRevocation = true;
    await assert.rejects(h.initial(), /환불 확정 후 이용 권한/);
    assert.notEqual(h.state.tables.refund_workflows[0].status, "REFUND_COMPLETED");
    assert.equal(h.target().is_active, true); h.unchangedOthers();
  });
  await check("a stale worker cannot revoke or complete after claim takeover", async () => {
    const h = harness(); const workflow = await h.recovery();
    await assert.rejects(h.refunds.reconcileRefundWorkflow(workflow, {
      beforeEntitlementRevocation: async () => {
        h.state.tables.refund_workflows[0].reconciliation_claim_token = crypto.randomUUID();
      },
    }));
    assert.equal(h.target().is_active, true); h.unchangedOthers();
    assert.notEqual(h.state.tables.refund_workflows[0].status, "REFUND_COMPLETED");
    assert.equal(h.state.cancelCalls, 0);
  });
  await check("wrong workflow profile escalates before provider access", async () => {
    const h = harness(); const workflow = await h.recovery(); workflow.profileId = OTHER_PROFILE;
    assert.equal((await h.refunds.reconcileRefundWorkflow(workflow)).status, "OWNER_REVIEW_REQUIRED");
    assert.equal(h.state.lookupCalls, 0); assert.equal(h.state.cancelCalls, 0);
    assert.equal(h.target().is_active, true); h.unchangedOthers();
  });
  await check("missing order or claim never falls through to account-wide revocation", async () => {
    const h = harness();
    for (const scope of [{}, { orderId: h.order().id }]) {
      await assert.rejects(h.purchases.revokeEntitlementForRefund({ userId: BUYER,
        profileId: PROFILE, productId: "career", ...scope }), /REFUND_REVOCATION_SCOPE_REQUIRED/);
    }
    assert.equal(h.state.rpcCalls, 0);
    assert(h.state.tables.entitlements.every(row => row.is_active));
  });
  await check("account closure still revokes all editions of the selected profile", async () => {
    const h = harness();
    await h.purchases.revokeEntitlementForAccountClosure({ userId: BUYER, profileId: PROFILE, productId: "career" });
    assert(h.state.tables.entitlements.filter(row => row.profile_id === PROFILE).every(row => !row.is_active));
    assert(h.state.tables.entitlements.filter(row => row.profile_id !== PROFILE).every(row => row.is_active));
  });
  console.log("refund-purchase-edition-regression: PASS (" + count + " scenarios; no network, real DB or money)");
})().catch(error => { console.error(error); process.exitCode = 1; });
