# Ahmed — continuation tasks (CareerLink)

Owner: **@Sanad-Manga** · role: repo mechanics, metadata, docs, coordination, review.

Relevant plans: [`docs/ROADMAP.md`](../../docs/ROADMAP.md) ·
[`docs/DETACH-PLAN.md`](../../docs/DETACH-PLAN.md) · [`DETACH.md`](DETACH.md)

---

## 1. Run the detach — `now`

Follow [`DETACH.md`](DETACH.md) steps 2–4:
- `git remote add careerlink https://github.com/Sanad-Manga/CareerLink.git`
- `git push careerlink --all && git push careerlink --tags`
- Verify 9 contributors + `v1.0` on CareerLink.
- Default branch `main`, branch protection (Test check + 1 review, no direct/force push).

**Done when:** CareerLink has the full history + `v1.0`, protection on, Actions enabled.

## 2. Rebrand — repo metadata + docs — `P0` for the new repo

Branch `chore/rebrand-repo-meta` against CareerLink.

| File | Change |
|------|--------|
| `package.json` | `name` (`giu-nexus` → new), `description`, `repository.url`, `bugs.url`, `homepage` |
| `client/package.json` | `name` is generic (`client`) — leave it |
| `README.md` | new title + intro; add the **History & Attribution** section (draft in `docs/DETACH-PLAN.md`); update Deployment table once Ziad picks a host |
| `docker-compose.yml` | `MONGO_DB_NAME`, db name, container names |
| `.mailmap`, `CONTRIBUTORS` | carry over unchanged |
| `railway.toml` | delete if moving off Railway (coordinate with Ziad) |
| old repo `README.md` | add "Frozen at `v1.0`, continued at Sanad-Manga/CareerLink" note, or archive |

**Acceptance:** `grep -rniE 'giu[- ]?nexus|german international' -- . ':!*.md' ':!docs/*'`
returns nothing in metadata/config; new README explains the lineage and lists all 9
original contributors.

## 3. Coordination — `ongoing`

- Keep [`docs/ROADMAP.md`](../../docs/ROADMAP.md) current as items land.
- Review + merge PRs; nobody merges their own.
- Sequence the workstreams: Ziad's `helmet`/CORS change and Abdelrahman's
  `User.embedding` schema change both touch `backend/app.js` / models — land them
  in separate PRs, review order Ziad → Abdelrahman.
- File GitHub issues in CareerLink for: rebrand (this file), hosting (Ziad),
  security CSP+CORS (Ziad), applicant ranking (Abdelrahman), client tests (shared).

## 4. Client test suite — shared, Ahmed to bootstrap — `P1`

Plan: [`docs/plans/client-test-suite.md`](../../docs/plans/client-test-suite.md).
Branch `chore/client-vitest`. Do the Vitest + RTL **setup** (config, `src/test/setup.js`,
`renderWithProviders`, `npm test` script, CI wiring). Hand the 6 baseline tests to
whoever has slack, or split 2 each.

**Acceptance:** `npm test` in `client/` runs Vitest; CI runs it; setup + helper in place.
