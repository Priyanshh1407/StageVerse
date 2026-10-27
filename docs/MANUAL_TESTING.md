# Manual testing guide

A click-by-click checklist for every upgrade made during the audit (see [`FIX_LOG.md`](../FIX_LOG.md) for the story behind each one). Each check says **what to do** and **what you should see**. IDs like `SEC-03` match the audit report.

Some protections can only be checked by trying something the UI never lets you do (another user's data, voting twice). For those there's a snippet to paste into the browser's DevTools console (F12 → Console) **while on the app's page**, so it runs with that browser's login.

> Everything here is also covered by the automated suite (`npm test`, 233 tests). This guide is for seeing it work end to end in a real browser.

---

## 0. Setup (once, ~5 minutes)

```bash
npm install
cp .env.example .env.local      # fill in MONGODB_URI and JWT_SECRET; GEMINI_API_KEY and GROQ_API_KEY for AI
npm run seed -- --yes           # demo users, 2 shows, setlists, fan tickets, song catalogue
npm run dev                     # http://localhost:3000
```

The seed prints both shows' URLs. **Re-run `npm run seed -- --yes` any time to reset both shows to Standby** before repeating the live-show tests.

**Demo accounts** (password `password123`):

| Role | Email | Home page |
|---|---|---|
| Fan | `fan@stageverse.demo` | `/dashboard` |
| Artist | `artist@stageverse.demo` | `/artist-dashboard` |
| Organizer | `organizer@stageverse.demo` | `/manage/dashboard` |
| Production crew | `production@stageverse.demo` | `/prod-dashboard` |

**Shows:** "StageVerse Demo Night" (short id **9001**) and "StageVerse Demo Night 2" (short id **9002**), same artist and crew.

**You need separate logins at once.** Each browser profile or incognito window keeps its own cookie. A simple layout: normal Chrome window = artist, Chrome incognito = crew, a second browser (Edge/Firefox) = fan.

---

## 1. Login, signup and sessions

| # | Check | Steps | Expected |
|---|---|---|---|
| 1.1 | Short password rejected (SEC-09) | `/signup`, password `short` | "Password must be at least 8 characters" |
| 1.2 | Bad email rejected (SEC-09) | `/signup`, email `not-an-email` | "Please enter a valid email address" |
| 1.3 | Emails are case-insensitive (SEC-09) | Sign up `Test@Example.com`, then try `test@example.com` | Second signup: "User already exists" |
| 1.4 | Password guessing is throttled (SEC-09) | `/login` as `fan@stageverse.demo` with a wrong password 6 times within a minute | Attempts 1–5: "Invalid credentials."; 6th: "Too many requests…". Works again after a minute |
| 1.5 | Real profile in the session (BUG-11) | Log in as the artist, open `/api/auth/me` | `name: "Demo Artist"` and the real email (used to say "User") |
| 1.6 | Logged out = 401, not 500 (ERR-01) | In a logged-out window, open `/api/fan/notifications` | Status **401** with `"Unauthorized: No token provided"` |

## 2. Page access by role (proxy.js)

| # | Check | Steps | Expected |
|---|---|---|---|
| 2.1 | Anonymous users go to login | Logged out, open `/live-show` and `/tasks` | Redirected to `/login` |
| 2.2 | A role can't open another role's pages | As the fan, open `/live-show`, `/create-event`, `/prod-dashboard` | Redirected to `/dashboard` |
| 2.3 | `/live` (crew) isn't `/live-show` (artist) | As the artist, open `/live-show` → allowed; open `/live` → redirected to `/artist-dashboard` | As shown |
| 2.4 | Logged-in users skip the login page | Logged in as the organizer, open `/login` | Redirected to `/manage/dashboard` |

## 3. Nobody can act on data they don't own (SEC-03, ARCH-01)

**Log in as the fan**, open any app page, then paste each snippet into the console. Every one should print **403**.

```js
// Overwrite the artist's setlist (used to succeed)
await fetch('/api/artist/setlist', { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ eventId: '9001', items: [{ title: 'Hacked' }] }) }).then(r => r.status)

// Read the real setlist to cheat at predictions (SEC-05)
await fetch('/api/artist/setlist?eventId=9001').then(r => r.status)

// Grade the prediction game
await fetch('/api/artist/declare-results', { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ eventId: '9001' }) }).then(r => r.status)

// Read the day sheet (it contains the venue wifi password)
await fetch('/api/artist/day-sheet/9001').then(r => r.status)

// Change the live show's status (SEC-02)
await fetch('/api/production/live', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ eventId: '9001', status: 'Paused' }) }).then(r => r.status)

// List every user's email
await fetch('/api/users/search?query=de').then(r => r.status)
```

**Cross-organizer revenue (IDOR).** Sign up a second organizer (e.g. `organizer2@test.dev`), log in as them, then:

```js
const { events } = await fetch('/api/events').then(r => r.json());
const demo = events.find(e => e.eventId === 9001);
await fetch(`/api/reports?eventId=${demo._id}`).then(r => r.status)   // 403 (used to return the revenue)
```

**Ownership can't be transferred.** As the demo organizer, open "StageVerse Demo Night" for editing in the organizer UI and save it. It still belongs to you. Then try to move it via the API (expected `200`, but `organizerId` unchanged):

```js
const { events } = await fetch('/api/events?mode=organizer').then(r => r.json()).then(j => ({ events: j.data }));
const ev = events.find(e => e.eventId === 9001);
await fetch(`/api/events/${ev._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: ev.title, organizerId: '507f1f77bcf86cd799439011' }) }).then(r => r.json()).then(j => j.data.organizerId)
// -> still your own id
```

## 4. Live show: sync, isolation and voting

Open three windows:
- **Artist:** `/live-show` → "StageVerse Demo Night"
- **Crew:** `/live` → "StageVerse Demo Night" (use a desktop-width window; the crew screen is desktop-only)
- **Fan:** `/dashboard`

Optional fourth window, crew on the **other** show: `/live` → "StageVerse Demo Night 2".

| # | Check | Steps | Expected |
|---|---|---|---|
| 4.1 | Instant sync (PERF-01) | Artist: **Start Show** | Crew screen switches to Live within about a second; first song highlighted |
| 4.2 | Shows don't leak into each other (BUG-05) | Watch the Demo Night 2 crew tab during 4.1 | Nothing changes there |
| 4.3 | Pause / resume | Artist: emergency pause, then resume | Crew status follows; timer re-syncs |
| 4.4 | Last-song alert | Artist: last-song warning → confirm | Crew gets the full-screen red alert; it clears after ~30 s |
| 4.5 | Poll goes out from the server (SEC-04) | Artist: **Trigger Encore Poll** → "Create New Poll (Template)" → activate | Fan sees the poll pop up; crew sees the question with 0 votes |
| 4.6 | Real tallies, no fake "12 votes" | Fan: vote | Crew's tally goes to 1 (it used to show 12 for every option) |
| 4.7 | One fan, one vote | Fan: try voting again; or in the fan console run the snippet below | UI won't allow it; the snippet's second call prints **409** |
| 4.8 | Late joiners see the open poll | While the poll is open, reload the fan window | Poll card comes back (used to be lost) |
| 4.9 | Server decides the winner (BUG-04) | Wait for the poll to close (60 s), then crew: **Reveal Winner** | The encore screen shows the option with the most votes (used to say "Midnight City" on other screens) |
| 4.10 | Crew sees sync problems (ERR-02) | Stop `npm run dev` while the crew screen is open | "Lost Connection" toast; amber "Sync problem" banner within ~20 s; restart the server and it recovers |

```js
// 4.7: in the FAN console while a poll is open
const { poll } = await fetch('/api/fan/poll?eventId=9001').then(r => r.json());
const vote = () => fetch('/api/fan/poll', { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pollId: poll._id, optionId: poll.options[1]._id }) }).then(r => r.status);
console.log(await vote(), await vote());   // 409 409 if you already voted in the UI, else 200 409
```

## 5. Setlist prediction game (SEC-05)

Run `npm run seed -- --yes` first so the show is on Standby.

| # | Check | Steps | Expected |
|---|---|---|---|
| 5.1 | Repeating a song doesn't multiply points | Fan console: first snippet below. Then artist: `/setlist-builder` → **Declare Results**. Then fan console: second snippet | Score **15** (used to be 35) |
| 5.2 | Predictions lock when the show starts | Artist: Start Show on Demo Night. Fan: change the prediction on `/dashboard` and save | "Predictions are closed: the show has started" |

```js
// 5.1: in the FAN console (show must be on Standby)
await fetch('/api/fan/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ eventId: '9001', songs: [{ title: 'Opening Lights' }, { title: 'Opening Lights' }, { title: 'Opening Lights' }] }) }).then(r => r.status)

// 5.1, after the artist declares results: read your graded prediction
await fetch('/api/fan/predict?eventId=9001').then(r => r.json()).then(j => ({ score: j.data.score, rank: j.data.rank, status: j.data.status }))
// -> { score: 15, rank: 1, status: "graded" }
```

## 6. Artist tools

| # | Check | Steps | Expected |
|---|---|---|---|
| 6.1 | Special characters in song titles (SEC-08) | `/setlist-builder` → add a song titled `My Song (Live` → **Save Setlist** | Saves (used to crash with a server error) |
| 6.2 | Guest list per show (BUG-13) | `/guest-list` | A **Show** picker with both demo shows; adding a guest adds it to the selected show (it was hardcoded to event 13) |
| 6.3 | Venue Intel typing (BUG-16) | `/day-sheet` → pick a show → Venue Intel edit (pencil) → type a long wifi name | Typing is continuous (it used to lose focus after every character) |
| 6.4 | Tech rider loading | `/tech-rider` | Loads the first show's rider without flashing an empty state |
| 6.5 | Polls start closed | `/setlist-builder` → configure an encore poll | Fans don't see it until the artist activates it on the live-show screen |

## 7. Organizer and production tools

| # | Check | Steps | Expected |
|---|---|---|---|
| 7.1 | Event ids never collide (BUG-09) | Organizer: create an event, delete it, create another | No error; each new event gets a new short id |
| 7.2 | Create Show modal opens (BUG-15) | Crew: `/prod-dashboard` → create a show | Modal opens (it used to crash on missing icons) |
| 7.3 | Show at a brand-new venue (BUG-14) | In that modal, type a venue name that doesn't exist → create | Show is created (used to fail validation) |
| 7.4 | Tasks need a show and stay scoped (BUG-08) | Crew: `/tasks` → new task without picking a show → save | Error toast, modal stays open. With a show picked it saves. The show dropdown lists only your shows |
| 7.5 | No invented data (BUG-10) | Organizer: `/analysis` | Reviews are labelled "Sample Reviews (demo data)" and the copy says sentiment analysis isn't built |
| 7.6 | Search input is literal (SEC-08) | `/explore` and the create-event venue search: type `(` | No error, just no results |

**Validation (VAL-01).** As the organizer, in the console:

```js
// Malformed JSON -> 400 (used to be 500)
await fetch('/api/venues', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops' }).then(r => r.status)

// Missing required field -> 400 with the field name
await fetch('/api/venues', { method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'X', city: 'Y' }) }).then(r => r.json())
```

## 8. AI features: provider chain and fallbacks (LLM-01, UPG-03)

Normal operation tries **Gemini 3.8 Flash → Gemini 3.5 Flash-Lite → Groq gpt-oss-120b**, and every AI response says which one answered. Open DevTools → **Network**, click the request (`generate`, `description` or `patch`) and look at the **Response**:
- `model` / `provider` show who answered.
- `degraded: true` means no AI answered and a non-AI fallback was used.

> Free Gemini keys allow only 20 requests/day per model. If Gemini's quota is used up, responses will show Groq. That's the chain working.

| # | Feature | Steps | Expected (AI available) |
|---|---|---|---|
| 8.1 | Organizer insight | `/manage/dashboard` → AI box → generate | Short copy; response has `degraded: false` |
| 8.2 | Event description | `/create-event` → fill artist, genre, vibe → **Generate AI** | Structured draft (HEADLINE / HOOK / …) |
| 8.3 | Song suggestions | `/setlist-builder` → **Suggest Songs with AI** | Songs added to the bank |
| 8.4 | Reorder setlist | `/setlist-builder` → **Optimize Flow** → submit | Setlist reordered |
| 8.5 | DMX patch: add (UPG-03) | Crew: `/patch-studio/9001` → AI box: `add 8 beams and 4 washes` | 12 fixtures, no overlapping addresses; washes keep 14 channels (no longer forced to 16) |
| 8.6 | "Patch" means add | `Patch 6 spots` | Spots are **added**; existing fixtures don't move |
| 8.7 | Repatch | Make two fixtures overlap, then `fix collisions` | All addresses re-packed without overlaps; every fixture keeps its channel count |
| 8.8 | Abuse limit (intentional) | Click generate 11 times within a minute | 11th: "Too many requests" (protects your quota and bill) |

**Force each fallback level.** Start the server from a *new* terminal with an override. Real environment variables take priority over `.env.local`, and closing that terminal undoes it.

Git Bash (the prefix applies to that one command only):

```bash
# Level 2: primary model fails -> Flash-Lite answers (response model: gemini-3.5-flash-lite)
GEMINI_MODEL=gemini-model-that-does-not-exist npm run dev

# Level 3: both Gemini models fail -> Groq answers (response model: openai/gpt-oss-120b)
GEMINI_API_KEY=invalid npm run dev

# Level 4: every provider fails -> non-AI fallbacks (response degraded: true)
GEMINI_API_KEY=invalid GROQ_API_KEY=invalid npm run dev
```

PowerShell (in a fresh terminal; the variable lasts until you close it):

```powershell
$env:GEMINI_MODEL='gemini-model-that-does-not-exist'; npm run dev   # level 2
$env:GEMINI_API_KEY='invalid'; npm run dev                          # level 3
$env:GEMINI_API_KEY='invalid'; $env:GROQ_API_KEY='invalid'; npm run dev   # level 4
```

With **level 4** active, repeat 8.1–8.5. Each still answers, with an "AI is busy" note:

| Feature | Fallback answer |
|---|---|
| Insight / description | Template copy built from your input |
| Song suggestions | Songs from the artist's own catalogue (seeded: Opening Lights, Midnight Drive, …) |
| Reorder | Energy curve by BPM. With the seeded setlist: Opening Lights (128) → Neon Run (118) → Slow Burn (72) → Midnight Drive (96) → Encore Anthem (140): strong opener, dip in the middle, biggest track last |
| DMX patch | `add 8 beams and 4 washes` still works (rule-based reader); `make it look cool` gets a "Try something like…" hint |

## 9. Platform checks

| # | Check | Steps | Expected |
|---|---|---|---|
| 9.1 | Health endpoint | Open `/api/health` | `{"status":"ok","db":"up","latencyMs":…}`; no connection strings or error details |
| 9.2 | No tempo invented | Crew live screen on a song without a BPM | Shows "—" (used to show 128) |
| 9.3 | Lint, tests, build | `npm run lint`, `npm test`, `npm run build` | 0 lint errors (warnings only), 233 tests passing, build succeeds |
| 9.4 | Benchmark | `npm run bench`, then open `bench/results/live-run.json` | Push p50 of a few ms; setlist lookup examines 1 document |
| 9.5 | AI eval | `npm run eval:patch -- --provider groq` (~65 Groq calls, ~15 min) | A new file in `evals/patch/results/` with 0% collisions for the new pipeline |

---

## 10. Homepage show (UPG-04)

Use the production build (`npm run build && npm start`); dev mode is much slower for 3D. Keep the laptop plugged in.

| # | Check | Steps | Expected |
|---|---|---|---|
| 10.1 | First paint | Open `/` | The headline appears immediately as HTML; the 3D stage fades in behind it a moment later |
| 10.2 | Scroll runs the show | Scroll slowly through the section | House lights down → "Cue 1/2/3 · GO" (rig powers up, camera moves) → one card per role (Fan, Artist, Organizer, Crew), with the rig recoloured for each → a riser (beams tighten) → the drop (strobe and blinders) → "You call the encore". Scrolling back plays it backwards |
| 10.3 | Encore colour | At the encore, click a colour | The whole rig (beams, lasers, LED screens) changes to it. Nothing is saved (local only) |
| 10.4 | Lighting desk takes over | Click **Lighting desk**, move any control | The panel says "You have the lights"; scrolling no longer changes the lights. Try Master (blackout), beam count, sweep/speed, colours, lasers (count and colour), blinders, haze |
| 10.5 | Strobe and DROP | Hold **STROBE**; click **DROP** | Strobe flashes only while held; DROP converges the beams with a flash and releases by itself |
| 10.6 | Resume show | Click **Resume show** | The desk lets go and the scroll show takes over again |
| 10.7 | Concert mode | Click **Play the show with sound** (only shown if `public/audio/A Sky Full of Stars.mp3` exists) | Music plays; beams and crowd pulse on the beat; the camera cuts every 8 bars; strobe + blinders hit at 0:46, 1:17 and 2:49. The timeline shows the sections and loudness; clicking it seeks and the lights follow |
| 10.8 | Desk during a song | While the song plays, touch the desk, then Resume show | The desk takes over; Resume returns to the song's programmed show at the current time |
| 10.9 | Concert mode hidden without the song | Temporarily rename the MP3, reload | No "Play the show" button (the page checks the file with a HEAD request first) |
| 10.10 | Quality tiers | Open `/?tier=0`, `/?tier=1`, `/?tier=2` | 0: poster with the 2D lights; 1: 72 beams, no bloom; 2: 100 beams with bloom |
| 10.11 | Reduce motion | DevTools → Rendering → "Emulate CSS prefers-reduced-motion: reduce", reload | The poster without animation; the text, cards and desk still work |
| 10.12 | Paused off-screen | Scroll down to the events, watch Task Manager → GPU | GPU use drops to about zero (the canvas stops rendering) |
| 10.13 | Benchmark | Open `/lab/stage` → **Run benchmark** (~40 s, tab in front), then **Copy results** | Average and 1%-low FPS per configuration (full scene at DPR 1 and at native DPR) |
| 10.14 | Song analysis | `npm run analyse:song -- "public/audio/A Sky Full of Stars.mp3" sky-full-of-stars "A Sky Full of Stars"` | ~125 BPM, 10 sections, ~22 cues; rewrites `public/shows/sky-full-of-stars.show.json` |
| 10.15 | Phone width | DevTools device mode, 375 px | Text fits, the desk opens as a full-width panel, no horizontal scroll |
| 10.16 | No socket on public pages | Open `/` logged out, check the console | No "Socket connection error" warnings (the socket only connects on live-show pages) |

---

## 11. Automated tests (Git Bash)

Run from the project folder (`cd /d/Projects/stageverse`). None of these touch your real database: the tests start an in-memory MongoDB (the first run downloads a ~100 MB `mongod` binary and caches it) and mock every AI provider.

```bash
# Everything: 233 tests, about 1-2 minutes
npm test

# Watch mode while editing (re-runs affected tests on save)
npm run test:watch

# Coverage report (summary in the terminal, full HTML report in coverage/index.html)
npm run test:coverage

# One area at a time
npx vitest run tests/security/authz-matrix.test.js    # who may do what on every route (SEC-03)
npx vitest run tests/security/socket.test.js          # live-show socket auth, rooms, typed protocol (SEC-02, BUG-05, UPG-02)
npx vitest run tests/unit/show.test.js                # homepage show: song analysis on a synthetic click track, cue engine (UPG-04)
npx vitest run tests/security/voting.test.js          # one fan one vote, 20 concurrent votes (SEC-04, BUG-04)
npx vitest run tests/security/predictions.test.js     # prediction scoring and locking (SEC-05)
npx vitest run tests/security/events.test.js          # event short ids, new-venue shows (BUG-09, BUG-14)
npx vitest run tests/security/tasks.test.js           # production tasks (BUG-08)
npx vitest run tests/security/regex.test.js           # special characters in search and titles (SEC-08)
npx vitest run tests/security/validation.test.js      # request body schemas (VAL-01)
npx vitest run tests/security/abuse.test.js           # rate limits, signup/login rules, /me (SEC-06, SEC-09, BUG-11)
npx vitest run tests/security/errors.test.js          # 401/403/404 instead of 500 (ERR-01)
npx vitest run tests/security/proxy.test.js           # page access by role, /api/health
npx vitest run tests/security/patch.test.js           # AI patch route end to end (UPG-03)
npx vitest run tests/security/ai-fallback.test.js     # every AI feature still answers when all providers are down
npx vitest run tests/unit                              # pure logic: scoring, polls, DMX allocator (incl. property tests), LLM chain

# A single test by name
npx vitest run -t "20 simultaneous votes"

# Lint (CI fails on any error) and production build
npm run lint
npm run build

# Performance benchmark (writes bench/results/live-run.json)
npm run bench
BENCH_LABEL=mytest npm run bench                       # writes bench/results/live-mytest.json

# AI patch eval: these make REAL API calls with your keys
npm run eval:patch -- --fake                           # harness self-check, no API calls
npm run eval:patch -- --provider groq                  # ~65 Groq calls, ~15 min at the default 5/min pace
npm run eval:patch -- --provider groq --rpm 20         # faster, if your Groq limits allow
npm run eval:patch -- --model gemini-3.5-flash-lite    # Gemini (free tier: 20 requests/day per model)

# Dependency audit (expect 1 known, unreachable advisory: xlsx)
npm audit --omit=dev
```

Same as CI runs on every push (`.github/workflows/ci.yml`):

```bash
npm ci && npm run lint && npm run test:coverage && npm run build
```

---

**Not covered here:** ticketing (purchase, tickets, inventory) is parked; see "Parked: Ticketing" in [`UPGRADE_PLAN.md`](../UPGRADE_PLAN.md). The ticket widget's crash (BUG-01) still exists by design until that work resumes.
