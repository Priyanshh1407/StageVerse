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
