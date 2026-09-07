# Ziad — continuation tasks (CareerLink)

Owner: **@ziadmosen06** · role: hosting/infra + backend security.

Relevant plans:
[`docs/plans/hosting-migration.md`](../../docs/plans/hosting-migration.md) ·
[`docs/plans/security-hardening.md`](../../docs/plans/security-hardening.md)

---

## 1. Hosting migration — `P0` (prod deploy is currently broken)

Plan: [`docs/plans/hosting-migration.md`](../../docs/plans/hosting-migration.md).
The Railway trial expired — `main` CI is red on the deploy job, backend isn't
auto-deploying.

- **Now, old repo:** add `continue-on-error: true` to the `deploy` job in
  `.github/workflows/ci.yml` so `main` stops going red. Small PR.
- **Decide the host:** Railway Hobby (~$5/mo, zero migration) **or** Render free
  tier (cold starts). Recommendation in the plan.
- **Wire it for CareerLink:**
  - deploy config (`render.yaml` or keep the Railway job with a valid plan)
  - `.github/workflows/ci.yml` deploy job → new host
  - `backend/config/swagger.js` `servers[].url` → new backend URL
  - `README.md` Deployment table
  - Vercel `VITE_API_URL` env → new backend URL
  - remove `railway.toml` + `RAILWAY_*` secrets if moving off Railway

**Acceptance:** a push to CareerLink `main` deploys a live backend within minutes;
CI green; Swagger `servers` + README point at the real URL.

## 2. Security hardening — CSP — `P1`

Plan: [`docs/plans/security-hardening.md`](../../docs/plans/security-hardening.md) §1.
Branch `feat/security-csp`.

- `backend/app.js` — replace `helmet({ contentSecurityPolicy: false })` with
  `helmet()` + explicit CSP directives (`default-src 'self'`, allowances for
  swagger-ui `style-src 'unsafe-inline'` / `img-src data:`).
- Verify `/api-docs` still renders and "try it out" works.
- Add a test asserting the `Content-Security-Policy` header on a normal route.

**Acceptance:** CSP header present with `default-src 'self'`; Swagger UI still works.

## 3. Security hardening — CORS origins to env — `P1`

Plan: [`docs/plans/security-hardening.md`](../../docs/plans/security-hardening.md) §2.
Branch `feat/security-cors-env` (can share the CSP PR).

- `backend/app.js` — `ALLOWED_ORIGINS` from `process.env.ALLOWED_ORIGINS`
  (comma-split), fall back to localhost defaults when unset.
- `.env.example` + `README.md` env table — add `ALLOWED_ORIGINS`.
- Set it in the host dashboard (Vercel frontend URL + localhost).

**Acceptance:** adding a frontend URL is an env change + restart, no code edit;
non-listed origins still rejected.

## 4. Email templates rebrand — `P1`

Part of the rebrand. Branch `chore/rebrand-email`.

- `backend/services/emailService.js` — `from: '"GIU Nexus" <…>'`, both `subject:`
  lines, footer text ("GIU Nexus · German International University" /
  "AI-Powered Career Platform"), the `GN` logo badge markup → new brand.

**Acceptance:** OTP email shows the new name everywhere; no "GIU"/"Nexus" left in
`emailService.js`.

## Optional — httpOnly cookie auth

Plan: [`docs/plans/security-hardening.md`](../../docs/plans/security-hardening.md) §3.
Larger change (backend + client + Vite proxy + CSRF). Only if the team wants it —
the Z1 Mongo blacklist already limits a stolen token's blast radius. Scope as its
own issue.
