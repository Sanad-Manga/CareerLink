# Plan — hosting migration (backend)

## Problem

The `Deploy to Railway` CI job fails on every push to `main`:

```
Indexing...
Uploading...
Your trial has expired. Please select a plan to continue using Railway.
##[error]Process completed with exit code 1
```

`RAILWAY_TOKEN` still authenticates (the upload starts) — this is purely a billing
state on the Railway account, not a config or secret problem. The backend is
**not currently auto-deploying**. Frontend (Vercel) and DB (MongoDB Atlas) are
unaffected.

Side effect: every `main` CI run shows red even though `Test` and `Lint` pass,
because the deploy job is part of the same workflow.

## Immediate mitigation (do now, 5 min)

Stop `main` CI going red for a known-external reason. In `.github/workflows/ci.yml`,
either:

- add `continue-on-error: true` to the `deploy` job, **or**
- comment the `deploy` job out until a host is chosen.

Prefer `continue-on-error: true` — it still runs and surfaces the failure without
failing the run. Revert once a working host is wired.

## Host options

| Option | Cost | Cold starts | Notes |
|--------|------|-------------|-------|
| **Railway Hobby** | ~$5/mo | none | Zero migration — just add a plan. Keep the existing workflow + secrets. |
| **Render** (free web service) | $0 | ~30–60s after 15 min idle | Free tier fine for a student/demo project. New `render.yaml` + deploy hook. |
| **Fly.io** | $0 within free allowance | minimal (scale-to-zero optional) | `fly.toml` + `flyctl deploy` in CI; slightly more setup. |
| **Vercel serverless** (move API alongside client) | $0 | per-invocation | Bigger change — Express needs a serverless adapter; not recommended mid-stream. |

## Recommendation

- **If anyone will pay ~$5/mo:** Railway Hobby. No migration, no workflow change.
- **Otherwise:** Render free tier. Accept cold starts; they only hit the first
  request after idle and this app has no uptime SLA.

## Work if moving to Render

1. `render.yaml` at repo root: web service, `npm ci`, `npm start`, health check `/`,
   env vars mapped from Render dashboard (`MONGO_URI`, `JWT_SECRET`, `HF_TOKEN`,
   `EMAIL_*`, `CLOUDINARY_*`, `SEED_ADMIN_*` not needed at runtime).
2. `.github/workflows/ci.yml` — replace the `deploy` job: either drop it and use
   Render's native auto-deploy-on-push, or `curl` the Render deploy hook.
3. Remove `railway.toml`, `RAILWAY_*` secrets.
4. Update `backend/config/swagger.js` `servers[].url` to the Render URL.
5. Update `README.md` Deployment table.
6. Update `client` `VITE_API_URL` (Vercel env) to the new backend URL.

## Acceptance

- `main` CI is green (deploy succeeds, or is intentionally `continue-on-error`
  with a tracked follow-up).
- A push to `main` results in a live updated backend within a few minutes.
- Swagger `servers` and the README point at the real URL.

## Note for the detach

The [`DETACH-PLAN.md`](../DETACH-PLAN.md) rebrand step already re-does deploy
config for the new repo. Decide the host **before** the detach so it's set up once.
