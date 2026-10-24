import test from "node:test";
import assert from "node:assert/strict";
import {planRecovery,classifyFailure,MAX_RETRIES} from "./recovery.mjs";
const now=Date.parse("2026-10-24T20:00:00+09:00");
const base={state:"FAILED",now,scheduledAt:now-3600000,attempts:0,
 remoteLookupPerformed:true,publicationConfirmed:false};
const decide=(x={})=>planRecovery({...base,...x});
test("unknown remote outcome cannot be retried blindly",()=>{
 assert.equal(decide({remoteLookupPerformed:false}).action,"VERIFY_REMOTE_STATUS");
 assert.equal(decide({publicationConfirmed:null}).action,"VERIFY_REMOTE_STATUS");
});
test("known published must not create duplicate",()=>{
 assert.equal(decide({publicationConfirmed:true}).action,"MARK_PUBLISHED");
 assert.equal(decide({state:"PUBLISHED"}).action,"MARK_PUBLISHED");
});
test("retry transient with deterministic backoff",()=>{
 const a=decide({kind:"TRANSIENT",attempts:0});
 assert.equal(a.action,"RETRY_AFTER");assert.equal(a.nextAttemptAt,now+5*60000);
 const b=decide({kind:"TRANSIENT",attempts:2});
 assert.equal(b.nextAttemptAt,now+120*60000);
});
test("rate limit waits at least one hour",()=>assert.ok(
 decide({kind:"RATE_LIMIT"}).nextAttemptAt>=now+60*60000
));
test("auth and policy failures require a human",()=>{
 assert.equal(decide({httpStatus:401}).action,"ESCALATE");
 assert.equal(decide({errorCode:"COPYRIGHT"}).reason,"MANUAL_CONTENT_REVIEW");
});
test("max retries stops",()=>{
 assert.equal(decide({kind:"TRANSIENT",attempts:MAX_RETRIES}).reason,"RETRY_EXHAUSTED");
});
test("pending before deadline waits, after grace checks remote",()=>{
 assert.equal(decide({state:"PENDING",scheduledAt:now+3600000}).action,"WAIT_FOR_PUBLICATION");
 assert.equal(decide({state:"PENDING",scheduledAt:now-2*3600000}).action,"VERIFY_REMOTE_STATUS");
});
test("classifies status families",()=>{
 assert.equal(classifyFailure({httpStatus:502}),"TRANSIENT");
 assert.equal(classifyFailure({httpStatus:429}),"RATE_LIMIT");
 assert.equal(classifyFailure({httpStatus:403}),"AUTH_RECONNECT");
});
