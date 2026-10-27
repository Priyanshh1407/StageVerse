# FIX LOG

Debugging and upgrade stories, recorded as they happen. Anything marked `<developer to fill>` needs your own words.

## Baseline (2026-10-27, before any fixes)

| Check | Command | Result |
|---|---|---|
| Build | `npx next build` | ✅ exit 0 (99 s) |
| Lint | `npx eslint .` | ❌ 82 errors, 25 warnings |
| Tests | — | 0 tests |
| Dependency audit | `npm audit --omit=dev` | ❌ 19 vulns (2 critical, 13 high, 4 moderate) |
| Secrets | `git log --all -S "mongodb+srv"` | none in history; one untracked file with live DB credentials (SEC-01) |

---

### SEC-01 — Hardcoded MongoDB credentials (2026-10-27, no commit: the file was never tracked)
Situation: a one-off maintenance script (`temp_update.mjs`) sat in the repo root, untracked.
Symptom: found during the audit; the script called `mongoose.connect()` with the full Atlas connection string, password included.
Investigation: `git log --all -- temp_update.mjs` and `git log --all -S "mongodb+srv"` showed it had never been committed. `.gitignore` didn't cover it, and the history showed a `git add .` habit, so the next commit would have published it.
Root cause: credentials pasted inline in a throwaway script instead of read from `process.env`.
Fix: deleted the file. Seeding and maintenance now live in `scripts/seed.mjs`, which reads `MONGODB_URI` from `.env.local` and refuses to run without `--yes`. **Password rotation in Atlas: `<developer to confirm done>`.**
Verification: `git grep -nE "mongodb(\+srv)?://[^'\"]+:[^'\"]+@"` returns nothing.
Trade-off / what I'd do at larger scale: a pre-commit secret scanner (gitleaks) and a secrets manager instead of `.env` files.
Interview version: "During a self-audit I found a maintenance script with my database password inline. It had never been pushed, but it was one `git add .` away. I deleted it, rotated the password anyway since it had been sitting in plaintext, and moved scripts to read env vars with a confirmation flag so they can't hit the wrong database by accident."

### TEST-01 (part 1) — Test harness and characterization tests (2026-10-27)
Situation: 0 tests. `next build` passed even though the ticket widget crashed at runtime (BUG-01), so the build alone was no safety net.
Investigation: route handlers depend on two things that don't exist outside Next: `lib/db.js` reads `MONGODB_URI` at import time, and `lib/auth.js` calls `cookies()` from `next/headers`, which only works inside a real request.
Fix: Vitest plus `mongodb-memory-server` running a **single-node replica set** (so transactions work later). `tests/setup.js` sets env vars before any route is imported and mocks `next/headers` to read the cookie of the request built by `tests/helpers.js`. Handlers are called directly with a `NextRequest`, so there's no HTTP server and no network.
Characterization: tests that pin a known bug assert the *correct* behaviour and are marked `it.fails`. They pass while the bug exists and flip to `it` when it's fixed. Pinned: ERR-01 (401 vs 500), SEC-02 (unauthenticated live control), SEC-03 (fan overwrites setlist; cross-organizer reports), SEC-04 (unauthenticated voting).
Verification: `npm test`: 8 passing (4 of them pinned bugs).
Interview version: "Before changing anything I wrote characterization tests. Some of them asserted the bug, like 'a fan can overwrite an artist's setlist'. When I fixed it, the test flipped from documenting the bug to guarding against it."
