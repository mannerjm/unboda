import { NextRequest, NextResponse } from "next/server";
import { requireOperator, OperatorAuthorizationError, recordOperatorAuditEvent } from "@/app/lib/operators/server";
import { isFinancialMfaVerified } from "@/app/lib/operators/financialMfa";
import { verifyCreditCheckoutForOperator, closeVerifiedCreditCheckout } from "@/app/lib/aiConsulting/creditCheckout";
export const dynamic = "force-dynamic";
const reply = (data: Record<string, unknown>, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
function sameOrigin(request: NextRequest) {
  try { return new URL(request.headers.get("origin") ?? "").origin === new URL(request.url).origin; } catch { return false; }
}
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return reply({error:"요청 출처를 확인할 수 없습니다."},403);
  try { await requireOperator(); } catch (e) { return reply({error:"관리자 권한이 필요합니다."},e instanceof OperatorAuthorizationError && e.code === "UNAUTHENTICATED" ? 401 : 403); }
  if (!(await isFinancialMfaVerified())) return reply({error:"관리자 추가 인증이 필요합니다.",mfaRequired:true},403);
  const body = await request.json().catch(()=>null) as {orderId?:unknown;action?:unknown;dashboardConfirmed?:unknown}|null;
  if (typeof body?.orderId !== "string" || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(body.orderId) || (body.action !== "inspect" && body.action !== "close")) return reply({error:"올바른 주문과 처리 방법을 선택해 주세요."},400);
  const orderId=body.orderId, action=body.action === "close" ? "UNPAID_ORDER_CLOSE" : "PAYMENT_RECHECK";
  try {
    // Audit before any mutation; provider evidence is always freshly checked in the service.
    await recordOperatorAuditEvent({action,targetType:"ORDER",targetReference:orderId,outcome:"SUCCESS",reason:body.action === "close" ? (body.dashboardConfirmed === true ? "unpaid close requested; original merchant dashboard confirmed" : "unpaid close requested") : "provider lookup requested"});
    const result=body.action === "close" ? await closeVerifiedCreditCheckout(orderId,body.dashboardConfirmed === true) : await verifyCreditCheckoutForOperator(orderId);
    await recordOperatorAuditEvent({action,targetType:"ORDER",targetReference:orderId,outcome:body.action === "close" && result.status !== "CLOSED" ? "ERROR" : "SUCCESS",reason:"provider result: " + result.status});
    return reply(result);
  } catch {
    await recordOperatorAuditEvent({action,targetType:"ORDER",targetReference:orderId,outcome:"ERROR",reason:"verification or persistence failed"}).catch(()=>undefined);
    return reply({error:"토스 조회 또는 처리 결과를 확정하지 못했습니다. 주문 상태를 새로고침해 확인해 주세요."},409);
  }
}
