import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=(p:string)=>readFileSync(p,"utf8");
const purchase=read("app/lib/purchases/server.ts");
const report=read("app/lib/paidReports/server.ts");
const grouped=read("app/lib/purchasedAnalysesGrouping.ts");
const list=read("app/components/PurchasedAnalysesListMultiEdition.tsx");
const refund=read("app/lib/aiConsulting/creditRefunds.ts");
const tos=read("app/lib/toss/server.ts");
const access=read("app/lib/aiConsulting/server.ts");
const terms=read("supabase/migrations/20261014190000_commercial_terms_credit_lots.sql");
const state=read("supabase/migrations/20261014195000_credit_expiry_refund_state_machine.sql");
const runtime=read("supabase/migrations/20261014200000_enforce_commercial_credit_runtime.sql");
const page=read("app/ai-consulting/credits/refunds/page.tsx");
const refundPage=read("app/refund/page.tsx");
const u=read("app/terms/page.tsx");
const alerts=read("app/lib/operators/ownerAlerts.ts");
const expiredMigration=read("supabase/migrations/20261015192000_close_expired_unpaid_toss_orders.sql");
const orderConfirm=read("app/api/orders/[orderId]/confirm-payment/route.ts");
const failures=read("app/lib/operators/failureVisibilityServer.ts");
const ordersMigration=read("supabase/migrations/032_active_edition_order_uniqueness.sql");
const heartbeats=read("app/lib/operators/heartbeat.ts");
const recoveryWorker=read("app/lib/operators/paidReportRecovery.ts");
const recoveryRoute=read("app/api/internal/report-recovery/route.ts");
const masterCron=read("app/api/internal/reconcile/route.ts");
const healthRoute=read("app/api/health/operations/route.ts");
const soloDashboard=read("app/lib/operators/soloOperations.ts");
const adminOperations=read("app/admin/AdminOperationsOverview.tsx");
const adminPage=read("app/admin/page.tsx");
const recoverySchema=read("supabase/migrations/20261015194500_solo_operations_safety.sql");
const recoveryHardening=read("supabase/migrations/20261015194800_solo_report_recovery_hardening.sql");
const cronConfig=JSON.parse(read("vercel.json")) as { crons?: Array<{ path: string; schedule: string }> };
const reportGenerator=read("app/lib/paidReports/generation.ts");
const guide=read("app/admin/guide/page.tsx");
const aiFullMetricsMigration=read("supabase/migrations/20261015195000_solo_ai_full_integrity_metrics.sql");
const paymentAlertIncident=alerts.slice(
  alerts.indexOf('kind: "PAYMENT_OWNER_REVIEW" as const'),
  alerts.indexOf('kind: "REFUND_OWNER_REVIEW" as const'),
);
const checks:Record<string,boolean>={
  legacyPurchasePreserved:terms.includes("effective_at is not null and new.purchased_at>=v_effective_at"),
  newPurchase12Months:terms.includes("new.service_expires_at:=new.purchased_at+interval '12 months'"),
  entitlementStampedFromPurchase:terms.includes("where id=new.purchase_id and user_id=new.user_id and profile_id=new.profile_id"),
  reportServerEnforcesExpiry:purchase.includes("service_expires_at.is.null,service_expires_at.gt."),
  serverCreditEnforcesExpiry:access.includes('rpc("expire_due_ai_credit_lots"'),
  reportSummaryExpires:report.includes("serviceExpiresAt: entitlement.serviceExpiresAt ?? null"),
  reportGroupExpires:grouped.includes("serviceExpiresAt: summary.serviceExpiresAt ?? null"),
  reportLibraryShowsExpiry:list.includes("열람 종료일")&&list.includes("reportServiceTermLabel(edition.serviceExpiresAt)"),
  legacyLibraryWithoutFakeExpiry:list.includes("기존 구매 이용조건 유지"),
  creditBundleBalanceFIFO:terms.includes("order by expires_at asc nulls last,purchased_at asc,purchase_id asc"),
  expiringCreditUpdatesLedger:state.includes("'ADJUSTMENT',-v_qty"),
  refundPurchaseOwnerVerified:state.includes("where purchase_id=p_purchase_id and user_id=p_user_id and profile_id=p_profile_id"),
  refundAmountServerComputed:state.includes("v_lot.paid_amount_krw::bigint*v_qty/v_lot.purchased_quantity"),
  refundReservesCredit:state.includes("held_quantity=held_quantity+v_qty"),
  refundDebitsCreditAfterSettlement:state.includes("'REFUND',-v_req.refund_quantity"),
  clientCannotSpecifyAmount:refund.includes("p_purchase_id:input.purchaseId")&&!refund.includes("p_refund_amount"),
  partialTossCancellation:tos.includes("cancelAmount: input.cancelAmount")||tos.includes("cancelAmount: input.cancelAmount }"),
  tossIdempotency:tos.includes('"Idempotency-Key"'),
  refundDisabledByDefault:refund.includes('process.env.AI_CREDIT_SELF_REFUNDS_ENABLED === "true"'),
  providerStateReconciled:refund.includes("getPaymentByOrderIdFromToss(refund.order_id, accountConfig)"),
  noDoubleProviderCalls:refund.includes("idempotencyKey:refund.idempotency_key"),
  refundRecurringRecovery:refund.includes("retryDueCreditRefunds"),
  guardReportDuringConsultation:runtime.includes("v_entitlement.service_expires_at<=now()"),
  buyerScreenShowsExpired:page.includes("lot.expiresAt"),
  buyerScreenRequiresEnabled:page.includes("enabled&&active&&lot.available>0&&!lot.refundId"),
  noFalseAutoRefundPromise:refundPage.includes("자동 카드 환불은 시험·검증 중"),
  publicTermsDisclose12mo:u.includes("온라인 열람·재열람기간은 결제 승인 시각부터 12개월"),
  exhaustedRetrySkipped:purchase.includes(".filter((record) => record.retryCount < record.maxRetryCount)"),
  pendingFallbackOnlyWhenUnrecorded:purchase.includes('.select("order_id")') &&
    purchase.includes(".in(\"order_id\", pendingOrders.map((order) => order.id))") &&
    purchase.includes("!knownOrderIds.has(row.id) && !alreadyRecordedIds.has(row.id)"),
  pendingFallbackFailsClosedOnLookupError:purchase.includes("if (existingPaymentError)") &&
    purchase.includes("throw new Error(`Toss pending 주문의 기존 결제 기록을 확인하지 못했습니다:"),
  ownerEmailStableForSamePaymentIssue:paymentAlertIncident.includes("version: normalizeVersion(row.reconciliation_status as string | null)") &&
    !paymentAlertIncident.includes("version: normalizeVersion(row.updated_at as string | null)"),
  paymentConfirmPathUnchanged:purchase.includes('if (provider.status !== "DONE")') &&
    purchase.includes("provider payment verified and access restored"),
  expiredProviderRequiresAtomicClosure:purchase.includes('provider.status === "EXPIRED"') &&
    purchase.includes('rpc("close_expired_unpaid_toss_order"') &&
    expiredMigration.includes("p_provider_status is distinct from 'EXPIRED'"),
  expiredNeverCaptures:expiredMigration.includes("v_payment.payment_key is not null") &&
    expiredMigration.includes("v_payment.confirmed_amount is not null") &&
    expiredMigration.includes("v_order.paid_at is not null") &&
    expiredMigration.includes("exists(select 1 from public.purchases"),
  expiredClosureAccountAndOrderPreserved:expiredMigration.includes("set status='canceled'") &&
    expiredMigration.includes("reconciliation_status='expired_unpaid'") &&
    !expiredMigration.includes("delete from public.orders"),
  expiredNoOwnerQueue:failures.includes('.in("reconciliation_status", ["reconciliation_required", "reconciliation_failed", "terminal_mismatch"])') &&
    !failures.includes('"expired_unpaid"'),
  expiredNoEmail:alerts.includes('.in("reconciliation_status", ["terminal_mismatch", "reconciliation_failed"])') &&
    !alerts.includes('"expired_unpaid"'),
  canceledOrderNoCheckoutReuse:ordersMigration.includes("status in ('pending', 'paid')") &&
    purchase.includes('.in("status", ["pending", "paid"])') &&
    orderConfirm.includes('order.status === "canceled"'),
  waitingCheckoutNoFalseFailure:purchase.includes('provider.status === "READY"') &&
    purchase.includes('provider.status === "IN_PROGRESS"') &&
    purchase.includes('provider.status === "WAITING_FOR_DEPOSIT"') &&
    purchase.includes('return { outcome: "awaiting_payment" }'),
  untouchedTossReviewGuards:orderConfirm.includes("isTossCheckoutUserAllowed(user.id)") &&
    purchase.includes('if (provider.status !== "DONE")'),
  hourlyCoreCronPreserved:cronConfig.crons?.some((job) => job.path === "/api/internal/reconcile" && job.schedule === "0 * * * *") === true,
  safeRecoveryScheduled:cronConfig.crons?.some((job) => job.path === "/api/internal/report-recovery" && job.schedule === "23 * * * *") === true &&
    recoveryRoute.includes('isAuthorizedSchedulerRequest(request)') &&
    recoveryRoute.includes('export const maxDuration = 300'),
  recoveryRequiresPaidEntitlement:recoverySchema.includes('e.purchase_id=pr.purchase_id') &&
    recoverySchema.includes('e.is_active=true') &&
    recoverySchema.includes("a.status='ACTIVE'"),
  recoveryNeverCreatesPurchase:!recoveryWorker.includes("createPendingOrder") &&
    !recoveryWorker.includes("createPurchaseFromPaidOrder") &&
    recoveryWorker.includes('p_limit: 1'),
  recoveryBoundedAndLocked:recoverySchema.includes('for update of pr skip locked') &&
    recoverySchema.includes('attempt_count,0)<3') &&
    recoveryHardening.includes('on conflict on constraint paid_report_recovery_attempts_pkey'),
  recoveryConvergesViaExistingClaim:recoveryWorker.includes('preparePaidReportGeneration(input)') &&
    recoveryWorker.includes('runPaidReportGeneration(input, claim)') &&
    reportGenerator.includes('if (!(await canPublish(input)))'),
  healthCannotLeakCustomers:healthRoute.includes('status: healthy ? 200 : 503') &&
    !healthRoute.includes('select("user_id') && !healthRoute.includes('select("email'),
  heartbeatFailClosed:heartbeats.includes('INTERNAL_HEARTBEAT_PERSIST_FAILED') &&
    masterCron.includes('await recordJobHeartbeat("reconcile"') &&
    recoveryRoute.includes('await recordJobHeartbeat("paid_report_recovery"'),
  aiRefundPilotOnlyExplicitUsers: read("app/lib/aiConsulting/creditRefunds.ts").includes('isAiCreditRefundAllowedForUser(refund.user_id)') &&
    read("app/lib/aiConsulting/creditRefunds.ts").includes('isAiCreditRefundAllowedForUser(input.userId)') &&
    read("app/lib/aiConsulting/creditRefunds.ts").includes('TOSS_LIVE_PILOT_ACCOUNT_IDS') &&
    read("app/lib/aiConsulting/creditRefunds.ts").includes('TOSS_LIVE_PILOT_ENABLED') &&
    read("app/lib/aiConsulting/creditRefunds.ts").includes('TOSS_HYBRID_ROUTING_ENABLED') &&
    read("app/lib/aiConsulting/creditRefunds.ts").includes('AI_CREDIT_REFUND_PILOT_ENABLED') &&
    read("app/api/ai-consulting/credits/refunds/route.ts").includes('isAiCreditRefundAllowedForUser(user.id)') &&
    read("app/ai-consulting/credits/refunds/page.tsx").includes('isAiCreditRefundAllowedForUser(user.id)'),
  extraRefundsOptInOnly:masterCron.includes('AI_CREDIT_REFUND_RETRY_WORKER_ENABLED === "true"') &&
    masterCron.includes('AI_CREDIT_SELF_REFUNDS_ENABLED === "true"') &&
    masterCron.includes('AI_CREDIT_REFUND_PILOT_ENABLED === "true"'),
  healthForSoloInbox:soloDashboard.includes('readJobHeartbeats()') &&
    adminOperations.includes('1인 통합 운영 업무함') &&
    adminPage.includes('getSoloOperationsSnapshot()'),
  alertAfterBudget:alerts.includes('recovery?.attempts ?? 0') &&
    alerts.includes('analysis_input_snapshot_invalid') &&
    alerts.includes('SUPPORT_OVERDUE'),
  overdueAndEmailAlerts:alerts.includes('NOTIFICATION_FAILURE') &&
    alerts.includes('REVIEWS_OVERDUE') &&
    alerts.includes('AI_OPERATIONS_ANOMALY'),
  supervisorRunbookAvailable:guide.includes('1인 운영 비상 대응') &&
    guide.includes('Supabase 프로젝트 상태'),
  serviceRoleOnly:recoverySchema.includes('revoke all on function public.claim_due_paid_report_recovery') &&
    recoveryHardening.includes('grant execute on function public.count_exhausted_paid_report_recoveries() to service_role'),
  fullAiCreditIntegrityScan:alerts.includes('rpc("list_ai_charge_integrity_incidents_24h")') &&
    aiFullMetricsMigration.includes('not exists(select 1 from public.ai_consulting_credit_ledger'),
  accurate24hAiMetrics:soloDashboard.includes('rpc("get_ai_solo_operations_metrics_24h")') &&
    aiFullMetricsMigration.includes('from public.ai_consulting_attempts a') &&
    !soloDashboard.includes('limit(500)'),
  privateAiMonitoring:aiFullMetricsMigration.includes('revoke all on function public.list_ai_charge_integrity_incidents_24h()') &&
    aiFullMetricsMigration.includes('grant execute on function public.get_ai_solo_operations_metrics_24h() to service_role')

};
for (const [name,pass] of Object.entries(checks))assert.ok(pass,`contract failed: ${name}`);
console.log("commercial integration static contract: PASS",Object.keys(checks).length,"checks (NOT actual payment E2E)");
