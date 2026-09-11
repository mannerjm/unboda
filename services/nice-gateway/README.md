# NICE identity gateway foundation

This service is the static-egress bridge between the Unboda application and NICE identity verification.

Current scope is deliberately narrow:

- bind the Node service to `127.0.0.1:8787` only;
- expose only `/health` and a signed `POST /v1/nice/_probe` through Caddy;
- call the NICE access-token endpoint from the registered static outbound IP;
- never return or log the NICE access token, ticket, Client ID, or Client Secret;
- do not update Supabase or mark an account `VERIFIED_ADULT` yet.

The production adult-verification flow (auth URL, callback binding, replay-safe result lookup, integrity verification, AES-GCM decryption, age policy, and authoritative account update) must be added only after the business age threshold and provider activation are confirmed.

## Secrets

Never commit secrets. The host uses `/etc/unboda-nice-gateway.env` with mode `0600` and root ownership. Required now:

```text
NICE_CLIENT_ID=...
NICE_CLIENT_SECRET=...
NICE_GATEWAY_SHARED_SECRET=...
```

The shared secret is for Vercel-server-to-gateway HMAC authentication and must be generated independently from the NICE credentials.

## Local tests

```bash
npm test
```

The test suite is offline and does not call NICE.

## Sanitized NICE probe

Run only after NICE has activated the contract for the current date:

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

Implementation must follow the current NICE integrated authentication guide at `https://auth-guide.niceid.co.kr/`. The token endpoint is `POST https://auth.niceid.co.kr/ido/intc/v1.0/auth/token`, using Basic Base64URL encoding of `client_id:client_secret`, `grant_type=client_credentials`, and a 20-50 byte `request_no`.
