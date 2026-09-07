# Spike — pick the next AI feature (AI-1)

Compares the three backlog candidates so the group can pick one for the next
milestone. **Decision: pending** — see recommendation at the bottom, then file an
implementation issue for the chosen one.

## Context — what the stack already gives us

- `@huggingface/inference` v4, `provider: 'hf-inference'`, `HF_TOKEN`.
- Models in use: `bart-large-mnli` (zero-shot), `all-MiniLM-L6-v2` (embeddings),
  `Qwen2.5-7B-Instruct` (chat).
- **A1 shipped a per-job embedding cache** on `JobPost.embedding` + a working
  `cosineSimilarity` in `jobController.js`. Reusable.
- Per-route AI rate limit already exists (20/hr/user on job AI routes).
- `multer` + Cloudinary upload path already wired for profile pictures.

## Evaluation criteria

HF model/endpoint · rough cost per call · where it plugs into the current
controllers · effort · risk.

---

## Candidate A — Résumé/CV upload + parsing for skill extraction

Job seeker uploads a PDF/DOCX; server extracts text and pulls skills from it
instead of (or in addition to) the hand-written bio.

| | |
|---|---|
| **HF** | None required — run the existing `extractSkillsFromText` keyword matcher on the parsed text. Optional upgrade: one `Qwen2.5-7B-Instruct` call with an "extract skills as JSON array" prompt for better recall. |
| **Non-HF deps** | `pdf-parse` (PDF), `mammoth` (DOCX). File parsing quality is the main unknown. |
| **Cost/call** | $0 with the keyword matcher; ~1 chat completion (cover-letter-sized) if using the LLM. |
| **Integration** | New `POST /api/v1/profile/resume` in `profileController` (multer, like the picture upload). Parse → `extractSkillsFromText` → save to `user.skills`. Optionally store the file on Cloudinary. New client upload UI on the profile page. |
| **Effort** | **M** (~2–3 days) — parsing + endpoint + client UI + tests for a couple of sample resumes. |
| **Risk** | PDF text extraction is inconsistent (columns, tables, scanned images → nothing). DOCX adds a dependency. Scanned PDFs need OCR (out of scope). |

---

## Candidate B — "Why you're a fit" explanations next to match scores

On the recommendations list, show a 1–2 sentence rationale for why the user's
skills match a given job.

| | |
|---|---|
| **HF** | `Qwen2.5-7B-Instruct` chat completion — prompt = user skills + job title/requirements → short rationale. |
| **Cost/call** | 1 chat completion per (user, job) explained. **Eager** (top 5 on every `/jobs/recommended`) = 5 calls/request → blows the rate limit fast and adds latency. **Lazy** (`GET /api/v1/jobs/:id/why-fit`, on demand) = 1 call when the user expands a card. |
| **Integration** | Lazy endpoint in `jobController`, sibling to `generateCoverLetter`. Cache the result per (user, job) in Mongo (a `FitExplanation` collection or a subdoc) so re-opening a card is free — mirrors the A1 embedding-cache pattern. Client renders it under the match score. |
| **Effort** | **S–M** (~1–2 days) — one endpoint, one prompt, a cache, a bit of client UI. |
| **Risk** | Hallucinated matches ("great fit!" when it isn't) undermine trust — keep the prompt grounded and terse, cite the actual overlapping skills. Latency on first open (~1–3s). |

---

## Candidate C — Applicant ranking for recruiters

On a job's applicants list, rank candidates by how well their skills/bio match the
job — the reverse of recommendations.

| | |
|---|---|
| **HF** | `all-MiniLM-L6-v2` embeddings — **reuses A1**. The job's embedding is already cached (`JobPost.embedding`). Embed each applicant's `skills`/`bio`, cosine vs the job vector. |
| **Cost/call** | 1 `featureExtraction` per applicant **without** a cached embedding; cache it on `User.embedding` (same pattern as jobs) so repeat views are free. Job side = $0 (cached). |
| **Integration** | Extend `getJobApplicants` in `applicationController` — after loading applicants, ensure each has an embedding, score against `job.embedding`, sort desc, attach `score`/`scored`. Reuse the exact `cosineSimilarity` from `jobController` (lift it into a shared `services/similarity.js`). Client adds a "Match" column + sort toggle. |
| **Effort** | **S** (~1–2 days) — the embedding + cosine infra already exists and is tested; this is wiring, a shared helper, and a client column. |
| **Risk** | **Low** — same math as recommendations, already covered by tests. Applicants with empty `skills` and `bio` can't be scored → show them unranked at the bottom (`scored: false`), consistent with how `/jobs/recommended` already handles no-skills users. |

---

## Recommendation — Candidate C

1. **Lowest effort, highest reuse.** The A1 embedding cache + cosine code shipped
   and is tested; C is mostly wiring and a shared helper.
2. **Serves the under-served persona.** Recruiters currently get an unordered
   applicant list; job seekers already have AI recommendations and cover letters.
3. **No new model, no new parsing dependency, no new failure mode.**
4. **Cost is bounded** and mostly cached after first view.

**Fast-follow: Candidate B** (lazy `why-fit` endpoint) — small, and it pairs
naturally with the match scores both seekers and (after C) recruiters see.

**Defer: Candidate A** — the biggest lift, and the value (skills from a CV) is
partly reachable today by pasting the CV into the bio field.

## Done when

- Group has picked one (edit this section with the decision + date).
- A follow-up implementation issue is filed for it, referencing this doc.
- If C: file a small prep issue to lift `cosineSimilarity` into `services/similarity.js`.
