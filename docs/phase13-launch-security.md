# Phase 13 — Launch Security Hardening

## Code-side hardening completed in this phase

- Upgrade Next.js and `eslint-config-next` from 16.2.10 to the patched 16.3.4 line after the launch audit found a critical Next.js advisory set.
- Run `npm audit fix` without `--force`; the resulting full dependency audit and production-only audit report zero known vulnerabilities at this checkpoint.
- Pin `tsx` as an exact development dependency and use the local binary in regression scripts instead of dynamically installing it through `npx` during CI.
- Add a PR security workflow that installs from the lockfile, blocks on high/critical production dependency findings, reports the full audit, runs launch-security regression checks, and builds the application.
- Add baseline response headers: HSTS, nosniff, frame denial, strict referrer policy, restrictive camera/microphone/geolocation permissions, and disabled DNS prefetching. Remove the default `X-Powered-By` header.
- Add a regression guard that keeps Production mock payment confirmation closed, requires matching Toss live credentials in Production, keeps local environment/key files ignored, and prevents server-only secret environment-variable names from being referenced by client components.
- Add feature-gated Cloudflare Turnstile support to password login, signup, and password-reset request forms. The public site key is client-only; the secret key is intentionally not stored in this repository or the Vercel client environment. Supabase Auth remains the server-side token verifier once dashboard enforcement is enabled.

## Deliberately not changed in this code slice

- No Production database mutation or migration.
- No customer, payment, entitlement, credit, consultation, or memory data was created.
- Toss Live and AI-credit checkout were not enabled.
- No Production secret was added, rotated, printed, or moved into a client bundle.
- Supabase CAPTCHA enforcement is not enabled by this code change. The frontend must first be deployed with the public Turnstile site key and the feature flag enabled, then the matching provider secret must be configured in Production Supabase Auth.
- No Content-Security-Policy was added yet. A strict CSP needs a dedicated browser E2E pass because checkout/auth/Next.js/Turnstile script behavior must be enumerated before enforcement.

## External/manual launch-security gates

1. **Supabase leaked-password protection — COMPLETE.** Production Auth leaked-password protection was enabled and the Security Advisor warning cleared.
2. **GitHub main-branch protection — COMPLETE.** An active `Protect main` repository ruleset requires PR-based changes, the Vercel status check, deletion protection, and blocks force pushes for the default `main` branch.
3. **CAPTCHA / automated-abuse protection — CODE READY, ACTIVATION PENDING.** Create a Cloudflare Turnstile widget for the production hostname, add only the public site key plus `NEXT_PUBLIC_AUTH_CAPTCHA_ENABLED=true` to the Vercel Production environment, redeploy, then configure the matching Turnstile secret in Supabase Auth and enable CAPTCHA protection. After enforcement, re-run signup/login/password-reset E2E. Do not enable the Supabase dashboard switch before the frontend is live.
4. **DMARC / mail-domain policy** — verify and publish the intended DNS policy separately; do not infer completion from SMTP delivery alone.
5. **CSP** — add only after browser E2E confirms the exact script/connect/frame requirements for Next.js, Supabase Auth, Toss, Turnstile, and any production monitoring provider.
6. **Operational alerting** — persisted monitoring/admin views exist, but external alert delivery for critical payment/refund/reconciliation/generation failures should be finalized before broad sale.

## Other sale gates outside this Phase 13 code slice

Final public legal/business facts, NICE adult verification, approved Toss live merchant credentials, AI-question-credit refund policy, and the controlled real-money Production smoke test remain separate launch requirements.

## Release description

Until the remaining manual controls above are closed, describe this checkpoint as **Phase 13 code-side launch security hardened; CAPTCHA/DNS/operational launch controls remain** rather than as fully launch-secure.
