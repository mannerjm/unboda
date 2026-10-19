# 운보다 판매 전 자체 검증 / 사용자 확인 분리 — 2026-10-19

## 실행한 검사와 증거
- staging ID: `xdiitqyysmhicjcytckm`. 스크립트 `scripts/staging-same-user-multiprofile-rollback-20261019.sql` 실제 실행 **PASS**. 기존 A/B 2계정의 A에 spouse 프로필을 트랜잭션 내부에서 생성, A 본인에게만 합성 주문·구매·entitlement·완료된 리포트를 설정, 본인/배우자에 각각 다른 합성 AI 기억 삽입. PostgreSQL `authenticated`의 profile_id 조건을 이용한 조회 결과가 정확히 분리되며 타 계정 및 익명 읽기도 차단됨.
- **주의:** RLS는 `auth.uid()=user_id`에 의해 계정 단위로 제한하며 같은 사용자의 가족 프로필 자체를 RLS만으로 분리하는 것은 아님. 서버가 활성 프로필과 구매 권한, 정확한 에디션 및 프로필 ID를 검증해야 함. `ReportAccessGate`, `status` API, `memories`, `portfolio` API에 활성 프로필 인증 경계 존재. privileged storage의 user/profile 필터 확인 후 `scripts/profile-scoped-purchase-server-regression.ts`에 자동 검사 추가.
- 테스트는 `ROLLBACK`으로 종료. 추가 확인 결과 staging Auth=2, profiles=2, synthetic spouse=0, orders/purchases/entitlements/paid_reports/memories=0. LIVE 결제, 환불, AI 모델 호출 없음.
- Vercel Production 환경 변수 검사: `TOSS_HYBRID_ROUTING_ENABLED=true`, `TOSS_LIVE_CHECKOUT_ENABLED=false`, `TOSS_LIVE_PILOT_ENABLED=false`, `AI_CREDIT_REFUND_PILOT_ENABLED=false`, `NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED=true`. LIVE 결제 및 AI 질문권 환불 파일럿을 임의 활성화하지 않음.
- 실제 운영 Prod Supabase Heartbeat: `reconcile`, `paid_report_recovery` 최근 3시간 이내 마지막 성공, 오류 표시 없음. 운영자·고객지원 최종/재시도 알림 실패 0, failed paid_reports 0, 환불 수동 검토 0. Security Advisor에 INFO `rls_enabled_no_policy` 19건: 내부 service-role-only 성격인지 별도 구분, 이것을 곧바로 공개 접근 취약점으로 해석하지 않음.
- 관련 기존 증거: 2026-10-19 실제 Supabase CAPTCHA 토큰 누락 POST 3종 모두 HTTP400(서버 차단), Resend 26/26 수신 서버 전달, Work 모드 실제 독립 계정 A/B HTTP 접근 격리 PASS(보고). 오늘 별도 실제 브라우저 UI E2E, 실물 LIVE 카드 승인/환불/취소는 수행하지 않았음.

## 코드/정책 확인
- `app/lib/toss/config.ts` 관리자 TEST/일반 LIVE/파일럿 계정 분기; `app/api/orders/route.ts` 및 `app/api/orders/[orderId]/confirm-payment/route.ts`에서 본인 계정·서버 가격·성인 자격 확인.
- 실제 상품/구매 흐름, 환불 지원, 프로필 선택 및 PWA 비공개 응답 캐시 방지에 기존 회귀 테스트 코드 존재. 새 자동 검사로 활성 프로필 체크와 유료 에디션/AI 기억 조건을 보호.
- 법적 페이지 `/terms`, `/privacy`, `/refund` 및 사업자 표시는 코드상 존재. 신규 유료 리포트·질문권 온라인 이용기간 12개월 고지, 자동 카드 부분 환불 비활성일 때 고객지원 접수 경로 안내 확인.
- `docs/business-publication-facts-2026-09-11.md`에 통신판매업 신고번호/신고기관, 개인정보보호 연락처, 시행일·버전이 미확정이라고 기재됨. 사용자 제공한 실제 법적 상태와 일치 여부 최종 확인 필요.

## 자동으로 PASS 처리하지 않은 테스트
1. 동일 계정에서 가족 프로필 전환 후 앱 브라우저에서 유료 리포트 열람·차단, 상담 내용 표시, A 로그아웃/뒤로 가기.
2. NICE 본인/성인 인증 공급자 실제 상용 흐름. Production Gateway 환경 설정 이름만 확인했으며 사업자 계약/승인 및 성공 콜백 E2E는 미검증.
3. 카드사 최종 심사, Toss 상점 MID/상용 키 일치, LIVE 제한 승인/취소, 질문권 차감·부분환불/실제 정산. 카드사 승인·사용자 별도 실행 승인 전에는 절대 실행하지 않음.
4. 전체 상품별 AI 리포트의 구체성·가독성·중복·정확성과 질문권 사용의 실시간 브라우저 플로우. 기존 정적 회귀 및 DB RLS 검사가 실구매 UI E2E를 대체하지 않음.
5. 사업자 사실(통신판매업 신고/예외, 법적 필수 공개 항목) 및 환불/디지털 콘텐츠 고지의 최종 법률·계약 준수 확인.
6. Supabase 자동 백업/PITR 정책의 실제 복원 성공, 모바일 iPhone/Android 구매 경험, DMARC/CSP 및 실사용 상담·고객지원 외부 수신 화면. 현 연결에서는 복원/현장 기기 조작 불가.

## 사용자만 확인해야 할 최소 묶음
- 토스페이먼츠 카드사 심사 최종 승인 화면 및 상점의 활성 결제수단/MID 확인 (비밀키·고객 결제정보 공유 금지).
- NICE 상용 본인확인 계약·인증 완료 여부 및 테스트에 사용할 사용자 본인 소유 시험 번호.
- 통신판매업 신고 또는 면제 근거, 실제 공개 사업자 정보, 환불·개인정보 고지 법적 최종 확인. 정식 개인정보/약관 시행일 확정.
- 운영자 이메일이 실제 받은편지함에 도착했는지 확인(Resend 전달 자체는 검증 완료).
- 최종 UI 체크용 PC/모바일 브라우저 세션에서 승인된 테스트 계정 로그인; 실제 결제·취소·정식 LIVE 오픈은 매 단계 별도 명시적 승인.
- Supabase 대시보드 백업/PITR 설정과 복원 계획 확인; 실제 복구는 staging 또는 격리 환경에서만 안전하게 실행.

## 상태와 원칙
현재 정식 일반 고객 LIVE 결제는 **OFF**. 이 문서는 개발·데이터베이스 검증과 실제 현장 서비스 검증을 구분하며, 미실행 테스트에 PASS를 부여하지 않음. 절차 완료 전 일반 고객 판매 개방 금지.
