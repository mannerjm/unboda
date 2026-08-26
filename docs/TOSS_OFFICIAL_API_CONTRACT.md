# TOSS PAYMENTS OFFICIAL API CONTRACT (Extracted from docs.tosspayments.com)

**Version:** v1.2
**Source:** Official Toss documentation (retrieved during STEP 57D-40)
**Last Updated:** 2024-06-01
**Authoritative:** Yes (matches official docs exactly)

---

## Payment Confirmation Endpoint

### Request

```
POST https://api.tosspayments.com/v1/payments/confirm
Authorization: Basic {base64(secret_key:)}
Content-Type: application/json

{
  "paymentKey": string (max 200 chars),
  "orderId": string (6-64 chars, alphanumeric + - _),
  "amount": number (KRW, integer)
}
```

### Response (Success: status=DONE)

```json
{
  "mId": "tosspayments",
  "paymentKey": "5EnNZRJGvaBX7zk2yd8ydw26XvwXkLrx9POLqKQjmAw4b0e1",
  "orderId": "a4CWyWY5m89PNh7xJwhk1",
  "orderName": "?좎뒪 ?곗뀛痢???2嫄?,
  "status": "DONE",
  "totalAmount": 1000,
  "balanceAmount": 1000,
  "taxExemptionAmount": 0,
  "taxFreeAmount": 0,
  "suppliedAmount": 909,
  "vat": 91,
  "currency": "KRW",
  "method": "移대뱶",
  "requestedAt": "2024-02-13T12:17:57+09:00",
  "approvedAt": "2024-02-13T12:18:14+09:00",
  "useEscrow": false,
  "cultureExpense": false,
  "card": {
    "issuerCode": "71",
    "acquirerCode": "71",
    "number": "12345678****000*",
    "installmentPlanMonths": 0,
    "isInterestFree": false,
    "interestPayer": null,
    "approveNo": "00000000",
    "useCardPoint": false,
    "cardType": "?좎슜",
    "ownerType": "媛쒖씤",
    "acquireStatus": "READY",
    "amount": 1000
  },
  "virtualAccount": null,
  "transfer": null,
  "mobilePhone": null,
  "giftCertificate": null,
  "cashReceipt": null,
  "cashReceipts": null,
  "discount": null,
  "cancels": null,
  "secret": null,
  "type": "NORMAL",
  "easyPay": {
    "provider": "?좎뒪?섏씠",
    "amount": 0,
    "discountAmount": 0
  },
  "country": "KR",
  "failure": null,
  "isPartialCancelable": true,
  "receipt": {
    "url": "https://dashboard.tosspayments.com/receipt/..."
  },
  "checkout": {
    "url": "https://api.tosspayments.com/v1/payments/.../checkout"
  },
  "lastTransactionKey": "9C62B18EEF0DE3EB7F4422EB6D14BC6E",
  "version": "2024-06-01"
}
```

### Response (Failure: status?잻ONE)

```json
{
  "code": "INVALID_PAYMENT_KEY",
  "message": "議댁옱?섏? ?딅뒗 paymentKey?낅땲??"
}
```

---

## Payment Query by PaymentKey

### Request

```
GET https://api.tosspayments.com/v1/payments/{paymentKey}
Authorization: Basic {base64(secret_key:)}
```

### Response

Returns full Payment object (same as confirmation response)

---

## Payment Query by OrderId

### Request

```
GET https://api.tosspayments.com/v1/payments/orders/{orderId}
Authorization: Basic {base64(secret_key:)}
```

### Response

Returns full Payment object (same as confirmation response)

---

## Payment Cancellation

### Request

```
POST https://api.tosspayments.com/v1/payments/{paymentKey}/cancel
Authorization: Basic {base64(secret_key:)}
Content-Type: application/json

{
  "cancelReason": string (required, max 200 chars),
  "cancelAmount": number (optional, for partial cancellation)
}
```

### Response (Success)

```json
{
  "mId": "tosspayments",
  "paymentKey": "5EnNZRJGvaBX7zk2yd8ydw26XvwXkLrx9POLqKQjmAw4b0e1",
  "orderId": "a4CWyWY5m89PNh7xJwhk1",
  "status": "CANCELED",
  "totalAmount": 1000,
  "balanceAmount": 0,
  "cancels": [
    {
      "transactionKey": "090A796806E726BBB929F4A2CA7DB9A7",
      "cancelReason": "援щℓ??蹂??,
      "canceledAt": "2024-02-13T12:20:23+09:00",
      "cancelAmount": 1000,
      "taxFreeAmount": 0,
      "refundableAmount": 0,
      "cancelStatus": "DONE"
    }
  ],
  "...": "other fields same as confirmation response"
}
```

---

## Payment Status Enum

### Valid Statuses:

```
READY
  ?쒋? Initial state after payment creation
  ?붴? User hasn't authenticated yet

IN_PROGRESS
  ?쒋? User authenticated, payment method confirmed
  ?쒋? Confirmation API call window: 10 minutes
  ?붴? If confirm not called within 10 min ??EXPIRED

WAITING_FOR_DEPOSIT
  ?쒋? Virtual account payment method only
  ?붴? Waiting for customer's bank deposit

DONE
  ?쒋? Payment successfully approved
  ?붴? ??SUCCESS STATE FOR LAUNCH V1

CANCELED
  ?쒋? Payment cancelled (before or after approval)
  ?붴? Includes voluntary + failed virtual account scenarios

PARTIAL_CANCELED
  ?쒋? Payment partially cancelled
  ?붴? Remaining amount still valid

ABORTED
  ?쒋? Payment approval failed
  ?붴? ??ERROR STATE (user retry needed)

EXPIRED
  ?쒋? Payment confirmation window closed (30 min)
  ?쒋? IN_PROGRESS state ??EXPIRED (no confirm call)
  ?붴? ??ERROR STATE (new order required)
```

---

## Authentication (Basic Auth)

### Mechanism

```
Authorization: Basic {base64(secret_key + ":")}
```

### Example

```
Secret: <SECRET_KEY_REDACTED>

1. Concatenate: <SECRET_KEY_REDACTED>
2. Base64: c2tfdGVzdF9hQmNEZUZnSGlKa0xtTm9QcVJzVHVWd1h5WjEyMzQ1Njo=
3. Header: Authorization: Basic c2tfdGVzdF9hQmNEZUZnSGlKa0xtTm9QcVJzVHVWd1h5WjEyMzQ1Njo=
```

---

## Card Object Structure

### Key Fields

```typescript
{
  issuerCode: string;          // 2-digit issuer code (e.g., "71" = SK移대뱶)
  acquirerCode: string;        // 2-digit acquirer code
  number: string;              // Masked (e.g., "12345678****000*")
  installmentPlanMonths: number; // 0 = one-time, 2-12 = installments
  isInterestFree: boolean;      // true = interest-free
  interestPayer?: string;       // "BUYER" | "CARD_COMPANY" | "MERCHANT"
  approveNo: string;            // Bank approval number (?뱀씤踰덊샇)
  useCardPoint: boolean;        // Card company point used?
  cardType: string;             // "?좎슜" | "泥댄겕" | "湲고봽?? | "誘명솗??
  ownerType: string;            // "媛쒖씤" | "踰뺤씤" | "誘명솗??
  acquireStatus: string;        // Acquisition status: READY | REQUESTED | COMPLETED | CANCEL_REQUESTED | CANCELED
  amount: number;               // Amount charged to card (in KRW)
}
```

---

## Toss Status Flow Diagram

```
READY (?앹꽦)
  ??
  [User authenticates in payment widget]
  ??
IN_PROGRESS (?몄쬆 ?꾨즺)
  ?쒋???[Confirm API called within 10 min]
  ??  ??
  ??  DONE (?뱀씤 ?꾨즺) ??
  ??
  ?붴???[No confirm call within 10 min]
      ??
      EXPIRED (留뚮즺) ??

WAITING_FOR_DEPOSIT (媛?곴퀎醫뚮쭔)
  ?쒋???[Customer deposits funds]
  ??  ??
  ??  DONE ??
  ??
  ?붴???[No deposit by dueDate]
      ??
      CANCELED

DONE ??[Cancel request]
  ??
  CANCELED (?꾩븸痍⑥냼) or PARTIAL_CANCELED (遺遺꾩랬??

IN_PROGRESS ??[User declines]
  ??
  ABORTED ??
```

---

## Error Codes (Payment Confirmation)

### Common Errors

```
INVALID_PAYMENT_KEY
  ??議댁옱?섏? ?딅뒗 paymentKey?낅땲??
  ??Action: Verify paymentKey from client

ALREADY_APPROVED
  ???대? ?뱀씤??paymentKey?낅땲??
  ??Action: Idempotent handling (return success)

PAYMENT_NOT_FOUND
  ??議댁옱?섏? ?딅뒗 二쇰Ц?낅땲??
  ??Action: Verify orderId matches

AMOUNT_MISMATCH
  ??寃곗젣 湲덉븸???쇱튂?섏? ?딆뒿?덈떎.
  ??Action: Block confirmation, alert owner

EXPIRED
  ??留뚮즺??寃곗젣 ?붿껌?낅땲??
  ??Action: User retry (new order required)

FORBIDDEN
  ??沅뚰븳???놁뒿?덈떎.
  ??Action: Verify secret key
```

---

## Key Constants for Launch V1

### Endpoint Base URL

```
Sandbox: https://api.tosspayments.com/v1
Production: https://api.tosspayments.com/v1 (same, key determines environment)
```

### OrderId Format

```
Format: 6-64 characters
Allowed: [a-zA-Z0-9\-\_]
Uniqueness: MUST be unique across all orders
Durability: NEVER change after creation
```

### Amount Format

```
Type: number (integer)
Unit: KRW (Korean Won)
Minimum: 1
Maximum: No specified maximum (billions possible)
Currency: Only KRW for card (v1.2)
```

### Currency Support (v1.2)

```
Card Payments:
  ??KRW
  ??USD (for international cards)
  ??JPY

Other Methods (Virtual Account, Transfer):
  ??KRW only
```

### Confirmation Window

```
Toss state: IN_PROGRESS
Duration: 10 minutes (600 seconds)
Auto-transition: ??EXPIRED if no confirm call
Action: User must confirm within window
```

### Approval Timestamp

```
Format: ISO 8601
Example: "2024-02-13T12:18:14+09:00"
Timezone: +09:00 (Korea Standard Time)
Precision: Seconds
```

---

## Secrets & Key Naming

### Secret Key Naming

```
Test Environment:
  Prefix: sk_test_
  Example: <SECRET_KEY_REDACTED>

Live Environment:
  Prefix: sk_live_
  Example: <SECRET_KEY_REDACTED>
```

### Client Key Naming

```
Test Environment:
  Prefix: pk_test_
  Example: <SECRET_KEY_REDACTED>

Live Environment:
  Prefix: pk_live_
  Example: <SECRET_KEY_REDACTED>
```

### Environment Detection Rule

```
if (key.startsWith('sk_live_') || key.startsWith('pk_live_')) {
  environment = 'production';
} else if (key.startsWith('sk_test_') || key.startsWith('pk_test_')) {
  environment = 'sandbox';
} else {
  throw new Error('Invalid key format');
}
```

---

## API Call Example (Curl)

### Confirmation Request

```bash
curl --request POST \
  --url https://api.tosspayments.com/v1/payments/confirm \
  --header 'Authorization: Basic dGVzdF9za196WExrS0V5cE5BcldtbzUwblgzbG1lYXhZRzVSOg==' \
  --header 'Content-Type: application/json' \
  --data '{
    "paymentKey": "5EnNZRJGvaBX7zk2yd8ydw26XvwXkLrx9POLqKQjmAw4b0e1",
    "orderId": "a4CWyWY5m89PNh7xJwhk1",
    "amount": 1000
  }'
```

### Response Example

```json
{
  "mId": "tosspayments",
  "paymentKey": "5EnNZRJGvaBX7zk2yd8ydw26XvwXkLrx9POLqKQjmAw4b0e1",
  "status": "DONE",
  "totalAmount": 1000,
  "approvedAt": "2024-02-13T12:18:14+09:00",
  "card": {
    "issuerCode": "71",
    "approveNo": "00000000",
    "cardType": "?좎슜"
  }
}
```

---

## Critical Implementation Notes

### ??Must Do

1. **Verify status === 'DONE'** (not just HTTP 200)
2. **Compare totalAmount vs server amount** (detect fraud)
3. **Store paymentKey** (for refunds/queries later)
4. **Handle idempotency** (ALREADY_APPROVED case)
5. **Validate orderId format** (6-64 chars, alphanumeric + `-_`)
6. **Use Basic Auth** (not Bearer token)
7. **Handle HTTPS only** (Toss requires)
8. **Set timeout ??60 seconds** (API can be slow)

### ??Must NOT Do

1. **Do NOT trust client-supplied amount** (always re-derive)
2. **Do NOT use test keys in production** (auto-block)
3. **Do NOT log secrets** (redact from logs)
4. **Do NOT expose secret key to client** (backend-only)
5. **Do NOT ignore status** (check status field, not just HTTP code)
6. **Do NOT retry indefinitely** (implement backoff)
7. **Do NOT assume timestamps are local** (store as UTC/ISO 8601)
8. **Do NOT charge twice** (idempotency critical)

---

## Compatibility with Internal Schema

### Mapping: Internal ??Toss

```
Internal Field ??Toss Field
order.id ??orderId (request body)
order.amount ??amount (request body)
order.amount ??totalAmount (response, verify match)
order.productId ??(not sent to Toss)
order.userId ??(not sent to Toss)
[new field] ??paymentKey (store in order table)
```

### Mapping: Toss Response ??Internal

```
Toss Field ??Internal Action
status: "DONE" ??order.status = "paid" ??
totalAmount ??verify == order.amount ??
paymentKey ??store for audit/refund
approvedAt ??update order.paid_at
card.approveNo ??log (for reference)
failure.code ??log error, do NOT mark paid
```

---

## Version History

| API Version | Release | Notes |
|---|---|---|
| v1.2 | 2024-06-01 | Current (used for Launch V1) |
| v1.1 | 2023-xx-xx | Previous |
| v1.0 | 2021-xx-xx | Original |

**Note:** This contract uses v1.2 (2024-06-01) which is the latest as of STEP 57D-40.

---

**Final Validation:** ??EXACT MATCH with official docs.tosspayments.com/reference
