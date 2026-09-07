# Ahmed Sanad — Coordination, Cross-Cutting & AI

Owner: **@Sanad-Manga**
Role: coordinate the 3-person split + own everything cross-cutting (CI, tests, seed, docs, repo/rebrand) + co-own every AI item with Abdelrahman (design, review, and hands-on build).

Priority key: **P0** ship first · **P1** this milestone · **P2** soon · **P3** nice-to-have

---

## Cross-cutting engineering

### C1. Remove committed admin backdoor in `seed.js` — `P0`

**Labels:** security, backend, P0

**Problem**
`seed.js` hardcodes `admin@giu.edu` / `adminpass123` and **resets** the admin to that password if the account already exists. README tells people to run `npm run seed` and describes it as creating "sample users, jobs, and applications" — it only touches the admin. Anyone with repo access who runs seed against Atlas has prod admin.

**Evidence**
- `backend/seed.js:14-20` (hardcoded creds), `:36-53` (reset-on-exists)
- README §"Seeding the Database"

**Proposed fix**
Pull admin email + password from env (`SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`); refuse to run if they're unset or if `NODE_ENV === 'production'` without an explicit `--force`. Don't reset an existing admin's password silently. Fix the README description.

**Acceptance criteria**
- No credentials in the source.
- Running seed with no env vars fails safely with a clear message.
- README matches what the script does.

---

### C2. CI runs on pull requests + branch protection — `P0`

**Labels:** ci, process, P0

**Problem**
`.github/workflows/ci.yml` only triggers on `push` to `main`. ~40 branches merge with zero automated checks; tests and the Railway deploy run **after** merge, with no gate. A broken PR reaches `main` and deploys before anyone knows.

**Evidence**
- `.github/workflows/ci.yml:3-5` (`on: push: branches: [main]`)
- `:28-43` (deploy job, no approval)

**Proposed fix**
Add `pull_request` trigger for the `test` job. Turn on branch protection for `main` (require the test check + 1 review). Add an `eslint` step for `client/` (it has a config, nothing runs it). Keep deploy gated on `test` passing on `main`.

**Acceptance criteria**
- Opening a PR runs tests automatically.
- `main` can't be pushed to directly; failing tests block merge.
- Lint runs in CI.

---

### C3. Refresh the stale test suite + cover the AI endpoints — `P1`

**Labels:** tests, ai, P1

**Problem**
`integration.test.js` mocks `hfService.tokenClassification` (no longer called anywhere) and comments describe "mocked HuggingFace NER". The `featureExtraction` mock returns a fixed 2-element array regardless of job count. No tests exist for: `/jobs/recommended`, `/jobs/:id/cover-letter`, real classification path, `/admin/stats`, application status updates, saved jobs, change-password, full reset-password flow, profile-picture upload, most RBAC-negative cases.

**Evidence**
- `backend/__tests__/integration.test.js:6-12` (stale mocks), `:230-258` (misleadingly named skill test)

**Proposed fix**
Delete dead mocks, rename the skill-extraction test to reflect keyword matching, add a realistic `featureExtraction` mock (one vector per input, length matches). Add happy + auth-failure tests for each uncovered route above. Coordinate the mock shape with Abdelrahman's A1/A5 work.

**Acceptance criteria**
- No mock references a function the code doesn't call.
- Every AI route has at least a happy-path and a 401/403 test.
- Coverage report added to CI output.

---

### C4. README accuracy pass — `P2`

**Labels:** docs, P2

**Problem**
Several claims are wrong or outdated: skill extraction model (see Abdelrahman / A3), `npm run seed` description (C1), "mongo-sanitize" / "XSS sanitization" protection that isn't wired (Ziad / Z5), 8 vs 6 job categories (A6), `ADMIN_REGISTRATION_SECRET` (Z7), contributors list still shows 8 while 3 are continuing.

**Proposed fix**
One pass once C1 / Z5 / Z7 / A3 / A6 land, so the doc reflects reality. Add a short "Status" or "History" note (ties into C6).

**Acceptance criteria**
- Every feature/security bullet in the README maps to code that exists.

---

### C5. Dead code / cruft removal — `P3`

**Labels:** tech-debt, P3

**Problem**
- `emailService.sendResetEmail` (link-based flow) is exported and mocked but the app only uses the OTP flow now.
- `hfService` uses the deprecated `HfInference` class name (renamed `InferenceClient` in `@huggingface/inference` v3+; pinned `^4.13.15`).
- `GIU_Nexus_MS1.code-workspace` tracked in the repo.
- No `.dockerignore` (build context ships everything not gitignored).
- `.wolf/anatomy.md` is stale (last scan May, mostly empty).

**Proposed fix**
Delete `sendResetEmail` if nothing links to it, switch to `InferenceClient`, drop the `.code-workspace` file, add a `.dockerignore`. Regenerate anatomy or leave it.

---

### C6. Rebrand mechanics: freeze v1.0, detach into a new repo — `P1` (process)

**Labels:** process, repo, P1

**Plan**
1. Land P0/P1 fixes on `GIU-Nexus`, then tag `v1.0` — a clean line for "the university version".
2. **Do not use GitHub's Fork button** for the continuation (forks are de-emphasized on profiles, contributions don't count, stays tethered). Create a **new standalone repo** and push full history: `git remote add new <url> && git push new --all --tags`. All 8 original contributors' commits stay intact and attributed.
3. In the new repo, rebrand: product name, email templates, swagger title, `seed.js` email domain, footer, `package.json` name. Keep git history untouched (no author rewrite).
4. Add a **History & Attribution** section to the new README: "Originally built 2025–2026 as an 8-person university project at GIU. Continued since <month 2026> by Ahmed Sanad, Ziad Mohamed, Abdelrahman ElGabarty." Keep a `CONTRIBUTORS` file listing all 8.
5. Before pushing publicly under a new name: quick informal OK from the other 5 original authors, and check the program's academic-integrity / IP policy.

**Acceptance criteria**
- `v1.0` tag exists on the current repo.
- New repo has full preserved history + attribution note + contributors file.

---

### C7. Security hardening tracking issue — `P2`

**Labels:** security, tracking, P2

**Problem** (bundle — small individually)
- `helmet` runs with `contentSecurityPolicy: false` (`backend/app.js:24`).
- Frontend stores the JWT in `localStorage` (`client/src/services/api.js:8`) — XSS-exfiltratable.
- CORS origins hardcoded in `backend/app.js:17-21` — new frontend URL needs a code change + redeploy; move to env.

**Proposed fix**
Turn on a real CSP, move CORS origins to `ALLOWED_ORIGINS` env var. Token storage: at minimum document the risk; ideally move to httpOnly cookie (larger change — scope separately if the team wants it).

---

## AI co-ownership (with Abdelrahman)

- Co-owner on **A1** (embedding cache), **A2** (honest match %), **A5** (HF provider + dimension validation) — pair on design and review, split implementation.
- **AI-1. Feature spike — pick the next AI feature — `P2`**
  Write a one-page design doc comparing the three candidates from the backlog: resume/CV upload + parsing for skill extraction, AI "why you're a fit" explanations next to match scores, applicant ranking for recruiters (reverse of recommendations). Cover: HF model/endpoint, cost per call, where it plugs into the current controllers, effort estimate. Bring it to the group to choose one for the next milestone.
  **Done when:** doc exists in `docs/`, team has picked one, a follow-up implementation issue is filed.

---

## Coordination (ongoing)

- Own the milestone board: turn these 3 files into GitHub issues, assign, set the milestone.
- Triage new bugs, keep `tasks/*.md` and the board in sync.
- Review cadence: each person opens PRs against `main`; you review + merge; nobody merges their own.
- Keep the 3 workstreams from colliding — Ziad's Z1/Z2 (shared store) and Abdelrahman's A1 (schema change) both touch models/infra; sequence them.

---

## Continuation — CareerLink (post-v1.0)

The audit issues above (#76–#105) are **done and merged**; `v1.0` is tagged.
Ongoing work happens in the new repo: **https://github.com/Sanad-Manga/CareerLink.git**

Your continuation tasks: [`tasks/continuation/AHMED.md`](continuation/AHMED.md)
How the detach works: [`tasks/continuation/DETACH.md`](continuation/DETACH.md)
Roadmap: [`docs/ROADMAP.md`](../docs/ROADMAP.md)
