import test from "node:test";
import assert from "node:assert/strict";
import {stageEditorialCandidate} from "./worker.mjs";
import {planContentBuffer} from "./buffer.mjs";
const now=Date.parse("2026-10-24T20:00:00+09:00");
const job=planContentBuffer({now}).find(j=>j.kind==="text-image");
const budget={approvedMonthlyLimitCents:1000,spentCents:0,reservedCents:0,
 budgetLockAcquired:true,subscriptionConfirmed:true};
const draft={
 title:"사주에는 네 가지 기둥이 있다는 이야기",
 script:"태어난 해, 달, 날, 시간을 각각 전통적인 기둥으로 나누어 읽습니다. 사주는 전통문화의 해석이며 사람의 삶이나 미래를 확정할 수 없습니다. 참고용 정보로 받아들이고 중요한 결정은 다른 근거도 함께 살펴보세요.",
 caption:"오행을 쉽고 친근하게 알아보는 전통 이야기입니다. 사주 해석은 참고용 정보이며 확정된 미래를 뜻하지 않습니다. #운보다 #사주",
 educationalValue:"사주 네 기둥이 어떤 전통적 역할을 하는지 익히되 인생을 단정하지 않도록 설명하는 자료입니다.",
 imagePrompt:"운보다의 밤하늘 배경에 네 기둥과 사주의 구조를 암시하는 독창적인 인포그래픽, 밝은 한국어 제목",
 evidenceNotes:["실제 발행 전 편집자가 명리 참고 자료를 확인해야 함"]
};
const mockLedger=()=>{
 const claims=new Set(),saved=[];
 return {claims,saved,claimJob:async({jobKey})=>!claims.has(jobKey)&&!!claims.add(jobKey),
  readRecentTopicKeys:async()=>[],
  saveCandidate:async record=>{saved.push(record);return true}};
};
test("no generator, budget or durable ledger means no work",async()=>{
 assert.equal((await stageEditorialCandidate({job,budget,estimatedCents:1})).reason,"DURABLE_LEDGER_NOT_CONNECTED");
 assert.equal((await stageEditorialCandidate({job,ledger:mockLedger(),budget,estimatedCents:1})).reason,"GENERATOR_NOT_CONNECTED");
 assert.equal((await stageEditorialCandidate({job,ledger:mockLedger(),generator:async()=>draft,
   estimatedCents:1,budget:{...budget,approvedMonthlyLimitCents:0}})).state,"BLOCKED");
});
test("generates candidate only after atomic claim; duplicates blocked",async()=>{
 const ledger=mockLedger();let called=0;
 const generate=async()=>{called++;return draft;};
 const args={job,ledger,generator:generate,budget,estimatedCents:100};
 const first=await stageEditorialCandidate(args);
 assert.equal(first.state,"NEEDS_EDITORIAL_QA");
 const again=await stageEditorialCandidate(args);
 assert.equal(again.state,"ALREADY_CLAIMED");
 assert.equal(called,1);
 assert.equal(ledger.saved[0].state,"NEEDS_EDITORIAL_QA");
});
test("refuses generation with corrupt topic history",async()=>{
 const ledger={...mockLedger(),readRecentTopicKeys:async()=>null};
 const got=await stageEditorialCandidate({job,ledger,generator:async()=>draft,budget,estimatedCents:1});
 assert.equal(got.state,"BLOCKED");
});
