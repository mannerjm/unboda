업데이트 기록

예)

2026-07-26 ~ 2026-08-09 (실제 커밋 범위, 단일 날짜 아님)

Premium Analysis

추가

로딩화면 개선

추천카드 개선

Prompt Builder 추가

---

2026-08-24

사용자 대상

- Result Premium Catalog 상품 구성을 54종(Launch 상품)으로 확정
  - TOPIC 47 / PERIOD 7
  - `career`, `wealth`, `relationship` 종합 분석 정상 노출
  - legacy `health` 종합 분석, `monthly-12months`(앞으로 12개월)는 이번 노출 대상에서 제외

Engineering / Internal (사용자 대상 릴리즈 노트에는 노출하지 않음)

- `public.profiles`에 대한 `service_role` write(`INSERT`/`UPDATE`/`DELETE`) 권한 부여로 프로필 생성/수정/삭제 API 오류(`permission denied for table profiles`) 수정
- Premium Catalog 노출 범위를 `getLaunchProductIds()` 기준 set-equality로 검증하는 회귀 테스트 추가
- 54-Product Browser Catalog QA(PASS) 완료

이 문서는 계속 누적된다.