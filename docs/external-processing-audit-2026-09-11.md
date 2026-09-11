# 외부 처리·국외 이전 사실확인 — 2026-09-11

목적: 판매 시작 전에 OpenAI, Resend, Toss Payments 등 외부 서비스로 실제 어떤 정보가 전달되는지와 공개 가능한 근거를 정리한다. 확인되지 않은 계약·리전·법적 관계는 추정하지 않는다.

## 1. OpenAI API

### 코드에서 확인된 실제 전달 범위

- 무료·유료 분석 프롬프트에는 달력 기준, 윤달 여부, 생년월일, 출생시간, 성별과 계산된 사주·대운·세운 정보가 포함될 수 있다 (`app/lib/prompt/inputPrompt.ts`).
- AI 상담 프롬프트에는 구매 분석 내용, 사용자가 직접 말한 기억, 최근 대화와 현재 질문이 포함될 수 있다 (`app/lib/aiConsulting/answerPipeline.ts`).
- 따라서 OpenAI API에는 이메일·NICE 원문 본인확인 정보가 아니라, 분석 생성에 필요한 프로필 정보와 사용자가 상담에서 입력한 내용이 전달될 수 있다.
- 핵심 분석 Responses API 호출과 AI 상담 Responses API 호출은 현재 모두 `store: false`를 사용한다.

### OpenAI 공식 문서로 확인된 사실

- API 고객 데이터는 기본적으로 모델 학습에 사용되지 않으며, 고객이 명시적으로 opt-in한 경우를 제외한다.
- Responses API의 `store` 기본값은 true이고, `store: false`는 생성 응답을 API의 저장 응답 상태로 남기지 않도록 하는 설정이다.
- `store: false`는 Zero Data Retention과 동일하지 않다. 기본 abuse-monitoring 로그는 별도 정책에 따라 최대 30일 보관될 수 있으며, ZDR은 별도 자격·승인이 필요한 통제다.
- OpenAI는 API용 데이터 레지던시 기능을 제공하지만, 현재 운보다 API 프로젝트에 특정 데이터 레지던시/처리 리전이 활성화되어 있는지는 이 감사에서 확인하지 못했다.
- OpenAI는 API 처리에 여러 하위처리자를 사용하며 공식 sub-processor 목록에 다수 국가가 공개되어 있다. 현재 계정 설정을 확인하지 않은 상태에서 단일 처리 국가를 임의로 확정하지 않는다.

공식 근거:
- https://developers.openai.com/api/reference/cli/resources/responses/methods/create
- https://openai.com/enterprise-privacy/
- https://platform.openai.com/docs/models/default-usage-policies-by-endpoint
- https://openai.com/policies/sub-processor-list/

### 남은 확인

- OpenAI API 프로젝트의 실제 Data Residency/processing 설정을 계정 화면에서 확인해야 한다.
- 그 확인 전에는 개인정보처리방침에 OpenAI 처리 국가를 특정 국가 하나로 단정하지 않는다.

## 2. Resend 이메일

### 계정·코드에서 확인된 실제 상태

- 실제 발송 도메인: `mail.unboda.kr`.
- Resend 계정에서 해당 도메인은 verified, sending enabled, receiving disabled 상태다.
- 발송 리전은 `ap-northeast-1`이다. Resend 공식 문서상 이 값은 이메일 라우팅/발송 리전을 의미하며 저장 위치를 의미하지 않는다.
- Open Tracking과 Click Tracking은 모두 비활성화되어 있다.
- 고객지원 알림은 수신자 이메일 주소와 최소한의 알림 제목/본문만 Resend로 전달한다.
- 새 문의 운영자 알림 이메일에는 고객 이메일, 주문번호, 문의 본문을 넣지 않는다.
- 고객 답변 알림 이메일에도 실제 답변 본문을 넣지 않는다.
- 운영 예외 알림도 고객 개인정보나 주문 식별자를 이메일에 포함하지 않는다.

관련 코드:
- `app/lib/support/notifications.ts`
- `app/lib/operators/ownerAlerts.ts`

### Resend 공식 문서로 확인된 사실

- Resend는 Customer Data의 processor로 동작할 수 있다고 DPA에서 설명한다.
- Resend는 고객 데이터 저장을 미국에서 수행한다고 안내한다. 도메인 발송 리전 선택은 저장 위치를 바꾸지 않는다.
- Free/Pro/Scale 플랜은 활성 계정의 email/log data를 30일 보관한다고 안내하고, 계정 종료 후 남은 customer data는 DPA상 90일 이내 삭제한다고 설명한다. Enterprise는 별도 보존 설정이 가능하다.
- 하위처리자 목록이 공개되어 있다.

공식 근거:
- https://resend.com/security/gdpr
- https://resend.com/legal/dpa
- https://resend.com/legal/subprocessors

### 공개 문구에 반영 가능한 결론

- 운보다가 Resend를 거래·고객지원·운영 알림 발송에 사용한다는 사실.
- 수신자 이메일 주소와 최소 알림 내용이 Resend로 전달된다는 사실.
- 저장 위치는 미국이라는 Resend 공식 설명.
- `ap-northeast-1`은 발송 리전이며 저장 위치가 아니라는 점.
- 운보다 설정에서 open/click tracking이 꺼져 있다는 점.

## 3. Toss Payments

### 현재 코드에서 확인된 실제 전달 범위

- 현재 Production은 live Toss 설정이 준비되지 않아 실제 결제 판매가 아직 활성화되지 않았다.
- 결제가 활성화되면 브라우저에서 Toss SDK에 다음 값이 전달된다.
  - `customerKey`: 운보다 Auth 사용자 ID
  - 내부 주문 ID
  - 결제 금액
  - 상품명
  - 성공/실패 반환 URL
- 현재 checkout 코드는 고객 이메일, 프로필 구분명, 생년월일, 출생시간, NICE 인증 원문을 Toss 결제 요청 값으로 전달하지 않는다.
- Toss 결제창 안에서 구매자가 입력하거나 인증하는 카드·결제수단 정보는 Toss Payments 및 해당 결제수단 제공자가 처리한다.
- 운보다 서버의 승인 확인 API는 Toss에 `paymentKey`, 내부 주문 ID, 금액을 전송한다.
- 결제 조회/취소 시 내부 주문 ID 또는 paymentKey와 취소 사유가 전송될 수 있다.

관련 코드:
- `app/checkout/[productId]/CheckoutAccessPanel.tsx`
- `app/lib/toss/server.ts`

### Toss Payments 공식 문서로 확인된 사실

- 전자결제 시 구매자명 또는 구매자ID, 결제금액 등을 처리하며 결제수단별로 카드·계좌·휴대폰 등 결제정보를 처리할 수 있다고 공식 동의문에 공개한다.
- Toss Payments는 결제 결과 조회·통보, 결제 취소·환불, 민원·분쟁 처리 등을 개인정보 처리 목적으로 안내한다.
- 최신 공개 개발 문서에서 실제 계약·카드사 심사가 완료되어야 실결제가 가능하다고 안내한다.

공식 근거:
- https://pages.tosspayments.com/terms/privacy/
- https://docs.tosspayments.com/guides/v2/get-started/payment-products
- https://docs.tosspayments.com/reference

### 남은 확인

- 운보다 Toss 가맹점 계약 완료 상태와 live key 발급 여부.
- 판매 개시 전 최신 Toss 개인정보 처리/제3자 제공/국외 이전 문구를 다시 확인한다.
- 실제 live 결제 1건의 브라우저 E2E가 끝나기 전에는 판매 완료 상태로 표시하지 않는다.

## 4. 현재 launch 관점 결론

확인 완료:
- NICE 원문 본인확인 정보는 서울 gateway에서 최소화됨.
- Supabase Production DB 주 리전은 서울.
- Vercel Production Functions는 `iad1`.
- OpenAI 핵심 분석·AI 상담 Responses 호출은 `store: false`.
- Resend는 고객지원/운영 이메일에서 본문 개인정보를 최소화하고 tracking을 비활성화함.
- Toss 코드 경계는 최소 주문 식별자·금액 위주로 구성되어 있음.

판매 전 남은 개인정보/외부처리 확인:
1. OpenAI API 프로젝트의 실제 Data Residency/processing 설정 확인.
2. 사업자 정보와 개인정보 보호 책임 연락처 확정.
3. Toss 가맹점 live 상태 확인 후 최신 결제 개인정보 문구 확정.
4. 위 사실을 근거로 공개 `/privacy`의 OpenAI·Resend·Toss 설명을 최종 반영.

이 문서는 기술·사실확인 메모이며 법률자문을 대신하지 않는다.