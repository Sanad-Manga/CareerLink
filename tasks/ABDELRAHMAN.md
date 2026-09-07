# Abdelrahman ElGabarty — Jobs & AI Features

Owner: **@AbdelrahmanElGabarty**
Co-owner on all AI items: **@Sanad-Manga** (Ahmed is in on anything AI — design + review + build).
Scope: job posting/lifecycle, recommendations, classification, skill extraction, HF integration.

Priority key: **P0** ship first · **P1** this milestone · **P2** soon · **P3** nice-to-have

---

## A1. Cache job embeddings in `getRecommendedJobs` — `P1` (co: Ahmed)

**Labels:** performance, cost, ai, P1

**Problem**
Every recommendations request re-embeds the user's skills **and every open job** through the HF API. Cost and latency scale linearly with job count.

**Evidence**
- `backend/controllers/jobController.js:147-151`

**Proposed fix**
Persist each job's embedding on the `JobPost` document, computed at create/update time (classification already runs there). At request time only embed the user's skill string and compare against stored vectors. Fallback: embed any job missing a cached vector.

**Acceptance criteria**
- A recommendations request with N open jobs makes exactly 1 HF call regardless of N.
- Embedding recomputes when a job's `title` or `requirements` change.
- Test with mocked HF asserting call count.

---

## A2. Honest recommendation match % — `P1` (co: Ahmed)

**Labels:** bug, ai, ux, P1

**Problem**
Scores are normalized by the top result (`j.score / maxScore`), so the best match always shows as 100% even when real cosine similarity is low. Misleading. `.wolf/buglog.json` bug-013 shows the frontend thresholds were already hand-tuned (0.4 → 0.12) to compensate for this.

**Evidence**
- `backend/controllers/jobController.js:165-167`

**Proposed fix**
Return the raw cosine similarity and map it to a display band on a fixed, documented scale — not relative to the current result set. Update thresholds in `client/src/pages/RecommendedJobsPage.jsx` to match.

**Acceptance criteria**
- Two users with genuinely weak matches both see sub-100% scores.
- The score→label scale is written down (in code comments or docs).

---

## A3. Reconcile skill-extraction docs with code — `P2`

**Labels:** docs, ai, P2

**Problem**
README §"Skill Extraction from Bio", the swagger description, and the route summary all claim `dslim/bert-base-NER`. The real implementation is a hardcoded `TECH_SKILLS` keyword list + regex. `.wolf/cerebrum.md` records the keyword approach as deliberate (NER tagged "GIU" as ORG, missed "Node.js"). **Code is right, docs are stale.**

**Evidence**
- code: `backend/controllers/profileController.js:92-168`
- stale docs: README §AI Features #2; `backend/routes/profileRoutes.js:138` and `:144-147`

**Proposed fix**
Rewrite all three doc spots to describe keyword-based extraction and why. Test-suite cleanup is Ahmed / C3.

**Acceptance criteria**
- No remaining reference to an NER model for skill extraction outside of a historical note.

---

## A4. Consistent response shape from `/jobs/recommended` — `P2`

**Labels:** bug, api, P2

**Problem**
Happy path returns `{ ...job.toObject(), score }`. The "user has no skills" and "HF call failed" branches return raw Mongoose docs with no `score`. Frontend has to special-case (`hasScore`).

**Evidence**
- `backend/controllers/jobController.js:142`, `:169`, `:172`

**Proposed fix**
Always return the same shape — plain objects, `score: null` when not computed, plus an explicit flag like `scored: false` so the client can branch cleanly.

**Acceptance criteria**
- All three code paths return objects of identical shape.
- Frontend no longer needs a shape guard.

---

## A5. Set HF provider + validate embedding dimensions — `P1` (co: Ahmed)

**Labels:** bug, ai, reliability, P1

**Problem**
`hfService` builds `new HfInference(HF_TOKEN)` with no `provider`. `.wolf/cerebrum.md` flags that `@huggingface/inference` v4 auto-routes to external providers (e.g. featherless-ai) that can fail with HTTP errors — pass `provider: 'hf-inference'`. Separately, `getRecommendedJobs` assumes `featureExtraction` returns one vector per input; if the endpoint returns token-level arrays the cosine math silently produces `NaN`.

**Evidence**
- `backend/services/hfService.js` (whole file)
- `backend/services/classificationService.js:8-12` and `backend/controllers/jobController.js:148-151` — no `provider`
- cosine assumption: `backend/controllers/jobController.js:160-162`

**Proposed fix**
Pass `provider: 'hf-inference'` on every HF call. After `featureExtraction`, assert each result is a flat numeric array of the expected length; if not, mean-pool or fail loudly instead of returning garbage scores.

**Acceptance criteria**
- All HF calls pin the provider.
- Malformed embedding response is caught and logged, not silently ranked.

---

## A6. Job category enum mismatch (6 vs 8) — `P2`

**Labels:** bug, ai, data, P2

**Problem**
README AI §1 lists 8 categories (adds **Mobile**, **Security**). `CANDIDATE_LABELS` and the `JobPost.category` Mongoose enum have only 6. If the model ever returned "Mobile"/"Security", the enum validator would reject the job create.

**Evidence**
- `backend/services/classificationService.js:3`
- `backend/models/JobPost.js:42`
- README §AI Features #1

**Proposed fix**
Pick the canonical set (6 or 8) and make `CANDIDATE_LABELS`, the schema enum, README, and swagger (`backend/config/swagger.js:49`) all agree.

**Acceptance criteria**
- One category list, referenced consistently in all four places.

---

## A7. Mass-assignment allowlist on job create/update — `P1`

**Labels:** security, backend, jobs, P1

**Problem**
`createJob` does `JobPost.create({ ...req.body, category, createdBy })` and `updateJob` does `findByIdAndUpdate(id, req.body, ...)`. A recruiter can set `createdBy` (reassign ownership to someone else), `status`, `totalSlots`, or `createdAt` directly.

**Evidence**
- `backend/controllers/jobController.js:81` (create)
- `backend/controllers/jobController.js:107` (update)

**Proposed fix**
Explicitly pick allowed fields (`title, company, description, requirements, location, type, salary, totalSlots`) on both paths. `category` stays server-set; `createdBy` never comes from the body; `status` only via a dedicated open/close action.

**Acceptance criteria**
- `POST /jobs` with `createdBy` in the body does not change ownership.
- `PATCH /jobs/:id` with `createdBy`/`createdAt` in the body is ignored.
- Tests added.

---

## A8. Job-post correctness cleanup — `P3`

**Labels:** bug, jobs, P3

**Problem**
Two small ones:
1. `updateJob` only re-classifies when `req.body.description` is present, but changing only the `title` also changes what the category should be.
2. `totalSlots` is never enforced — `applyToJob` doesn't check applicant count against it, so the field is dead.

**Evidence**
- `backend/controllers/jobController.js:106`
- `backend/models/JobPost.js:44-47`; `backend/controllers/applicationController.js:36-69`

**Proposed fix**
Re-classify when `title` OR `description` changes. Decide whether `totalSlots` should block further applications / auto-close the job when hit, or drop the field.

**Acceptance criteria**
- Title-only edit updates category.
- `totalSlots` either enforced (with a test) or removed from schema + swagger + `JobForm`.

---

## Continuation — CareerLink (post-v1.0)

The audit issues above (#76–#105) are **done and merged**; `v1.0` is tagged.
Ongoing work happens in the new repo: **https://github.com/Sanad-Manga/CareerLink.git**

Your continuation tasks: [`tasks/continuation/ABDELRAHMAN.md`](continuation/ABDELRAHMAN.md)
How the detach works: [`tasks/continuation/DETACH.md`](continuation/DETACH.md)
Roadmap: [`docs/ROADMAP.md`](../docs/ROADMAP.md)
