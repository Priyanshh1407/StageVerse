# StageVerse

![CI](https://github.com/Priyanshh1407/StageVerse/actions/workflows/ci.yml/badge.svg)

A live-event platform that connects the four groups behind a concert: **fans**, **artists**, **organizers** and the **production crew**. Organizers publish shows, artists build setlists, tech riders and day sheets, crews patch lighting and track logistics, and during the show the artist's console, the crew's screens and fans' phones stay in sync in real time, including a live encore vote.

Built with Next.js 16 (App Router), MongoDB/Mongoose, Socket.IO and Google Gemini.

## What each role can do

| Role | Highlights |
|---|---|
| **Fan** | Discover events, predict the setlist (scored after the show), vote in the live encore poll, memory vault |
| **Artist** | Setlist builder, encore polls, live-show console (start/pause/last-song alert), tech rider with LD assignment, day sheet, guest list |
| **Organizer** | Create and manage events, AI-written event descriptions, reports and analytics |
| **Production crew** | Live cue screen synced to the artist, DMX patch studio with an AI patch assistant, logistics board, tasks |

## Architecture

```mermaid
flowchart LR
    subgraph Browser
        F[Fan] --- A[Artist console] --- C[Crew screen] --- O[Organizer]
    end
    Browser -- "HTTPS (cookie JWT)" --> P[proxy.js<br/>page gate by role]
    P --> R[API route handlers<br/>verifyAuth + loadEventFor]
    Browser <-- "Socket.IO<br/>room event:&lt;id&gt;" --> S[lib/socketServer<br/>handshake auth, roles]
    R --> DB[(MongoDB)]
    S --> DB
    R -- "broadcast after DB write<br/>lib/realtime" --> S
    R -- "intent only" --> G[AI chain<br/>Gemini 3.8 Flash → 3.5 Flash-Lite → Groq]
    R --> D[lib/dmx/allocate<br/>deterministic addressing]
```

- **Every API route authenticates and authorizes itself.** A user's permissions on an event come from their *relation* to it (organizer / artist / assigned crew), not just their account role ([`lib/authz.js`](lib/authz.js)). The page proxy only decides which pages a role can open.
- **The server is the source of truth for live state.** Clients request changes over HTTP; the server writes to MongoDB and *then* broadcasts to the show's Socket.IO room. Details, sequence diagram and numbers: [`docs/live-sync.md`](docs/live-sync.md).
- **AI requests are always answered.** Providers are tried in order (Gemini 3.8 Flash → Gemini 3.5 Flash-Lite → Groq `gpt-oss-120b`), and a provider that just hit overload or quota is skipped for a while (circuit breaker). If none answers, each feature falls back to something useful without AI: template copy, the artist's own song catalogue, a BPM energy curve for setlist order, or a rule-based reader for patch requests. Responses say `degraded: true` when that happens ([`lib/llm.js`](lib/llm.js)).
- **The LLM interprets, code computes.** The DMX patch assistant asks Gemini only for intent (`{action, fixtures:[{type,count}]}`, JSON-schema constrained and validated, with one repair retry). A deterministic allocator assigns collision-free addresses ([`lib/dmx`](lib/dmx)).
- **The homepage is a 3D concert that runs on integrated graphics.** Light is faked instead of computed: instanced real fixture models whose pan and tilt are solved in a vertex shader, with additive cone beams (no real spotlights), each group of lights doing one job, about 31 draw calls, quality tiers with a live step-down and a 2D fallback. Scrolling runs a lighting cue stack, a lighting desk takes the lights over by hand, and concert mode plays a song with a show programmed from its own beats and sections ([`docs/homepage-show.md`](docs/homepage-show.md)).

## Run it locally (about 10 minutes)

**Prerequisites:** Node.js 22.9 or newer, a MongoDB database (local `mongod` or a free Atlas cluster), and optionally Gemini and/or Groq API keys for the AI features (without any, AI features use their non-AI fallbacks).

```bash
git clone https://github.com/Priyanshh1407/StageVerse.git
cd StageVerse
npm install
cp .env.example .env.local      # then fill in MONGODB_URI and JWT_SECRET (GEMINI_API_KEY / GROQ_API_KEY optional)
npm run seed -- --yes           # demo users, venue, event and setlist
npm run dev                     # http://localhost:3000
```

Demo accounts created by the seed script (password `password123`):

| Role | Email |
|---|---|
| Fan | `fan@stageverse.demo` |
| Artist | `artist@stageverse.demo` |
| Organizer | `organizer@stageverse.demo` |
| Production crew | `production@stageverse.demo` |

To see the live sync, open the artist's live-show page, the crew's live page and the fan dashboard for the seeded event in three browser windows.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev server / production build / production server |
| `npm test` | Full test suite against an in-memory MongoDB replica set (no network, no real DB) |
| `npm run test:coverage` | Tests with a coverage report for server code |
| `npm run lint` | ESLint (CI fails on any error) |
| `npm run seed -- --yes` | Seed demo data into the database in `.env.local` |
| `npm run bench` | Live-screen benchmark (endpoint latency, socket push latency) |
| `npm run analyse:song -- <file> <slug> <title>` | Analyse a song (tempo, beats, sections) and program its homepage light show ([docs](docs/homepage-show.md)) |
| `npm run eval:patch -- --provider groq` | AI patch-assistant evaluation, legacy vs current pipeline (~65 real API calls; `-- --fake` checks the harness without API calls) |

## Testing and quality

- **243 tests** (Vitest) covering authentication, an authorization matrix across roles and routes (including the cases that *must* still be allowed), voting integrity (20 concurrent votes from one fan count once), socket handshake auth and room isolation against a real Socket.IO server, prediction scoring, input validation, rate limiting, the DMX allocator (with property-based tests over random patches), the AI patch route with a scripted model, and the homepage show's song analysis (against a synthetic click track) and cue engine.
- **CI** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) runs lint, tests with coverage, a production build and a dependency audit on every push.
- **Manual test guide:** [`docs/MANUAL_TESTING.md`](docs/MANUAL_TESTING.md) walks through every upgraded feature in the browser (including how to force each AI fallback level) and lists the automated test commands.
- The engineering history (each bug, how it was found, the fix and the trade-off) is in [`FIX_LOG.md`](FIX_LOG.md). The audit that started it is in [`PROJECT_AUDIT_REPORT.md`](PROJECT_AUDIT_REPORT.md).

## Measured

| What | Result | Source |
|---|---|---|
| Live-state requests, 10 crew screens | 10/s → 0.5/s (push first, 20 s reconcile) | `bench/results/` |
| Socket push latency to 10 screens | p50 ≈ 3 ms, p95 ≈ 5 ms | `bench/results/` |
| Setlist lookup | 2,001 → 1 documents examined (index) | `bench/results/` |
| Production dependency advisories | 19 → 1 (`xlsx`, write-only use, not reachable) | `npm audit --omit=dev` |
| AI patching: cases with colliding DMX addresses | 17% → **0%** (30-case eval, Groq gpt-oss-120b) | `evals/patch/results/` |
| AI patching: request understood correctly | 90% → **100%** (93% before one round of prompt fixes) | `evals/patch/results/` |
| AI patching: p50 / p95 latency | 1.3 / 2.1 s → **0.78 / 1.5 s** | `evals/patch/results/` |
| Homepage 3D stage on Intel Iris Xe (integrated) | ~89 real lights → 3 cheap fills; **60 FPS**, 58 FPS 1% low with bloom at native resolution | `bench/results/stage-*.json`, [docs](docs/homepage-show.md) |
| Song analysis: *A Sky Full of Stars* | 125.1 BPM detected (published: 125), 10 sections, 22 cues | [docs](docs/homepage-show.md) |

## Known limitations

Written down on purpose: this is a portfolio project, and these are the honest edges.

- **Ticketing is on hold.** The purchase widget has a known crash (BUG-01), purchases don't issue tickets (BUG-02), and inventory updates aren't atomic (BUG-03). No real payments are taken. See "Parked: Ticketing" in [`UPGRADE_PLAN.md`](UPGRADE_PLAN.md).
- **Real-time needs one long-running Node server.** Socket.IO attaches to Next's HTTP server, so it doesn't work on serverless hosts, and rooms are in-process (multiple instances would need the Socket.IO Redis adapter).
- **Rate limits are per process** (in-memory token buckets).
- **Free AI tiers are tight** (Gemini: 5 requests/minute and 20/day per model). The provider chain and non-AI fallbacks keep features working, but fallback answers are simpler; heavy AI use needs a billed key.
- **Accounts choose their own role at signup.** Fine for a demo; a real deployment would approve organizer and crew accounts.
- **Concert mode is local-only.** The demo songs are commercial recordings, so they're gitignored and never committed or deployed. Their programmed shows (timings only, no audio) are committed in `public/shows/`, so after checking out the repo you can drop your own copy of the track into `public/audio/` with the same file name (e.g. `A Sky Full of Stars.mp3`) and the demo button appears. Without a track, "Light up your song" analyses any MP3/WAV/OGG/FLAC in the browser. Per-song touches live in `public/shows/<slug>.extras.json` (e.g. Yellow turns every light yellow at its drops).
- **Sentiment analysis isn't built.** The analysis page shows labelled sample data.
- The AI patch eval uses 30 cases I wrote, and the second prompt version was tuned on them, so its 100% intent accuracy is optimistic; a held-out case set is the next step. Gemini results are pending: the free tier's 20 requests/day per model is less than one full run.

## Project structure

```
app/            pages (grouped by role) and API route handlers (app/api)
components/     UI components by area
lib/            auth, authorization, errors, validation schemas, realtime, socket server, DMX allocator, LLM client
models/         Mongoose schemas
pages/api/socket/io.js   Socket.IO bootstrap (needs the Node server)
tests/          Vitest suites (unit, security, characterization)
bench/ evals/   performance benchmark and LLM evaluation harness
docs/           design notes
```

## Credits

3D fixture models (CC BY 4.0): "Moving Head Beam (high Poly)" by Lord Henry and "STROBO LIGHTING WASIS" by eventdesignws, both from Sketchfab. Details in [`public/fixtures/CREDITS.md`](public/fixtures/CREDITS.md).
