# NICE identity gateway

This service is the static-egress bridge between the Unboda application and NICE identity verification.

Production responsibilities:

- bind the Node service to `127.0.0.1:8787` only;
- expose `/health` plus signed `/v1/nice/*` API calls through Caddy;
- call NICE from the registered static outbound IP;
- never return or log the NICE Client ID, Client Secret, access token, ticket, or raw decrypted identity result;
- issue a mobile-only (`M`) NICE standard-window auth URL;
- seal provider transaction material before returning it to the Vercel application;
- verify NICE result integrity, decrypt AES-256-GCM result data, and reduce the result to the configured adult policy outcome;
- return only the normalized adult boolean plus policy/evidence versions to the application.

The authoritative account update remains in the Unboda application, after a durable user-bound verification session is claimed exactly once.

## Adult policy

The paid-service eligibility policy is **만 19세 이상** (`NICE_ADULT_19_V1`). Age is calculated from NICE's verified `birthdate` using the `Asia/Seoul` calendar date. Raw `birthdate`, name, mobile number, CI, DI, and other NICE identity fields are not returned by this gateway and are not persisted in the Unboda database.

## Secrets

Never commit secrets. The host uses `/etc/unboda-nice-gateway.env` with mode `0600` and root ownership:

```text
NICE_CLIENT_ID=...
NICE_CLIENT_SECRET=...
NICE_GATEWAY_SHARED_SECRET=...
```

The shared secret is for Vercel-server-to-gateway HMAC authentication and for deriving a separate domain-separated key used to seal short-lived provider context. It must be generated independently from the NICE credentials.

## Signed endpoints

All `/v1/nice/*` endpoints require the Vercel-to-gateway HMAC headers (`timestamp`, `nonce`, `signature`) and reject stale or replayed requests.

- `POST /v1/nice/_probe` — sanitized access-token connectivity probe.
- `POST /v1/nice/auth-url` — obtains a NICE mobile-verification standard-window URL and returns an opaque sealed provider context valid for 10 minutes.
- `POST /v1/nice/result` — consumes the sealed provider context plus `web_transaction_id`, verifies/decrypts the NICE result, and returns only the normalized adult eligibility result.

## Local tests

```bash
npm test
```

The test suite is offline and does not call NICE.

## Sanitized NICE probe

```bash
node --env-file=/etc/unboda-nice-gateway.env scripts/probe-nice-token.mjs
```

Expected success output contains only:

```json
{"ok":true,"provider":"NICE","resultCode":"0000"}
```

No access token or ticket is printed.

## Runtime

Install `deploy/unboda-nice-gateway.service` as `/etc/systemd/system/unboda-nice-gateway.service`, create the dedicated `nicegateway` system user, and keep the source at `/opt/unboda/services/nice-gateway`.

Caddy should use `deploy/Caddyfile.snippet`. Only Caddy listens publicly on ports 80/443; the Node process remains localhost-only.

## NICE protocol source

Implementation follows the current NICE integrated authentication guide at `https://auth-guide.niceid.co.kr/`:

- `POST /ido/intc/v1.0/auth/token`
- `POST /ido/intc/v1.0/auth/url`
- `POST /ido/intc/v1.0/auth/result`

The result integrity check and AES-GCM decryption follow NICE's documented PBKDF2/HMAC/AES-GCM procedure.
