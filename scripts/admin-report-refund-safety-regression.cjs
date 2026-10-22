/* Safe synthetic route harness: NEVER issues a real Toss payment request. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const routePath = "app/api/internal/admin/report-refunds/route.ts";
const code = fs.readFileSync(routePath, "utf8");
const refundCore = fs.readFileSync("app/lib/refunds/server.ts", "utf8");
const customerRoute = fs.readFileSync("app/api/orders/[orderId]/refund/route.ts", "utf8");
assert(code.includes('process.env.REPORT_REFUND_ADMIN_ENABLED !== "true"'));
assert(code.includes("process.env.REPORT_REFUND_APPROVER_IDS"));
assert(code.includes("await requireOperator()"));
assert(code.includes("await recordOperatorAuditEvent"));
assert(code.includes("await getPaymentByOrderIdFromToss"));
assert(code.includes("await getRefundWorkflowForOrder"));
assert(code.includes("await inspect(input.ticketId, input.reason, true)"));
assert(refundCore.includes("idempotencyKey: workflow.id"));
assert(refundCore.includes('if (error) throw new Error("REFUND_WORKFLOW_LOOKUP_FAILED")'));

assert(customerRoute.includes("REFUND_SUPPORT_REQUIRED"));

const buyerId = "22222222-2222-4222-8222-222222222222";
const approver = "11111111-1111-4111-8111-111111111111";
const ticketId = "33333333-3333-4333-8333-333333333333";
const orderId = "44444444-4444-4444-8444-444444444444";
const state = {
  authorized: true, ticket: {id:ticketId,user_id:buyerId,order_id:orderId,category:"PAYMENT_REFUND",status:"IN_REVIEW"},
  existing: null, paymentStatus: "DONE", providerStatus:"DONE", cancelled:false,
  providerOutage:false, policyEligible:true, auditError:false,
  attempts:0, auditAttempts:0, confirmedAmount:9900,
};
const order = {id:orderId,userId:buyerId,profileId:"55555555-5555-4555-8555-555555555555",
  productId:"synthetic-report",amount:9900,status:"paid",analysisEditionKey:"synthetic-edition"};
class OperatorAuthorizationError extends Error { constructor(code) { super(code); this.code=code; } }
const mocks = {
 "next/server": {NextResponse:{json:(data,opts={})=>({status:opts.status??200,data})}},
 "@/app/lib/operators/server": {
  OperatorAuthorizationError,
  requireOperator:async()=>{if(!state.authorized)throw new OperatorAuthorizationError("MISSING_ROLE");return {authUserId:approver};},
  recordOperatorAuditEvent:async()=>{state.auditAttempts++;if(state.auditError)throw Error("synthetic audit unavailable");}
 },
 "@/app/lib/supabase/admin": {createAdminClient:()=>({from:(t)=>{assert.equal(t,"support_requests");return {
  select(){return this;},eq(){return this;},
  async maybeSingle(){return {data:state.ticket,error:null};}
 };}})},
 "@/app/lib/purchases/server": {
  getOrderForUser:async(id,user)=>id===order.id&&user===buyerId?order:null,
  getTossPaymentRecordForOrder:async()=>({paymentKey:"paymentkey-test",providerOrderId:orderId,
    providerStatus:state.paymentStatus,confirmedAmount:state.confirmedAmount,currency:"KRW"})
 },
 "@/app/lib/refunds/policy": {assessFullRefundEligibility:async()=>({eligible:state.policyEligible})},
 "@/app/lib/refunds/server": {
  getRefundWorkflowForOrder:async()=>state.existing,
  requestFullRefund:async()=>{state.attempts++;return {status:"REFUND_COMPLETED",requestedAmount:9900};}
 },
 "@/app/lib/toss/server": {getPaymentByOrderIdFromToss:async()=>{
  if(state.providerOutage)throw Error("synthetic outage");
  return {paymentKey:"paymentkey-test",orderId,totalAmount:9900,currency:"KRW",
    status:state.providerStatus,method:"카드",cancels:state.cancelled?[{cancelStatus:"DONE",cancelAmount:9900}]:[]};
 }},
 "@/app/lib/toss/config": {getTossConfigForAccount:()=>({environment:"mock"})}
};
const compiled=ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const loaded={exports:{}};
new Function("require","module","exports","process","URL",compiled)(
 s=>{if(!(s in mocks))throw Error("Unmocked import: "+s);return mocks[s]},
 loaded,loaded.exports,process,URL);
const handler=loaded.exports;
const payload={ticketId,reason:"CONTENT_NOT_PROVIDED",note:"리포트 최종 미제공 사유를 운영자가 확인함",confirmed:true,amountConfirmation:9900};
function request(body=payload,origin="https://stage.example") {
 const url="https://stage.example/api/internal/admin/report-refunds";
 return {url,nextUrl:new URL(url+"?ticketId="+ticketId+"&reason=CONTENT_NOT_PROVIDED"),
   headers:{get:(name)=>name==="origin"?origin:null},json:async()=>body};
}
async function expectBlocked(action,label){
 const before=state.attempts;
 const r=await action;
 assert.notEqual(r.status,200,label);
 assert.equal(state.attempts,before,label+" must not cancel");
}
(async()=>{
 delete process.env.REPORT_REFUND_ADMIN_ENABLED;
 process.env.REPORT_REFUND_APPROVER_IDS=approver;
 await expectBlocked(handler.POST(request()),"disabled feature");
 process.env.REPORT_REFUND_ADMIN_ENABLED="true";
 process.env.REPORT_REFUND_APPROVER_IDS=buyerId;
 await expectBlocked(handler.POST(request()),"not in approver allowlist");
 process.env.REPORT_REFUND_APPROVER_IDS=approver;
 await expectBlocked(handler.POST(request(payload,"https://evil.example")),"CSRF");
 state.authorized=false;
 await expectBlocked(handler.POST(request()),"not an operator");state.authorized=true;
 await expectBlocked(handler.POST(request({...payload,confirmed:false})),"explicit approval");
 await expectBlocked(handler.POST(request({...payload,reason:"OWNER_OVERRIDE"})),"owner override forbidden");
 await expectBlocked(handler.POST(request({...payload,amountConfirmation:1000})),"wrong amount");
 state.ticket.category="PAID_ANALYSIS";
 await expectBlocked(handler.POST(request()),"wrong support category");state.ticket.category="PAYMENT_REFUND";
 state.ticket.status="WAITING_USER";
 await expectBlocked(handler.POST(request()),"support not reviewed");state.ticket.status="IN_REVIEW";
 state.existing={status:"REFUND_COMPLETED"};
 await expectBlocked(handler.POST(request()),"duplicate refund");state.existing=null;
 state.paymentStatus="PENDING";
 await expectBlocked(handler.POST(request()),"unconfirmed payment");state.paymentStatus="DONE";
 state.confirmedAmount=1000;
 await expectBlocked(handler.POST(request()),"internal amount mismatch");state.confirmedAmount=9900;
 state.policyEligible=false;
 await expectBlocked(handler.POST(request()),"policy not eligible");state.policyEligible=true;
 state.providerStatus="PARTIAL_CANCELED";
 await expectBlocked(handler.POST(request()),"provider already partial");state.providerStatus="DONE";
 state.cancelled=true;
 await expectBlocked(handler.POST(request()),"prior provider cancellation");state.cancelled=false;
 state.providerOutage=true;
 await expectBlocked(handler.POST(request()),"provider outage");state.providerOutage=false;
 state.auditError=true;
 await expectBlocked(handler.POST(request()),"audit write fails closed");state.auditError=false;
 const inspected=await handler.GET(request());
 assert.equal(inspected.status,200);
 assert.equal(inspected.data.ready,true);
 assert.equal(state.attempts,0,"GET never executes payment cancellation");
 const good=await handler.POST(request());
 assert.equal(good.status,200);
 assert.equal(good.data.status,"REFUND_COMPLETED");
 assert.equal(state.attempts,1);
 assert.ok(state.auditAttempts>=2);
 state.existing={status:"REFUND_COMPLETED"};
 await expectBlocked(handler.POST(request()),"replay after completion");
 console.log("admin-report-refund-safety-regression: PASS (19 synthetic gates, NO Toss or real DB)");
})().catch(e=>{console.error("admin-report-refund-safety-regression: FAIL",e);process.exitCode=1;});
