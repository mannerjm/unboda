# Unboda Home Visual Redesign Implementation Report

## Product-Truth Filter

The reference image was used for visual direction only: cream/gold/near-black palette, editorial Korean hierarchy, generous spacing, circular hero composition, and a compact capability strip. Current repository routes and product behavior remain authoritative.

| Reference item | Current real route/action | Supported? | Final home treatment |
|---|---|---:|---|
| Brand/logo | `/` | Yes | `운보다` wordmark with restrained gold mark |
| 무료 분석 | `/guest-saju` for guests; `/saju` for members | Yes | Primary CTA preserves state-specific destination |
| 로그인 | `/auth/login?returnTo=/` | Yes | Header and secondary CTA |
| 회원가입 | `/auth/signup` from Guest result/checkout flows | Yes | Not invented in the home header; existing entry paths remain unchanged |
| 추천 분석 | `/recommendations` | Yes | Member header destination |
| 심층 분석 | `/deep-analysis` | Yes | Header and capability item |
| 관심 분석 | `/interests` | Yes | Not added to guest header; remains in existing member IA |
| 구매한 분석 | `/purchased-analyses` | Yes | Not added to guest header; remains in existing member IA |
| My Page/profile management | `/mypage` | Yes | Member header and capability item |
| Terms | `/terms` | Yes | Minimal legal footer link |
| Privacy | `/privacy` | Yes | Minimal legal footer link |
| Refund | `/refund` | Yes | Minimal legal footer link |
| 서비스 소개 / 이용 방법 | No current route | No | Omitted |
| 고객지원 destination | No confirmed public route | No | Omitted |
| Blog / Instagram / social links | No confirmed product routes | No | Omitted |
| Business address, phone, support email | Publication facts pending | No | Omitted |
| Metrics, certifications, expertise claims | Not independently supported | No | Omitted |

## Implementation

- Replaced the previous home JSX presentation with `app/components/HomeExperience.tsx`.
- Preserved the server-side landing-state computation in `app/page.tsx`: guest, no profile, profile selection, ready, in-progress, stale, and completed analysis states remain unchanged in behavior.
- Added a responsive editorial header with real Guest/member destinations.
- Added a visual hero using the approved reference asset as a cropped decorative landscape, with CSS-built orbit, stone, and branch details. Unsupported reference copy is not used as application copy.
- Added truthful capability items: 무료 사주 분석, 심층 분석, 프로필 관리, 구매한 분석 관리.
- Added only `/terms`, `/privacy`, and `/refund` in the footer.
- No Auth, signup-policy, Guest, payment, eligibility, migration, or account logic was modified.
- No unsupported metrics, social proof, security superiority, expert claims, business facts, SLA, or ©2025 text was added.

## Validation

- `npx.cmd tsc --noEmit` — PASS.
- `npm.cmd run build` — PASS; all routes generated.
- Editor diagnostics for `app/page.tsx` and `app/components/HomeExperience.tsx` — no errors.
- Unsupported reference-copy scan across the new home files — no matches.
- Local review server — available at `http://localhost:3000`; an existing workspace Next process already owned port 3000.
- No commit, push, or staging performed.

## Review URL

http://localhost:3000
