# 외부 처리·국외 이전 사실확인 — 2026-09-11

목적: 판매 시작 전에 OpenAI, Resend, Toss Payments 등 외부 서비스로 실제 어떤 정보가 전달되는지와 공개 가능한 근거를 정리한다. 확인되지 않은 계약·리전·법적 관계는 추정하지 않는다.

## 1. OpenAI API

### 코드에서 확인된 실제 전달 범위

- 무료·유료 분석 프롬프트에는 달력 기준, 윤달 여부, 생년월일, 출생시간, 성별과 계산된 사주·대운·세운 정보가 포함될 수 있다 (`app/lib/prompt/inputPrompt.ts`).
- AI 상담 프롬프트에는 구매 분석 내용, 사용자가 직접 말한 기억, 최근 대화와 현재 질문이 포함될 수 있다 (`app/lib/aiConsulting/answerPipeline.ts`).
- 따라서 OpenAI API에는 이메일·NICE 원문 본인확인 정보가 아니라, 분석 생성에 필요한 프로필 정보와 사용자가 상담에서 입력한 내용이 전달될 수 있다.
- 핵심 분석 Responses API 호출과 AI 상담 Responses API 호출은 현재 모두 `store: false`를 사용한다.

### 계정 화면에서 확인된 실제 프로젝트 설정

- 2026-09-11 OpenAI Platform의 운보다 사용 프로젝트 `Project Settings > General` 화면에서 `Project Residency = Global`을 직접 확인했다.
- 프로젝트 ID나 API Key 값은 이 감사 문서에 기록하지 않는다.
- 따라서 현재 운보다 OpenAI API 프로젝트에는 대한민국 전용 데이터 레지던시가 적용되어 있지 않다.
- `Global`은 특정 단일 국가에 처리·저장 위치가 고정된 프로젝트로 해석하지 않는다.

### OpenAI 공식 문서로 확인된 사실

- API 고객 데이터는 기본적으로 모델 학습에 사용되지 않으며, 고객이 명시적으로 opt-in한 경우를 제외한다.
- Responses API는 기본적으로 application state를 보관할 수 있으나, 운보다의 실제 Responses 호출은 `store: false`를 명시한다.
- `store: false`는 Zero Data Retention과 동일하지 않다. 기본 abuse-monitoring 로그에는 프롬프트·응답 등 고객 콘텐츠가 포함될 수 있고, 기본적으로 최대 30일 보관될 수 있다.
- OpenAI 문서상 데이터 레지던시는 프로젝트별 설정이며, 특정 리전을 설정한 프로젝트에만 해당 지역 저장·처리 통제가 적용된다. 현재 운보다 프로젝트는 `Global`이므로 특정 지역 레지던시를 적용한 상태로 표시하지 않는다.
- OpenAI는 API 처리에 여러 하위처리자를 사용하며, 공식 sub-processor 목록에 미국·대한민국·일본·싱가포르·유럽권 등을 포함한 복수 국가의 처리 위치가 공개되어 있다. 따라서 현재 운보다 프로젝트의 API 처리를 특정 국가 하나로 단정하지 않는다.
- 공개 Services Agreement와 DPA에서 EEA·스위스 외 고객의 OpenAI 계약 당사자는 OpenAI OpCo, LLC로 안내된다.

공식 근거:
- https://developers.openai.com/api/docs/guides/your-data
- https://openai.com/policies/services-agreement/
- https://openai.com/policies/data-processing-addendum/
- https://openai.com/policies/sub-processor-list/

### 공개 문구에 반영 가능한 결론

- 운보다는 분석 및 AI 상담 생성을 위해 OpenAI API를 사용한다.
- OpenAI로 전달될 수 있는 범위는 분석 생성에 필요한 생년월일·출생시간·성별·계산된 사주 정보와 AI 상담 입력·대화 내용이다.
- 계정 이메일과 NICE 원문 본인확인 정보는 현재 분석·상담 생성 프롬프트에 포함하지 않는다.
- 현재 API 프로젝트의 Project Residency는 `Global`이며 대한민국 전용 데이터 레지던시는 적용되지 않는다.
- 특정 단일 처리 국가를 기재하지 않고, OpenAI 및 공식 하위처리자가 공개한 복수 국가에서 처리될 수 있음을 설명한다.
- 운보다의 Responses 호출은 `store: false`이지만 기본 abuse-monitoring 등 OpenAI의 별도 보존 통제가 존재할 수 있다는 점을 함께 설명한다.

## 2. Resend 이메일

### 계정·코드에서 확인된 실제 상태

- 실제 발송 도메인: `mail.unboda.kr`.
- Resend 계정에서 해당 도메인은 verified, sending enabled, receiving disabled 상태다.
- 발송 리전은 `ap-northeast-1`이다. 이 값은 이메일 라우팅/발송 리전이며 저장 위치를 의미하지 않는 것으로 구분한다.
- Open Tracking과 Click Tracking은 모두 비활성화되어 있다.
- 고객지원 알림은 수신자 이메일 주소와 최소한의 알림 제목/본문만 Resend로 전달한다.
- 새 문의 운영자 알림 이메일에는 고객 이메일, 주문번호, 문의 본문을 넣지 않는다.
- 고객 답변 알림 이메일에도 실제 답변 본문을 넣지 않는다.
- 운영 예외 알림도 고객 개인정보나 주문 식별자를 이메일에 포함하지 않는다.

관련 코드:
- `app/lib/support/notifications.ts`
- `app/lib/operators/ownerAlerts.ts`

### Resend 공식 문서로 확인된 사실

- Resend의 DPA상 법인명은 Plus Five Five, Inc.이며, 고객을 위한 이메일 발송 처리에서 processor/sub-processor 관계를 설명한다.
- Resend는 고객 데이터 저장 위치를 미국으로 안내한다.
- Resend 공개 정책상 Free/Pro/Scale 플랜의 이메일·로그 데이터는 30일 보관되고, Enterprise는 별도 설정이 가능하다.
- 계정 종료 후 남은 customer data는 DPA상 90일 이내 삭제한다고 안내한다.
- 백업은 공개 GDPR 안내상 7일 지속된다고 안내한다.
- 하위처리자 목록이 공개되어 있다.

공식 근거:
- https://resend.com/security/gdpr
- https://resend.com/legal/dpa
- https://resend.com/legal/subprocessors
- https://resend.com/pricing

### 공개 문구에 반영 가능한 결론

- 운보다가 Resend를 고객지원·운영 알림 이메일 발송에 사용한다는 사실.
- 수신자 이메일 주소와 최소 알림 내용이 Resend로 전달된다는 사실.
- Resend가 고객 데이터 저장 위치를 미국으로 공개한다는 사실.
- `ap-northeast-1`은 현재 운보다 발송 리전이며 저장 위치와 동일한 의미로 쓰지 않는다.
- 운보다 설정에서 open/click tracking이 꺼져 있다는 점.
- 실제 계정 플랜을 이 감사에서 확정하지 않았으므로 공개 문구에서는 특정 플랜의 30일 보존을 운보다 계정의 확정값처럼 단정하지 않고, Resend 공개 정책 및 계약·플랜에 따른다고 설명한다.

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
- OpenAI 실제 API 프로젝트의 Project Residency는 `Global`.
- Resend는 고객지원/운영 이메일에서 본문 개인정보를 최소화하고 tracking을 비활성화함.
- Resend는 고객 데이터 저장 위치를 미국으로 공개하고 있음.
- Toss 코드 경계는 최소 주문 식별자·금액 위주로 구성되어 있음.

판매 전 남은 개인정보/외부처리 확인:
1. 사업자 정보와 개인정보 보호 책임 연락처 확정.
2. Toss 가맹점 live 상태 확인 후 최신 결제 개인정보 문구 확정.
3. OpenAI·Resend 공개 설명은 이번 확인 결과를 근거로 `/privacy`에 반영하고, 제공자 정책 또는 실제 계정 설정이 바뀌면 갱신한다.

이 문서는 기술·사실확인 메모이며 법률자문을 대신하지 않는다.
