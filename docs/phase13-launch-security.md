# Phase 13 — Launch Security Hardening

## Code-side hardening completed in this phase

- Upgrade Next.js and `eslint-config-next` from 16.2.10 to the patched 16.3.4 line after the launch audit found a critical Next.js advisory set.
- Run `npm audit fix` without `--force`; the resulting full dependency audit and production-only audit report zero known vulnerabilities at this checkpoint.
- Pin `tsx` as an exact development dependency and use the local binary in regression scripts instead of dynamically installing it through `npx` during CI.
- Add a PR security workflow that installs from the lockfile, blocks on high/critical production dependency findings, reports the full audit, runs launch-security regression checks, and builds the application.
- Add baseline response headers: HSTS, nosniff, frame denial, strict referrer policy, restrictive camera/microphone/geolocation permissions, and disabled DNS prefetching. Remove the default `X-Powered-By` header.
- Add a regression guard that keeps Production mock payment confirmation closed, requires matching Toss live credentials in Production, keeps local environment/key files ignored, and prevents server-only secret environment-variable names from being referenced by client components.

## Deliberately not changed in this code slice

- No Production database mutation or migration.
- No customer, payment, entitlement, credit, consultation, or memory data was created.
- Toss Live and AI-credit checkout were not enabled.
- No Production secret was added, rotated, printed, or moved into a client bundle.
- No Content-Security-Policy was added yet. A strict CSP needs a dedicated browser E2E pass because checkout/auth/Next.js script behavior must be enumerated before enforcement.

## Remaining external/manual launch-security gates

1. **Supabase leaked-password protection** — the Production Security Advisor currently reports this Auth protection as disabled. Enable it in the Production Auth configuration and re-run signup/login/password-reset E2E.
2. **CAPTCHA / automated-abuse protection** — integrate the selected CAPTCHA provider with the client Auth flow before enabling the corresponding Supabase enforcement. Do not enable a dashboard switch first and break signup/recovery.
3. **GitHub main-branch protection** — `main` is currently unprotected. Before General Sale, require PR-based changes and successful launch/security checks through branch protection or a repository ruleset.
4. **DMARC / mail-domain policy** — verify and publish the intended DNS policy separately; do not infer completion from SMTP delivery alone.
5. **CSP** — add only after browser E2E confirms the exact script/connect/frame requirements for Next.js, Supabase Auth, Toss, and any production monitoring provider.
6. **Operational alerting** — persisted monitoring/admin views exist, but external alert delivery for critical payment/refund/reconciliation/generation failures should be finalized before broad sale.

## Other sale gates outside this Phase 13 code slice

Final public legal/business facts, NICE adult verification, approved Toss live merchant credentials, AI-question-credit refund policy, and the controlled real-money Production smoke test remain separate launch requirements.

## Release description

Until the manual controls above are closed, describe this checkpoint as **Phase 13 code-side launch security hardened; dashboard/DNS/operational launch controls remain** rather than as fully launch-secure.
