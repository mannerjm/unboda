# STEP 52D-3D-D Corrected Unboda V1 Public Legal Policy Draft

> **문서 상태: 내부 검토용 corrected draft.** 현재 공개 페이지나 고객 안내로
> 배포하지 않습니다. 아래 `FACT-PENDING` 값은 확인 전 공개 문구로 대체할 수
> 없습니다. 이 문서는 3D-C 감사의 텍스트 correction을 반영한 내부 초안이며,
> 구현된 공개 정책 페이지를 의미하지 않습니다.

## 1. Executive Verdict

**PASS — CORRECTED DRAFT READY**

3D-C에서 지적한 문구를 반영한 Terms, Privacy, Refund/Cancellation/Withdrawal
초안입니다. 필요한 계정·인증·요청 서비스 처리와 거래기록 보존 범위를 구분하고,
일반적인 Privacy 동의를 전제로 삼지 않으며, 디지털 콘텐츠 공급 개시가 계약과
광고에 맞지 않는 공급에 대한 권리를 없애지 않는다는 점을 명시했습니다.

공개 전에는 실제 사업자·지원·처리자·국외이전 사실, 정책 버전·시행일, 필드별
보존 설정, 그리고 아래의 제한된 `GENUINE LEGAL AMBIGUITY` 항목을 확정해야
합니다. `/terms`, `/privacy`, `/refund` route shell은 내부/비공개 상태로 먼저
구현할 수 있지만, FACT-PENDING placeholder를 고객에게 표시해서는 안 됩니다.

## 2. Frozen Legal/Product Determinations

### DETERMINED

- 직접 서비스 이용자는 만 14세 이상입니다.
- 만 14세 확인은 서비스 이용자의 자기확인이며, 객관적 연령·본인·성인·NICE
  인증이 아닙니다.
- 분석 대상은 본인 또는 다른 사람일 수 있고, 아동 분석 대상도 허용됩니다.
- 분석 대상의 생년월일은 계정 보유자의 이용 자격 증명이 아닙니다.
- 계정·인증·이메일 확인·라이프사이클·프로필·요청된 분석·요청된 지원 처리는
  목적상 필요한 서비스/계약 이행 처리로 우선 매핑합니다.
- 모든 개인정보 처리에 일반 Privacy consent를 요구하지 않습니다.
- 현재 policy evidence 유형은 `TERMS`와 `AGE_14_PLUS`뿐입니다.
- Guest age 확인은 member policy evidence에 저장하지 않습니다.
- 이메일 확인과 AGE_14_PLUS, `VERIFIED_ADULT`는 서로 다른 상태입니다.
- 유료 구매 전 `ACTIVE` 계정, 확인된 이메일, `VERIFIED_ADULT`가 필요합니다.
- 결제가 승인되면 개인화 분석 생성이 즉시 시작됩니다.
- 결제 또는 디지털 콘텐츠라는 이유만으로 모든 환불·철회 권리를 배제하지
  않습니다.
- 광고·주문·계약 내용과 실질적으로 다른 공급, 결함 있는 공급, 미공급에 대한
  적용 가능한 소비자 권리는 개인화 공급 개시만으로 배제되지 않습니다.
- 제공된 거래기록 범주 목표는 표시·광고 6개월, 계약·청약철회 5년,
  대금결제·서비스 공급 5년, 소비자 불만·분쟁 3년입니다.
- 위 기간은 목적에 해당하는 실제 필드에만 적용하며, 테이블 전체 보존을
  의미하지 않습니다.
- 계정 종료는 모든 DB 행의 즉시 물리적 삭제를 의미하지 않습니다.
- canonical public policy route는 `/terms`, `/privacy`, `/refund`로 정합니다.

### FACT-PENDING

실제 사업자명, 대표자, 주소, 전화번호, 지원 이메일, 등록정보, 처리자·지역·
하위처리자·보존·국외이전 및 운영 설정은 확인 전입니다. 이는 법적 해석이
아니라 공개에 필요한 사실의 부재입니다.

### OWNER-PENDING

- 최종 공개 버전·시행일 승인자와 release gate;
- checkout에 별도 적극 확인을 둘지에 대한 제품 활성화 승인;
- footer의 배치와 지원 운영 소유자;
- 필드별 거래기록 보존 매핑의 운영 승인.

### GENUINE LEGAL AMBIGUITY

1. 명확한 즉시 공급 고지 외에 별도 unchecked acknowledgement가 필요한지 여부.
2. Terms/AGE_14_PLUS 증거의 계정 종료 후 정확한 기간과 삭제·가명처리 방식.
3. 제3자·아동 정보 입력에 필요한 최종 책임·권한 고지의 강도.
4. 환불 기록 중 계약·철회와 소비자 불만·분쟁 목적이 겹치는 필드의 최종 범위.

보수적 V1은 권리를 축소하지 않고, 고지와 증거를 최소 목적별로 분리하며,
확정되지 않은 사실이나 기간은 공개하지 않는 것입니다.

## 3. Final Status Classification

| 항목 | 분류 | 결과 |
|---|---|---|
| 필요한 계정/인증/요청 서비스 처리의 서비스 필요성 | DETERMINED | 일반 Privacy consent-only 처리로 표현하지 않음 |
| `TERMS`, `AGE_14_PLUS` evidence 존재와 역할 | DETERMINED | agreement/policy-state evidence로 표현 |
| 개인정보 동의 event 일반화 | DETERMINED | `PRIVACY_CONSENT`, `MARKETING_CONSENT` 없음 |
| 보존 범주 목표 6개월/5년/3년 | DETERMINED | 목적에 해당하는 필드에만 매핑 |
| policy evidence 정확한 보존기간 | GENUINE LEGAL AMBIGUITY | 숫자 미확정 |
| business/provider 실제 값 | FACT-PENDING | 값 확인 전 공개 금지 |
| checkout 별도 확인 활성화 | OWNER-PENDING + GENUINE LEGAL AMBIGUITY | 권장하되 최종 활성화 미정 |
| canonical routes | DETERMINED | `/terms`, `/privacy`, `/refund` |

## 4. Final Processing and Legal-Basis Matrix

아래는 현재 결정된 처리 목적과 공개 문구 방향입니다. 법적 근거의 최종
조문·표현은 해당 목적과 실제 운영 사실에 맞춰 확정합니다.

| 데이터/기록 | 실제 위치 | 주체 | 목적 | 서비스 필요성 | 법적 근거 분류 | 공개 위치 | 보존/종료 목표 |
|---|---|---|---|---|---|---|---|
| Auth ID/email | `auth.users.id`, `auth.users.email` | 계정 보유자 | 계정 생성·로그인·복구·확인 | 필수 | 계약/서비스 이행 후보 | Privacy, Terms | 필요한 계정·보안 기간; 종료 시 최소 연결 |
| Password/Auth state | Supabase Auth | 계정 보유자 | 인증·보안 | 필수 | 서비스·보안 | Privacy | Auth 관리; 앱 증거 테이블에 복사하지 않음 |
| Email 확인 | `auth.users.email_confirmed_at` | 계정 보유자 | 이메일 접근 확인 | 특정 기능에 필수 | 서비스·보안 | Privacy | Auth 관리; age/adult evidence와 분리 |
| Lifecycle | `account_lifecycles` | 계정 보유자 | 접근·종료·재시도·유료 경계 | 필수 운영 | 계약·보안·증거 | Terms, Privacy | 목적별 최소 상태/감사 연결 |
| Profile | `profiles` | 분석 대상/관리 계정 | 요청된 분석 | 요청 시 필수 | 계약/서비스 이행 | Terms, Privacy | 종료 시 기존 52D-2B tombstone |
| Free result | `free_analysis_results` | 분석 대상/계정 | 요청 결과 제공·재방문 | 요청 시 필수 | 계약/서비스 이행 | Privacy | 종료 시 content/snapshot/fingerprint NULL |
| Guest | `guest_free_analyses` | Guest/분석 대상 | 비회원 결과 제공·이전 | 요청 시 필수 | 계약/서비스 이행 | Privacy | 고객 접근/이전 24h; `created_at + 7일`까지; 이전 원문 신속 최소화 |
| Interests | `interested_analyses` | 계정 보유자 | 관심 상품 저장 | 선택 기능 | 요청 서비스 | Privacy | 종료 시 삭제 |
| Order | `orders` | 소비자/계정 | 주문·계약·결제·공급·edition 식별 | 유료 거래 필수 | 계약·법정의무·증거 | Terms, Privacy, Refund | 필요한 필드만 계약/결제/공급 범주로 보존; input snapshot 삭제 |
| Purchase | `purchases` | 소비자/계정 | 구매·공급 연결 | 유료 거래 필수 | 계약·법정의무·증거 | Terms, Privacy, Refund | 필요한 linkage/identity만 보존; input snapshot 삭제 |
| Entitlement | `entitlements` | 소비자 | 공급·접근·revocation | 공급에 필수 | 계약·법정의무·증거 | Privacy, Refund | 최소 공급/환불 연결; active 권한 revocation |
| Paid report | `paid_reports` | 분석 대상/소비자 | 개인화 결과 공급 | 공급에 필수 | 계약/서비스 이행 | Privacy, Refund | content scrub; 상태·필요 linkage만 유지 |
| Payment | `toss_payment_records` | 소비자 | 결제 확인·대사 | 결제에 필수 | 결제·법정의무·증거 | Privacy, Refund | 결제 목적의 필드만 검토 |
| Refund | `refund_workflows` | 소비자 | 환불·철회·공급 실패 처리 | 요청 시 필수 | 계약·철회·증거 | Refund, Privacy | 실제 목적에 따라 철회/분쟁 범주 매핑 |
| Policy evidence | `policy_acceptance_events` | 계정 보유자 | Terms/age policy state 증명 | 정책 증거 | agreement/evidence | Terms, Privacy | 정확한 기간·삭제 방식은 ambiguity |
| Operator audit | `operator_audit_events` | 계정/운영 | 보안·지원 책임성 | 보안 필요 | 보안·증거 | Privacy | 별도 audit 목적; customer content 금지 |

필수 처리의 근거를 모두 동의라고 표현하지 않으며, 별도 동의가 필요한
목적이 확인될 때만 그 목적에 한정한 별도 event를 검토합니다. 현재에는
`PRIVACY_CONSENT`를 추가하지 않습니다.

## 5. Final Field-Level Retention Target

| 실제 필드/기록 | 목표 분류 | 종료 후 처리 |
|---|---|---|
| `orders.id`, `status`, `amount`, `product_id`, `analysis_edition_key`, 거래 시각 | A 계약 / B 결제 / C 공급 | 해당 목적에 필요한 최소 필드만 목표 5년 검토 |
| `orders.payment_provider`, `transaction_id`, `paid_at` | B 결제 | 결제 증거 목적의 최소 범위 |
| `orders.analysis_input_snapshot` | F 서비스 개인화 | 계정 종료 시 NULL; 주문 보존 이유만으로 남기지 않음 |
| `orders.analysis_reference_snapshot` | C 공급 context 후보 | `anchorDate`만 allowlist; 필요 없으면 NULL |
| `purchases.id`, `order_id`, `product_id`, `analysis_edition_key`, `purchased_at` | A/B/C | 계약·결제·공급에 필요한 최소 linkage |
| `purchases.analysis_input_snapshot` | F 서비스 개인화 | 계정 종료 시 NULL |
| `purchases.analysis_reference_snapshot` | C 공급 context 후보 | 개인화 Fortune 제거; anchor-only 또는 NULL |
| `entitlements.id`, resource/purchase/edition linkage, active/revoked state | C 공급 / D 환불 | 권리·공급·환불에 필요한 최소 상태 |
| `paid_reports.id`, status, purchase linkage, timestamps | C 공급 | content는 서비스 개인화이므로 scrub; metadata는 목적별 검토 |
| `paid_reports.content` | F 서비스 개인화 | 종료 시 scrub marker; transaction row가 남는 이유만으로 보존하지 않음 |
| `toss_payment_records` order/payment/provider status, amount, reconciliation evidence | B 결제 | 결제 목적 최소 필드; payment key는 보안 취급 |
| `refund_workflows` request/status/reason/provider/retry evidence | D 환불; E 분쟁 후보 | 실제 철회·분쟁 목적 필드만 매핑 |
| `policy_acceptance_events.user_id/type/version/accepted_at/source` | 계약·정책 증거 | separate evidence; 기간과 삭제/가명처리 mechanics는 ambiguity |
| 표시/광고 로그 | 해당 기록이 실제 존재할 때만 표시/광고 | 현재 전용 authoritative table 없음 |
| complaint/dispute records | E 불만/분쟁 | 현재 전용 table 없음; 도입 시 해당 record만 목표 3년 검토 |

확정된 범주 목표는 다음과 같습니다.

- 표시·광고 관련 기록: 6개월;
- 계약 또는 청약철회 관련 기록: 5년;
- 대금결제 및 재화·서비스 공급 관련 기록: 5년;
- 소비자 불만 또는 분쟁처리 관련 기록: 3년.

이 목표는 결정된 category target이며, 실제 보존 구현은 field-level mapping을
완료한 뒤 적용합니다. 특정 테이블 전체를 자동으로 5년 보존한다는 의미가
아닙니다.

## 6. Corrected Terms V1 Draft

### 제1조 목적

이 약관은 운보다가 제공하는 무료 사주 분석, 회원 프로필 관리, 심층 분석,
주문·결제·환불 서비스를 이용할 때 필요한 권리·의무와 이용 조건을 정합니다.

### 제2조 정의

1. “회원”은 이메일과 비밀번호로 계정을 만든 이용자입니다.
2. “Guest”는 회원가입 없이 서비스를 이용하는 이용자입니다.
3. “계정 보유자” 또는 “서비스 이용자”는 운보다에 직접 서비스를 요청하는
   사람입니다.
4. “분석 대상”은 이용자가 분석을 요청하기 위해 입력한 본인 또는 다른 사람의
   프로필입니다.
5. “무료 분석”, “유료 분석”, “에디션”은 화면에 표시된 해당 서비스를 말합니다.

### 제3조 게시·효력·변경

운보다가는 약관의 버전과 시행일을 서비스 화면에 게시합니다. 약관을 변경하는
경우 변경 내용과 시행일을 알기 쉽게 안내하며, 이용자에게 불리한 변경은 관련
법령이 요구하는 절차를 따릅니다.

- Terms 버전: `[FACT-PENDING: 공개 승인 Terms 버전]`
- 시행일: `[FACT-PENDING: 공개 승인 시행일]`

### 제4조 직접 이용자 연령

운보다가 직접 서비스를 이용하는 계정 보유자·서비스 이용자는 만 14세 이상이어야
합니다. 만 14세 확인은 이용자의 자기확인입니다. 운보다가 이용자의 나이, 본인,
성인 또는 신원을 객관적으로 확인했다는 뜻이 아니며, 이메일 확인도 연령 또는
성인 확인이 아닙니다.

분석 대상 프로필에는 별도의 연령 제한을 두지 않습니다. 만 14세 이상인 서비스
이용자는 자녀를 포함한 다른 사람의 프로필을 분석 대상으로 입력할 수 있습니다.
분석 대상의 생년월일은 계정 보유자의 이용 자격이나 연령 증거로 사용되지 않습니다.
V1에서는 만 14세 미만 직접 이용자를 위한 별도 법정대리인 가입 절차를 제공하지
않습니다.

### 제5조 가입·이메일 확인

회원은 정확한 이메일과 안전한 비밀번호를 사용하여 가입합니다. 이메일 확인은
해당 이메일 주소에 접근할 수 있음을 확인하는 절차입니다. 이메일 확인, 만 14세
자기확인, 유료 이용 자격 및 성인 인증은 서로 다른 절차와 상태입니다. 회원가입이나
이메일 확인만으로 유료 분석 이용 자격이 부여되지 않습니다.

### 제6조 계정 관리

회원은 자신의 인증 수단을 안전하게 관리하고 다른 사람의 계정이나 인증 수단을
사용하지 않습니다. 운보다가는 보안, 법령 또는 서비스 운영상 필요한 경우 관련
법령과 약관에 따라 이용을 제한할 수 있습니다.

### 제7조 다른 사람·아동 프로필

1. 계정 보유자와 분석 대상은 서로 다른 사람일 수 있습니다.
2. 계정 보유자는 다른 사람, 특히 아동의 정보를 입력하기 전에 해당 정보를
   제공하고 분석을 요청할 적절한 권한 또는 합법적인 근거가 있는지 스스로
   확인해야 합니다.
3. 계정 보유자는 다른 사람의 정보를 위법하게 제공해서는 안 됩니다.
4. 운보다가는 계정 보유자와 분석 대상의 가족관계, 대리권 또는 동의 여부를
   객관적으로 확인하거나 보증하지 않습니다.
5. 입력 정보는 계정 보유자가 요청한 분석 제공을 위해 사용됩니다. 분석 대상은
   자동으로 계약 당사자나 서비스 이용자가 되지 않습니다.
6. 분석 대상의 생년월일은 계정 보유자의 연령 또는 서비스 자격을 결정하지
   않습니다.

### 제8조 Guest 무료 분석

Guest는 회원가입 없이 현재 약속된 무료 분석 결과를 요청하고 확인할 수 있습니다.
Guest 고객의 접근·이전 창구는 생성 시점부터 24시간입니다. 이는 백엔드의 전체
보존기간이 아닙니다. 오류 회복과 제한된 운영 처리를 위해 Guest 데이터는
`created_at` 기준 최대 7일까지 남을 수 있으며 늦어도 그 경계까지 삭제됩니다.

이전이 성공하면 원래 Guest 프로필 입력, 지문 및 분석 content는 신속하게
최소화됩니다. 이전 연결에 필요한 최소 정보가 임시로 남을 수 있으나, 계정 종료
또는 정해진 삭제 경계에 따라 삭제됩니다.

### 제9조 무료 분석

무료 분석은 이용자가 요청한 분석 대상 정보를 바탕으로 해석 결과를 제공합니다.
무료 결과는 회원가입을 완료해야 볼 수 있는 서비스가 아닙니다. 회원가입은 결과와
프로필을 저장·관리하기 위한 기능을 제공합니다. 현재 기간 변경이나 기술적
문제가 있으면 재분석 또는 재시도가 필요할 수 있습니다.

### 제10조 유료 개인화 분석

유료 분석은 결제 당시 화면에 표시된 상품, 대상, 에디션 및 기간을 기준으로
제공합니다. 결제 전 계정 상태, 확인된 이메일 및 유료 이용 자격을 확인합니다.
분석은 전문 자문이나 객관적 미래 예측이 아닙니다.

### 제11조 구매 에디션과 이력

구매 당시의 상품·대상·에디션·기간과 주문 연결은 구매 이력에 기록됩니다. 이후
카탈로그나 현재 기간이 바뀌어도 구매 당시 에디션이 자동 변경되지 않습니다.
단순한 기간·상품 변경만으로 환불 사유가 자동 발생하지는 않지만, 광고·주문·계약과
다른 공급, 결함 있는 공급 및 관련 법령상 권리는 별도로 보장됩니다.

### 제12조 결제와 즉시 생성

결제가 승인되면 선택한 분석 대상에 대한 개인화 분석 생성이 즉시 시작됩니다.
결제 후 별도의 “생성 시작” 버튼은 요구하지 않습니다. 결제 상태, 공급 상태 또는
이용권 상태가 일치하지 않으면 먼저 회복·대사 절차를 진행합니다.

### 제13조 서비스 공급과 불일치

운보다가는 화면에 표시된 상품과 주문 당시 확정된 대상·에디션·기간·공급 내용을
기준으로 서비스를 제공합니다. 실제 공급이 표시·광고·주문·계약의 내용과
실질적으로 다르거나 결함이 있거나, 약정된 공급이 이루어지지 않은 경우에는
개인화 디지털 콘텐츠의 공급이 시작되었다는 이유만으로 관련 법령상 철회·취소·
환불·시정 권리가 배제되지 않습니다.

일시적인 처리 지연은 곧바로 최종 공급 실패를 뜻하지 않습니다. 운보다가는
재처리·대사·정정 가능성을 먼저 확인하고, 공급이 회복 불가능하면 Refund 정책과
관련 법령에 따라 처리합니다.

### 제14조 철회·취소·환불

철회·취소·환불에는 관련 법령과 공개된 Refund 정책을 적용합니다. 결제 자체 또는
디지털 콘텐츠라는 이유만으로 모든 환불을 배제하지 않습니다. 개인화 공급 개시가
철회에 미치는 효과는 결제 전 고지, 실제 공급 상태 및 관련 법령을 함께 기준으로
판단합니다. 이 약관은 법령상 보장되는 권리를 제한하지 않습니다.

### 제15조 입력 오류와 처리 오류

이용자가 확인하여 입력한 프로필·분석 대상 정보가 잘못된 경우와 운보다가 이용자의
확인과 다르게 정보를 처리한 경우를 구분합니다. 주문 당시 확정된 입력, 대상,
에디션과 실제 공급 내용이 다른 경우에는 제13조와 관련 법령을 적용합니다.
이용자는 오류를 발견하면 My Page의 해당 주문과 지원 채널을 통해 알려야 합니다.

### 제16조 중복 결제·공급 실패

중복 결제가 확인되면 운보다가는 주문·결제 기록을 대사한 뒤 중복 금액을 전액
환불하는 방향으로 처리합니다. 개인화 분석의 생성·공급이 회복 불가능하게
실패한 것이 확인되면 관련 법령과 Refund 정책에 따라 전액 환불 절차를 진행합니다.
짧은 처리 지연만으로 자동 환불이 결정되는 것은 아니며, 사실관계가 불명확하면
담당자 검토로 이관합니다.

### 제17조 계정 종료

계정 종료가 확정되면 저장한 프로필과 개인화된 무료·유료 분석 content는 더
이용할 수 없게 됩니다. 서비스 목적의 개인화 정보는 데이터 종류에 따라 삭제,
NULL 처리 또는 서비스에서 다시 개인화 결과로 사용할 수 없도록 스크럽됩니다.
관심 목록은 삭제됩니다.

계정 종료 후 복원은 제공되지 않으며, 다시 가입해도 기존 프로필·분석 결과·구매
결과가 새 계정으로 복원된다고 보장하지 않습니다. 주문·결제·환불·공급·분쟁·
보안 또는 정책 증거 중 법령상 또는 목적상 필요한 최소 기록은 해당 목적과 기간에
따라 별도로 남을 수 있습니다. 따라서 계정 종료가 모든 DB 행의 즉시 물리적
삭제를 의미하지는 않습니다.

### 제18조 서비스 변경·중단

운보다가는 보안, 법령, 기술, 운영 또는 상품 정책에 따라 서비스를 변경하거나
일시 중단할 수 있습니다. 중요한 변경은 적용되는 법령과 서비스 중요도에 맞는
방법으로 안내합니다. 이미 체결된 거래와 법령상 권리에 영향을 주지 않도록
처리합니다.

### 제19조 금지행위

타인의 계정·인증 수단 도용, 위법한 정보 제공, 시스템 우회, 권한 없는 조회,
서비스 장애 유발, 결과의 허위 표시 및 법령 위반 행위를 해서는 안 됩니다.

### 제20조 지식재산권·결과 이용

운보다가 제공하는 소프트웨어, 화면, 상품 설명 및 구성의 권리는 관련 권리자에게
있습니다. 이용자는 법령과 서비스가 허용하는 범위에서 자신이 요청한 결과를
이용할 수 있습니다. 결과를 객관적 사실, 보장된 예측 또는 전문 자문인 것처럼
허위 표시하거나 타인의 권리를 침해해서는 안 됩니다.

### 제21조 사주·운세 콘텐츠

사주·운세 분석은 입력 정보와 해석 기준에 따른 해석적·정보적 콘텐츠입니다.
미래의 결과, 정확성, 성공, 운명 또는 특정 사건을 보장하지 않으며 의료·법률·
투자·세무·심리 등 전문 자문을 대신하지 않습니다. 중요한 결정에는 적절한
전문 정보와 본인의 판단을 함께 사용해야 합니다. 이 조항은 법령상 이용자 권리를
제한하지 않습니다.

### 제22조 지원·사업자 정보

- 공식 지원 이메일: `[FACT-PENDING: 확인된 공식 지원 이메일]`
- 사업자 공개 정보: `[FACT-PENDING: 확인된 사업자 공개 정보]`

### 제23조 준거법·분쟁

준거법과 분쟁 처리 절차는 실제 사업자와 서비스 운영 사실을 확인한 뒤 공개
버전에 확정합니다. 이용자의 법령상 소비자 권리를 제한하는 방식으로 해석하지
않습니다.

## 7. Saju/Fortune Disclaimer

> 사주·운세 분석은 입력 정보와 해석 기준에 따른 해석적·정보적 콘텐츠입니다.
> 미래의 결과나 정확성, 성공을 보장하지 않으며 의료·법률·투자·세무·심리 등
> 전문 자문을 대신하지 않습니다. 중요한 결정에는 적절한 전문 정보와 본인의
> 판단을 함께 활용해 주세요. 이 안내는 법령상 이용자 권리를 제한하지 않습니다.

## 8. Corrected Privacy Policy V1 Draft

### 개인정보처리방침

운보다가는 이용자가 요청한 서비스와 계정 기능을 제공하기 위해 필요한 범위에서
정보를 처리합니다. 공개 버전에는 확인된 사업자·처리자·국외이전·보존 사실과
승인된 법적 근거를 반영합니다.

#### 1. 처리 목적과 근거 방향

1. 계정 생성, 로그인, 복구, 이메일 확인, 보안 및 라이프사이클 관리: 서비스
   제공에 필요한 처리로 우선 설명합니다.
2. 프로필 관리와 요청된 무료·유료 분석 제공: 이용자가 요청한 서비스 제공에
   필요한 처리로 설명합니다.
3. Guest 결과 제공·재방문·이전: 제한된 서비스 제공과 회복 목적의 처리로
   설명합니다.
4. 관심 목록: 이용자가 요청한 저장 기능 제공 목적입니다.
5. 주문·구매·이용권·결제·공급·환불: 계약·서비스 이행과 해당 transaction
   record 목적을 구분합니다.
6. 지원·문의: 이용자의 요청 처리와 필요한 거래·분쟁 대응 목적입니다.
7. Terms/AGE_14_PLUS evidence: 수락한 policy version과 시점의 별도 증거입니다.
8. 보안·부정 이용 방지·감사: 실제 기술·운영 목적에 한정합니다.

이 문서는 개인정보라는 이유만으로 모든 처리를 동의에만 의존한다고 표현하지
않습니다. 특정 목적에 별도 동의가 필요한지는 그 목적에 한정하여 정합니다.
현재 일반 `PRIVACY_CONSENT` event는 없습니다.

#### 2. 처리 항목

| 범주 | 실제 항목 |
|---|---|
| 계정/Auth | Auth ID, 이메일, 이메일 확인 상태, Auth가 관리하는 인증 정보 |
| 프로필 | 구분명, 관계, 생년월일, 태어난 시간, 성별, 달력 유형, 윤달 여부 |
| 회원 무료 분석 | 결과 content, profile snapshot/fingerprint, 상태·오류·시각 |
| Guest | 분석 row 식별자, 보안 hash, profile input, 결과 content, 선택 상품, 생성·만료·이전 상태 |
| 관심 | 사용자·프로필·상품 연결과 시각 |
| 유료 거래 | 주문·구매·이용권·리포트 ID, 상품·edition, 금액·상태·공급·환불 연결 |
| 결제/환불 | 결제 대사·공급 증거, 환불 요청·상태·처리·오류·retry 정보 |
| 정책 증거 | policy type/version, user 연결, accepted_at, source, event ID |
| 운영/보안 | lifecycle, retry/error/audit metadata |

생년월일·태어난 시간·성별은 식별 가능한 사람과 연결될 때 개인정보로 취급합니다.
사주 입력이라는 이유만으로 별도의 법정 민감정보라고 단정하지 않습니다.

#### 3. 제3자·아동 분석 대상

계정 보유자는 본인 또는 다른 사람을 분석 대상으로 입력할 수 있습니다. 다른
사람, 특히 아동의 정보를 제공하는 경우 계정 보유자는 필요한 권한 또는 합법적인
근거를 스스로 확인해야 하며, 정보를 위법하게 제공해서는 안 됩니다. 운보다가는
관계·가족관계·대리권을 객관적으로 확인하지 않습니다. 정보는 계정 보유자가
요청한 분석 제공 목적에 사용되고, 분석 대상의 연령은 계정 보유자의 자격을
결정하지 않습니다.

#### 4. Guest 처리와 보존

Guest 결과에 대한 고객 접근·이전 창구는 24시간입니다. 이는 전체 backend
retention이 아닙니다. 제한된 회복·운영 처리를 위해 Guest row는 생성 시각
`created_at` 기준 최대 7일까지 남을 수 있고, 늦어도 그 경계까지 삭제됩니다.
이전 성공 후 원래 profile input, fingerprint, content는 신속하게 최소화됩니다.
이전 연결에 필요한 최소 정보가 일시적으로 남을 수 있으며, 계정 종료 또는 삭제
경계에 따라 삭제됩니다. Guest age self-attestation은 policy evidence event에
저장하지 않습니다.

#### 5. 회원 데이터와 계정 종료

프로필은 요청된 분석 대상 정보입니다. 회원 무료 분석은 요청된 결과의 제공과
재방문 상태에 사용됩니다. 계정 종료가 확정되면 프로필 입력값은 기존 구조의
tombstone으로 대체되고, 회원 무료 분석의 content·snapshot·fingerprint는 NULL
처리됩니다. 관심 목록은 삭제됩니다. 유료 report content는 scrub되고, 주문·
구매의 분석 input snapshot은 삭제됩니다. 필요한 거래·공급·환불·보안 기록은
별도 목적과 기간에 따라 남을 수 있습니다.

#### 6. 유료 거래·결제·환불

주문·구매·이용권·리포트는 구매와 공급, 정확한 edition, 권한, 환불 상태 확인에
사용됩니다. 주문·구매의 raw analysis input snapshot은 계정 종료 시 삭제합니다.
정확한 edition, 금액, 상태, 거래·공급·환불 연결 중 필요한 최소 필드는 목적별로
남을 수 있습니다. 결제·환불 기록을 남긴다는 이유만으로 profile input이나
personalized analysis content를 함께 남기지 않습니다.

#### 7. 정책 evidence

Terms 및 만 14세 자기확인 evidence는 수락한 정책 유형·버전·계정·시각·source를
기록하여 historical agreement/policy state를 확인하기 위한 별도 기록입니다.
이는 일반 Privacy consent나 성인 인증 기록이 아니며, 서비스 content를 복원하거나
새 계정을 승인하는 데 사용되지 않습니다. 정확한 post-closure 보존기간과 삭제·
가명처리 방식은 evidence 목적에 따라 별도로 정하며, 이 초안에서는 숫자를
확정하지 않습니다.

#### 8. 보존기간

프로젝트의 결정된 목표 범주는 다음과 같습니다.

- 표시·광고 관련 기록: 6개월;
- 계약 또는 청약철회 관련 기록: 5년;
- 대금결제 및 재화·서비스 공급 관련 기록: 5년;
- 소비자 불만 또는 분쟁처리 관련 기록: 3년.

이는 해당 범주에 실제로 필요한 field-level record에 적용합니다. 모든 table과
모든 field를 일괄 보존한다는 뜻이 아닙니다. 정책 evidence의 구체적 기간은
별도 evidence 목적을 확정한 뒤 공개합니다.

#### 9. 삭제·파기

서비스 목적이 끝나고 다른 정당한 보존 목적이 없으면 필요한 범위에서 삭제하거나
더 이상 서비스에서 개인화 결과로 사용할 수 없도록 처리합니다. 계정 종료는
모든 DB row의 즉시 물리적 삭제를 의미하지 않습니다. 법령상 또는 분쟁·결제·공급·
보안상 필요한 최소 record는 목적별 기간 동안 별도 남을 수 있습니다.

#### 10. 처리자·국외 처리

실제 계약과 배포 사실이 확인된 처리자만 공개 버전에 기재합니다.

- Supabase/Auth/DB: `[FACT-PENDING: 계약상 역할·지역·하위처리자·보존]`
- Hosting/runtime: `[FACT-PENDING: 사업자·지역·로그/백업 보존]`
- AI/model: `[FACT-PENDING: 실제 제공자·처리범위·지역·보존·하위처리자]`
- Payment: `[FACT-PENDING: 실제 결제 처리자·지역·보존·하위처리자]`
- Email/Auth delivery: `[FACT-PENDING: 발송 구조·지역·보존]`
- Analytics/error monitoring: `[FACT-PENDING: 사용 여부·제공자·수집 항목]`

확인되지 않은 국가·수신자·처리자·국외이전 사실은 단정하지 않습니다. 실제
국외 처리 또는 이전이 확인되면 국가, 수신자, 목적, 항목, 방식, 보호조치와
보존을 공개 버전에 반영합니다.

#### 11. 정보주체 권리

이용자는 적용 법령이 정하는 범위에서 열람, 정정, 삭제, 처리정지 등 권리를
행사할 수 있습니다.

- 권리 행사 방법: `[FACT-PENDING: 확인된 접수 방법]`
- 개인정보 담당자/책임자: `[FACT-PENDING: 확인된 담당자 또는 공식 채널]`
- 지원 이메일: `[FACT-PENDING: 공식 지원 이메일]`

#### 12. 안전성 확보조치

현재 구현에는 서버 세션 확인, RLS, service-role 분리, 접근범위 제한, Guest
보안 hash, 정책 evidence 최소화, 결제·환불 대사 및 retry 보호가 포함됩니다.
최종 공개 버전에는 실제 조직·기술·관리 조치만 기재합니다.

#### 13. 쿠키·로컬 저장·로그

Guest 분석은 제한된 HttpOnly cookie를 사용하여 24시간 고객 접근과 서버 조회를
지원합니다. Auth cookie는 인증·보안에 사용됩니다. 별도 device identifier나
새로운 localStorage evidence는 이 정책에 전제하지 않습니다. 로그·오류 모니터링의
실제 수집항목은 확인된 배포 설정만 공개합니다.

#### 14. 버전·시행일·변경

- Privacy 버전: `[FACT-PENDING: 공개 승인 Privacy 버전]`
- 시행일: `[FACT-PENDING: 공개 승인 시행일]`

변경 시 버전, 시행일, 주요 변경 내용을 표시합니다. 공개 Terms version과
signup evidence의 Terms version은 동일해야 합니다.

## 9. Full Refund/Cancellation/Withdrawal V1 Draft

### 환불·취소·청약철회 정책

이 정책은 관련 법령상 소비자 권리를 우선하여 적용합니다. 결제 승인 후 선택한
분석 대상에 대한 개인화 분석 생성이 즉시 시작되며, 결제 후 별도의 생성 시작
버튼은 제공하지 않습니다.

#### 1. 결제 미완료

결제가 완료되기 전에는 결제 승인과 유료 분석 공급이 완료된 것으로 보지 않습니다.
결제 실패·취소는 실제 결제 상태에 따라 처리합니다.

#### 2. 결제 완료와 공급 개시

결제가 승인되면 개인화 생성이 즉시 시작됩니다. 이 사실은 결제 전 화면에
명확하게 고지합니다. 개인화 공급이 시작된 뒤의 철회·취소·환불은 관련 법령,
결제 전 고지, 실제 공급 상태 및 이 정책을 함께 기준으로 판단합니다.

#### 3. 일반적인 변경의사 철회

소비자는 관련 법령이 정하는 범위에서 일반적인 변경의사에 따른 철회·취소 권리를
가질 수 있습니다. 개인화 디지털 콘텐츠의 공급이 적법하게 시작된 경우에는
공급 개시 고지와 법령상 제한 요건을 함께 적용합니다. 이 정책은 법령상 권리를
배제하지 않습니다.

#### 4. 공급이 시작된 경우

공급 개시만으로 모든 권리가 소멸하거나 모든 환불이 불가능해지는 것은 아닙니다.
공급 내용이 광고·상품 설명·주문·에디션·기간 또는 계약 내용과 실질적으로
다르거나 결함이 있거나, 약정된 공급이 이루어지지 않은 경우에는 개인화 공급
개시를 이유로 관련 법령상 권리를 배제하지 않습니다.

#### 5. 중복 결제

중복 결제가 확인되면 주문·결제 기록을 대사한 뒤 중복 결제 금액을 전액 환불하는
방향으로 처리합니다. 확인 전에는 기록을 보존하고 회복·대사를 진행합니다.

#### 6. 이용권·리포트 누락

결제는 성공했지만 이용권 또는 리포트가 보이지 않는 경우 새 결제를 요구하기
전에 주문·결제·이용권·리포트 상태를 확인합니다. 회복할 수 없거나 공급 실패가
확인되면 관련 법령과 이 정책에 따라 전액 환불 절차를 진행합니다.

#### 7. 회복 불가능한 공급 실패

재시도·대사·재처리로도 개인화 분석을 공급할 수 없다고 확인되면 전액 환불
절차를 진행합니다. 일시적인 처리 지연은 최종 공급 실패와 구분합니다.

#### 8. 일시적인 생성 지연

일시적인 생성 지연만으로 자동 환불이 결정되는 것은 아닙니다. 운보다가는 상태와
재처리 가능성을 확인합니다. 별도의 시간 보장이나 지원 SLA는 이 초안에서 약속하지
않습니다. 공급이 최종적으로 불가능하면 제7조에 따라 처리합니다.

#### 9. 고객이 확인한 잘못된 입력

이용자가 주문 전 확인한 프로필·분석 대상·에디션 정보를 잘못 입력한 경우와
운보다가 확인된 입력과 다르게 처리한 경우를 구분합니다. 이용자는 오류를 발견하면
My Page 주문·결제 이력과 지원 채널을 통해 알려야 합니다. 관련 법령과 사실관계에
따라 재처리·정정·취소·환불을 검토합니다.

#### 10. 운보다가 다른 데이터를 처리한 경우

운보다가 이용자의 확인과 다른 대상·프로필·에디션 또는 입력을 처리한 사실이
확인되면 회복·재처리·정정을 먼저 확인합니다. 회복할 수 없거나 계약·주문·광고와
실질적으로 다른 공급이면 관련 법령과 이 정책에 따라 전액 환불 또는 필요한
시정 절차를 진행합니다.

#### 11. 계약·광고와 다른 공급 또는 결함

표시·광고·상품 설명·주문·계약상 공급 내용과 실제 서비스 또는 content가 실질적으로
다르거나 결함이 있는 경우에는 개인화 디지털 콘텐츠 공급이 시작되었다는 이유만으로
소비자의 관련 법령상 철회·취소·환불·시정 권리를 배제하지 않습니다. 운보다가는
재공급·정정·재처리 가능성을 확인하되, 회복할 수 없으면 관련 법령과 이 정책에
따라 처리합니다.

#### 12. 에디션·기간 변경

구매 당시 확정된 정확한 에디션과 기간은 구매 이력으로 유지됩니다. 이후 현재
에디션이나 기간이 바뀌었다는 사실만으로 자동 환불 사유가 되지는 않지만, 실제
공급이 광고·주문·계약과 다른 경우에는 제11조와 관련 법령을 적용합니다.

#### 13. 부분 환불

V1에서는 부분 환불을 자동 처리하지 않습니다. 이 문구는 관련 법령상 권리나
담당자 검토를 제한하지 않습니다.

#### 14. 담당자 검토

결제·공급·환불 기록이 서로 다르거나 자동 판단이 안전하지 않으면 자동 금융
변경을 멈추고 담당자 검토로 처리합니다. 검토 중에도 관련 법령상 권리를 제한하지
않습니다.

#### 15. 요청 경로와 법령 우선

회원은 `My Page → 결제 이력 → 해당 주문/구매 → 환불·취소 요청` 경로로 요청할
수 있습니다.

- 지원 이메일: `[FACT-PENDING: 공식 지원 이메일]`
- Refund 버전: `[FACT-PENDING: 공개 승인 Refund 버전]`
- 시행일: `[FACT-PENDING: 공개 승인 시행일]`

이 정책의 어떤 내용도 관련 법령상 철회, 취소, 환불, 손해배상, 분쟁 또는 기타
소비자 권리를 배제하거나 축소하는 것으로 해석하지 않습니다.

## 10. Future Signup Legal Block

> **FUTURE UX — 현재 구현되지 않음**

```text
[ ] [필수] 이용약관에 동의합니다. (Terms 보기)
[ ] [필수] 저는 만 14세 이상입니다.
```

만 14세 확인은 서비스 이용자 본인의 자기확인입니다. 이메일 확인이나 성인·본인
인증이 아니며, 분석 대상의 연령을 확인하는 절차도 아닙니다.

Privacy Policy는 처리 목적과 항목을 설명하는 공개 안내로 연결합니다. V1에는
일반 `PRIVACY_CONSENT` 또는 marketing consent event를 추가하지 않습니다. “모두
동의” control은 V1에서 사용하지 않습니다. 이 block은 public Terms와 승인된
version이 준비된 뒤 별도 구현합니다.

## 11. Future Checkout Legal Block

> **FUTURE UX — 현재 구현되지 않음**

**결제 전 확인**

- 분석 상품: `[서버가 확정한 상품명]`
- 분석 대상: `[서버가 확정한 프로필/대상]`
- 분석 에디션·기간: `[서버가 확정한 에디션·기간 또는 해당 없음]`
- 총 결제 금액: `[서버가 확정한 금액 및 통화]`

결제가 승인되면 선택한 분석 대상에 대한 개인화 분석 생성이 즉시 시작됩니다.
결제 후 별도의 생성 시작 버튼은 필요하지 않습니다.

환불·취소·청약철회 조건은 [환불·취소·청약철회 정책](`/refund`)에서 확인할 수
있습니다. 결제·공급 오류, 중복 결제, 공급 불능 및 입력 오류는 주문 상태를
확인한 뒤 회복·대사 또는 정책에 따른 처리를 진행합니다.

**권장 표면 분류**

- 상품·대상·에디션·가격: `NOTICE`, 서버 확정값;
- 즉시 개인화 생성: `NOTICE`, 결제 action 인접;
- Refund 정책: `NOTICE`, `/refund` 인접 링크;
- Terms: `NOTICE`, `/terms` 링크;
- Privacy: `NOTICE`, `/privacy` 링크이며 일반 consent event가 아님;
- 즉시 공급 적극 확인: `OWNER-PENDING`; 구현한다면 unchecked
  `AFFIRMATIVE ACKNOWLEDGEMENT`로 두고 결제 전에 받아야 함;
- 위 확인의 법적 필수 여부: `GENUINE LEGAL AMBIGUITY`.

## 12. Account-Closure Disclosure Draft

회원탈퇴가 확정되면 저장한 사주 프로필과 개인화된 무료·유료 분석 결과를 더
이용할 수 없게 됩니다. 데이터 종류에 따라 서비스 목적의 개인화 정보는 삭제,
NULL 처리 또는 서비스에서 다시 개인화 결과로 사용할 수 없도록 스크럽됩니다.
관심 목록은 삭제됩니다.

계정 종료 후 복원은 제공되지 않으며, 다시 가입해도 기존 계정의 프로필·분석
결과·구매 결과가 새 계정으로 복원된다고 보장하지 않습니다. 주문·결제·환불·
공급·분쟁·보안 또는 법령상 필요한 최소 기록은 해당 목적과 적용 기간에 따라
별도로 남을 수 있습니다. 따라서 회원탈퇴가 모든 데이터베이스 기록의 즉시
물리적 삭제를 의미하지는 않습니다.

진행 중인 결제 확인이나 환불 처리가 있으면 거래 상태를 먼저 확인해야 하며,
필요한 경우 최종 종료 처리가 지연되거나 담당자 검토로 전환될 수 있습니다.

## 13. Public Route Decision

Canonical V1 public routes는 다음과 같이 결정합니다.

- `/terms`
- `/privacy`
- `/refund`

세 페이지는 로그인 없이 접근 가능하고, signup·checkout·footer에서 연결되며,
모바일에서 읽고 인쇄·복사할 수 있어야 합니다. 현재 route는 아직 구현되지
않았습니다. 공개 전 최종 버전·시행일·사업자·지원·처리자 값이 준비되어야 합니다.

## 14. Footer Disclosure Structure

공통 public footer는 다음을 노출하는 구조로 구현합니다.

- 이용약관 (`/terms`);
- 개인정보처리방침 (`/privacy`);
- 환불·취소·청약철회 정책 (`/refund`);
- verified business disclosure;
- verified support contact.

구조는 `DETERMINED`입니다. 실제 사업자·연락처·등록정보는 `FACT-PENDING`이며,
확인 전 placeholder를 고객 화면에 표시하지 않습니다. Footer는 `app/layout.tsx`
또는 public layout이 소유하고 AppShell의 authenticated product navigation과
중복하지 않는 방향을 권장합니다.

## 15. FACT-PENDING Publication Values

- 공식 사업자명/상호;
- 대표자;
- 사업자등록번호;
- 사업장 주소;
- 고객센터 전화번호;
- 공식 지원 이메일;
- 통신판매업 신고 정보와 확인 기관;
- hosting/deployment region;
- Supabase 계약상 처리 역할·지역·하위처리자·보존;
- 실제 AI provider·처리범위·지역·보존·하위처리자;
- 실제 payment processor·처리범위·지역·보존·하위처리자;
- email/Auth delivery provider facts;
- NICE provider/protocol, 현재는 미구현;
- 국외이전 국가·수신자·목적·방법·보호조치;
- analytics/error monitoring provider와 수집범위;
- 실제 complaint/support system;
- 승인된 Terms/Privacy/Refund version 및 시행일;
- 실제 generation threshold 또는 support SLA가 공개에 필요할 경우 그 값.

## 16. Remaining OWNER-PENDING

1. `/terms`, `/privacy`, `/refund`의 공개 release 승인과 버전 owner.
2. checkout 즉시 생성 acknowledgement를 실제로 활성화할지 여부.
3. footer의 public/authenticated layout 배치.
4. 지원 채널과 환불 운영 소유자.
5. field-level transaction retention mapping의 운영 승인.
6. public publication 시점과 FACT-PENDING 값 검증 절차.

## 17. Remaining GENUINE LEGAL AMBIGUITY

1. **즉시 공급 acknowledgement**
   - competing interpretations: 인접한 명확한 notice로 충분하거나, 공급 개시를
     입증할 별도 unchecked 확인이 필요할 수 있습니다.
   - conservative V1: notice와 Refund link를 먼저 제공하고, 별도 확인을 요구하는
     경우에만 affirmative evidence를 추가합니다.
   - route implementation: block하지 않음.
   - production publication: 최종 checkout wording/activation에는 block.
2. **Policy evidence 기간과 mechanics**
   - competing interpretations: historical agreement/claim defense 목적의 장기
     보존 또는 목적 종료 후 삭제·가명처리가 가능할 수 있습니다.
   - conservative V1: service content와 분리하고 minimum fields만 보유하며 숫자를
     공개하지 않습니다.
   - route implementation: block하지 않음.
   - production publication: Privacy의 최종 retention statement에는 block.
3. **제3자·아동 권한 문구**
   - competing interpretations: account holder에게 필요한 authority를 어느
     수준으로 요구·설명할지 차이가 있습니다.
   - conservative V1: 합법적 근거/권한을 스스로 확인하고 Unboda가 관계를 검증하지
     않는다고 명시하며 대표자 consent infrastructure는 만들지 않습니다.
   - route implementation: block하지 않음.
   - production publication: final wording에는 block.
4. **Refund field overlap**
   - competing interpretations: 일부 refund field가 contract/withdrawal,
     payment/supply, complaint/dispute 목적에 동시에 해당할 수 있습니다.
   - conservative V1: field-level purpose를 먼저 확정하고 전체 row에 한 기간을
     부여하지 않습니다.
   - route implementation: block하지 않음.
   - production publication: final retention claim에는 block.

## 18. Publication Blocker Matrix

| 문서 | 상태 | Public publication blockers | Internal route shell |
|---|---|---|---|
| `/terms` | INTERNAL DRAFT READY / ROUTE IMPLEMENTATION READY | final wording, approved version/effective date, verified business/support values | Does not block |
| `/privacy` | INTERNAL DRAFT READY / ROUTE IMPLEMENTATION READY | processor/region/transfer facts, final basis/retention mapping, responsible contact, approved version | Does not block |
| `/refund` | INTERNAL DRAFT READY / ROUTE IMPLEMENTATION READY | final withdrawal/refund wording, support channel, business values, approved version, checkout alignment | Does not block |

`FACT-PENDING` literal placeholders must never ship to a public page.

## 19. Exact Next Implementation Slice

1. Add one centralized public-policy configuration with `/terms`, `/privacy`, `/refund`
   routes, stable versions, effective dates, and disabled/unpublished state.
2. Implement public route shells and shared footer without account-specific data or
   placeholder values in production output.
3. Add public-route, version, mobile, accessibility, and no-fabricated-facts tests.
4. After route/content verification, publish approved policies.
5. Activate signup Terms and AGE_14_PLUS controls using the same Terms version.
6. Complete server-owned signup evidence orchestration and partial-failure handling.
7. Implement checkout notice and any approved affirmative acknowledgement.
8. Run final legal/product/security E2E audit.

## 20. Final Recommendation

This corrected draft is ready for internal review and route-shell planning. The public
Terms, Privacy, and Refund documents may be implemented as unpublished/publication-
disabled shells after the route owner approves the canonical paths. They must not be
published until FACT-PENDING values are verified and the four narrow genuine legal
ambiguities are resolved or explicitly accepted.

Do not add a generic Privacy consent checkbox or event. Do not call self-attestation
verified age. Do not infer account eligibility from profile birth date. Do not claim
Guest 24-hour access is total backend retention. Do not claim all DB rows disappear on
closure. Do not publish fabricated provider, business, support, retention, or SLA facts.
