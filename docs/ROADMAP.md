# Roadmap — post-v1.0 continuation

`v1.0` (tag on the university repo) is the frozen "submitted project" line. Everything
below is work for the **rebranded continuation repo** (see [`DETACH-PLAN.md`](DETACH-PLAN.md)).

Each item links to a plan under [`plans/`](plans/). Plans are written to be picked up
cold — problem, approach, file touchpoints, effort, risks, acceptance.

---

## Shipped in v1.0

Post-submission hardening that made it into the tag:

- CI on PRs + branch protection + client lint gate (#86, #92, #98)
- `seed.js` credentials from env, no reset-on-run (C1)
- Jest suite refresh + AI/auth endpoint coverage, 19 → 71 tests (#87, #103)
- Mongo-backed JWT blacklist + rate limiter, per-route AI limits, request input
  sanitization, admin-delete safety (Z1–Z8)
- Job embedding cache, honest match %, consistent response shape, HF provider pin,
  category-enum fix, mass-assignment allowlist, job-post cleanup (A1–A8)
- README accuracy, dead-code removal, `InferenceClient` rename (#88, #89)

---

## Queued

| # | Item | Plan | Rough effort | Depends on |
|---|------|------|--------------|------------|
| 1 | **Rebrand + detach** | [`DETACH-PLAN.md`](DETACH-PLAN.md) | 0.5 day + approvals | author sign-off, IP check |
| 2 | **Hosting migration** — Railway trial expired, prod deploy is red | [`plans/hosting-migration.md`](plans/hosting-migration.md) | 0.5–1 day | pick a host |
| 3 | **Security hardening** (C7) — real CSP, CORS→env, token storage | [`plans/security-hardening.md`](plans/security-hardening.md) | CSP+CORS ~1 day; cookie auth ~3 days | — |
| 4 | **Next AI feature** (AI-1) — spike + pick one | [`plans/next-ai-feature.md`](plans/next-ai-feature.md) | spike done; impl 1–3 days | team decision |
| 5 | **Client test suite** — client has zero tests | [`plans/client-test-suite.md`](plans/client-test-suite.md) | 1 day setup + ongoing | — |
| 6 | Client `exhaustive-deps` warnings (3) — from #92 | — (inline) | 0.5 day | — |

## Suggested order

1. **Hosting migration** first — prod is currently not deploying, and the rebrand
   step re-does deploy config anyway, so decide the host before the detach.
2. **Detach + rebrand** — clean line before piling on features.
3. **Security hardening (CSP + CORS→env)** — small, self-contained, no product risk.
4. **AI feature** — the spike recommends [Candidate C](plans/next-ai-feature.md);
   file the implementation issue once the group signs off.
5. **Client test suite** — do this alongside (4) so the new feature ships with tests.
6. Cookie-based auth and the `exhaustive-deps` cleanup are nice-to-have; schedule
   when there's slack.

---

## Not planned (parked)

- TypeScript migration — large, low payoff for a 3-person team right now.
- Error monitoring (Sentry) / structured logging — revisit if the app gets real traffic.
- `helmet` CSP for the API is in scope (plan 3); a full frontend CSP is a separate,
  larger effort tied to the Vercel deploy.
