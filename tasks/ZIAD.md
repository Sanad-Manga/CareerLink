# Ziad Mohamed — Auth & Backend Infrastructure

Owner: **@ziadmosen06**
Scope: authentication, token/session handling, rate limiting, input sanitization, admin-account safety.

Priority key: **P0** ship first · **P1** this milestone · **P2** soon · **P3** nice-to-have

---

## Z1. Move JWT blacklist off in-memory `Set` — `P0`

**Labels:** security, backend, P0

**Problem**
`middleware/tokenBlacklist.js` is a plain in-memory `Set`. It resets on every restart/redeploy (logged-out tokens become valid again), is not shared across Railway instances, and grows unbounded — no entry ever expires.

**Evidence**
- `backend/middleware/tokenBlacklist.js` — `const blacklist = new Set()`
- consumed in `backend/middleware/auth.js:19` and `backend/controllers/authController.js:179`

**Proposed fix**
Mongo TTL collection keyed by `jti`, `expireAfterSeconds` aligned to `JWT_EXPIRE` so rows self-evict. Redis is overkill at current scale.

**Acceptance criteria**
- Logout survives a server restart (integration test).
- Blacklist rows disappear automatically once the token would have expired anyway.
- `auth.protect` does an indexed lookup on `jti`, not a collection scan.

---

## Z2. Migrate auth rate-limiter off `MemoryStore` — `P1`

**Labels:** security, backend, P1

**Problem**
Same class of bug as Z1. `rateLimiter.js` uses `new MemoryStore()` — the limit resets on redeploy and is per-instance, so cycling requests during a deploy window or hitting a second instance bypasses it.

**Evidence**
- `backend/middleware/rateLimiter.js:3`

**Proposed fix**
Shared store (`rate-limit-mongo`, or reuse whatever backend Z1 lands on). Keep `authLimiterStore.resetAll()` working for tests (`backend/__tests__/integration.test.js:43`).

**Acceptance criteria**
- Rate limit enforced consistently across instances and across a restart.
- Existing rate-limit test still passes.

---

## Z3. Extend OTP expiry from 2 minutes — `P1`

**Labels:** backend, ux, P1

**Problem**
Password-reset OTP expires 2 minutes after send — too tight for a real user opening their email.

**Evidence**
- `backend/controllers/authController.js:216` — `Date.now() + 2 * 60 * 1000`
- email copy hardcodes "2 minutes" twice: `backend/services/emailService.js:106` and `:112`

**Proposed fix**
Raise to 10 minutes (matches the reset-token window at `authController.js:272`). Drive it from one named constant and interpolate that into the email copy so they can't drift.

**Acceptance criteria**
- Single source-of-truth constant for the expiry.
- Email text reflects the constant automatically.

---

## Z4. Add rate limiting to AI-heavy routes — `P1`

**Labels:** security, cost, backend, P1

**Problem**
Only `/auth/*` is rate-limited. Every route that calls HuggingFace is open to abuse and quota burn:
- `POST /jobs`, `PATCH /jobs/:id` → `classifyJobCategory`
- `GET /jobs/recommended` → `featureExtraction`
- `POST /jobs/:id/cover-letter` → Qwen chat completion (most expensive)

**Evidence**
- `backend/routes/jobRoutes.js` — no limiter on any of the above
- `authLimiter` only imported in `backend/routes/authRoutes.js`

**Proposed fix**
A separate stricter limiter (e.g. 20/hour keyed on `req.user._id`, not IP) on those four routes. `extract-skills` no longer needs it (local keyword matching now).

**Acceptance criteria**
- Over-limit returns 429 with the standard `{ success:false, message }` shape.
- Limit is per-user.
- Covered by a test.

---

## Z5. Wire up input sanitization (currently a no-op) — `P1`

**Labels:** security, backend, P1

**Problem**
`express-mongo-sanitize` is a dependency but imported nowhere. README claims "mongo-sanitize" and "XSS sanitization" that don't exist. Raw `req.body.email` flows into `User.findOne({ email })` in login / forgot-password / verify-otp (NoSQL operator injection); raw `keyword`/`location` flow into `$regex` in `getJobs` (regex injection / ReDoS). `xss` is only applied in `register`.

**Evidence**
- `backend/app.js` — only `helmet` + `cors`
- `backend/controllers/authController.js:135`, `:202`, `:252`
- `backend/controllers/jobController.js:12-17`

**Proposed fix**
Mount `express-mongo-sanitize` app-wide; anchor/escape the regex inputs in `getJobs`; assert `email` is a string before querying. Fix the README claims to match.

**Acceptance criteria**
- `POST /auth/login` with `{"email":{"$ne":null}}` returns 400/401, not a user.
- Test added.

---

## Z6. Email normalization mismatch between register and login — `P2`

**Labels:** bug, backend, P2

**Problem**
`register` stores `validator.normalizeEmail(email)` (lowercases, strips Gmail dots); login / forgot-password / verify-otp query the raw input. Register `Foo.Bar@Gmail.com` → stored as `foobar@gmail.com` → user can't log in with what they typed.

**Evidence**
- store: `backend/controllers/authController.js:49`
- raw lookups: `:135`, `:202`, `:252`

**Proposed fix**
Normalize on every read path, or stop normalizing on write and just lowercase consistently everywhere. Pick one.

**Acceptance criteria**
- Register + login round-trip with mixed-case and dotted addresses.
- Test added.

---

## Z7. Remove or implement `ADMIN_REGISTRATION_SECRET` — `P2`

**Labels:** tech-debt, docs, backend, P2

**Problem**
Documented in README, `.env.example`, and `docker-compose.yml`, referenced nowhere in code. `register` hard-blocks `role: admin` outright, so the secret implies a capability that doesn't exist.

**Evidence**
- grep `ADMIN_REGISTRATION_SECRET` across `backend/` + `client/src/` → zero hits
- block: `backend/controllers/authController.js:77-83`

**Proposed fix**
Delete it from README / `.env.example` / `docker-compose.yml`. `seed.js` is the intended admin-creation path (see Ahmed / C1). Only implement a guarded path if the team actually wants self-service admin signup.

**Acceptance criteria**
- No dangling references to the var anywhere.

---

## Z8. Admin self-protection + cascade on user delete — `P2`

**Labels:** security, backend, P2

**Problem**
`deleteUser` and `updateUserStatus` let an admin delete or demote any user — including other admins or themselves. `deleteUser` also orphans that user's `JobPost` and `Application` documents.

**Evidence**
- `backend/controllers/userController.js:54-124` — no role guard, no self guard, no cascade

**Proposed fix**
Reject actions where the target `role === 'admin'` or the target is `req.user._id`. On delete, cascade-remove (or reassign) the user's jobs/applications.

**Acceptance criteria**
- Admin cannot delete or demote another admin or self (403).
- Deleting a recruiter removes/reassigns their jobs.
- Tests added.

---

## Continuation — CareerLink (post-v1.0)

The audit issues above (#76–#105) are **done and merged**; `v1.0` is tagged.
Ongoing work happens in the new repo: **https://github.com/Sanad-Manga/CareerLink.git**

Your continuation tasks: [`tasks/continuation/ZIAD.md`](continuation/ZIAD.md)
How the detach works: [`tasks/continuation/DETACH.md`](continuation/DETACH.md)
Roadmap: [`docs/ROADMAP.md`](../docs/ROADMAP.md)
