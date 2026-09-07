# Detach & rebrand plan (issue #90 / C6)

Move the project off the university repo into a standalone, rebranded repository
**with the full commit history preserved** and every original contributor still
attributed.

---

## Status

| Step | State |
|------|-------|
| Ahmed — CI + branch protection (#86), seed creds (C1), test refresh (#87), dead code (#89), lint gate (#92), README (#88), recommend-test fix (#103) | done — merged |
| Ziad — Z3 OTP expiry, Z6 email normalization, Z7 dead admin secret (#96) | done — merged |
| Ziad — Z1 Mongo-backed JWT blacklist, Z2 Mongo rate limiter, Z4 per-route AI limits, Z5 input sanitization, Z8 admin-delete safety (#102) | done — merged |
| Abdelrahman — A1–A8: embedding cache, honest match %, HF provider + dim validation, response shape, skill-doc reconcile, category enum, mass-assignment allowlist, job-post cleanup (#100, #101) | done — merged |
| **Tag `v1.0`** on `803c5bf` (the #102 merge) | **done — pushed 2026-09-07** |
| `.mailmap` (identity consolidation) | done — in this PR |
| `CONTRIBUTORS` file | done — in this PR |
| Get informal OK from the other 6 original authors | **todo — gates going public** |
| Check the program's academic-integrity / IP policy | **todo — gates going public** |
| Create the new repo + push history | todo — run the migration steps below |
| Rebrand pass in the new repo | todo |
| History & Attribution section in the new README | todo (text drafted below) |

> **`v1.0` is tagged** (annotated, on `803c5bf`). All P0/P1 audit work is in.
> An earlier attempt had cut it on the #87 merge and was removed — this one sits
> on the real last commit before detach. What's left for #90 is the migration
> itself, which is gated on the two "going public" rows above.

---

## Gates (do these before anything public)

1. **Informal sign-off** from Mohamed Walid, Mohamed Nazmy, Ali Issa, Baraa
   Tantawy, Eyad Nader, Mostafa Ayman — a "yes, fine to continue this under a new
   name with my commits kept" in writing (chat message is enough). We are not
   rewriting authorship, so this is courtesy + IP hygiene, not a legal
   requirement, but get it anyway.
2. **Academic-integrity / IP check** — confirm the GIU program's policy allows
   continuing a submitted group project publicly. If the coursework submission
   assigns IP to the university or the group, note who signed off.

Until both are done, keep the new repo **private**.

3. **All P0/P1 work merged** — done. `v1.0` (on `803c5bf`) is the frozen
   university version; every filed audit issue plus the three unfiled items
   (Z1, Z5, A7) are in.

---

## Why not "Fork"

GitHub's Fork button de-emphasises the repo on profiles, doesn't count
contributions toward the new owner, keeps an upstream tether, and makes the new
repo look like a derivative rather than the continuation. Instead: create a fresh
empty repo and push the existing history into it.

---

## Migration steps

```bash
# 0. Start from a clean, up-to-date clone of the university repo
git clone https://github.com/Sanad-Manga/GIU-Nexus.git nexus-continuation
cd nexus-continuation

# 1. Create the new EMPTY repo on GitHub first (no README/licence/gitignore),
#    private for now. Call the remote `new`.
git remote add new https://github.com/<owner>/<new-repo>.git

# 2. Push every branch and tag, history intact, no author rewrite
git push new --all
git push new --tags

# 3. On GitHub, set the new repo's default branch to `main`.

# 4. Verify history + attribution came across
git -C . log --oneline | wc -l          # same commit count as the source
git shortlog -sne --no-merges --all     # 9 humans (with .mailmap applied), + bots
git show v1.0 --no-patch                # tag is present

# 5. Point local `origin` at the new repo, drop the old remote
git remote remove origin
git remote rename new origin
```

Do **not** use `git filter-repo` / `filter-branch` / author rewriting. The point
is that the original authorship is untouched and verifiable.

`.mailmap` (already committed) makes `git shortlog` and GitHub's contributor
graph show one entry per person despite the ~17 name/email variants in history.

---

## Rebrand checklist (in the new repo, after migration)

Pick the new product name first, then sweep these. `grep -rniE 'giu[- ]?nexus|giu\.edu|german international'` catches most of it.

**Backend**
- `backend/config/swagger.js` — `title: 'GIU Nexus API'`, `customSiteTitle: 'GIU Nexus API Docs'`, the two `servers[].url` (Railway/prod URLs)
- `backend/services/emailService.js` — `from: '"GIU Nexus" <...>'` (x2), both `subject:` lines, footer text "GIU Nexus · German International University" / "AI-Powered Career Platform", the `GN` logo badge markup
- `backend/app.js` — `ALLOWED_ORIGINS` (the `giu-nexus-beta.vercel.app` entry) → move to an `ALLOWED_ORIGINS` env var while you're here (that's C7, but this is the natural moment)
- `.env.example` / `.env` — `SEED_ADMIN_EMAIL` example domain, `EMAIL_*` sender identity

**Frontend**
- `client/index.html` — `<title>`
- `client/src/**` — grep for "GIU", "Nexus", logo/wordmark components, footer, page `<title>`s, any hardcoded API base URL
- `client/vercel.json`, favicon / assets under `client/public/`

**Repo metadata**
- `package.json` — `name` (`giu-nexus`), `description`, `repository.url`, `bugs.url`, `homepage`
- `client/package.json` — `name` is generic (`client`), leave it
- `README.md` — full rewrite of the header; keep the feature/API content
- `docker-compose.yml` — `MONGO_DB_NAME` / db name `giu-nexus`, container names
- `railway.toml`, deploy config, GitHub Actions secrets on the new repo (Railway token/service IDs, Vercel)
- `postman/GIU-Nexus.postman_collection.json` + `.postman_environment.json` — collection name, `baseUrl`

**Do not touch**
- Commit author names/emails (preserve history)
- The `v1.0` tag on the old repo
- `.mailmap` — carry it over as-is

---

## README "History & Attribution" section (draft for the new repo)

> ## History & Attribution
>
> This project began in 2025–2026 as **GIU Nexus**, a nine-person university
> project at the German International University. That version is frozen at the
> [`v1.0`](https://github.com/Sanad-Manga/GIU-Nexus/releases/tag/v1.0) tag of the
> original repository.
>
> Development has continued since September 2026 under the name **&lt;new name&gt;**,
> maintained by Ahmed Sanad, Ziad Mohsen, and Abdelrahman ElGabarty. The full
> commit history from the original project is preserved here — see
> [`CONTRIBUTORS`](CONTRIBUTORS) for everyone who built v1.0.

---

## Post-migration cleanup (new repo)

- Re-add CI secrets (Railway, Vercel) and re-enable branch protection on `main`
  (mirror the old repo: require the `Test` check + 1 review).
- Update deployment targets (new Railway project / Vercel project) and the
  swagger `servers` URLs to match. Note: the **Deploy to Railway** job is
  currently failing on the old repo (exit 1 — stale token/service config); set
  it up fresh rather than copying the broken secrets.
- Archive or add a pointer note to `Sanad-Manga/GIU-Nexus` once the new repo is
  public, so the old one isn't mistaken for active.
- Carry over `.dockerignore` and the `.gitignore` rules (both already exclude
  `client/dist`, `node_modules`, `.env`).
