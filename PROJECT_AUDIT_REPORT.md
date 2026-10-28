# PROJECT AUDIT REPORT
Project: StageVerse | Type: Full-stack web app (Next.js 16 App Router + MongoDB/Mongoose + Socket.IO + Gemini LLM) | Audited: 2026-10-27 | Audit #: 1

> Scope: all tracked source plus untracked work-in-progress (`app/test-3d/`, `components/canvas/`, `temp_update.mjs`). Branch `deployment` with uncommitted changes to 9 files — the audit reflects the working tree, not the last commit.
> Secret-bearing files (`.env.local`) were intentionally not opened.

## 0. Status after Phases 0–6 (2026-10-27)

| Finding | Status |
|---|---|
| SEC-01 | File deleted; **Atlas password rotation pending (developer)** |
| SEC-02 … SEC-09, ERR-01 … ERR-03, ARCH-01, VAL-01 | Fixed |
| BUG-04 … BUG-11, BUG-10, PERF-01, TEST-01, LLM-01, DOC-01 | Fixed (LLM-01: real-model eval numbers pending) |
| BUG-01, BUG-02, BUG-03 | **Parked** (ticketing on hold by developer decision) |

New findings during execution (all fixed): **BUG-12** artist messages looked up shows by organizerId · **BUG-13** guest list hardcoded to event 13 · **BUG-14** production couldn't create shows at new venues · **BUG-15** CreateShowModal missing icon imports (crash) · **BUG-16** Venue Intel inputs lost focus every keystroke · **SEC-10** artists saw crew messages from every event · UploadMediaModal cleared event search results · TaskModal offered shows the crew isn't on · **REG-01** my ERR-01 codemod emptied login's catch (caught by a test).
Corrections to this report: the "glued lines" were lone carriage returns, not hidden code (see Hygiene). In Mongoose 9, `isValidObjectId` is not as loose as I implied in ARCH-01.

Baseline → now: tests 0 → 173 · lint errors 82 → 0 · prod audit 19 → 1 (unreachable) · build passes · CI added (unverified until first push).

## 1. Executive Summary

- **Overall health:** An ambitious, visually rich multi-role platform (fan / artist / organizer / production crew) with a real live-show sync feature, but the server trusts almost every caller: authorization is mostly "is there a valid cookie", and the two flows that matter most (buying tickets and running a live show) both have confirmed correctness bugs.
- **Would this project survive a 45-minute deep-dive interview today? No.** The first follow-ups an interviewer asks about a ticketing + live-voting app ("How do you prevent overselling?", "How do you stop someone voting 1,000 times?", "Can a fan change another artist's setlist?") all hit confirmed bugs. There are 0 tests, and features in the UI (sentiment analysis, Python service) are empty files.
- **Findings:** P0 6 | P1 10 | P2 11 | P3 3
- **Top 3 things to fix before any interview:**
  1. **SEC-01**: delete `temp_update.mjs` and rotate the MongoDB password; it's hardcoded there in plaintext.
  2. **SEC-03 / SEC-02**: add real role and ownership checks to the API and authenticate the socket server.
  3. **BUG-01 / BUG-02 / BUG-03**: fix the ticket purchase flow. Today the widget crashes, no ticket is ever issued, and inventory can be corrupted.

## 2. Baseline (commands actually run)

| Check | Command | Result |
|---|---|---|
| Build | `npx next build` | ✅ Exit 0, compiled in 99s, 79 static pages. Warning: `middleware` convention is deprecated in Next 16 (rename to `proxy`). The build does **not** catch undefined JSX identifiers. |
| Type check | (`Running TypeScript` step inside build) | Passes trivially: the project is plain JS, so there's nothing to type-check. |
| Lint | `npx eslint .` | ❌ **82 errors, 25 warnings** across 246 files. Notable: 8× `react/jsx-no-undef` (real runtime crashes), 5× `react-hooks/rules-of-hooks`, 13× `set-state-in-effect`, 49× unescaped entities. |
| Tests | — | **0 tests.** No test framework, no test script. |
| Coverage | — | n/a |
| Dependency audit | `npm audit --omit=dev` | ❌ **19 vulnerabilities: 2 critical, 13 high, 4 moderate.** Critical: `next@16.0.8` (multiple advisories incl. Server Components DoS, source exposure), `jspdf<=4.2.0`. High: `socket.io-parser`, `ws`, `xlsx` (no fix available). |
| Secret exposure | `git ls-files \| grep -Ei '(^\|/)\.env…'`; `git log --all -S "mongodb+srv"` | ✅ No env/secret files tracked; `.env*` is gitignored; no credentials in git history. ❌ One **untracked** file contains live DB credentials (SEC-01). |
| App startup | not run | Running the app needs the developer's `.env.local` and a live MongoDB Atlas cluster. I didn't start it, to avoid touching the real database. |
| Commit hygiene | `git log --oneline` | 23 commits, messages like "Final touches 2", "Completed sockstesgit add .!". The history shows features landing but tells no engineering story (see Hygiene). |

## 3. What Is Already Good

Talk about these with confidence:

- **Product scope and domain modelling.** Four distinct roles with their own workflows, backed by 22 Mongoose models: day sheets, tech riders, DMX patching, guest lists, setlists, predictions (`models/`). That's real domain thinking, not a todo-app clone.
- **Password handling is correct.** bcrypt with cost 10 (`app/api/auth/signup/route.js:27`), `select: false` on the password field (`models/User.js:17`), and the same generic "Invalid credentials" message for unknown email and wrong password (`app/api/auth/login/route.js:21-31`), which avoids user enumeration.
- **Session cookie is configured well.** `httpOnly`, `sameSite: 'strict'`, `secure` in production, 7-day expiry matching the JWT `expiresIn` (`app/api/auth/login/route.js:47-53`). `sameSite=strict` also blocks most CSRF on the cookie-authenticated mutating routes.
- **Mongo connection caching for serverless/hot-reload** via `global.mongoose`, and the cached promise is reset on failure (`lib/db.js:11-30`). That's the right pattern, and you should be able to explain why it exists.
- **Some routes do ownership checks properly** and can serve as the template for the rest: `app/api/events/[id]/ticketing/route.js:21` (organizer only), `app/api/production/events/[id]/route.js:25-27` (organizer or assigned crew), `app/api/events/[id]/assign/route.js:19-27` (owner-scoped query).
- **Atomic vote increment.** `findOneAndUpdate` with `$inc` on `options.$.votes` (`app/api/fan/poll/route.js:88-92`) avoids lost updates under concurrent votes. The concurrency instinct is right here; the auth and dedupe around it are what's missing (SEC-04).
- **Unique compound index on predictions** (`models/Prediction.js:17`) enforces one prediction per user per event at the DB level, plus an idempotent upsert on save.
- **Ranking logic** in `declare-results` uses standard competition ranking ("1, 1, 3") correctly (`app/api/artist/declare-results/route.js:58-72`).
- **Resilient client-side sync design intent.** The production screen re-reads the DB as source of truth and treats sockets as the fast path (`app/(production)/live/[id]/page.jsx:76-78`). The idea is defensible even though the implementation needs work (PERF-01).
- **LLM error mapping.** 429/503 from Gemini are translated into user-facing retry messages (`app/api/generate/route.js:33-45`).

## 4. Findings

---

### [SEC-01] Hardcoded MongoDB Atlas credentials in a source file
- Severity: **P0** | Interview Risk: MEDIUM | Confidence: **CONFIRMED**
- Category: security
- Location: `temp_update.mjs:6` (untracked)
- What's wrong: the script calls `mongoose.connect('mongodb+srv://<user>:REDACTED@<cluster>.mongodb.net/…')` with the full password inline.
- Evidence: file contents; `git log --all -- temp_update.mjs` and `git log --all -S "mongodb+srv"` return nothing, so it has **not** been committed yet. But it isn't covered by `.gitignore`, and the history shows a `git add .` habit (commit `ae4e671`).
- Why it matters: one `git add .` away from publishing write access to the production database (users, password hashes, orders) on a public GitHub repo. The credential has also appeared in plaintext in local tooling output (including this audit session), so treat it as exposed.
- Fix: (1) Rotate the Atlas user password now. (2) Delete `temp_update.mjs`; if a reset script is useful, make it read `process.env.MONGODB_URI` and put it in a `scripts/` folder. (3) Consider restricting the Atlas network access list.
- Effort: S

---

### [SEC-02] Live-show control is unauthenticated: anyone can start, stop, reveal or warn on any show
- Severity: **P0** | Interview Risk: **HIGH** | Confidence: **CONFIRMED**
- Category: security
- Location: `pages/api/socket/io.js:38-87`; `app/api/production/live/route.js:110-143`; `middleware.js:25` (`'/api'` is public)
- What's wrong:
  - The Socket.IO server never authenticates the connection. It accepts `show:start`, `show:update`, `poll:start`, `poll:reveal`, `poll:end`, `show:warning`, `poll:vote` from **any** client and rebroadcasts each one to **every** connected client with `io.emit`.
  - `cors: { origin: "*", credentials: true }` lets any origin connect.
  - `PUT /api/production/live` has no auth check at all. Anyone who knows an event's ObjectId (and they're exposed in public URLs like `/events/<id>`) can set `showStatus` and `showWarning`.
- Evidence: there's no `verifyAuth`/handshake check in either file. Reproduction from any browser console on any site: `io("https://<host>", {path:"/api/socket/io"}).emit("show:warning", {})` triggers the full-screen red "LAST SONG" alert on every production screen (`app/(production)/live/[id]/page.jsx:186-190`).
- Why it matters: this is the headline feature. An interviewer will ask "who's allowed to send `show:start`?", and the honest answer today is "anyone on the internet".
- Fix: authenticate the socket handshake by parsing the `token` cookie in `io.use()` and verifying it with the same secret. Put clients in per-event rooms (`event:<id>`). Only accept control events from the event's artist or assigned crew, checked server-side. Add `verifyAuth` + ownership to `PUT /api/production/live`. Restrict CORS to your own origin.
- Effort: M

---

### [SEC-03] API authorization is "logged in = allowed": missing role and ownership checks (IDOR) across most routes
- Severity: **P0** | Interview Risk: **HIGH** | Confidence: **CONFIRMED** (by reading each handler)
- Category: security / authorization
- Location (representative, not exhaustive):
  - `app/api/artist/setlist/route.js:39-87`: any logged-in user can **overwrite any event's setlist**, and the upsert sets `artistId` to the caller.
  - `app/api/artist/declare-results/route.js:8-24`: any user (including a fan) can grade and rank any event's predictions.
  - `app/api/fan/poll/route.js:34-63` (PUT) and `:70-85` (create), `app/api/artist/poll/route.js:6-30`: any user can create or activate polls on any event.
  - `app/api/artist/guestlist/[id]/route.js:6-67`: any user can edit or delete any guest by id, and triggers a "revoked" notification to them.
  - `app/api/production/tasks/route.js:65-103`, `app/api/production/logistics/route.js:6-32`: update or delete any task by id.
  - `app/api/reports/route.js:28-29`: `?eventId=<another organizer's event>` returns that organizer's revenue and transactions. The `myEvents` list is computed but not enforced when an explicit id is passed.
  - `app/api/artist/day-sheet/[id]/route.js:8-20`: any user can read any event's day sheet, including `venueIntel.wifiPass` and `greenRoomCode`.
  - `middleware.js:3-8, 79-86`: page-level role protection only covers 4 dashboard prefixes. Any logged-in role can open `/create-event`, `/ticketing/*`, `/live/*`, `/setlist-builder`, `/patch-studio/*`.
- What's wrong: `grep` over `app/api` shows **only 5 of ~58 route files reference `role` at all**. Most handlers call `verifyAuth` and then act on whatever id the client sends.
- Evidence: route-by-route table produced during the audit (auth count vs role-check count). Example: log in as a fan, then `POST /api/artist/setlist {eventId:"<any event>", items:[{title:"x"}]}` replaces the real setlist.
- Why it matters: this is the classic IDOR question, and it applies to nearly every endpoint. It also undermines every other feature (predictions, polls, reports).
- Fix: add a small `lib/authz.js` with `requireUser()`, `requireRole(user, ...roles)` and `loadEventFor(user, id, {as: 'organizer'|'artist'|'crew'})`, which resolves numeric or ObjectId ids once and throws 403/404. Use it in every mutating route. Scope `find`/`update` queries by owner (`{_id, organizerId: user.userId}`) instead of fetching then comparing. Extend middleware role prefixes to cover each role's pages.
- Effort: L

---

### [BUG-01] Ticket purchase widget crashes as soon as a tier is selected
- Severity: **P0** | Interview Risk: **HIGH** | Confidence: **CONFIRMED**
- Category: bug
- Location: `components/fan/TicketSelection.jsx:4` (imports), used at `:71, :108, :119, :121, :189`
- What's wrong: the component uses `ArrowLeft`, `CheckCircle`, `Minus`, `Plus` and `Loader2`, but imports only `Ticket, CreditCard, CheckCircle2, ChevronRight, User` from `lucide-react`.
- Evidence: ESLint `react/jsx-no-undef` on all five. Trace: clicking a tier sets `selectedTierId`, which renders `<CheckCircle>` (line 108) and the quantity stepper `<Minus>/<Plus>` (lines 119/121), throwing `ReferenceError: CheckCircle is not defined`. Used by both `app/(non-login)/events/[id]/page.jsx:14` and `/events/[id]/tickets`.
- Why it matters: the primary revenue flow can't be completed through the UI. `next build` passes, which shows the build alone isn't a safety net (see TEST-01).
- Fix: import the icons. Add `eslint` (errors only) to CI so `jsx-no-undef` fails the pipeline.
- Effort: S

---

### [BUG-02] Buying a ticket never issues a Ticket: "My Tickets", reports, analytics and friends' activity never show purchases
- Severity: **P0** | Interview Risk: **HIGH** | Confidence: **CONFIRMED**
- Category: bug / data model
- Location: `app/api/orders/route.js:53-66` creates only an `Order`. Readers of the `Ticket` collection: `app/api/fan/ticket/route.js:17`, `app/api/reports/route.js:41,96`, `app/api/analysis/route.js:31`, `app/api/discover/friends/route.js:23`
- What's wrong: there are two parallel purchase models (`Order` and `Ticket`), and nothing writes the second.
- Evidence: `grep -rn "Ticket.create\|new Ticket(\|Ticket.insertMany"` returns **zero matches** in the whole repo. Any `Ticket` documents in the DB must have been seeded by hand.
- Why it matters: a fan who pays sees no ticket, and the organizer's revenue dashboard ignores real sales. "Walk me through what happens when I click Buy" exposes this immediately.
- Fix: in the order handler, create `quantity` Ticket documents (with a unique `qrCode` from `nanoid`) in the **same transaction** as the inventory decrement and the Order insert (see BUG-03). Alternatively, pick one model and make all readers use it. Either way, document the decision.
- Effort: M

---

### [BUG-03] Ticket inventory can be corrupted: overselling race, negative and string quantities
- Severity: **P0** | Interview Risk: **HIGH** | Confidence: **CONFIRMED** (quantity cases verified with Node; race confirmed by code structure)
- Category: bug / concurrency / validation
- Location: `app/api/orders/route.js:24-47`
- What's wrong:
  1. **Read-modify-write race:** it reads `event`, checks `capacity - sold`, then `tier.sold += quantity; await event.save()`. Two concurrent buyers of the last ticket both pass the check, so the tier is oversold.
  2. **Negative quantity:** `quantity: -5` passes `quantity > available`. That decrements `sold` (restoring inventory) and creates a `'Paid'` order with `totalAmount: -250`.
  3. **String quantity:** `quantity: "2"` gives `10 + "2" = "102"`, which Mongoose casts to `sold = 102`.
  4. The order is marked `status: 'Paid'` with no payment step, and the inventory save and order create aren't atomic, so a crash between them loses tickets.
- Evidence: Node check run during the audit: `"2" > 90 → false; 10 + "2" → "102"`; `-5 > 90 → false; sold → 5; total → -250`.
- Why it matters: "How do you stop overselling?" is the single most predictable question for a ticketing system.
- Fix: validate `quantity` as an integer in 1..10. Replace read-modify-write with a conditional atomic update:
  ```js
  Event.updateOne(
    { _id, ticketTiers: { $elemMatch: { _id: tierId, status: 'Active', $expr: … } } },
    { $inc: { 'ticketTiers.$.sold': qty } })
  ```
  (or store tier inventory as its own collection, which makes `{_id, sold: {$lte: capacity - qty}}` trivial). Then wrap the Order + Ticket inserts in a MongoDB transaction. Add an idempotency key so a retried request doesn't double-buy.
- Effort: M

---

### [SEC-04] Live-poll voting is unauthenticated and unlimited (ballot stuffing)
- Severity: **P1** | Interview Risk: **HIGH** | Confidence: **CONFIRMED**
- Category: security / integrity
- Location: `app/api/fan/poll/route.js:64-94`; `pages/api/socket/io.js:54-57`; `app/(production)/live/[id]/page.jsx:172-183`; `components/fan/dashboard/LivePollCard.jsx:22-27`
- What's wrong: the vote branch of `POST /api/fan/poll` has no auth ("Only check auth for creation"), no one-vote-per-user record, and no `isActive` check, so you can vote on closed polls. Separately, the production screen increments its tally on every `poll:vote` socket message, which any client can send. And socket-started polls on the fan card show a hardcoded `votes: 12` per option.
- Evidence: `for i in $(seq 1000); do curl -XPOST /api/fan/poll -d '{"pollId":"…","optionId":"…"}'; done` would add 1000 votes with no cookie.
- Why it matters: the encore vote is the "wow" feature. "How do you ensure one fan = one vote?" is the obvious question.
- Fix: require auth (and optionally a valid ticket for the event). Add a `Vote` collection with a unique `{pollId, userId}` index, insert first and only then `$inc`. Check `isActive`. Broadcast tallies **from the server** after the DB write instead of trusting client `poll:vote` messages. Remove the fake `12`.
- Effort: M

---

### [SEC-05] Setlist-prediction game can be won by cheating
- Severity: **P1** | Interview Risk: MEDIUM | Confidence: **CONFIRMED** (by reading)
- Category: security / logic
- Location: `app/api/artist/setlist/route.js:8-38` (GET); `app/api/fan/predict/route.js:34-76`; `app/api/artist/declare-results/route.js:44-53`
- What's wrong:
  1. Any logged-in fan can `GET /api/artist/setlist?eventId=…` and read the real setlist, then submit a perfect prediction. Predictions stay editable until graded.
  2. Scoring doesn't de-duplicate. A prediction listing the same correct song 10 times scores 10×10 (+5 if aligned), because `findIndex` matches every duplicate.
- Fix: restrict setlist GET to the event's artist and crew. Lock predictions at show start (`showStatus !== 'Standby'`). De-duplicate predicted songs before scoring, with each truth item matchable once. Add unit tests for the scoring function (it's pure logic, so it's ideal for tests).
- Effort: S–M

---

### [SEC-06] Unauthenticated LLM endpoints and unauthenticated write endpoints
- Severity: **P1** | Interview Risk: **HIGH** | Confidence: **CONFIRMED**
- Category: security / cost
- Location: `app/api/generate/route.js`, `app/api/description/route.js`, `app/api/patch/route.js` (Gemini, no auth, no rate limit); `app/api/venues/route.js:26-57` (POST, no auth, `Venue.create(body)`); `app/api/production/fixture-profiles/route.js:15-35` (POST, no auth); `app/api/production/logistics/[id]/route.js` (GET, no auth)
- What's wrong: `middleware.js:25` marks all of `/api` public ("Let API handle its own auth"), and these handlers don't. Anyone can drain the Gemini quota or bill, or insert venues and fixture profiles with arbitrary fields.
- Fix: require auth plus the appropriate role. Add a simple per-user rate limit on LLM routes (an in-memory token bucket is fine for a single instance; say so in interviews). Cap prompt length. Whitelist fields on create.
- Effort: S–M

---

### [SEC-07] Known-vulnerable dependencies, including Next.js itself
- Severity: **P1** | Interview Risk: MEDIUM | Confidence: **CONFIRMED** (npm audit)
- Category: security / dependencies
- Location: `package.json`: `next@16.0.8` (critical), `jspdf@^4.0.0` (critical), `socket.io`/`ws` (high), `xlsx@0.18.5` (high, **no fix on npm**)
- What's wrong: `next` is reachable on every request. `xlsx`'s prototype pollution and ReDoS only matter if you **parse** untrusted spreadsheets. Check whether the app only writes them (`app/(organizer)/reports/page.jsx`); if so, the real risk is low.
- Fix: bump `next` and `eslint-config-next` to the latest 16.x patch, and `jspdf`, `socket.io`, `socket.io-client` to patched versions (`npm audit fix`). For `xlsx`, either confirm write-only use and document it, or switch to the SheetJS CDN build or `exceljs`. Re-run the build and the smoke tests.
- Effort: S

---

### [ERR-02] Production live API silently serves fake demo data on errors
- Severity: **P1** | Interview Risk: **HIGH** | Confidence: **CONFIRMED**
- Category: error-handling
- Location: `app/api/production/live/route.js:76-86, 104-107`
- What's wrong: on **any** exception, `GET` returns `{ success: true, ...MOCK_EVENT_DATA }` ("The Epoch World Tour", "Midnight City"…). A missing setlist also falls back to the mock setlist. The crew screen polls this every second, so a DB blip during a real show silently swaps in a fake setlist with no error shown.
- Fix: return `success:false` with the right status (404/500), and make the UI show a "sync lost / retrying" state. Keep demo data behind an explicit `eventId=demo-event` only.
- Effort: S

---

### [BUG-04] Encore reveal always announces the hardcoded "Midnight City"
- Severity: **P1** | Interview Risk: MEDIUM | Confidence: **LIKELY** (traced, not run)
- Category: bug
- Location: `components/production/live/LiveControls.jsx:16`; `app/(production)/live/[id]/page.jsx:184-186, 269-271`
- What's wrong: `winning` is computed as `winner === o.text`, but `winner` is `null` until a `poll:reveal` arrives. `onRevealEncore` emits `poll.options.find(o => o.winning)?.title`, which is `undefined`. Receivers fall back to `data?.winner || "Midnight City"`. The winner should be the option with the most votes.
- Verify: start a poll, cast votes for a non-"Midnight City" option, then click Reveal.
- Fix: compute the winner from vote counts **on the server** at poll end, persist it on the Poll, and broadcast it. Remove the hardcoded fallback.
- Effort: S

---

### [BUG-05] Real-time events leak across concurrent shows (no rooms, no filtering)
- Severity: **P1** | Interview Risk: **HIGH** | Confidence: **CONFIRMED**
- Category: bug / architecture
- Location: `pages/api/socket/io.js` (all `io.emit`; `join-room` exists but is never used for emitting); `app/(production)/live/[id]/page.jsx:128-133`; `components/fan/dashboard/LivePollCard.jsx:20-33`
- What's wrong: every show event goes to every connected client. The production page even detects a mismatched `eventId`, toasts "Proceeding with update anyway (Debug Mode)", and applies it. The fan poll card doesn't check `eventId` at all.
- Why it matters: with two shows live at once, show A's crew sees show B's status, and fans of A get B's poll.
- Fix: per-event rooms (`socket.join('event:'+id)` after the authorization check from SEC-02, then `io.to(room).emit`). Drop mismatched events on the client as defence in depth.
- Effort: S (on top of SEC-02)

---

### [BUG-06] Rules-of-Hooks violations on the live-show screens
- Severity: **P1** | Interview Risk: MEDIUM | Confidence: CONFIRMED (lint); crash **LIKELY**
- Category: bug / frontend
- Location: `components/production/live/LiveControls.jsx:8-10` (early `return` before `useState`); `components/artist/live/PollSelectionModal.jsx:9-11`
- What's wrong: when `currentSong` changes from falsy to set (setlist loads after first render), React sees more hooks than the previous render and throws "Rendered more hooks than during the previous render".
- Fix: move all hooks above the early return.
- Effort: S

---

### [BUG-07] Logistics API throws for every real event id
- Severity: **P1** | Interview Risk: LOW | Confidence: **CONFIRMED**
- Category: bug
- Location: `app/api/production/logistics/[id]/route.js:10-12, 46-47`
- What's wrong: it uses `mongoose.Types.ObjectId.isValid` but never imports `mongoose`. UI links use `event._id` (`components/shared/EventSelectionPage.jsx:55`), and `isNaN("6967…b206") === true`, so the code always reaches the undefined `mongoose` and gets `ReferenceError`, then a 500. It also reads `eventDetails.name` and `.location`, which don't exist on the Event schema (`title`, `city`). Separately, there's a hardcoded `'project-alpha'` to `'Hamlet World Tour'` lookup.
- Fix: import mongoose, use `title` and `city`, remove the magic id, add auth.
- Effort: S

---

### [BUG-08] Production task creation always fails, and task listing shows everyone's tasks
- Severity: **P1** | Interview Risk: LOW | Confidence: **CONFIRMED** (by schema)
- Category: bug
- Location: `app/api/production/tasks/route.js:36-63` vs `models/Task.js:5`
- What's wrong: `Task.eventId` is `required: true`, but POST never sets it, so it always fails validation ("Failed to create task"). POST also writes `showName`, `venue`, `assignedTo` and `assignedToName`, which aren't in the schema and get silently dropped by strict mode. GET does `Task.find({})` with no user or event scoping. The status vocabulary disagrees too: model default `'pending'`, POST `'Pending'`, GET maps `'Done'`.
- Fix: decide whether tasks belong to an event (schema says yes). Require `eventId` and authorize it via `loadEventFor`. Add the denormalized fields to the schema or drop them. Use one status enum.
- Effort: S

---

### [ERR-01] `verifyAuth` throws instead of returning null: unauthenticated calls return 500, not 401
- Severity: **P2** | Interview Risk: **HIGH** | Confidence: **CONFIRMED**
- Category: error-handling / API design
- Location: `lib/auth.js:8-16`; every `if (!user) return 401` that follows it (~35 routes) is dead code. Also `app/api/events/[id]/route.js:72, 100` dereferences `event.organizerId` before the null check (a missing event gives 500, not 404).
- What's wrong: the throw is caught by each route's generic `catch`, which responds `500 Server Error`. Clients can't tell "log in again" from "server broken", and error monitoring fills with false 500s.
- Fix: one `AuthError` (and `ForbiddenError`/`NotFoundError`) class plus a small `withApi(handler)` wrapper that maps them to 401/403/404. This pairs with SEC-03's `lib/authz.js`.
- Effort: S–M

---

### [VAL-01] Mass assignment and no schema validation on request bodies
- Severity: **P2** | Interview Risk: **HIGH** | Confidence: **CONFIRMED**
- Category: validation / security
- Location: `app/api/events/route.js:44-47` (`new Event({...body, …})`, so a client can set `ticketTiers[].sold`, `status`, `artistId`, `assignedTo`); `app/api/events/[id]/route.js:76-80` (`findOneAndUpdate(query, {...body})`, so an organizer can set `organizerId` to someone else); `app/api/production/tasks/route.js:72-76` (`...updates`); `app/api/venues/route.js:47` (`Venue.create(body)`); `app/api/fan/poll/route.js:80` (`options.map` crashes with 500 if `options` is missing)
- Fix: introduce `zod` schemas per route (whitelisting fields) and return 400 with field errors. Start with orders, events, setlist, polls and predictions.
- Effort: M

---

### [SEC-08] Unescaped user input in `$regex` / `new RegExp` (ReDoS, crashes, wrong matches)
- Severity: **P2** | Interview Risk: MEDIUM | Confidence: **CONFIRMED** (setlist case verified with Node)
- Category: security / bug
- Location: `app/api/artist/setlist/route.js:62` (`new RegExp('^'+item.title+'$','i')`); `app/api/venues/route.js:12-13`; `app/api/users/search/route.js:23`; `app/api/discover/route.js:58-94`; `app/api/reports/route.js:93`
- What's wrong: a song titled `My Song (Live` throws `Unterminated group`, so the whole setlist save returns 500. A title of `.*` matches and links to an arbitrary existing song. Catastrophic patterns like `(a+)+$` can pin a Mongo CPU core (ReDoS).
- Fix: escape with `s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`, or for exact title matching store a normalized `titleLower` field with an index and use equality.
- Effort: S

---

### [SEC-09] Self-assigned roles at signup; no rate limiting on auth
- Severity: **P2** | Interview Risk: MEDIUM | Confidence: **CONFIRMED**
- Category: security
- Location: `app/api/auth/signup/route.js:10, 33` (`role` comes from the request body); `app/api/auth/login/route.js` (no throttling); no password-length or email-format validation
- What's wrong: anyone can register as `organizer` or `production`. That may be an intended product choice for a demo, but it should be a conscious, documented decision (e.g. "organizer accounts require approval in production"). Unlimited login attempts allow credential stuffing.
- Fix: validate role against an allow-list, and document the trade-off (or gate privileged roles behind approval). Add basic login rate limiting per IP and email. Enforce a minimum password length.
- Effort: S

---

### [BUG-09] Event short-id generation collides after deletions and races on concurrent creates
- Severity: **P2** | Interview Risk: MEDIUM | Confidence: **CONFIRMED** (by logic)
- Category: bug / data
- Location: `app/api/events/route.js:41-42`; unused `models/Counter.js`
- What's wrong: `eventId = 1000 + countDocuments() + 1`. After deleting any event, the next create reuses an id that still exists, hits the unique index and returns 500. Two simultaneous creates get the same id.
- Fix: use the existing `Counter` model with `findOneAndUpdate({id:'eventId'}, {$inc:{seq:1}}, {upsert:true, new:true})`, which is atomic.
- Effort: S

---

### [BUG-10] Hardcoded or fake data presented as real features
- Severity: **P2** | Interview Risk: **HIGH** | Confidence: **CONFIRMED**
- Category: docs / honesty
- Location: `python-service/main.py`, `sentiment_model.py`, `requirements.txt` (all **0 bytes**); `app/api/sentiment/route.js`, `app/api/wizard/generate/route.js`, `lib/gemini.js` (0 bytes); `app/(organizer)/analysis/page.jsx:38-42` (hardcoded `REVIEWS` plus "Our advanced sentiment analysis engine…"); `components/fan/dashboard/LivePollCard.jsx:26` (`votes: 12`); `app/(production)/live/[id]/page.jsx:85` (`bpm: 128`)
- Why it matters: an interviewer who opens the repo and sees an empty `sentiment_model.py` next to a UI claiming sentiment analysis will doubt every other claim.
- Fix: delete the empty files, label mock UI as "sample data", or implement the feature for real (see the NOT-recommending section in the plan).
- Effort: S

---

### [PERF-01] Production screen polls a 3-query endpoint every second *and* listens to sockets
- Severity: **P2** | Interview Risk: **HIGH** | Confidence: **CONFIRMED** (by code); load impact **SUSPECTED**
- Category: performance / architecture
- Location: `app/(production)/live/[id]/page.jsx:113-118` (`setInterval(fetchShowData, 1000)`); `app/api/production/live/route.js:65-87` (Event+venue populate, Setlist+songs populate, Poll)
- What's wrong: each open crew screen makes 3 Mongo round-trips per second, and it uses two sources of truth: polling overwrites socket-applied state every second, which can cause flicker or regressions. "Why do you have both WebSockets and 1-second polling?" is a near-certain question.
- Verify: count requests/sec in the Network tab with N screens open, and time the endpoint (p50/p95).
- Fix: make the server authoritative. Persist state, then emit to the room with the full state snapshot. On (re)connect the client fetches once (or uses Socket.IO connection-state recovery). Keep a slow (e.g. 15–30 s) reconciliation poll as a fallback, and **measure** before and after.
- Effort: M

---

### [TEST-01] Zero automated tests and no CI
- Severity: **P2** | Interview Risk: **HIGH** | Confidence: **CONFIRMED**
- Category: testing
- Location: repo-wide; no `test` script in `package.json`; `.github/` holds only an empty `appmod/appcat` directory
- Why it matters: BUG-01 (a crash on the purchase path) passed `next build`. Without tests, none of the fixes above can be shown to stay fixed.
- Fix: Vitest + `mongodb-memory-server` (in replica-set mode, so transactions work) and call route handlers directly with `new Request(...)`. Priority targets: order/inventory, authz matrix, voting, prediction scoring. Add a GitHub Actions workflow running lint (errors), tests and build.
- Effort: M (setup) + ongoing

---

### [ARCH-01] Auth and event-id resolution logic duplicated in many inconsistent variants
- Severity: **P2** | Interview Risk: MEDIUM | Confidence: **CONFIRMED**
- Category: architecture
- Location: auth is done three ways: `lib/auth.js` (jsonwebtoken + `cookies()`), inline `jose` `jwtVerify` (orders, events/[id], ticketing, reports, analysis, fan/ticket, auth/me) and `middleware.js` (jose). Numeric-vs-ObjectId event resolution is reimplemented in about 9 routes with different rules (`isValidObjectId` vs `/^[0-9a-f]{24}$/` vs `isNaN`), which is the direct cause of BUG-07.
- Why it matters: SEC-03 exists because there's no single place to put authorization.
- Fix: `lib/authz.js` (one JWT library: `jose`, which works in both edge and node) plus `lib/events.js#resolveEvent(id)`. Do this as part of the Phase 1 work, not as a separate refactor.
- Effort: M (overlaps SEC-03)

---

### [LLM-01] LLM output trusted without validation; no timeout; the LLM does deterministic work
- Severity: **P2** | Interview Risk: **HIGH** (for AI/ML roles) | Confidence: **CONFIRMED**
- Category: LLM
- Location: `app/api/patch/route.js:15-56`; `app/api/description/route.js:41-57`; `components/production/patcher/PatchingSidebar.jsx:20-30`
- What's wrong:
  - `/api/patch` asks Gemini to "find the next available address gaps" and "ensure they do NOT overlap" for DMX patching. That's a deterministic interval-allocation problem that an LLM will sometimes get wrong.
  - The result is fence-stripped with a regex, passed to `JSON.parse` (a 500 on any deviation), and handed to the UI **without validating** that `address` is in 1..512, `universe` ≥ 1, or that ranges don't overlap.
  - User text is interpolated directly into the instruction string (prompt injection; low impact today because there are no tools or side effects, but worth naming).
  - There's no request timeout, so a hung Gemini call holds the request until the platform kills it.
  - `/api/description` is better: it has a fallback on a parse failure.
- Fix: see UPG-03 in the plan. The LLM extracts **intent** (fixture type, count, mode) into a zod-validated schema with one repair retry. A pure function allocates addresses with a collision-free guarantee. Use `AbortController` timeouts and native `responseMimeType: "application/json"` with a response schema.
- Effort: M

---

### [DOC-01] README is create-next-app boilerplate; no `.env.example`
- Severity: **P2** | Interview Risk: MEDIUM | Confidence: **CONFIRMED**
- Category: docs / DX
- Location: `README.md`
- What's wrong: there's nothing on what StageVerse is, the roles, how to seed data, or the required env vars. From source, those are `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET`. There's also no architecture explanation and no demo.
- Fix: covered in Phase 7.
- Effort: S–M

---

### [ERR-03] Internal error messages returned to clients
- Severity: P3 | Interview Risk: LOW | Confidence: CONFIRMED
- Location: `app/api/events/route.js:56`, `app/api/events/[id]/ticketing/route.js:69,140`, `app/api/production/events/[id]/route.js:74,104`, `app/api/artist/setlist/route.js:37`, `app/api/description/route.js:78`, `app/api/production/live/route.js:141`, `app/api/venues/route.js:55`
- Fix: log details server-side and return a generic message plus a request id (comes free with ERR-01's wrapper).
- Effort: S

### [BUG-11] `/api/auth/me` always returns name "User" and an undefined email
- Severity: P3 | Interview Risk: LOW | Confidence: CONFIRMED
- Location: `app/api/auth/me/route.js:15-20` reads `payload.name`/`payload.email`, but login signs only `{userId, role}` (`app/api/auth/login/route.js:32-35`).
- Fix: look the user up by id (keeps the JWT small and always fresh) or add the fields to the token.
- Effort: S

## 5. Hygiene Bundle

- Stray debug artifacts are **committed**: `check_event.js`, `debug-polls.js` (which also parses `.env.local` by hand), `debug_api.log`. Remove them and add `*.log` to `.gitignore`.
- Remaining ESLint errors after the real bugs: 49× `react/no-unescaped-entities`, 13× `set-state-in-effect`, 6× `static-components`, 1× `purity` (`Math.random` in render, `components/ConcertLights.jsx:96`), 10× `<img>` instead of `next/image`.
- Debug logging of full request bodies and documents (`app/api/events/route.js:40-50` logs the whole create-event body; `[Declare Results]`, `[API]` console spam); production socket handlers log every vote.
- Unused or duplicate dependencies: `react-router-dom` (no imports in a Next app), two drag-and-drop libraries (`@dnd-kit/*` and `@hello-pangea/dnd`), two JWT libraries (`jsonwebtoken` and `jose`).
- `models/Event.js:120` deletes the cached model in development on every import. It works, but it's a hack worth a comment or removal.
- Next 16 deprecation: rename `middleware.js` to `proxy.js`.
- Mixed id strategies (numeric `eventId` and ObjectId) everywhere. Pick one for URLs.
- Empty `.github/appmod/appcat/` directory.
- Commit messages ("Final touches 2", "Completed sockstesgit add .!"). From now on, use the `fix(ID): …` convention in the plan; the history itself becomes evidence.
- ~~Several files have statements glued onto one line~~ **Corrected during Phase 1:** these were bare carriage returns (730 in 130 files). JavaScript treats a lone CR as a line break, so the code ran correctly, but grep/sed/diff saw one long line. Normalized in commit f9f89ac (word diff empty, lint unchanged).
- Large untracked binary assets (`public/*.glb`, `public/textures/`): decide whether to commit them (consider Git LFS) before the next `git add .`.

## 6. Things That Could Not Be Verified

| Item | Why not | How to verify |
|---|---|---|
| Runtime behaviour of any flow | The app needs `.env.local` (not read) and the live Atlas DB | Phase 0: run against `mongodb-memory-server` or a local Mongo with seed data |
| BUG-04 Encore always "Midnight City" | Traced through code, not run | Start poll → vote for another option → Reveal |
| BUG-06 hooks crash in practice | Depends on render order | Open `/live/<id>` with a slow network (DevTools throttling) and watch the console |
| PERF-01 actual load | No load test | Open 5 crew tabs; measure req/s and p95 of `/api/production/live` |
| Socket.IO in deployment | The branch is named `deployment`, but no deploy config is in the repo. `pages/api/socket/io.js` attaches to `res.socket.server`, which **does not persist on serverless hosts such as Vercel** | Confirm the hosting target. If it's Vercel, sockets need a separate long-running service or a hosted pub/sub. Test on the real host. |
| `xlsx` vulnerability reachability | Need to confirm whether user-supplied spreadsheets are ever parsed | `grep -rn "XLSX.read\|xlsx.read" app components` |
| Whether the uncommitted changes (9 files) are intended | They're work in progress on `deployment` | The developer should commit or stash before Phase 0 |

## 7. Things I Must NOT Claim in an Interview (current state)

- "It's secure", "role-based access control", or "only artists can control their show": false (SEC-02, SEC-03).
- "Prevents overselling" or "ticket inventory is consistent": false (BUG-03).
- "Fans get a digital ticket with a QR code after purchase": false; no Ticket is created (BUG-02).
- "Real-time voting with one vote per fan": false (SEC-04).
- "Sentiment analysis", "Python ML microservice", or "AI-powered analytics": the service files are empty and reviews are hardcoded (BUG-10).
- "The AI patches fixtures without collisions": it's unvalidated LLM output (LLM-01).
- "Payments": orders are marked `Paid` with no payment step.
- "It's tested" or "production-ready": 0 tests, 82 lint errors, 19 vulnerable packages.
- "Real-time over WebSockets" without mentioning the 1-second polling (PERF-01).
- "Scales to many concurrent shows": events are broadcast globally (BUG-05), and in-process Socket.IO state doesn't scale past one instance.
