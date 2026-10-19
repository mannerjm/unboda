# 운보다 staging 유료 리포트·AI 상담 기억 계정 격리 검증 (2026-10-19)

## 테스트 범위 및 환경
- Supabase **staging**: `xdiitqyysmhicjcytckm`. Production에는 실행하지 않음.
- SQL: `scripts/staging-paid-content-memory-rls-rollback.sql`. 기존 staging Auth/프로필 **2개를 유지**하고 전용 테스트 데이터만 트랜잭션에서 생성함.
- 테스트 데이터: A에게 0원 합성 주문·구매·유료 권한·완료된 리포트 JSON·상담 스레드·질문 메시지·출처가 연결된 기억을 제공. B에게는 구매 없이 독립 합성 기억 1건 제공. **실제 토스 결제/AI 모델 호출 없음.**
- 일시적 SELECT grant를 트랜잭션 안에서만 부여해 PostgreSQL RLS를 테스트함. 모든 grant 및 합성 데이터는 끝에서 `ROLLBACK`.

## 실제 실행 결과 (DB 통합 테스트)
**PASS**. 대상 SQL 파일을 staging에 실행해 결과:
- A의 권한으로는 자신의 주문·구매·entitlement·완료된 유료 리포트와 AI 스레드·메시지·기억만 각각 조회됨.
- B의 권한으로는 A의 유료 리포트·주문·권한·상담 스레드·메시지가 모두 0건 조회되고, **B 자신의 기억만** 조회됨.
- A 권한에서 B의 기억은 조회되지 않음.
- 미인증 `anon`은 주문·구매·권한·리포트·상담/기억을 모두 0건 조회함.
- B의 기억으로 A의 상담 메시지 ID를 연결하려는 외래키 위반 시도는 거부됨.
- SQL 종료 후 staging의 주문·구매·이용권·유료 리포트·AI grant·스레드·메시지·기억 **모두 0건**이고, Auth 사용자와 프로필 각 **2건 그대로**임을 별도 SQL 조회로 확인.
- 임시 `anon`의 기억 조회 GRANT와 `authenticated`의 리포트 GRANT 역시 유지되지 않았음.

## 서버 코드 검사 추가
빌드 회귀 검사 `scripts/auth-tenant-isolation-launch-regression.ts`에 다음 읽기 경계가 빠지지 않는지 추가:
- `app/lib/paidReports/server.ts`: user_id, profile_id, product_id, analysis_edition_key로 유료 리포트 조회 제한
- `app/lib/purchases/server.ts`: user/profile/product/edition 기반 entitlement 조회
- `app/lib/aiConsulting/memory.ts`, `portfolio.ts`: user_id, profile_id 조건
- SQL fixture의 종료 ROLLBACK 및 A/B/익명/외래키 차단 조건

## 검증의 한계
- 이번 PASS는 **실제 staging 테이블의 합성 콘텐츠에 대한 RLS/DB 통합 검사**임. 트랜잭션 내 테스트 데이터는 HTTP 요청에는 노출되지 않았고, 브라우저에서 유료 리포트를 정상 렌더링한 테스트가 아님.
- 앱 서버는 service-role 권한으로 테이블을 조회하므로 서버 소유권 검사도 중요함. 정적 회귀 검사를 보강했지만 **합성 구매 데이터가 존재할 때 HTTP 정상 열람 및 교차 차단을 실제 실행하지는 못함**.
- 리포트 합성 JSON은 DB 접근 검증용 최소 JSON이며 앱의 상세 보고서 콘텐츠 계약을 만족하는지 검증하지 않음.
- A의 UI/로그아웃 재검사, 운영 알림 실제 발송, CAPTCHA 실강제, 카드사 승인 후 LIVE 결제·환불은 여전히 별도 출시 게이트.
- 본 SQL은 운영 DB나 실제 유료 거래/고객 데이터에 사용하면 안 됨.
