# 운보다 staging 스키마 동기화 및 실로그인 E2E 준비 게이트
점검일: 2026-10-18 (KST)

## 1. 확인된 사실 (읽기 전용 운영/staging 카탈로그 비교)
- Supabase Production `eiyvdmorqclirvidihlm`: public 테이블 34개, public 컬럼 441개, public 함수 시그니처 63개, RLS 정책 15개.
- Supabase staging `xdiitqyysmhicjcytckm`: public 테이블 10개, 컬럼 112개, 함수 시그니처 6개, RLS 정책 7개.
- staging에 누락된 운영 구성: 테이블 **24개**, 컬럼 **329개**, 함수 **57개**, RLS 정책 **8개**. 현재 확인한 범위에서 staging 전용 추가 테이블은 없음.
- Supabase migration history: Production **70개**, staging **3개**. staging의 3개는 9월 NICE/출생시간 관련이고 버전 ID가 Production과 다르므로 단순한 '67개 적용'으로 판정하거나 migrate repair하지 않는다.
- 동일한 SQL 파일 `scripts/staging-schema-e2e-preflight.sql`을 두 DB에 실행한 결과: Production 필수 31개 게이트 **31/31**, staging **10/31**. 해당 검사는 카탈로그 조회만 실행함.
- `staging`에 테스트용 인증 사용자 2명 및 소유자가 다른 프로필 2건이 있으나, 이는 웹 로그인 쿠키/세션 존재를 뜻하지 않음.
- `scripts/staging-tenant-rls-rollback.sql`과 `scripts/staging-ai-tenant-rls-rollback.sql`은 A/B RLS 모의 접근 차단 PASS. SQL 수준의 역할/JWT 시뮬레이션이며 브라우저 E2E가 아님.

## 2. staging 필수 구성 (동기화 순서, 아직 적용하지 않음)
1. **현재 스키마 기준선 확정.** 001~015 상당의 기존 테이블·제약·인덱스·함수 존재 확인. staging 마이그레이션 이력이 축약되어 있으므로 완료 이력과 실제 DDL 상태를 별도로 대조한다. 기존 2개 테스트 계정을 임의 삭제하거나 덮어쓰지 않는다.
2. **결제/계정 접근의 선행 구조.** Production migration 016~038 범위: Toss 기록 및 환불 상태, `account_lifecycles`, 구매 에디션 `entitlements.analysis_edition_key`, `paid_reports.analysis_edition_key`, 관리자 권한·계정 정책. AI 039 이상을 먼저 설치하지 않는다.
3. **AI 상담 기본 구조.** Production 이름 `ai_consulting_schema_foundation`부터 `ai_consulting_atomic_grants`, `ai_consulting_long_term_memory`, `ai_consulting_thread_entry` 순서의 의존성 확인 후 테스트 DB에 적용.
4. **AI 질문권/관측.** `ai_consulting_profile_credit_ledger`, `ai_consulting_credit_runtime`, `ai_consulting_attempt_observability`의 참조·RPC·트리거 의존 확인.
5. **최근 운영 보완.** 9~10월 후속 운영/계정/상담/환불/AI 비용 관련 적용 순서를 Production migration history에 맞춰 검증.
6. **스키마 정합성 재검증.** 실제 table/column/function/RLS/GRANT, Supabase Security Advisor, `scripts/staging-schema-e2e-preflight.sql` 전 항목 준비, 기존 staging 시험 계정 유지 확인.
7. **안전한 환경 분리.** 별도 Vercel staging 웹 배포를 staging Supabase에만 연결하고 Auth redirect URLs 확인. TEST 결제용 키 사용/실제 결제는 실행하지 않음.
8. **HTTP + 브라우저 E2E.** 2개 계정 독립 로그인 세션으로 `scripts/two-account-readonly-e2e.ts` 실행하고 AI 상담/리포트/질문권의 타인 프로필 접근을 403·404로 차단하는지 검증. 미실행이면 완료로 표시 금지.

## 3. Vercel 환경 차이 및 안전 차단
- 확인된 Vercel 프로젝트는 `unboda` Production 프로젝트 1개. 별도의 staging 웹 프로젝트가 발견되지 않음.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`는 현재 **production 대상**으로만 등록됨. 일반 preview에 staging 인증을 구성하지 않은 상태.
- **운영 Supabase service_role 비밀키를 preview/staging에 재사용하지 않음.** 별도 staging 비밀키는 비밀관리 시스템 또는 Vercel 설정 화면에서 직접 안전하게 입력해야 함. 이 문서/PR/출력에 비밀키·쿠키 기록 금지.
- 실행 프로그램은 HTTPS 서버 호스트를 `UNBODA_E2E_EXPECTED_HOST`로 고정하고, `unboda.kr` 및 `www.unboda.kr` 접근을 거부하며, 쿠키가 없으면 SKIPPED 코드 2를 반환함.
- Vercel Preview에 이미 OPENAI_API_KEY 키가 존재하므로, 실제 E2E에서는 AI 메시지 작성 등 비용 발생 요청 금지. 읽기 전용 API만 실행.
- 현재 LIVE 결제/환불 스위치를 변경하지 않음. staged app 연결 이전에는 Production 보안 설정과 사용자 데이터 어떠한 수정도 금지.

## 4. 현재 블로커
- Staging 실제 DB에 24개 테이블 등 누락. 기능 전체와 동일한 웹 E2E 불가능.
- Server-side staging DB 비밀키 및 preview 고립 환경 미설정. 도구를 통해 비밀값을 표시하거나 임의 생성하지 않음.
- A/B 인증 세션을 제공하는 안전한 테스트 러너/보안 저장소 미설정.
- 별도 DB 프로젝트/브랜치를 새로 만드는 방법은 추가 비용이 발생할 수 있어, 비용 확인·명시적 승인 없이 생성하지 않음.

## 5. 성공 판정 기준
- 운영과 staging **필수 스키마**(테이블/컬럼/RPC/RLS)를 동기화하거나 검증 목적의 별도 테스트 DB에 동일 적용.
- staging-only 웹 배포 + staging-only Supabase 키 + 로그인 독립 세션 검증.
- 읽기 전용 교차 접근 API, 비로그인 차단, 직접 리포트 상태/상담 기억 접근 차단이 네트워크 요청으로 통과.
- 미완료 단계는 출시 E2E 통과로 표시하지 않음.

## 6. E2E 대상 서버 신원 검사 (코드 추가)
- `GET /api/internal/e2e-readiness`는 `VERCEL_ENV=preview`, `UNBODA_E2E_STAGING_ENABLED=true`, staging Supabase URL의 정확한 일치, staging 전용 `SUPABASE_SERVICE_ROLE_KEY` 등록 및 모든 LIVE 결제 스위치 비활성일 때에만 `{ready:true}`를 반환한다.
- Production 및 그 외 환경은 **404**와 `{ready:false}` 반환. 응답에는 DB ID/환경값/비밀키를 넣지 않는다.
- `scripts/two-account-readonly-e2e.ts`는 **인증 쿠키 전송 전에** 서버 신원 응답을 검증하도록 수정했다. 404라면 실제 테스트를 시작하지 않음.
- 서버 신원 검사 통과 자체는 DB 스키마 완성이나 두 계정 인증을 증명하지 않는다. 반드시 위 31항목 SQL 및 HTTP E2E를 각각 통과해야 함.
- 실제 격리된 Preview에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 **staging 값으로만** 설정한다. 별도 staging service-role 비밀키는 비밀관리 시스템에서 직접 구성해야 하며 운영 비밀키 복사 금지.
