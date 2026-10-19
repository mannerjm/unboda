# 운보다 staging 두 계정 HTTP E2E 실행 기준 (2026-10-19)

## 실제 준비 현황
- staging Supabase `xdiitqyysmhicjcytckm`에 테스트 전용 Auth 사용자 2개와 프로필 2개를 확인.
- 이번 점검에서 한 계정에 누락됐던 `active_profiles` 선택 1건만 보완하여 두 계정 모두 **자기 소유 프로필 1개**가 활성화되어 있음. 기존 프로필·주문·결제·리포트 데이터 변경 없음.
- `auth.sessions`에는 세션 **2건이 있지만 소유 계정은 1개뿐**. `not_after IS NULL`인 행은 `not_after > now()` 검사에 포함되지 않으므로 0건으로 단정하면 안 됨. `auth.sessions`의 기록만으로 HTTP 요청에 쓸 쿠키를 얻을 수 없으며, 인증 세션이 검증됐다는 뜻도 아님.
- Preview 배포 `unboda-pr9awsg8m-unboda.vercel.app`의 `GET /api/internal/e2e-readiness`에서 사용자가 `{"ready":true}` 화면을 확인. staging 전용 서비스 키·프로필 DB 질의 성공을 의미하나 계정 간 HTTP E2E 통과는 아님.
- staging DB의 테이블/RPC/RLS/권한 구조 정합성 및 실제 AI 테이블 A/B RLS 접근 차단은 별도 검증 통과.

## HTTP 검사의 필수 조건
- 테스트 대상 도메인/HTTPS를 명시적으로 고정하고 실행 전에 `/api/internal/e2e-readiness`에서 ready=true 확인.
- 계정 A와 B 각각의 **독립 로그인 세션 쿠키를 안전한 실행 환경에서만** 공급. 쿠키·refresh/access token·테스트 계정 비밀번호를 GitHub, ChatGPT 채팅, Vercel 로그에 복사하지 말 것.
- `UNBODA_E2E_BASE_URL`, `UNBODA_E2E_EXPECTED_HOST`, `UNBODA_E2E_COOKIE_A`, `UNBODA_E2E_COOKIE_B` 값을 실행 환경에만 설정. 미입력 시 스크립트는 SKIPPED, 종료코드 2 (PASS 아님).
- `scripts/two-account-readonly-e2e.ts`는 인증 없는 GET → 본인 계정 정상 GET → 서로 다른 계정의 프로필 ID로 GET 순서.
- 비로그인: 프로필, 마이페이지, 상담 기억, 상담 포트폴리오, 질문권 잔액, 유료 리포트 상태가 모두 401(JSON)인지.
- 본인: 프로필, 구매 요약, AI 기억, 상담 포트폴리오, 질문권 잔액이 200으로 조회되는지.
- 상대방: AI 기억 403, 상담 포트폴리오 403, 질문권 잔액 404, 유료 리포트 상태 403.
- 구매한 상품이 없는 시험 계정의 본인 리포트 상태는 403. 테스트 상품 기본값은 `career`이며 유효한 다른 product ID를 `UNBODA_E2E_PAID_PRODUCT_ID`로 지정 가능.
- 계정 A/B가 같거나 프로필이 겹치면 FAIL. 재시도 실패·리다이렉트·HTML 반환도 FAIL.
- 이번 검사는 모두 GET으로 실제 결제, 질문권 소진, AI 메시지 작성 또는 리포트 생성을 수행하지 않음.

## PASS의 범위 / 출시 전 미해결
- 모든 위 항목을 실제 독립 세션으로 실행하기 전까지 **실로그인 E2E 미완료**.
- 현재 구매·entitlement·paid_reports 테스트 자료는 0건이므로, `paid product X`를 A가 구매한 후 B가 보는 **실제 유료 구매/열람 흐름**은 위 스크립트만으로 검증되지 않음. 별도 staging 합성 구매 fixture 또는 승인된 TEST 결제 시나리오가 필요.
- E2E를 위해 Supabase service-role 비밀키나 사용자 암호를 외부로 추출해 공유하지 않음.
- Work 모드의 클라우드 브라우저나 적절한 비밀관리/테스트 실행기에서 두 시험 계정으로 로그인해야 독립 HTTP 세션을 검증할 수 있음.
- Production LIVE 결제·부분 환불 설정은 절대 변경하지 않음.
