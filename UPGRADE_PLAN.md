# UPGRADE PLAN
Target role(s): SDE + ML/AI Engineer (assumed; not specified) | Time budget: 3–4 weeks (assumed) | Based on audit #1 (2026-10-27)

> **Scope decision (2026-10-27, developer):** make the project proper and secure first. The **ticketing / purchase flow is on hold.** Its items (BUG-01, BUG-02, BUG-03, UPG-01) have moved to "Parked — Ticketing" at the end of this file. Security work that only *reads* ticket data (e.g. the reports IDOR in SEC-03) stays in scope, because it's an authorization fix, not a ticketing change.

## Strategy

StageVerse has impressive breadth: four roles, 22 models, live sync, an LLM patcher. But today the server trusts every caller. The current goal is a **secure, correct base**: every route authenticates *and* authorizes, the real-time layer is authenticated and isolated per show, inputs are validated, failures are loud, and tests plus CI prove it.

On top of that base, two flagship talking points:

1. **Authenticated, room-scoped, server-authoritative live sync** (SDE flagship): socket auth, per-event rooms, one-vote-per-fan enforced by a unique index, with polling reduced from 1 s to a slow reconciliation and measured.
2. **Hybrid LLM + deterministic DMX patcher with an eval set** (AI flagship): the LLM parses intent, an algorithm allocates addresses, and the eval harness reports the schema-valid rate and collision rate before and after.

A third flagship (concurrency-safe ticketing, UPG-01) comes back when ticketing is un-parked.

## Progress (2026-10-27)
Phases 0–5 done; Phase 6 partly done (BUG-10, hygiene, README, proxy rename, /api/health). Branch chain: `phase-0-safety-net` → `phase-1-security` → `phase-2-correctness` → `phase-3-testing-ci` (phases 3–6 continue on it). 173 tests, lint 0 errors, build passes. Details in FIX_LOG.md.
Waiting on the developer: Atlas password rotation; run `npm run eval:patch` (real Gemini calls) to record UPG-03 numbers; pick the deployment target; record the demo; UPG-04 3D homepage discussion. Then re-audit → project-interview-report → project-mock-interview.
Also done beyond the plan: BUG-13–16, artist message/notification scoping, LLM SDK/model upgrade (gemini-3.8-flash), a regression from my own ERR-01 codemod (fixed).

## Phase Overview

| Phase | Goal | Items | Effort | Interview payoff |
|---|---|---|---|---|
| 0 | Safety net | Clean tree, rotate secret, test harness, smoke tests | 1–1.5 days | "I characterised the system before changing it" |
| 1 | Critical security fixes | ERR-01, ARCH-01, SEC-03, SEC-02 + BUG-05, SEC-04 | 4–5 days | Authz design, IDOR, socket auth: the core stories |
| 2 | Correctness & resilience | SEC-05, SEC-06, SEC-07, ERR-02, BUG-04–09, VAL-01, SEC-08, SEC-09 | 3–4 days | Validation, fail-loud, LLM cost protection |
| 3 | Testing & CI | Authz matrix tests, lint to 0 errors, GitHub Actions | 1.5–2 days | Green CI badge; "the build passed but the app crashed" story |
| 4 | Performance (measured) | PERF-01 | 1–1.5 days | Before/after req/s and latency |
| 5 | Interview upgrades | UPG-02, UPG-03 | 4–5 days | Two flagship stories with numbers |
| 6 | Ship & document | DOC-01, BUG-10, hygiene, deploy, diagram | 2 days | Clickable demo, honest README |
| — | **Parked: Ticketing** | BUG-01, BUG-02, BUG-03, UPG-01 | ~3 days when resumed | Overselling / idempotency story |

Total ≈ 16–20 working days, excluding parked work. If time runs short, **do Phases 0–3 plus UPG-02 first**. UPG-03 matters mainly for the ML/AI role.

(No standalone "Architecture" phase: ARCH-01 is done inside Phase 1 because SEC-03 needs it, which is the only kind of refactor that pays for itself here.)

---

## Phase 0 — Safety Net
Goal: be able to change the code and know immediately if the two main flows broke.
Why this order: every later fix needs a baseline and a regression net, and the leaked credential can't wait.
Items:
- [ ] **SEC-01 (do today, before anything else)** — file deleted ✔; **password rotation: developer to confirm**: rotate the Atlas DB user password; delete `temp_update.mjs` — Atlas console, `temp_update.mjs` — S
- [x] Commit or stash the 9 uncommitted files on `deployment`; decide what to do with the untracked `public/*.glb`, `app/test-3d/`, `components/canvas/` (commit, LFS, or ignore). Then `git checkout -b phase-0-safety-net` from a clean tree — S
- [x] Record baseline in `FIX_LOG.md`: build ✅, lint 82 errors / 25 warnings, 0 tests, npm audit 2C/13H/4M — S
- [x] Add `.env.example` with `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (names only) — S
- [x] Set up Vitest + `mongodb-memory-server` (**replica-set mode**, needed for transactions in Phase 1) with a `tests/helpers.js` that builds a `Request` carrying a signed `token` cookie for a given role — `vitest.config.mjs`, `tests/` — M
- [x] Characterization tests that pin **current** behaviour (some will be marked `.fails` / `todo` and flipped to passing as Phase 1 fixes land):
  - auth: signup → login → cookie set; wrong password → 401
  - protected route without cookie returns 500 (documents ERR-01)
  - fan poll vote without cookie succeeds (documents SEC-04)
  - `PUT /api/production/live` without cookie succeeds (documents SEC-02)
  - organizer can read another organizer's reports via `?eventId=` (documents SEC-03)
  - fan can overwrite a setlist (documents SEC-03)
  — `tests/characterization/*.test.js` — M
- [x] Seed script (`scripts/seed.mjs`, reads env) creating one user per role, one event with tiers, one setlist, so the app and tests share fixtures — S
Acceptance criteria:
- The Atlas password is rotated and `temp_update.mjs` no longer exists; `git status` is clean on the new branch.
- `npm test` runs ≥ 8 tests against an in-memory Mongo with no network access.
Verification commands:
- `git status`
- `npm test`
- `git grep -nE "mongodb(\+srv)?://[^'\"]+:[^'\"]+@"` returns nothing
Interview payoff:
- "Before touching anything I wrote characterization tests. Some of them *asserted the bug*, like 'a fan can overwrite an artist's setlist', so when I fixed it, the test flipped from documenting the bug to guarding against it."
Risk / rollback:
- Low; the only new code is test code. If `mongodb-memory-server` binaries won't download on Windows, use a local `mongod` or Docker `mongo:7 --replSet rs0`.

---

## Phase 1 — Critical Security Fixes (all non-ticketing P0 + HIGH-risk P1/P2)
Goal: nobody can act on data they don't own, and nobody can control a live show they aren't part of.
Why this order: ERR-01 and ARCH-01 come first because they create the `withApi` / `lib/authz.js` primitives that SEC-03, SEC-02 and SEC-04 are built on. ERR-01 (a P2) is scheduled here because it's HIGH interview risk and a prerequisite.
Items:
- [x] **ERR-01** `lib/errors.js` (`AuthError`, `ForbiddenError`, `NotFoundError`, `ValidationError`) plus a `withApi(handler)` wrapper mapping them to 401/403/404/400 with a request id; `verifyAuth` uses `jose` and throws `AuthError` — `lib/auth.js`, `lib/errors.js`, `lib/api.js` — S–M
- [x] **ARCH-01** `lib/events.js#resolveEvent(id)` (one rule for numeric vs ObjectId) and `lib/authz.js#requireRole`, `loadEventFor(user, id, {as})` — `lib/` — M
- [x] **SEC-03** Apply authz to every mutating route plus sensitive reads (setlist, polls, declare-results, guestlist/[id], tasks, logistics, reports `eventId`, day-sheet); scope queries by owner; extend `middleware.js` role prefixes — `app/api/**`, `middleware.js` — L
- [x] **SEC-02 + BUG-05** Socket handshake auth (`io.use`, JWT from the cookie); `join` an event room only after an authz check; control events accepted only from the event's artist or crew; `io.to(room).emit`; CORS restricted to your own origin; auth on `PUT /api/production/live` — `pages/api/socket/io.js`, `app/api/production/live/route.js`, clients — M
- [x] **SEC-04** `Vote` model with unique `{pollId,userId}`; vote requires auth and an active poll; server emits the tally after the DB write; ignore client `poll:vote`; remove fake `votes: 12` — `models/Vote.js`, `app/api/fan/poll/route.js`, `LivePollCard.jsx`, production page — M
Acceptance criteria:
- A test matrix shows: a fan gets **403** on setlist POST, poll create/activate, declare-results, another organizer's reports, guest delete, task update; unauthenticated gets **401** (not 500) on all protected routes.
- The owner can still do everything they could before (positive cases in the same matrix).
- Voting twice as the same user leaves the count unchanged and returns 409; voting with no cookie returns 401.
- A socket client without a cookie is rejected at handshake; a socket in room A receives nothing emitted to room B; a fan's socket can't emit `show:start` / `poll:reveal`.
Verification commands:
- `npm test`
- Manual: run a live show as an artist with a crew screen and a fan screen open, plus a second event's crew screen, which must receive nothing
Interview payoff:
- The authorization story: "I found my API authenticated users but didn't authorize them, e.g. a fan could rewrite an artist's setlist. I centralised it into `loadEventFor` and proved it with an authz matrix test."
- Socket auth and rooms: "WebSockets don't go through your HTTP middleware; you have to authenticate the handshake yourself."
Risk / rollback:
- Authz changes can lock legitimate users out of pages they used to reach. The test matrix includes the **positive** cases (the owner can still do X). One commit per item, so each is revertable on its own.
- `app/api/orders/route.js` is **not** touched in this phase (ticketing is parked). It already restricts purchases to the `fan` role.
- **Touches auth and data models, so wait for an explicit "go" before editing (per execute-mode rules).**

---

## Phase 2 — Correctness & Resilience
Goal: remaining user-visible bugs fixed; bad input and failing dependencies produce clear errors, never fake success.
Why this order: these build on Phase 1's `withApi`, `resolveEvent` and authz helpers.
Items:
- [x] **ERR-02** Remove the mock-data fallback from `production/live` GET; UI shows "sync lost, retrying" — `app/api/production/live/route.js`, production page — S
- [x] **BUG-04** Winner computed and persisted server-side at poll end; remove the "Midnight City" fallback — `app/api/fan/poll/route.js`, `models/Poll.js`, `LiveControls.jsx` — S
- [x] **BUG-06** Move hooks above early returns — `LiveControls.jsx`, `PollSelectionModal.jsx` — S
- [x] **BUG-07** Logistics route: import mongoose, use `resolveEvent`, `title`/`city`, auth, remove the `'project-alpha'` magic — `app/api/production/logistics/[id]/route.js` — S
- [x] **BUG-08** Tasks: require and authorize `eventId`, align schema fields and status enum, scope GET — `app/api/production/tasks/route.js`, `models/Task.js` — S
- [x] **BUG-09** Atomic `Counter`-based event short ids — `app/api/events/route.js` — S
- [x] **SEC-05** Restrict setlist GET; lock predictions at show start; de-duplicate scoring; extract `scorePrediction()` as a pure function — `lib/scoring.js`, routes — S–M
- [x] **SEC-06** Auth + role + per-user rate limit + max prompt length on `/api/generate`, `/api/description`, `/api/patch`; auth on venues and fixture-profiles POST — `lib/rateLimit.js`, routes — S–M
- [x] **VAL-01** `zod` schemas for orders, events (create/update whitelist), setlist, polls, predictions, venues, tasks — `lib/schemas/*.js` — M
- [x] **SEC-08** Escape regex input everywhere; exact song match via a normalized indexed field — `lib/escapeRegex.js`, `models/Song.js` — S
- [x] **SEC-09** Role allow-list at signup (document the self-serve trade-off), min password length, login rate limit — `app/api/auth/*` — S
- [x] **SEC-07** `npm audit fix`; bump `next`/`eslint-config-next` to latest 16.x patch; check `xlsx` usage (write-only?) and document or replace — `package.json` — S
- [x] **ERR-03 / BUG-11** Generic client errors; `/api/auth/me` reads the user from the DB — S
Acceptance criteria:
- `npm audit --omit=dev` shows 0 critical; any remaining high is documented with a reachability note.
- Unit tests for `scorePrediction` cover duplicates, order bonus, ties and empty input.
- A test kills the DB mock and asserts `production/live` GET returns non-2xx (no mock data).
- Malformed bodies (missing fields, wrong types, extra fields like `organizerId`) return 400, and extra fields are never persisted.
- A setlist containing a song titled `My Song (Live` saves successfully.
Verification commands:
- `npm test`
- `npm audit --omit=dev`
- `npx next build`
Interview payoff:
- "Fail loud, not fake": the mock-data fallback story.
- "Validation at the boundary with zod; mass assignment was letting an organizer reassign event ownership."
- "I protect the LLM endpoints from cost abuse with auth plus a token-bucket rate limit, and I know it's per-instance."
Risk / rollback:
- Dependency bumps can break the build. Do SEC-07 in its own commit and run the full build and smoke tests right after.

---

## Phase 3 — Testing & CI
Goal: every push proves the critical paths still work.
Why this order: by now the critical paths are fixed and stable enough to lock in.
Items:
- [x] **TEST-01** Fill out the suite: authz matrix (role × route × own/other), order concurrency, vote dedupe, socket room isolation (using `socket.io-client` against an in-test server), scoring, LLM routes with a **mocked** Gemini client — `tests/` — M
- [x] Fix the remaining ESLint **errors** to 0 (unescaped entities, set-state-in-effect, static-components, purity); warnings may remain — `app/`, `components/` — M
- [x] GitHub Actions `ci.yml`: `npm ci` → `npm run lint` → `npm test` → `npm run build` on push and PR, with dummy env values; add a README badge — `.github/workflows/ci.yml` — S
Acceptance criteria:
- `npm test` has ≥ 40 meaningful tests (assertions on DB state and status codes, not just `200`) and runs in < 60 s.
- `npx eslint .` reports **0 errors**.
- CI is green on the PR.
Verification commands:
- `npm test -- --coverage` (report the coverage of `app/api/orders`, `app/api/fan/poll`, `lib/authz.js`, `lib/scoring.js`; don't chase an overall percentage)
- `npx eslint .`
Interview payoff:
- "`next build` passed while the checkout crashed. That's why CI runs lint with `jsx-no-undef` as an error, plus route-level tests against an in-memory Mongo."
Risk / rollback:
- Lint fixes in `set-state-in-effect` can change render behaviour. Verify the affected screens manually.

---

## Phase 4 — Performance (measure first)
Goal: replace 1-second polling with server-authoritative push, and prove the improvement.
Why this order: needs Phase 1's authenticated rooms, and Phase 3's tests catch regressions.
Items:
- [x] **PERF-01 (measure)** Script that opens N simulated crew clients (Node `fetch` loop or k6) and records req/s and p50/p95 for `/api/production/live`; record the "before" numbers in `FIX_LOG.md` — `scripts/bench-live.mjs` — S
- [x] **PERF-01 (fix)** The server persists show state then emits the full snapshot to the room; the client fetches once on connect/reconnect (or uses Socket.IO connection-state recovery) plus a 20 s reconciliation poll; lean queries with `.lean()` and projected fields; index `Setlist.eventId` and `Poll.{eventId,isActive}` — production page, live route, models — M
Acceptance criteria:
- With 10 crew clients open, DB-hitting requests/sec drop from ~30 (before; measure it) to ≤ 1. Status changes reach clients in < 500 ms (log the emit-to-receive delta).
- Killing and restarting the server: clients reconnect and show the correct state within 5 s.
Verification commands:
- `node scripts/bench-live.mjs --clients 10 --seconds 60` (before and after)
Interview payoff:
- "Two sources of truth were fighting. I made the server authoritative, used push for latency and a slow poll for reconciliation. Here are the before/after numbers."
Risk / rollback:
- Reconnection edge cases. Keep the poll interval configurable so it can be dialled back to 1 s if needed.

---

## Phase 5 — Interview Upgrades (flagship features & evidence)
Goal: turn the fixed flows into three defensible stories with numbers.
Why this order: each one builds on a fixed and tested base from Phases 1–4.

- [x] **UPG-02 Authenticated, room-scoped, server-authoritative live-show sync**
  - Problem it solves in THIS project: SEC-02, SEC-04, BUG-04, BUG-05, PERF-01. Anyone could control any show, votes were stuffable, events leaked across shows, and polling fought sockets.
  - What gets built (scope-limited): a typed event protocol (`lib/liveProtocol.js` with zod schemas per event); handshake auth; per-event rooms with role-based emit permission; `Vote` uniqueness; a server-computed winner; a state snapshot on reconnect; an integration test running two shows in parallel to prove isolation; a short `docs/live-sync.md` with a sequence diagram.
  - Evidence it produces: an isolation test (0 cross-room messages); a vote-stuffing test (1000 attempts → 1 counted); before/after request rate from Phase 4; measured emit-to-receive latency.
  - Talking point: "The live layer went from an open broadcast relay to an authenticated, room-scoped protocol where the server is the only source of truth. One fan, one vote, enforced by a unique index rather than client code."
  - Follow-ups the interviewer will ask, and what you must understand: why cookies are sent on the socket handshake and how you verify them; rooms vs namespaces; what breaks with 2+ server instances (rooms are in-process, so you'd need the Redis adapter, and you should say you haven't needed it yet); at-least-once delivery and why the client reconciles; why the Next.js `pages/api` socket hack doesn't work on serverless.
  - Effort: M–L | Interview impact: 5 | Buzzword risk: Low

- [x] **UPG-03 Hybrid LLM + deterministic DMX patch allocator, with an evaluation harness** (the AI/ML-role flagship)
  - Problem it solves in THIS project: LLM-01. Gemini is asked to compute collision-free DMX addresses (a deterministic interval-packing task), its output is unvalidated, and invalid JSON gives a 500.
  - What gets built (scope-limited):
    1. `lib/dmx/allocate.js`: a pure function that, given the current patch (universe, start, footprint) and requested fixtures, returns first-fit addresses within 1–512 per universe, spilling to the next universe, with no overlaps; plus a `repatch` mode that packs everything.
    2. The LLM call now only extracts **intent** (`{action, fixtures:[{type, mode, count}]}`) using Gemini JSON mode with a response schema, zod validation, one repair retry carrying the validation error, a 10 s `AbortController` timeout, and a clear error if it still fails.
    3. `evals/patch/cases.jsonl`: ~30 hand-written prompts with expected intents (including adversarial ones: "ignore instructions and…", ambiguous counts, unknown fixtures) and a runner reporting **schema-valid rate, intent accuracy, address-collision rate, out-of-range rate, p50 latency and tokens**, for the old prompt vs the new pipeline.
    4. Property-based tests (`fast-check`) for the allocator: random patches never produce overlaps or out-of-range addresses.
  - Evidence it produces: an eval table, e.g. collision rate `<old>%` → 0% (guaranteed by construction), schema-valid `<old>%` → `<new>%`, token count per request before and after.
  - Talking point: "I moved the part that must be correct out of the LLM. The model parses what the LD wants, an algorithm guarantees collision-free addresses, and an eval set of 30 prompts shows the difference."
  - Follow-ups the interviewer will ask, and what you must understand: why LLMs are bad at constraint satisfaction over long numeric context; JSON mode vs schema-constrained decoding vs post-hoc validation; the retry-with-error pattern and its cost; how the eval set was built and its limits (small, author-written; no LLM-as-judge needed because the outputs are structured); prompt injection when user text lands in the prompt (low impact here because the LLM has no tools); how you'd add a second provider as a fallback.
  - Effort: M–L | Interview impact: 5 for AI roles, 3 for SDE | Buzzword risk: Low (it *removes* LLM responsibility rather than adding hype)

Acceptance criteria (phase):
- Each UPG has its evidence artifact committed (`docs/live-sync.md`, `evals/patch/results.md`) containing **measured** numbers.
Verification commands:
- `npm test`
- `node evals/patch/run.mjs` (uses the real Gemini key; ~30 calls, a few cents; run on demand, not in CI)
Interview payoff:
- Two 2-minute stories, each with a problem, an investigation, a decision, a trade-off and a number.
Risk / rollback:
- UPG-03 changes the patch API response shape. Keep `{action, patch}` compatible so `PatchingSidebar.jsx` and `StudioSidebar.jsx` keep working.

---

## Phase 6 — Ship & Document
Goal: a recruiter can click a live demo and a reviewer can understand the system in 5 minutes.
Items:
- [x] **BUG-10** Delete the empty `python-service/`, `app/api/sentiment`, `app/api/wizard/generate` and `lib/gemini.js`; label hardcoded analysis reviews as sample data (or remove the "engine" claim); remove the hardcoded `bpm: 128` — S
- [x] Hygiene bundle: remove debug scripts and log, unused deps (`react-router-dom`, one of the two DnD libs, `jsonwebtoken`), console noise; rename `middleware.js` → `proxy.js`; run Prettier once — S–M
- [ ] **Deployment decision**: Socket.IO needs a long-running Node process. Either deploy the whole app on a single always-on host (Render/Railway/Fly with a custom `server.js` running Next and Socket.IO), or keep Next on Vercel and run the socket server separately. Document the choice and add `GET /api/health` (DB ping, no secrets) — M
- [x] **DOC-01** README: what it is, the four roles, an architecture diagram (Next app ⇄ Mongo, Socket.IO rooms, Gemini), setup in < 10 minutes with `.env.example` and `scripts/seed.mjs`, demo accounts, a design decisions section (cookie JWT, server-authoritative sync, LLM intent + deterministic allocator), and an honest **known limitations** section (no real payments, single-instance sockets, self-serve roles) — M
- [ ] **UPG-04 "The Show": a scroll-driven 3D concert homepage that runs on integrated graphics** (full design: `C:\Users\Intel\.claude\plans\yes-add-that-to-linear-orbit.md`)
  - Problem it solves in THIS project: the `/test-3d` prototype (`components/canvas/StageRig.jsx`) uses ~89 real dynamic lights (78 drei volumetric SpotLights + 11 pointLights), 3 per-frame `RenderTexture` scenes, ~500 draw calls (estimate) and full-res Bloom. It's unusable on the dev laptop (Intel Iris Xe). The gate/tunnel sections are dropped. `public/textures/env.exr` (70 MB) is unreferenced.
  - What gets built (scope-limited): `components/home/stage/`. Beams are a single `InstancedMesh` of additive shader cones animated in the vertex shader (0 real spotlights). Fixtures are instanced from `low_moving_head.glb`; the truss is one merged geometry; the LED wall is a `CanvasTexture` showing real upcoming events. Quality tiers 0/1/2 (`detect-gpu` + `PerformanceMonitor`, `?tier=` override; tier 0 = poster + existing `ConcertLights`, also used for reduced-motion). A 400vh sticky section driven by GSAP `ScrollTrigger` runs a data-driven **cue stack** (`cues.js`): house lights down → cues 1–3 → build (per-role shots) → the drop → "you call the encore" colour pick. The render loop pauses off-screen; the HTML headline keeps LCP fast. Afterwards, delete the gate/tunnel/unused components and ~76 MB of unused assets.
  - Evidence it produces: before/after table on the Intel Iris Xe (prod build): real lights 89 → ≤ 2, draw calls ~500 → ≤ 40, FPS `<before>` → ≥ 55, homepage LCP `<baseline>` → no worse, 3D assets ≤ 3 MB in a lazy chunk.
  - Talking point: "I made a 3D concert render at 60 FPS on integrated graphics by faking volumetric light with instanced additive cones animated in a vertex shader, with adaptive quality tiers and a reduced-motion fallback. Scrolling the homepage literally runs a lighting cue stack, the same concept the production crew uses in the app."
  - Follow-ups the interviewer will ask, and what you must understand: forward-rendering cost (pixels × lights); draw calls vs fill rate/overdraw; why instancing helps; vertex-shader animation vs per-frame JS; additive blending and `depthWrite:false`; why ScrollTrigger plus a ref instead of React state; how LCP is protected with a lazy canvas; accessibility (`prefers-reduced-motion`).
  - Effort: L (~4–6 days) | Interview impact: 4 (frontend/SDE), 2 (ML) | Buzzword risk: Low (backed by measured numbers)
  - Note: safe to build in parallel with security phases (public page, no auth or data writes)
- [ ] 60–90 s demo GIF or video: run a live show with an encore vote across three browser windows (artist, crew, fan) — S
- [ ] Re-run `project-audit-upgrade` (re-audit), then `project-interview-report`, then `project-mock-interview` — S
Acceptance criteria:
- A fresh clone gets to a running app with seed data in ≤ 10 minutes following only the README.
- The live demo URL works, and `/api/health` returns 200.
Verification commands:
- Fresh clone in a temp dir → follow README → `npm run dev`
- `curl https://<host>/api/health`
Interview payoff:
- A clickable demo plus a README that names its own limitations, which reads as maturity.
Risk / rollback:
- Free-tier cold starts: mention them before a live demo.

---

## Parked — Ticketing (on hold by developer decision, 2026-10-27)

Not scheduled. Resume as its own phase when you decide to. Until then, **don't claim in interviews that ticket purchase works** (see audit §7).

- [ ] **BUG-01** Import missing lucide icons in `TicketSelection.jsx` (and `CreateShowModal.jsx`, which isn't ticketing; fix it in Phase 3's lint cleanup) — S
- [ ] **BUG-02 + BUG-03** Validate `quantity` (int 1–10); atomic conditional `$inc` on the tier; create the Order **and** `quantity` Ticket docs (unique `qrCode`) in one Mongo transaction (needs a replica set; Atlas has one, and local tests need `mongodb-memory-server` in replSet mode) — `app/api/orders/route.js`, `models/Ticket.js` — M
- [ ] **UPG-01 Concurrency-safe, idempotent ticket checkout with a load test**
  - Problem it solves: BUG-03 (oversell, negative quantity, non-atomic writes) and client retries creating duplicate orders.
  - What gets built: `Idempotency-Key` on `POST /api/orders` (unique index plus cached response); a script firing N concurrent buyers at a tier of capacity C, run against the old and new code.
  - Evidence: oversold tickets before vs after (`<before>` → 0), duplicate orders on retry, p95 checkout latency.
  - Follow-ups to understand: why `findOne`+`save` races; single-document atomicity; transaction guarantees and costs; idempotency vs unique constraints; reserve → pay → confirm with real payments.
  - Effort: M | Interview impact: 5 | Buzzword risk: Low
Acceptance criteria when resumed:
- 20 concurrent purchases against 5 remaining seats: exactly 5 succeed, `sold === capacity`, Ticket count === Order quantity sum.
- Negative, zero, string and float quantities return 400; a purchased ticket appears under `/ticket`.

## Upgrades I'm Deliberately NOT Recommending

| Idea | Why not for this project |
|---|---|
| Rebuild the empty Python sentiment microservice | There's no real review data (reviews are hardcoded), so you'd be training on nothing and couldn't defend the metrics. A second service and language adds deployment complexity for a feature with no users. If you want an ML story, UPG-03's eval harness is more honest and more relevant. |
| Redis adapter / horizontal scaling for Socket.IO | You run one instance. Adding Redis without a measured need invites "why?" with no answer. Say instead: "rooms are in-process; with >1 instance I'd add the Redis adapter, and here's what changes." |
| Microservices / Kubernetes | A single Next.js app with one DB is the right shape for this scale. Splitting it creates distributed-transaction problems that would make BUG-03 harder, not easier. |
| Real payment integration (Stripe) as a flagship | Tempting, but it adds webhooks, refunds and holds before inventory is even atomic. Fine as a later Stripe **test-mode** addition once UPG-01 is done; mention the reserve → pay → confirm design instead. |
| Vector DB / RAG ("AI event recommendations") | There's no retrieval problem in this codebase. Mongo filters on genre and city already solve discovery. |
| Full TypeScript migration | 246 files of JS; weeks of churn with little interview signal. Zod at the API boundary (VAL-01) gets most of the safety where it matters. |
| Expanding the untracked 3D stage visualizer (`app/test-3d`, `components/canvas`) | Visually impressive but low engineering signal, and the GLB assets bloat the repo. Polish it as a demo garnish only after Phases 1–3. |
| Fine-tuning a model for DMX patching | No dataset, no eval baseline. The deterministic allocator solves the correctness problem completely. |
| Chasing 100% test coverage | Spend tests on authz, inventory, voting and scoring; UI components give little value per test here. |

## Resume Bullets (write only AFTER the phase is done — templates)

Fill the `<placeholders>` only with numbers you actually measured. Never guess.

- Built StageVerse, a multi-role live-event platform (Next.js, MongoDB, Socket.IO) serving fans, artists, organizers and production crews across `<n>` workflows.
- *(Only after the parked ticketing work is done)* Eliminated ticket overselling by replacing a read-modify-write with conditional atomic updates and MongoDB transactions; a load test with `<N>` concurrent buyers went from `<X>` oversold tickets to 0.
- Secured the real-time show-control layer with handshake authentication, per-event rooms and server-side role checks, and enforced one-vote-per-fan with a unique index (`<1000>` stuffing attempts → 1 counted).
- Replaced 1 s polling with server-authoritative push plus reconciliation, cutting DB requests from `<before>`/s to `<after>`/s with `<n>` concurrent crew screens at `<latency>` ms p95 update latency.
- Redesigned an LLM-driven DMX patching feature so the model extracts intent (schema-validated with repair retry) and a deterministic allocator assigns addresses; on a `<30>`-case eval set, address collisions went from `<x>%` to 0% and schema-valid responses from `<y>%` to `<z>%`.
- Introduced centralised authorization and a `<n>`-test suite (Vitest + in-memory MongoDB) with CI, closing `<n>` IDOR vulnerabilities found in a self-audit.
