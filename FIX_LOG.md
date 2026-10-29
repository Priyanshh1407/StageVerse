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

---

## Phase 1 — Critical security fixes (2026-10-27, branch `phase-1-security`)

### DX — "Code hidden inside comments" that wasn't (2026-10-27, commit f9f89ac)
Situation: while scripting the ERR-01 changes, `grep` and `sed` showed lines like `const mode = ...; // 'organizer' or null    if (mode === 'organizer') {`, which looked as if real code sat inside `//` comments. 17 places, including the public events listing and the prediction scoring.
Investigation: before "fixing" anything, I checked how a JS parser sees one of them. `node --check` parsed the file fine, and `cat -A` showed the "glued" statements were separated by bare `\r` characters. The ECMAScript spec treats a lone CR as a line terminator, so the comment ends there and the code runs. Text tools (grep, sed, my own scripts) only split on `\n`, so to them it looked like one line.
Root cause: an earlier automated pass left 730 lone CRs in 130 files. Not a runtime bug, but every text tool misread these files, which made code review and scripted edits unreliable.
Fix: normalized lone CRs to LF in a separate, behaviour-neutral commit. Verified with an empty word-level diff and identical lint results (82 errors / 25 warnings before and after). Then re-ran the codemods on the clean files.
Interview version: "My tooling told me 17 lines of code were commented out, including the public event listing. Instead of trusting grep, I asked the parser: the file parsed fine, and `cat -A` showed bare carriage returns, which JavaScript treats as newlines but grep doesn't. So it wasn't a bug, but it was a trap for every future edit, so I normalized it in an isolated commit and proved it was behaviour-neutral with an empty word diff."

### ERR-01 — Auth failures returned 500 instead of 401 (2026-10-27, commit 428e1de)
Situation: an expired session made every protected API call answer `500 Server Error`.
Symptom: the characterization test "protected route without a cookie returns 401" got 500.
Investigation: `lib/auth.js#verifyAuth` threw a plain `Error`; each route's generic `catch` turned it into a 500. The ~35 `if (!user) return 401` checks after it could never run, because the function never returned null.
Root cause: the error *type* carried no meaning, so the catch blocks couldn't tell "not logged in" from "database down".
Fix: `lib/errors.js` (typed `AuthError`/`ForbiddenError`/`NotFoundError`/`ValidationError`/`ConflictError`) and `lib/api.js#apiError()`, which maps them to status codes and turns anything unknown into a generic 500 with a request id (internals are logged, never returned). A codemod rewrote 51 route `catch` blocks and removed the dead checks. `verifyAuth` uses `jose` (one JWT library for edge middleware and Node), and login signs with it too. The parked ticketing routes were left untouched.
Verification: test flipped from `it.fails` to `it`; new tests for a garbage token, a token signed with another secret, a missing event (404 instead of a TypeError 500), and that a 500 never leaks the error message.
Interview version: "Unauthenticated calls returned 500, which hid real outages in the noise and made the client unable to say 'log in again'. The cause was an untyped throw caught by a generic catch, so a whole layer of 401 checks was dead code. I introduced typed HTTP errors and one mapper, and a codemod applied it to 51 routes."

### ARCH-01 + SEC-03 — Authenticated but not authorized (2026-10-27, commits 7427045, a4ed4f7)
Situation: most API routes checked *that* you were logged in, never *who* you were.
Symptom: as a fan, `POST /api/artist/setlist` replaced a real artist's setlist; an organizer could read another organizer's revenue via `/api/reports?eventId=`; any user could read day-sheet wifi passwords, grade predictions, open polls, and edit guests and tasks.
Investigation: a route-by-route grep found only 5 of ~58 route files referencing `role` at all. The characterization tests reproduced the setlist and reports cases.
Root cause: there was no shared place for authorization, and event ids were resolved in about 9 different ways.
Fix: `lib/events.js#resolveEvent` (one id rule) and `lib/authz.js`. A user's *relation* to an event (organizer/artist/crew) comes from the event document, not the account role, so an artist controls only their own shows. `loadEventFor(user, id, allowed)` throws 404 or 403; `loadTaskFor` and `requireRole` cover the rest. Applied to every mutating route and the sensitive reads. Also: event create/update ignore `organizerId`/`eventId` from the body (mass assignment); user search is closed to fans and its input is regex-escaped; middleware gates every role's pages with segment-aware matching (`/live` no longer matches `/live-show`).
Found along the way: `artist/message` looked up the artist's show by `organizerId` (messages never attached), and `artist/notifications` returned every crew message from every event.
Verification: a 51-case authorization matrix that includes the *positive* cases (owners can still do their job), plus mass-assignment tests. `npm test`: 87 passing.
Trade-off / at larger scale: relation checks cost one event lookup per request; at scale I'd cache event membership or move it into a policy layer (e.g. CASL), but per-request checks are simpler to reason about.
Interview version: "I found my API authenticated users but didn't authorize them: a fan could rewrite an artist's setlist. The fix was to derive permissions from the user's relation to the specific event, centralised in one `loadEventFor` helper, and I proved it with a matrix test covering who must be refused *and* who must still be allowed."

### SEC-04 — Unlimited, anonymous voting (2026-10-27, commit a4ed4f7)
Situation: the encore vote is the live feature fans interact with.
Symptom: the characterization test showed a vote with no cookie succeeded; nothing stopped repeat votes, and closed polls still accepted them.
Root cause: the vote branch skipped auth by design ("only check auth for creation"), and there was no record of who had voted.
Fix: a `Vote` collection with a **unique (pollId, userId) index**. The vote is inserted *before* the tally `$inc`; a duplicate-key error becomes 409. The increment is conditional on `isActive`, and if the poll closed in between, the vote record is removed. The server broadcasts the persisted tally. Polls configured in the setlist builder now start closed (they used to pop up for fans before the show).
Verification: 20 simultaneous votes from one user → exactly one 200, nineteen 409s, tally 1, one Vote document.
Trade-off: the tally `$inc` and the Vote insert aren't in one transaction; a crash between them undercounts by one, and the tally can be rebuilt from the Vote collection. Chosen over a transaction for latency during a burst of votes.
Interview version: "One fan, one vote is enforced by the database, not by my code: a unique index on poll and user. I proved it with 20 concurrent votes from the same user, where an application-level 'check then insert' would have let several through."

### SEC-02 + BUG-05 — Anyone could control any show; shows leaked into each other (2026-10-27, commit a8db3ab)
Situation: Socket.IO drives the artist → crew → fan live sync.
Symptom: any socket (CORS `*`, no auth) could emit `show:warning` or `poll:reveal`, and the server rebroadcast it to every connected client with `io.emit`. The crew screen even detected a mismatched event id and applied the update anyway ("Debug Mode").
Root cause: WebSockets don't pass through Next middleware or route auth, so the socket layer had no auth of its own, and rooms were never used.
Fix: `lib/socketServer.js` verifies the session cookie during the handshake; clients join `event:<id>` and the server assigns the role; only artist/crew can relay `show:update`/`poll:reveal`, only to their own room, with unknown fields stripped. State changes (show status, warning, poll start/end, tallies) are broadcast by the HTTP routes *after* the DB write. Clients use `useShowRoom()`, which re-joins after reconnects. The fan card now fetches an already-open poll on load (that effect was empty) and drops the hardcoded "12 votes".
Verification: 10 tests against a real Socket.IO server: no cookie or a forged token is refused; a fan's control event is rejected; show A's update never reaches show B; an HTTP vote produces a server-sent tally in one room only.
Trade-off / at larger scale: rooms live in one process, so with more than one server instance I'd add the Socket.IO Redis adapter. The socket server also needs a long-running Node process, not serverless.
Interview version: "WebSockets bypass HTTP middleware, so my live-show channel had no auth at all and broadcast globally. I authenticated the handshake with the same session cookie, scoped everything to per-event rooms, and made the server the only source of truth for state changes, so clients request changes over HTTP and the server announces what actually got saved."

---

## Phase 2 — Correctness & resilience (2026-10-27, branch `phase-2-correctness`)

### BUG-06 — Rules-of-Hooks violations on live screens (commit 3750f28)
Root cause: `LiveControls` and `PollSelectionModal` returned early before calling `useState`/`useEffect`, so a render where `currentSong`/`isOpen` changed called a different number of hooks ("Rendered more hooks than during the previous render"). Fix: hooks first, empty state after. Verification: `react-hooks/rules-of-hooks` errors 5 → 0.

### BUG-04 — Encore reveal always announced "Midnight City" (commit 0cf3a5a)
Investigation: traced the reveal. The crew member who clicked Reveal saw the right winner (computed locally), but the socket message carried `options.find(o => o.winning)?.title`, and `winning` is only set *after* a reveal, so it sent `undefined` and every other screen fell back to a hardcoded "Midnight City".
Fix: closing a poll stores `pickWinner()` of the persisted counts on the Poll (ties flagged), `poll:end` carries it, and the reveal relays that name. Verification: unit tests for `pickWinner` (ties, zero votes) and an integration test (A:1, B:2 → winner B persisted).
Interview version: "Only the person who clicked Reveal saw the right winner; everyone else saw a hardcoded song, because the broadcast read a flag that is only set after the reveal. I moved the decision to the server at poll close, so there's one winner and every screen gets it from the same place."

### SEC-05 — Gaming the setlist prediction game (commit 0222a9a)
Symptom (red test): predicting "Song A" three times scored **35**; the honest score is 15. Predictions could also be changed after the show started.
Root cause: scoring ran `findIndex` per predicted song with no record of which real songs were already matched.
Fix: pure `scorePrediction()` where each setlist entry matches at most once (blank titles never match); predictions return 409 once the show leaves Standby; results written with one `bulkWrite` instead of N `save()` calls. (The real setlist was already hidden from fans in Phase 1.)
Interview version: "A pure scoring function made the bug obvious and testable: each real song can be matched once. I wrote the failing test first; it showed 35 points for spamming one song."

### BUG-09 + BUG-14 — Event ids collided; production couldn't create shows at new venues (commit 4d7d1c3)
Symptom (red tests): after deleting an event, the next create returned 500 (duplicate `eventId`); five concurrent creates produced duplicate ids; a legacy event with id 1500 got its id reused.
Root cause: `eventId = 1000 + countDocuments() + 1`; the production dashboard used `Math.random()` in 1000–9999. Separately, production created missing venues without the schema's required `address` (it set a non-existent `location` field).
Fix: `nextEventId()`, one atomic `$inc` on a unique Counter document, seeded from the highest existing id. Venues get `address: 'TBA'`.
Interview version: "Deriving an id from a count breaks as soon as you delete anything, and it races. An atomic counter fixes both; the subtle part was seeding it from the highest existing id so legacy data isn't reused."

### BUG-08 — Production task creation always failed (commit 174a2d2)
Root cause: the modal sent `eventId`, but the route ignored it, and `Task.eventId` is required, so every create failed validation. It also wrote fields the schema silently dropped and mixed `'Pending'`/`'pending'`.
Fix: required, authorized `eventId`; field allow-list (a task can't be moved to another show); one status vocabulary; show name and venue from the populated event; the page shows the server's error instead of closing the modal.

### SEC-08 — User input used as regex (commit ad91c4a)
Symptom (red tests): a song titled `My Song (Live` crashed the setlist save (500); a title of `.*` linked an unrelated song; `(` in venue/discover search returned 500.
Fix: `escapeRegex`/`containsRegex` at every call site (length-capped). Also scoped the artist dashboard's "Crew Message" alert to the artist's own shows (it counted messages from every event).

### SEC-06 — Unauthenticated LLM endpoints (commit d7343ae)
Fix: `guardLlmRequest()` checks session, role, and a per-user token bucket (10/min, 429 + `Retry-After`); prompt length caps; a 15 s Gemini request timeout. Gemini is mocked in tests.
Trade-off: the bucket is in process memory, so with several instances I'd use Redis (`INCR` + TTL).

### SEC-09 + BUG-11 — Signup/login hardening; `/api/auth/me` (commit b0862f6)
Fix: email format, min 8 chars, known roles only, emails stored lowercase, 5 login attempts/min per IP+email, signup throttled; `/me` reads the profile from the DB (the JWT only carries `{userId, role}`).
**Regression found and fixed:** the ERR-01 codemod (428e1de) had emptied login's `catch`. Its "delete the console line" regex ran past a statement with no semicolon and also removed the `return apiError(...)` inserted just before it, so any login error produced no response. The new rate-limit test exercised that path and failed with `undefined`. A scan of every route's `catch` blocks found no other case.
Interview version (this is a good one): "My own refactoring script introduced a bug: a regex that deleted logging lines ran past a missing semicolon and deleted a return statement. Tests on the happy path didn't notice; the first test that hit login's error path did. Afterwards I scanned all 58 routes for catch blocks with no return or throw to make sure it was the only one."

### VAL-01 — Schema validation at the boundary (commit 54953cf)
Fix: `lib/schemas.js` (zod) for event create/update, setlist, polls, venues, day sheet and rider; unknown keys are stripped, so mass assignment is closed by construction; 400 responses list the bad fields; malformed JSON is a 400. Verification: a client-sent `sold: 999` becomes 0, `organizerId` is ignored.

### SEC-07 — Vulnerable dependencies (commits 8462f20, c7ce1ab)
Before → after (`npm audit --omit=dev`): 19 (2 critical, 13 high, 4 moderate) → 1 high. next 16.0.8 → 16.4.3, jspdf → 4.2.1, socket.io/ws via `npm audit fix`, vitest 3 → 5 (dev). zod 3 → 4.6.7 because GHSA-mrhx-c7xc-m3w5 (memory exhaustion on oversized constrained arrays) applied to our own `.max()` schemas.
Remaining: `xlsx` (no fixed release on npm), not reachable because the app only *writes* a spreadsheet in the browser.
Note: next's newer `eslint-config-next` adds React Compiler rules, so lint errors rose 81 → 108 without code changes (`set-state-in-effect` 13 → 32, new `immutability` 10). That's Phase 3 work.

### BUG-13 + ERR-02 (UI) (commits 0d0e39b, 972d7bf)
BUG-13: the artist guest-list page was hardcoded to `eventId=13` for reads, adds and clear-all; it now uses the artist's own shows with a picker. ERR-02: the crew live screen shows a "sync problem" banner (not on crew / unavailable / connection lost) and keeps the last good state.

### Phase 2 status
`npm test`: **139 passing** (from 0 at the start of Phase 0) · `next build`: passes · `npm audit --omit=dev`: 1 high (xlsx, not reachable) · lint: 108 errors / 26 warnings (stricter ruleset; Phase 3).

---

## Phase 3 — Testing & CI (2026-10-27, branch `phase-3-testing-ci`)

### Lint 108 → 0 errors (commits 031f404 … cb87678)
Approach: fix by cause, not by count. Real bugs got proper fixes; mechanical issues were scripted from ESLint's exact positions; genuine data-fetch effects got a one-line, reasoned exemption instead of contorted code.
- **BUG-15** `CreateShowModal` used `Layers`/`Upload`/`Loader2` without importing them, so opening production's "Create Show" crashed (same class as BUG-01; `next build` doesn't catch it).
- **BUG-16** `VenueIntel` declared `Input` *inside* the component, so every keystroke created a new component type and React remounted the field: it lost focus after each character.
- `ConcertLights` used `Math.random()` for animation durations during render; the 200 ms flash effect re-rendered it, handing framer-motion new durations that restart the sweep.
- 19 "copy props into state in an effect" sites became "adjust state during render when the input changes" (react.dev's recommended pattern). Where the effect used to run on mount, initial state is now derived from props (AddGuestForm in edit mode, memory vault `?action=upload`), because the render-time check only fires on *changes*.
- Bugs these effects hid: `UploadMediaModal`'s friend-search effect cleared the **event** results whenever the friend box was empty; `TaskModal` offered every public event as a task's show, so crew picked shows they then got a 403 on (now `/api/artist/events`); the tech rider flashed an empty state before its events loaded.
- Parked ticketing files keep their errors visible as warnings via a labelled ESLint override, so CI can enforce zero errors elsewhere without editing parked code.
- A false claim of mine was caught by my own test: in Mongoose 9, `isValidObjectId('twelve-chars')` is `false`. The comment in `lib/events.js` was corrected.

### CI (commit 6a4b22c)
GitHub Actions: Node 22 → `npm ci` → lint → tests with coverage (in-memory Mongo, cached binary) → `next build` → informational prod audit. Placeholder env only. Coverage on critical code: `authz` 97%, `scoring`/`polls` 100%, `socketServer` 93%, fan poll route 81% (47% overall; untested read routes aren't the goal). **Not yet verified on GitHub:** it runs on the first push.

## Phase 4 — Performance (commit 23dc26e)

### PERF-01 — 1-second polling on top of sockets
Measured first (`bench/live.bench.js`, in-memory replica set, 2,000 other shows, 10 crew screens):

| | before | after |
|---|---|---|
| requests/s (10 screens) | 10 | 0.5 |
| setlist docs examined | 2,001 (collection scan) | 1 (index) |
| endpoint p50 / p95 | 14.3 / 19.1 ms | 13.6 / 17.6 ms |
| push p50 / p95 | 3.3 / 5.6 ms | 2.9 / 5.2 ms |

Fix: index on `Setlist.eventId`; `lean()` plus projections (no song populate the screen never read); the crew screen is push-first, with a 20 s reconcile poll and a refetch on every socket (re)connect (Socket.IO doesn't replay missed events).
Honest reading: endpoint latency barely moved, because a 2k-document scan is cheap and per-request auth/lookup work dominates. The index matters as data grows; the real win is 20× less load and ~3 ms updates instead of up to 1 s.
Interview version: "I measured before touching anything. The surprise was that the index didn't change latency at my data size, so I didn't claim it did; the real win was load: push-first cut requests twentyfold and made updates near-instant."

## Phase 5 — Interview upgrades

### UPG-02 — Typed live-show protocol (commit de98dc3)
`lib/liveProtocol.js` validates every relayed socket payload with zod (status enum, integer time, non-empty winner); malformed events get `error:invalid`. `docs/live-sync.md` has the sequence diagram, protocol table, decisions, numbers and limitations.

### UPG-03 — AI patching: LLM intent + deterministic allocator (commits f3f1b83, 37946e7)
Problem: the patch assistant asked Gemini to "find the next free address gaps" and trusted its JSON. Repatch replaced the whole patch with model output, and both screens then forced every fixture to 16 channels / Standard, which itself reintroduces collisions. The full current patch went into every prompt, and user text was concatenated into the instructions.
Fix: the model only extracts `{action, fixtures[{type,count,channels?,mode?}]}`, with JSON mode constrained by `z.toJSONSchema()` of the same zod validator and one repair retry quoting the validation error; 422 if still invalid. `lib/dmx/allocate.js` does first-fit allocation (existing fixtures never move), spill-over to the next universe, order-preserving repatch, and `findConflicts`; the route re-checks before responding. The screens keep real footprints.
Verification: unit tests; **fast-check property tests** (300 random patches each: new fixtures never overlap or exceed channel 512; repatch always clean and footprint-preserving); route tests with a scripted model (repair loop, 422, out-of-space 400, user text not in the system instruction, no addresses sent to the model).
Eval harness: `evals/patch/cases.json` (30 cases incl. 4 prompt-injection cases) and `run.mjs` comparing the verbatim legacy prompt with the new pipeline. Real-model results are in the eval section below.
Interview version: "I moved the part that has to be correct out of the LLM. The model parses what the lighting designer wants; an algorithm guarantees collision-free addresses, which property-based tests check over hundreds of random rigs, and an eval set measures intent accuracy against the old prompt."

### LLM-01 — Current SDK and model (commit 61a9a84)
`@google/generative-ai` → `@google/genai` 2.31; `gemini-2.5-flash` → `gemini-3.8-flash` (stable; recommended for new projects on Google's models page, Oct 2026), overridable via `GEMINI_MODEL`. `lib/llm.js#generate` puts rules in `systemInstruction` and user text in `contents`, uses JSON Schema output where structured, a 15 s timeout, and returns token usage. The description route uses JSON mode instead of stripping code fences.

## Phase 6 — Ship & document (partial)

- **BUG-10** (ed54c68): deleted empty "features" (`python-service/` 0-byte files, `api/sentiment`, `api/wizard/generate`, `lib/gemini.js`); the analysis page labels its reviews as sample data; the live API/screen no longer invent BPM 128/120 or key "C". Removed debug artifacts and unused deps (react-router-dom, @dnd-kit/*, jsonwebtoken, leva).
- `middleware.js` → `proxy.js` (Next 16), with first tests for the page gate; `/api/health` replaces a public health check that leaked connection errors (bf1557f).
- **DOC-01** (e887494): real README (roles, architecture diagram, 10-minute setup, demo accounts, measured numbers, known limitations). The seed gives the demo fan a ticket so the three-window demo works.
- Mongoose 9 deprecation: `new: true` → `returnDocument: 'after'` (505ef45).
- **Not done (need the developer):** deployment target decision, demo GIF/video, live eval run, UPG-04 3D homepage (to discuss), then re-audit → interview report → mock interview.

`npm test`: **173 passing** · lint: **0 errors** (35 warnings) · build: passes · prod audit: 1 high (xlsx, not reachable).

---

## LLM reliability (2026-10-27/28, after the first live eval)

### Live eval findings
- First live run: `gemini-3.8-flash` answered 503 "high demand" / 504 deadline; the harness crashed on the first upstream error. Fixed: retries with server-hinted waits, pacing (`--rpm`), and outages counted separately from wrong answers.
- The free tier allows **5 requests/minute and 20/day per model**. A full eval (~60–70 calls per model) can't finish in a day on a free key, so partial results were discarded as not evidence. The eval was run on Groq instead (below).
- Live smoke test (1 call, `gemini-3.5-flash-lite`, the exact structured-output request `lib/llm.js` sends): schema-valid JSON on the first try, but **21.9 s** latency under current load.

### Provider chain + non-AI fallbacks (commits 1f0484e, 6b960d3)
Goal (developer's request): an AI request should always get an answer, never "not available".
- Chain: `gemini-3.8-flash` → `gemini-3.5-flash-lite` → Groq `openai/gpt-oss-120b` (OpenAI-compatible endpoint, `json_schema` output; needs `GROQ_API_KEY`). Any provider error moves to the next. A 12 s per-provider timeout bounds the wait (the 21.9 s Flash-Lite call above would have moved on).
- Circuit breaker: after overload or quota errors a model is benched (server "retry in Ns", 1 h for daily quotas, 30 s for 5xx/timeouts), so requests stop waiting on a dead provider; if every model is benched, all are tried anyway.
- If every provider fails, each feature degrades with `degraded: true` instead of erroring: template copy (insight, event description), the artist's own song catalogue (never invented songs), a deterministic BPM energy curve for setlist order, and a rule-based reader for patch requests (29/30 on my own eval prompts, which is optimistic because I wrote both).
- `/api/generate` became task-based (`insight` / `songs` / `reorder`). The three screens used to paste format instructions into one free-text prompt, which conflicted with the server's "under 50 words" system prompt; now the server owns each prompt, schema and fallback.
- Not an outage message: our own abuse limit (10 AI requests/min per user) still returns 429 on purpose.
Interview version: "The newest model was overloaded and my key had 20 requests a day, so 'just call the LLM' wasn't a reliability strategy. I built a provider chain with a circuit breaker so requests skip a model that's down, and behind it a deterministic fallback per feature, so users always get an answer and the response says when it's the simpler one."


### UPG-03 eval results (Groq `openai/gpt-oss-120b`, 30 cases, 0 upstream failures; commits a31a216, be17757)

| | legacy (model assigns addresses) | new, prompt v1 | new, prompt v2 |
|---|---|---|---|
| intent correct | 90% | 93% | **100%** |
| cases with address collisions | 17% | 0% | **0%** |
| out-of-range addresses | 13% (3% in run 1) | 0% | **0%** |
| repatch lost fixture footprints | 13% | 0% | **0%** |
| p50 / p95 latency | 1.3 / 2.1 s | invalid* | **0.78 / 1.5 s** |
| avg tokens | 805 | 620 | 705 |

* v1 timed the harness's pacing wait as well; fixed so only API time counts.
Error analysis between v1 and v2: "Patch 6 spots and 4 washes" was read as *repatch* (in lighting, "patch" also means connecting new fixtures; on a real rig this would have re-addressed everything), and "Robe BMFL Blades" was forced into the generic "Beam" category. The prompt now says patch/rig/hang N X means add, and keeps named fixture models as their type. No repair retries were needed in v2.
**Caveat:** I wrote the cases and tuned v2 on them, so 100% is optimistic. Next step: a held-out set written separately. Legacy out-of-range varied between runs (it uses the model's default temperature).
Interview version: "I built a 30-case eval with prompt-injection cases and compared the old prompt, where the model picked DMX addresses, against intent extraction plus a deterministic allocator. Collisions went from 17% of cases to zero by construction, and error analysis of the two remaining misses found a real ambiguity, 'patch' meaning 'add' in lighting, which a prompt fix resolved. I'd validate that 100% on a held-out set before claiming it."


### UPG-04 homepage show: debugging notes
- **Beat tracker locked onto the hi-hats.** On a synthetic click track, every detected beat landed ~0.22 s after the kick, on the off-beat hi-hat. Cause: spectral flux summed over linear FFT bins is dominated by the treble (a hi-hat touches hundreds of bins, a kick a handful). Fix: average the full-band onset envelope with a bass-band (< 150 Hz) one, approximating the low-frequency emphasis of a mel spectrum. Found by a test, not by ear.
- **Every beat ~25 ms early.** Frames were timestamped at their start, but an onset only registers once it reaches the middle of the 46 ms analysis window. Fix: timestamp frame centres. Remaining error on the test track: < 35 ms.
- **First homepage FPS reading looked jittery** (55 FPS, jumping). GPU time was only 1.7 ms/frame, so the scene wasn't the cause. A scripted benchmark with the FPS overlay hidden measured a locked 60 FPS (59 FPS 1% low) for every configuration up to 140 beams: the overlay and eyeballing were the noise. Kept as a benchmark button in `/lab/stage`.
- **React Compiler rejects mutating props and memoized values** (e.g. writing `look.current` from a prop ref inside `useFrame`). Per-frame three.js mutation moved into plain module functions (`directFrame`, `layoutBlinders`) that the component calls; animation still never re-renders React.
- **Every public page opened a socket the server refused** ("unauthorized" warnings and reconnect attempts for logged-out visitors). The provider now creates the socket with `autoConnect: false` and `useShowRoom` connects it, so only live-show pages open one.
Interview version: "The homepage is a 3D concert that holds 60 FPS on integrated graphics because the light is faked: one instanced mesh of additive cones moved in a vertex shader instead of ~89 real lights. Concert mode analyses a song offline with my own DSP (spectral-flux onsets, autocorrelation tempo, dynamic-programming beat tracking) and programs the lights from it; a synthetic click-track test caught the tracker locking onto hi-hats, and the fix was weighting the bass band."
- **The homepage stage vanished on scroll.** The sticky stage scrolled away with the page, leaving a black screen for the rest of the 400vh section. Cause: the page wrapper's `overflow-x: hidden`. Hiding overflow on one axis computes the other to `auto`, which makes the wrapper a scroll container, and `position: sticky` sticks to the nearest scroll container. Fix: `overflow-x: clip`, which clips without creating a scroll container. Caught by screenshotting the page at several scroll positions.
- **"It looks like a cartoon game"** (developer feedback). The causes were concrete: every lens drew a full-colour disc regardless of where it pointed, housings had a coloured band, beams were flat saturated cones, and there was no air. Fixes: lens flare computed from each fixture's aim relative to the camera (the same aiming code as the beam), dark housings, white-hot beam cores that saturate with distance, two-scale haze grain, drifting haze layers, coloured bounce light on the steel from below, floor spill, bloom on integrated GPUs (benchmarked first) and a slight handheld sway.

---

## Release: demo data, live clock, fan pages (2026-10-28/29)

### BUG-17 — New events only saved on the third try (commit be1521a)
Symptom: creating an event failed twice with a server error, then worked.
Investigation: read-only check of the database: the event-id counter was at 10, while older events already used ids 11–15 (and 201–210, 999, 1029–1031 further up).
Root cause: `nextEventId()` (BUG-09's atomic counter) only seeded itself from the highest id when the counter document didn't exist. This counter existed but was behind, so every create got an id that was already taken and failed on the unique index; each failure still consumed a number, so retries walked past the taken ids.
Fix: if the next id already exists, `$max` the counter to the highest existing id, then increment. The seed also moves the counter past its fixed demo ids, so a user's event can never get an id a re-seed would overwrite.
Verification: test with legacy events right where the counter goes next; it fails without the fix.
Interview version: "The id counter was behind ids older data already used, so every save hit a duplicate key, and each failure used up a number. I confirmed it against the database read-only, made the counter jump past existing ids, and wrote a test that fails without the fix."

### BUG-18 — Crew timer reset when coming back to a show; refresh did nothing (commit ea80e1d)
Root cause: the refresh button next to ONLINE called an `onResync` prop that `LiveHeader` never passed down, so it only reconnected the socket; and the show clock existed only in each screen's memory.
Fix: `Setlist.clock = { elapsed, liveSince }` maintained by `lib/showClock.js` (`advanceClock`, `elapsedAt`), following the artist's own timer when sent. `GET /api/production/live` returns `elapsedSeconds`; every `show:update` carries `time`; refresh reloads the show ("Re-synced: back on track"); the artist console restores status and time on open.
Verification: unit tests for run / pause / resume / artist time / standby; an end-to-end run (start → pause at 5 s → resume) read Live 5 s → Paused 5 s → Live 8 s from the crew's view.
Trade-off: no per-second writes; the price is that the clock is only as accurate as the artist's timer when it's sent.

### BUG-19 — Seeded data was invisible on several dashboards (commit be1521a)
Found by seeding realistic data for every role: event images were read from `image` (the schema has `images.hero`), memory photos from `imageUrl` (stored as `image`), the fan's prediction songs were looked up under the event's organizer instead of its artist, the artist's "next show" was the furthest date, and the production dashboard ignored shows active via `productionStatus` (no tasks, no patch conflicts). Also a typo (`nsole.error`) in the friends route's error handler.

### SEC-10 — Crew notifications leaked other shows' messages (commit be1521a)
`/api/notifications` computed the user's event ids and then didn't use them, so every crew member saw every show's "Artist Message" tasks. Now filtered to the user's own events.

### SEC-11 — Seed script could print the database connection string (commit f529739)
`new URL()` on a multi-host MongoDB connection string throws, and Node's error message printed the whole string, password included, to the terminal. The host name for log messages is now taken by plain string splitting. The exposed password must be rotated (see `docs/DEPLOYMENT.md`, section 3).

### Features in this release
- Seed: a seven-show tour per team with tickets, setlists, crew, patches, polls, predictions, memories and notifications; public recruiter logins with their own copy (commit f529739).
- Memories open full size in a lightbox; `/social` Friends page with follow / unfollow (`POST /api/social` only edits your own list; 5 tests) (commit 6e830d6).
- Educational-use disclaimer for the two demo songs on the site and README; deployment guide for Vercel (commits 4148c87, a1cf1ec).

`npm test`: **279 passing** · lint: **0 errors** · build: passes.

## Homepage polish (2026-10-29)

### BUG-20 — Encore colours couldn't be picked on phones (commit 4633834)
Symptom: on a phone, tapping an encore colour did nothing.
Investigation: reproduced in headless Edge with phone emulation (390 px, touch) through the DevTools protocol: `document.elementFromPoint` at the Gold button returned a paragraph of the playground card, not the button.
Root cause: the playground card is invisible until the encore is over, and its parent overlay had `pointer-events: none`, but the card itself set `pointer-events: auto`. On a phone it spans the full width and covered the encore colours (on a laptop it sits bottom-left, away from them).
Fix: hidden overlays are `inert` (no taps, no focus). Verified with the same emulated tap: Gold selected, the rig turned gold.
Interview version: "Tapping a colour on a phone did nothing. Instead of guessing, I emulated a phone and asked the browser which element was actually under the tap: an invisible card from the next section, because a child had re-enabled pointer events. Making hidden sections inert fixed it for every overlay at once."

### BUG-21 — LED wall listed past shows; 'Up next' doubled the city and hid the date (commits d146fa8, cd2ca47)
The wall showed the first two events of a list that included past shows (2022's Chromatica Ball). The homepage now lists only upcoming events, featured ones first (`Event.featured`). The line was "title · city · date", cut at 52 characters; titles that already name the city read "… Mumbai · Mumbai" and lost the date. The city is now dropped when the title contains it, and the line shrinks to fit, shortening only the title.

### Features
- House lights light the venue in the scroll show and on the desk (warm washes and steady strobes, beams off), and come up when a song ends; songs are otherwise unchanged (commits ebed041, b07ac89; 6 tests). Brighter house lamps (156bf45).
- Phones get the full scroll show; playground controls ask for a bigger screen (fdad55f).
- The playground in two steps: songs, then one-tap lighting controls, with a clear "Next" button.

`npm test`: **285 passing** · lint: **0 errors** · build: passes.
