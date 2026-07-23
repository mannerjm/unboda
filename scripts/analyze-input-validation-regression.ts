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

const invalidBirthDate = validateAnalyzeInput({
  birthDate: "1987/02/03",
  birthTime: "22:48",
  calendarType: "양력",
  isLeapMonth: "평달",
  gender: "남성",
});

if (invalidBirthDate.valid) {
  throw new Error("잘못된 birthDate 형식이 통과되었습니다.");
}

const invalidBirthTime = validateAnalyzeInput({
  birthDate: "1987-02-03",
  birthTime: "25:99",
  calendarType: "양력",
  isLeapMonth: "평달",
  gender: "남성",
});

if (invalidBirthTime.valid) {
  throw new Error("잘못된 birthTime 형식이 통과되었습니다.");
}

console.log("birthDate 형식 검증: true");
console.log("birthTime 형식 검증: true");

const validLeapDate = validateAnalyzeInput({
  birthDate: "2024-02-29",
  birthTime: "12:00",
  calendarType: "양력",
  isLeapMonth: "평달",
  gender: "남성",
});

if (!validLeapDate.valid) {
  throw new Error("정상 윤년 날짜가 거부되었습니다.");
}

const invalidNonLeapDate = validateAnalyzeInput({
  birthDate: "2026-02-29",
  birthTime: "12:00",
  calendarType: "양력",
  isLeapMonth: "평달",
  gender: "남성",
});

if (invalidNonLeapDate.valid) {
  throw new Error("존재하지 않는 2026-02-29가 통과되었습니다.");
}

const invalidFebruaryDate = validateAnalyzeInput({
  birthDate: "2026-02-30",
  birthTime: "12:00",
  calendarType: "양력",
  isLeapMonth: "평달",
  gender: "남성",
});

if (invalidFebruaryDate.valid) {
  throw new Error("존재하지 않는 2026-02-30이 통과되었습니다.");
}

const invalidMonth = validateAnalyzeInput({
  birthDate: "2026-13-01",
  birthTime: "12:00",
  calendarType: "양력",
  isLeapMonth: "평달",
  gender: "남성",
});

if (invalidMonth.valid) {
  throw new Error("존재하지 않는 13월 날짜가 통과되었습니다.");
}

console.log("윤년 유효 날짜 허용: true");
console.log("평년 2월 29일 차단: true");
console.log("존재하지 않는 2월 30일 차단: true");
console.log("존재하지 않는 월 차단: true");