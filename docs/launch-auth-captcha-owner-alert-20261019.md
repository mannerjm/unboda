# 운보다 출시 전 로그인 CAPTCHA · 운영 알림 확인 (2026-10-19)

## 점검 범위
운영 Vercel 설정 이름/필수 공개 플래그, 가입·로그인·비밀번호 재설정 CAPTCHA 연결 코드, Supabase Security Advisor, 정기 작업 기록, 운영자 알림 전송 원장 및 실제 Resend 발송 상태를 **읽기 전용**으로 확인했다.

## 확인 결과
- Production Vercel `NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED`가 정확히 `true`이며 `NEXT_PUBLIC_TURNSTILE_SITE_KEY`가 비어 있지 않음을 확인 (공개 키 값은 기록하지 않음).
- `app/auth/AuthCaptcha.tsx`는 Cloudflare Turnstile 토큰 생성, 만료·오류 시 토큰 초기화를 수행. 로그인·가입·비밀번호 재설정 화면에서 토큰 전달. `app/api/auth/signup/route.ts`는 플래그가 켜진 상태에서 신규 가입 요청에 토큰이 없으면 거부하고 Supabase Auth signUp으로 토큰을 넘긴다.
- **별도 미확인:** Supabase Production Auth > Bot and Abuse Protection > Enable CAPTCHA protection이 실제 ON인지, 공급자가 Cloudflare Turnstile인지, 서버 측 Secret이 올바른지는 연결된 관리 도구가 반환하지 않아 확인하지 못함. 웹사이트 화면의 CAPTCHA와 Vercel 공개 키만으로 서버 검증 활성화까지 증명하지 않는다.
- 운영 DB `operator_roles`에 활성 CS_OPERATOR 알림 수신 대상 1명.
- 운영 DB `operator_alert_deliveries` 26건 SENT, `support_notification_deliveries` 2건 SENT. 두 스케줄러 `reconcile`, `paid_report_recovery`는 최근 3시간 안에 시도·성공, 마지막 오류 표시 없음.
- 운영 Resend 계정의 `mail.unboda.kr` 도메인은 **verified / sending enabled**.
- Resend 계정 2026-10-12 ~ 2026-10-19 지표: **26 sent, 26 delivered, 0 bounced, 0 failed**. 실제 발송 일자는 10월 14~15일. 모두 운영 예외 알림이며 공급자 기준 수신 서버 전달 성공. 사용자 메일함의 스팸 필터/열람 여부는 이 지표만으로 증명할 수 없음.
- 검토한 마지막 운영 알림은 결제 상태 불일치 1건을 관리자에게 전달했고 고객 개인정보/주문 식별자를 메일 본문에 포함하지 않음. 현재 DB의 결제·환불 수동 확인 및 AI 질문권 환불 예외는 각각 0건.
- Supabase Production Security Advisor는 RLS 정책이 없는 내부 운영 테이블에 대한 INFO 안내가 남아 있음. 보호되지 않은 공개 읽기 권한으로 단정하지 말고 의도된 service-role-only 구성인지 테이블별 확인.
- 현 시점에 새로운 테스트 이메일을 전송하거나 운영 계정 로그인·데이터 수정·결제/환불 설정을 변경하지 않음.

## 이번 코드 보강
`scripts/launch-security-regression.ts`가 Production 빌드에서:
- CAPTCHA 사용 플래그 `true` 및 Turnstile 공개 키 존재 검증
- Resend 발송 키, CRON_SECRET 존재 검증
- `vercel.json`의 일정과 스케줄러 인증·알림 경로, Resend 발송 멱등성·수신자 조회 조건 보호

모든 비밀키는 **존재 여부만** 확인하고 값은 출력하지 않는다. 일반 로컬/Preview 빌드는 동일한 Production 필수 조건 때문에 차단되지 않는다.

## 남아 있는 실검증 (최종 판매 개방 전)
1. Supabase Production [Auth 보안 설정](https://supabase.com/dashboard/project/eiyvdmorqclirvidihlm/auth/protection)에서 CAPTCHA 활성화 상태, **Cloudflare Turnstile**, 서버 Secret 설정 여부 확인. 운영 사용자의 로그인에 영향을 줄 수 있으므로 코드를 먼저 배포·도메인 사이트 키와 시크릿 일치 확인 후 서버 측 보호를 활성화한다. 사용자가 스크린샷으로 상태를 공유할 때 **Secret 값은 가리고** 상태만 확인한다.
2. 비로그인 상태에서 실제 로그인/회원가입/재설정 폼의 Turnstile 렌더링 및 유효·누락·잘못된 토큰의 동작을 실증. 테스트 계정/Preview 먼저, Production 보안 토글 변경 시 별도 승인.
3. 관리자 알림은 외부 수신 서버 전달까지 확인했지만 실제 사용자가 받은편지함에서 열람했는지 확인되지 않음. 운영자 수신함에서 스팸 분류 없이 수신됐는지 한 번 확인.
4. DMARC DNS와 엄격한 CSP, 카드사 승인 후 LIVE 결제·환불, 유료 리포트 UI E2E는 각각 별도 출시 게이트.

## 근거
- Supabase 공식 가이드: https://supabase.com/docs/guides/auth/auth-captcha
- [PR 보강 결과](https://github.com/mannerjm/unboda/pulls) 및 위 운영 DB/Resend 실측.
