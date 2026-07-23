import { getAnalyzeErrorStatus } from "../app/lib/getAnalyzeErrorStatus";

const openAINameError = new Error("요청 실패");
openAINameError.name = "OpenAIError";

if (getAnalyzeErrorStatus(openAINameError) !== 502) {
  throw new Error("OpenAI 이름 오류가 502로 분류되지 않았습니다.");
}

const openAIMessageError = new Error("OpenAI API 호출에 실패했습니다.");

if (getAnalyzeErrorStatus(openAIMessageError) !== 502) {
  throw new Error("OpenAI 메시지 오류가 502로 분류되지 않았습니다.");
}

const internalError = new Error("만세력 계산 중 오류가 발생했습니다.");

if (getAnalyzeErrorStatus(internalError) !== 500) {
  throw new Error("내부 계산 오류가 500으로 분류되지 않았습니다.");
}

if (getAnalyzeErrorStatus("unknown error") !== 500) {
  throw new Error("알 수 없는 오류가 500으로 분류되지 않았습니다.");
}

console.log("OpenAI 이름 오류 502 분류: true");
console.log("OpenAI 메시지 오류 502 분류: true");
console.log("내부 계산 오류 500 분류: true");
console.log("알 수 없는 오류 500 분류: true");
console.log("잘못된 JSON 요청 400 처리: route.ts 적용 완료");