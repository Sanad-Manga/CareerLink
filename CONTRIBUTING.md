# Contributing

CareerLink is the continuation of a university project (frozen at `v1.0` in the
original repo). Maintained by Ahmed Sanad, Ziad Mohsen, and Abdelrahman ElGabarty.

## Workflow

Trunk-based. `main` is always releasable.

1. Branch off `main`.
2. One branch = one PR = one concern. Keep it small.
3. Open a PR into `main`. Fill in what changed and how you tested it.
4. Needs **1 approving review** and green CI to merge. **Nobody merges their own PR.**
5. Squash-merge. Delete the branch after merge.

## Branch names

```
<type>/<short-kebab-description>
```

**Types:** `feat` · `fix` · `chore` · `docs` · `refactor` · `test` · `ci` · `perf`

- lowercase, hyphens, 2–4 words, no spaces
- prefix the issue number when it maps to one: `feat/12-applicant-ranking`
- delete after merge

Examples: `feat/applicant-ranking`, `refactor/similarity-helper`,
`feat/security-csp`, `chore/rebrand-email`, `test/client-vitest-setup`,
`fix/railway-deploy-token`.

## Commits

Short imperative subject (`Add applicant match column`). Body only if it needs
context. Don't bundle unrelated changes.

## Issues

Every non-trivial change tracks to an issue. Labels: `feat` / `fix` / `chore` /
`security` / `ai` / `tests` / `docs` + a priority `P0`–`P3`. Assign yourself when
you start.

Planning docs live in [`docs/`](docs/): [`ROADMAP.md`](docs/ROADMAP.md) and
[`docs/plans/`](docs/plans/). Per-person task lists are in
[`tasks/continuation/`](tasks/continuation/).

## Local setup

```bash
npm install                 # backend deps
cp .env.example .env         # fill in values
npm run dev                  # backend on :5000, Swagger at /api-docs
npm test                     # backend Jest suite

cd client && npm install && npm run dev   # frontend on :5173
```

## Before opening a PR

- `npm test` passes (backend).
- `cd client && npm run lint` is clean.
- New backend routes/behaviour have a test.
- Docs updated if you changed setup, env vars, or the API surface.
