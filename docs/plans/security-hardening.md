# Plan — security hardening (C7)

Three small, mostly independent items. Do the first two together in one PR; the
third (cookie auth) is a separate, larger change.

Current state (`main`):

- `backend/app.js` — `helmet({ contentSecurityPolicy: false })`, CSP is **off**.
- `backend/app.js` — `ALLOWED_ORIGINS` is a **hardcoded array**; a new frontend
  URL needs a code change + redeploy.
- `client/src/services/api.js` — JWT is read from and written to `localStorage`.
  Any XSS on the client can exfiltrate it. (Mitigated somewhat by the Mongo
  blacklist from Z1, but the token is still valid until logout/expiry.)

---

## 1. Turn on a real CSP for the API — effort S

The API serves JSON + Swagger UI at `/api-docs`. A locked-down CSP is easy because
almost nothing needs inline anything, except swagger-ui.

**Approach**

- `app.use(helmet())` with an explicit `contentSecurityPolicy.directives`:
  - `default-src 'self'`
  - `script-src 'self'` (+ whatever swagger-ui-express needs — it bundles its own
    assets; test `/api-docs` after enabling)
  - `style-src 'self' 'unsafe-inline'` (swagger-ui injects styles)
  - `img-src 'self' data:` (swagger-ui logo)
  - `connect-src 'self'`
- If swagger-ui fights the CSP, scope the strict policy to non-docs routes and a
  relaxed one to `/api-docs` — but try the single-policy path first.

**Files:** `backend/app.js`. **Test:** `/api-docs` still renders and "try it out"
still works; add a test asserting `Content-Security-Policy` header is present on a
normal route.

**Acceptance:** CSP header present, `default-src 'self'`, Swagger UI still works.

---

## 2. CORS origins from env — effort S

**Approach**

- `const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)`
- Fallback to the current localhost defaults when the env var is unset (dev
  convenience): `if (!ALLOWED_ORIGINS.length) ALLOWED_ORIGINS.push('http://localhost:5173', 'http://localhost:3000')`.
- Keep the existing origin-callback logic.

**Files:** `backend/app.js`, `.env.example` (add `ALLOWED_ORIGINS=`), `README.md`
env table, deploy env (Render/Railway dashboard).

**Acceptance:** adding a frontend URL is an env change + restart, no code edit.
A request from a non-listed origin is still rejected.

---

## 3. Move JWT off `localStorage` → httpOnly cookie — effort M/L, separate PR

This is the real fix for XSS token theft, but it touches auth end-to-end.

**Backend**

- On login / register / reset-password: also `res.cookie('token', jwt, { httpOnly: true, secure: true, sameSite: 'none', maxAge: <JWT_EXPIRE ms> })` (sameSite `none` + `secure` because the API and client are on different domains — Vercel vs Render/Railway).
- `middleware/auth.js` `protect`: accept the token from `req.cookies.token` as well
  as the `Authorization` header (keep header support for Swagger + Postman).
- `logout`: `res.clearCookie('token')` in addition to blacklisting the `jti`.
- Add `cookie-parser`. CORS already has `credentials: true`.

**Frontend**

- `axios.create({ ..., withCredentials: true })`.
- Stop reading/writing `localStorage.token`; the browser sends the cookie.
- The 401 interceptor still works (server clears the cookie; client redirects).
- `user` object can stay in `localStorage` (not a secret) or move to an in-memory
  context hydrated from a `GET /profile` on load.

**Gotchas**

- Cross-site cookies need `SameSite=None; Secure` and HTTPS on both ends — works
  on Vercel + Render/Railway, breaks on plain `http://localhost` unless you proxy
  the API through Vite's dev server (`server.proxy` in `vite.config.js`). Add the
  proxy so local dev keeps working.
- CSRF: with `SameSite=None` you want a CSRF token or origin check on state-changing
  routes. Simplest: check `Origin`/`Referer` against `ALLOWED_ORIGINS` in a small
  middleware for non-GET requests.

**Files:** `backend/middleware/auth.js`, `backend/controllers/authController.js`,
`backend/app.js`, `client/src/services/api.js`, `client/src/context/AuthContext.jsx`,
`client/vite.config.js`, `.env.example`.

**Acceptance:** no JWT in `localStorage`; auth works in prod (cross-site) and local
dev (via Vite proxy); logout clears the cookie; state-changing routes reject
cross-origin requests without a valid origin.

**Recommendation:** ship 1 + 2 now. Do 3 only if the team wants it — it's the
right call for a public app, but it's a multi-file change with cross-site cookie
footguns, and the Z1 blacklist already limits the blast radius of a stolen token.
