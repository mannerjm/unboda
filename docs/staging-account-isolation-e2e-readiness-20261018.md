# 운보다 계정 분리 E2E 준비 점검 (2026-10-18)

## 현재 검증된 범위
- 별도 Supabase 프로젝트 `unboda-staging` (`xdiitqyysmhicjcytckm`)에 서로 다른 소유자의 시험용 프로필 2개가 있음.
- Production (`eiyvdmorqclirvidihlm`)의 AI 상담 grants/threads/messages/memories는 authenticated SELECT 정책 `auth.uid() = user_id` 적용 확인.
- staging SQL 롤백 테스트: A/B 역할로 프로필·주문·구매·리포트·이용권 10개 조회 경계 통과. 임시 권한·데이터 모두 ROLLBACK 확인.
- 별도 AI 정책 미러 테스트: A/B 본인 조회/상대방 차단, 익명 차단 통과. `e2e_ai_rls_probe` 스키마 ROLLBACK 확인.
- 위 내용은 **DB 정책 검증**이며, 실제 계정 로그인 쿠키와 Next.js API에 대한 브라우저/HTTP E2E 통과로 간주하지 않음.

## staging 스키마 동기화 주의
- staging에는 `ai_consulting_threads`, `ai_consulting_messages`, `ai_consulting_memories` 등 실제 AI 상담 테이블이 없음.
- Production에는 계정 라이프사이클·구매 에디션·AI 상담·결제/환불 연동 관련 후속 마이그레이션이 적용되어 있고 staging은 일부 9월 변경 이력만 남아 있음.
- `039_ai_consulting_schema_foundation.sql`은 `entitlements.analysis_edition_key`, `account_lifecycles` 등 선행 구조를 참조함. 일부 마이그레이션을 선별 실행하는 것은 안전한 동기화가 아님.
- **정식 schema parity 작업은** 전체 의존 마이그레이션 검토 → 백업/격리된 테스트 프로젝트에서 적용 → 연결된 staging 앱의 동작 검증 순서로 분리. Production 직접 마이그레이션 금지.

## HTTP 교차 접근 E2E 수행 조건
- staging Supabase를 사용하는 별도 HTTPS 웹 배포와 두 개의 독립 테스트 로그인 세션 필요.
- `scripts/two-account-readonly-e2e.ts`는 `UNBODA_E2E_BASE_URL`, `UNBODA_E2E_EXPECTED_HOST`, `UNBODA_E2E_COOKIE_A`, `UNBODA_E2E_COOKIE_B` 환경 변수를 **실행 환경에서만** 받음. 비밀값을 GitHub/Vercel 로그나 이 문서에 적지 않음.
- 본인 프로필 목록/마이페이지 구매 요약에 이어 **상대방**의 AI 기억 GET(403), AI 상담 포트폴리오 GET(403), 질문권 잔액 GET(404) 차단 확인.
- 선택 사항: `UNBODA_E2E_PAID_PRODUCT_ID`를 유효 상품 ID로 제공하면 상대방 리포트 상태 GET(403) 확인.
- 세션이 없으면 종료 코드 2와 SKIPPED, 통과 아님. 공개 Production 호스트 `unboda.kr`는 실행 금지.
- 이 검사는 안전한 조회만 실행하며 보고서 생성, AI 대화, 결제, 환불·프로필 수정을 실행하지 않음.

## 추가 출시 게이트
1. 전체 마이그레이션을 정리해 staging 앱 + DB가 Production 기능과 호환되는지 확인.
2. 두 테스트 계정으로 실제 로그인 후 HTTP E2E 실행 및 응답 검사.
3. 실제 브라우저의 직접 URL 접근/세션 로그아웃/재로그인·AI 상담 기억 교차 접근 검사.
4. LIVE 결제/환불은 카드 승인과 별도 명시적 승인 전까지 계속 비활성.
