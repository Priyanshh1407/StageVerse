# Deploying StageVerse (Vercel)

The live site is **https://stage-verse.vercel.app/**, deployed by Vercel from the GitHub repo
`Priyanshh1407/StageVerse`. This guide covers shipping updates, the settings production needs,
the recruiter demo logins and what to check after a deploy.

> **Current state (checked 28 Oct 2026):** the live site still runs an old build. Its page title
> is "Create Next App" and `/api/health` returns 404. Neither `main` nor `deployment` on GitHub
> contains the work on `upg-04-homepage` yet: the security, testing and homepage phases and the
> seed. Steps 1–4 below get it live.

## 1. Find which branch Vercel deploys

Vercel → the StageVerse project → **Settings → Git → Production Branch**. It's `main` or
`deployment`. Pushing to that branch deploys the live site. Pushing to any other branch creates a
**preview deployment** with its own URL, which Vercel posts on the pull request.

Recommended: set the production branch to `main` and merge feature branches into it with a pull
request. The CI workflow (lint, tests, build) runs on every pull request, so a broken branch
shows up before it reaches the live site.

## 2. Environment variables

Vercel → **Settings → Environment Variables**. Set these for **Production**, and for **Preview**
too if you want previews to work. Values you change only apply to the **next** deployment, so
redeploy after editing them.

| Variable | Required | Value |
|---|---|---|
| `MONGODB_URI` | yes | The production database's connection string from Atlas (Connect → Drivers) |
| `JWT_SECRET` | yes | A long random string, e.g. the output of `openssl rand -base64 48`. Use a different one from your local `.env.local`. Changing it logs everyone out |
| `GEMINI_API_KEY` | for AI | Google AI Studio key. Without it, the AI features use their non-AI fallbacks |
| `GROQ_API_KEY` | optional | The second AI provider, used when Gemini fails or hits its limits |
| `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`, `GROQ_MODEL` | optional | Only to override the defaults (`gemini-3.8-flash`, `gemini-3.5-flash-lite`, `openai/gpt-oss-120b`) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | for uploads | Your Cloudinary cloud name (fans' memory uploads) |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_PRESET` | for uploads | An **unsigned** upload preset in Cloudinary (default name `stageverse_unsigned`) |
| `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | for uploads | From the Cloudinary dashboard |
| `SOCKET_ALLOWED_ORIGINS` | recommended | `https://stage-verse.vercel.app` |

The old build used the same variable names, so the existing values carry over. The new code
adds the optional AI ones and `SOCKET_ALLOWED_ORIGINS`.

`NEXT_PUBLIC_*` values are built into the browser code, so never put a secret in one.

**Node version:** Settings → **Build and Deployment → Node.js Version → 22.x** (the app needs
22.9 or newer). The build command (`next build`) and install command (`npm install`) are
Vercel's defaults, so leave them as they are.

## 3. MongoDB Atlas

- **Network Access:** Vercel functions don't have fixed IP addresses, so Atlas has to allow
  `0.0.0.0/0`. That makes the password the only thing protecting the database: keep it long and
  random.
- **Database user:** give the app's user *readWrite* on the StageVerse database only, not
  *atlasAdmin*.
- **Changing the password** (do it now if it has ever been exposed): Atlas → Database Access →
  the user → Edit → Edit Password. Then update `MONGODB_URI` in **both** Vercel (and redeploy)
  and your local `.env.local`.

## 4. Ship it

```bash
git checkout upg-04-homepage
git push                              # Vercel builds a preview of the branch
gh pr create --base main --fill       # or open the pull request on GitHub
```

1. Wait for CI to pass on the pull request, then open the Vercel preview link and run the
   checklist in section 6 against it.
2. Merge the pull request. Vercel deploys `main` to https://stage-verse.vercel.app/ in a few
   minutes (Vercel → Deployments shows its progress and build log).
3. If the production branch is `deployment`, either switch it to `main` (section 1) or merge
   `main` into `deployment` after this.

**Rolling back:** Vercel → Deployments → pick the last good deployment → **⋯ → Promote to
Production** (an instant rollback; nothing is rebuilt).

## 5. Demo data and recruiter logins

The seed creates two teams, each with its own copy of a seven-show tour (tickets, setlists,
guest lists, crew, DMX patches, polls, memories):

| Team | Logins | Password |
|---|---|---|
| Recruiters (public, in the README) | `recruiter.fan@stageverse.demo`, `recruiter.artist@stageverse.demo`, `recruiter.organizer@stageverse.demo`, `recruiter.crew@stageverse.demo` | `stageverse-demo` |
| Testing (yours, `docs/MANUAL_TESTING.md`) | `fan@`, `artist@`, `organizer@`, `production@stageverse.demo` | `password123` (or whatever the account was created with) |

The seed writes to whichever database `MONGODB_URI` points at. If production uses the same Atlas
database as your `.env.local`, running the seed locally has already seeded production.
Otherwise, put the production string in a separate local file (all `.env*` files are gitignored)
and seed from it:

```bash
# .env.production.local contains: MONGODB_URI=<the production connection string>
node --env-file=.env.production.local scripts/seed.mjs --yes
```

Run it again whenever you want to **reset the demo**: recruiters can change things, such as
starting a show, deleting a guest or editing an event. Re-running restores both teams' data and
the recruiter passwords. It never touches other accounts or the events they created.

## 6. After every deploy

- [ ] `https://stage-verse.vercel.app/api/health` returns `{"status":"ok","db":"up"}`
      (a 503 means the database can't be reached: check `MONGODB_URI` and Atlas Network Access)
- [ ] The homepage 3D stage loads, and a demo song plays in the playground
- [ ] Log in as each recruiter account: each dashboard shows the Afterglow Tour data
- [ ] Artist → Live Show → start the show. The crew's live screen follows it (see the
      limitation below), and its refresh button puts it back on track
- [ ] Vercel → the deployment → **Logs**: no repeating errors

## 7. Known limits on Vercel

- **Live sync isn't instant on Vercel.** Socket.IO needs a long-running server, and Vercel runs
  the API as short-lived functions, so the websocket pushes don't reach other screens. The live
  screens still converge: they reload the show state every 20 seconds, on reconnect, and when
  the crew presses the refresh button (the show clock is stored on the server). For instant sync,
  host the app on a platform that runs `next start` as a long-lived process (Render, Railway,
  Fly.io), or move the socket server to one of those.
- **Rate limits are per function instance**, so they're looser on Vercel than on one server.
- **AI requests on free tiers** are limited (Gemini: 5 a minute, 20 a day per model). The site
  falls back to Groq and then to the non-AI answers.

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| Every API call 500s, `/api/health` 503 | `MONGODB_URI` wrong or missing, or Atlas Network Access doesn't allow `0.0.0.0/0` |
| Login succeeds but you're instantly logged out | `JWT_SECRET` missing, or it was changed between deployments |
| Build fails on Vercel but passes locally | Node version below 22 (section 2), or an env var a page needs at build time |
| Fan photo uploads fail | Cloudinary variables missing, or the upload preset isn't **unsigned** |
| Images from another host don't show | The host must be listed under `images.remotePatterns` in `next.config.mjs` |
