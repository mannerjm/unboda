import { restoreStoredResult } from "../app/lib/restoreStoredResult";


const validCase = restoreStoredResult(
  "정상 AI 분석 결과",
  JSON.stringify({
    solarDate: "1987-02-03",
   daeunAnalysis: {},
  })
);

if (!validCase.ok) {
  throw new Error("정상 저장 데이터 복원에 실패했습니다.");
}

const brokenJsonCase = restoreStoredResult(
  "정상 AI 분석 결과",
  "{broken-json"
);

if (brokenJsonCase.ok) {
  throw new Error("깨진 JSON 데이터가 정상 처리되었습니다.");
}

const missingResultCase = restoreStoredResult(
  null,
  JSON.stringify({ solarDate: "1987-02-03" })
);

if (missingResultCase.ok) {
  throw new Error("AI 결과 누락 데이터가 정상 처리되었습니다.");
}

const missingSajuCase = restoreStoredResult(
  "정상 AI 분석 결과",
  null
);

if (missingSajuCase.ok) {
  throw new Error("사주 데이터 누락이 정상 처리되었습니다.");
}

console.log("정상 저장 데이터 복원: true");
console.log("깨진 JSON 차단: true");
console.log("AI 결과 누락 차단: true");
console.log("사주 데이터 누락 차단: true");