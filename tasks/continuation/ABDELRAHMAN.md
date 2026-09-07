# Abdelrahman — continuation tasks (CareerLink)

Owner: **@AbdelrahmanElGabarty** · role: AI features + backend.

Relevant plan:
[`docs/plans/next-ai-feature.md`](../../docs/plans/next-ai-feature.md)

---

## 1. Next AI feature — applicant ranking for recruiters — `P1`

Spike: [`docs/plans/next-ai-feature.md`](../../docs/plans/next-ai-feature.md).
The spike recommends **Candidate C** (rank a job's applicants by skill/bio match).
Confirm with the group first, then implement.

### 1a. Prep — shared similarity helper

Branch `refactor/similarity-helper`.
- Lift `cosineSimilarity` out of `backend/controllers/jobController.js` into
  `backend/services/similarity.js`; import it back in `jobController`.
- No behaviour change; existing recommendation tests must still pass.

### 1b. User embedding cache

Branch `feat/user-embedding`.
- `backend/models/User.js` — add `embedding: { type: [Number], select: false }`.
- Mirror the A1 job pattern: a helper that embeds a user's `skills`/`bio`
  (`all-MiniLM-L6-v2`, `provider: 'hf-inference'`), caches on `User.embedding`,
  recomputes when skills/bio change (or lazily on first use).

### 1c. Rank applicants

Branch `feat/applicant-ranking`.
- `backend/controllers/applicationController.js` `getJobApplicants` — the job's
  embedding is already cached (`JobPost.embedding`). For each applicant: ensure a
  user embedding, `cosineSimilarity(job.embedding, user.embedding)`, attach
  `score` + `scored`, sort desc. Applicants with no skills **and** no bio → can't
  be scored → `scored: false`, sorted last (same convention as
  `/jobs/recommended` for no-skills users).
- `client/` — add a "Match" column + a sort toggle on the applicants view.
- Tests: happy path (ranked), applicant with no skills/bio (unscored, last),
  403 for a non-owning recruiter, 401 without a token.

**Acceptance:** recruiter sees applicants ordered by match; job-side embeddings
reused from cache (no extra HF calls per view after the first); tests green.

## 2. Fast-follow — "why you're a fit" explanations — `P2`

[`docs/plans/next-ai-feature.md`](../../docs/plans/next-ai-feature.md) Candidate B.
Lazy `GET /api/v1/jobs/:id/why-fit` (1 `Qwen2.5-7B-Instruct` call, cached per
user+job like embeddings), rendered under the match score. File as its own issue
after applicant ranking lands.

## 3. Category/AI docs upkeep — `ongoing`

Keep the README "AI Features" section in sync with any model/endpoint changes
(the section was just corrected in #88 — don't let it drift again).
