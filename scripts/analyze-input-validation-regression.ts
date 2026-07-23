import { validateAnalyzeInput } from "../app/lib/validateAnalyzeInput";

const validInput = validateAnalyzeInput({
  birthDate: "1987-02-03",
  birthTime: "22:48",
  calendarType: "양력",
  isLeapMonth: "평달",
  gender: "남성",
});

if (!validInput.valid) {
  throw new Error("정상 입력이 거부되었습니다.");
}

const missingInput = validateAnalyzeInput({
  birthDate: "",
  birthTime: "22:48",
  calendarType: "양력",
  isLeapMonth: "평달",
  gender: "남성",
});

if (missingInput.valid) {
  throw new Error("필수값 누락 입력이 통과되었습니다.");
}

const invalidCalendarType = validateAnalyzeInput({
  birthDate: "1987-02-03",
  birthTime: "22:48",
  calendarType: "기타",
  isLeapMonth: "평달",
  gender: "남성",
});

if (invalidCalendarType.valid) {
  throw new Error("잘못된 calendarType이 통과되었습니다.");
}

const invalidLeapMonth = validateAnalyzeInput({
  birthDate: "1987-02-03",
  birthTime: "22:48",
  calendarType: "양력",
  isLeapMonth: "기타",
  gender: "남성",
});

if (invalidLeapMonth.valid) {
  throw new Error("잘못된 isLeapMonth가 통과되었습니다.");
}

const invalidGender = validateAnalyzeInput({
  birthDate: "1987-02-03",
  birthTime: "22:48",
  calendarType: "양력",
  isLeapMonth: "평달",
  gender: "기타",
});

if (invalidGender.valid) {
  throw new Error("잘못된 gender가 통과되었습니다.");
}

console.log("정상 입력 허용: true");
console.log("필수값 누락 차단: true");
console.log("calendarType 검증: true");
console.log("isLeapMonth 검증: true");
console.log("gender 검증: true");