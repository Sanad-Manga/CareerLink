# Plan — client test suite

## Problem

`client/` has **zero tests**. `client/package.json` scripts are `dev` / `build` /
`lint` / `preview` only. The `Lint (client)` CI job is the only client gate, and it
only catches static issues — nothing verifies that a component renders, that the
auth context behaves, or that the API layer attaches the token.

Backend has 71 Jest tests; the client has none. Any refactor of the React code
(e.g. the `exhaustive-deps` cleanup, or a move to cookie auth) is unguarded.

## Approach — Vitest + React Testing Library

Vitest matches the existing Vite toolchain (shared config, fast, Jest-compatible
API). No webpack/Jest transform config needed.

### Setup (~half a day)

1. Dev deps: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`,
   `@testing-library/user-event`, `jsdom`.
2. `client/vite.config.js` — add a `test` block: `environment: 'jsdom'`,
   `setupFiles: './src/test/setup.js'`, `globals: true`.
3. `client/src/test/setup.js` — `import '@testing-library/jest-dom'`; stub
   `matchMedia` / `localStorage` if needed.
4. `client/package.json` — `"test": "vitest run"`, `"test:watch": "vitest"`.
5. `.github/workflows/ci.yml` — add a `npm test` step to the `Lint (client)` job
   (rename it `Client`), or a new job. Keep it blocking once there's a baseline.

### First tests to write (priority order)

| Target | Why | What to assert |
|--------|-----|----------------|
| `services/api.js` | The token/401 plumbing everything depends on | request interceptor adds `Authorization` when `localStorage.token` is set; 401 response clears storage + redirects |
| `context/AuthContext.jsx` | Central auth state | login sets user; logout clears; `useAuth` throws outside provider (or returns null — match impl) |
| `pages/ForgotPasswordPage.jsx` | Multi-step flow with `localStorage` prefill | renders email step; prefills from `localStorage.resetEmail`; advances to OTP step on submit (mock `api`) |
| `components/SaveJobButton.jsx` | Optimistic update + rollback | toggles saved state on click; rolls back when `api.post` rejects |
| `components/JobForm.jsx` | Validation + unsaved-changes guard | required-field validation; `onCancel` confirm when dirty |
| A route smoke test | Catch import/render crashes | render `<App>` inside `MemoryRouter` at `/`, `/jobs`, `/login` — no throw |

Mock `../services/api` with `vi.mock`. Wrap components needing router/context in a
small `renderWithProviders` helper.

## Effort

- Setup: ~0.5 day.
- The 6 tests above: ~1 day.
- Ongoing: new components/pages ship with a test (add to the PR checklist).

## Acceptance

- `npm test` in `client/` runs Vitest and passes.
- CI runs it (blocking).
- `renderWithProviders` helper + `src/test/setup.js` in place.
- The 6 baseline tests above exist and pass.

## Sequencing

Do this alongside the next AI feature (AI-1) so that feature ships with client
tests from day one, and so the cookie-auth change (security plan item 3) has a
safety net.
