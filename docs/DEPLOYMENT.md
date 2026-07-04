# Deployment & Release Flow

How code gets from your machine to production, what the E2E tests actually gate,
and how to make the process safer as the project grows.

> **TL;DR — the big misconception:** A failing E2E run does **not** take the
> website down, and a failed deploy does **not** take it down either. Vercel
> deployments are *atomic and immutable* — the previous good version keeps
> serving until a new build succeeds. The real risk today is the opposite: a
> broken-but-compiling commit **can still reach production**, because the E2E
> tests and the Vercel deploy are two independent pipelines that aren't wired
> together.

---

## 1. Current flow (everything goes to `main`)

When you `git push` to `main`, **two independent things** happen in parallel.
Neither one knows or waits for the other:

```
                                  git push origin main
                                          │
                 ┌────────────────────────┴─────────────────────────┐
                 │                                                    │
                 ▼                                                    ▼
   ┌───────────────────────────┐                     ┌───────────────────────────────┐
   │  GitHub Actions (CI)       │                     │  Vercel Git integration        │
   │  .github/workflows/e2e.yml │                     │  (Production branch = main)     │
   ├───────────────────────────┤                     ├───────────────────────────────┤
   │  • build                   │                     │  • npm install + next build    │
   │  • seed TEST Supabase      │                     │  • if build OK → promote to     │
   │  • run Playwright E2E      │                     │    the production domain        │
   │  • result: ✅ or ❌ badge   │                     │  • if build FAILS → keep the    │
   │                            │                     │    last good deploy live        │
   └───────────────────────────┘                     └───────────────────────────────┘
                 │                                                    │
                 ▼                                                    ▼
        Red/green check on                                   Users see the new
        the commit in GitHub                                 version (or the old
        (does NOT block the deploy)                          one if build failed)
```

### So, is the site down if E2E fails?

**No.** Two separate reasons:

1. **E2E ≠ deploy.** GitHub Actions and Vercel are not connected by default. A
   red E2E run just puts a ❌ next to the commit on GitHub. Vercel still builds
   and deploys the same commit regardless.
2. **Deploys are atomic.** Even if the *Vercel build itself* fails, Vercel does
   not tear down the running site. The failed build is marked "Error" and the
   **previous successful deployment keeps serving traffic**. Production only
   changes when a new build *succeeds*.

### Is this a good process?

It's fine for a solo developer, but it has one real weakness: **nothing stops a
functional regression from reaching production.** The app can compile cleanly
(so Vercel deploys it) while the E2E suite is failing because a real user flow
broke. Today you'd only notice from the red badge — after it's already live.

---

## 2. Recommended flow (small change, big safety win)

Introduce a `develop`/feature branch and let Pull Requests be the gate. The E2E
workflow **already** runs on `pull_request → main`, so most of this is just
turning on branch protection.

```
   feature/xyz  (or develop)
        │  git push
        ▼
   ┌─────────────────────────────┐        ┌───────────────────────────────┐
   │  Open PR → main             │───────▶│  Vercel PREVIEW deployment      │
   └─────────────────────────────┘        │  unique URL, test it live       │
        │                                  └───────────────────────────────┘
        ▼
   ┌─────────────────────────────┐
   │  GitHub Actions E2E on PR   │   ✅ green  ─┐
   └─────────────────────────────┘             │  branch protection:
        │                                       │  "require E2E to pass"
        ▼                                       ▼
   ❌ red  →  merge blocked            ✅  →  Merge PR to main
                                                 │
                                                 ▼
                                      Vercel PRODUCTION deploy
                                      (only ever from green code)
```

Benefits:
- **Bad code can't reach production** — the merge is blocked until E2E is green.
- **Preview URLs** let you click through the real change before it's live.
- **`main` stays deployable** at all times.
- You still work alone and merge your own PRs — it's a 30-second habit, not
  bureaucracy.

---

## 3. How to set it up (checklist)

1. **Create a working branch** instead of committing straight to `main`:
   ```bash
   git checkout -b feature/my-change
   # ...work...
   git push -u origin feature/my-change   # open a PR on GitHub
   ```
2. **Turn on branch protection for `main`** (GitHub → Settings → Branches → Add
   rule):
   - ✅ *Require a pull request before merging*
   - ✅ *Require status checks to pass* → select **"Playwright E2E"**
   - (optional) *Require branches to be up to date before merging*
3. **Confirm Vercel Preview Deployments are on** (Vercel → Project → Settings →
   Git). They're on by default: every branch/PR gets its own URL.
4. *(Optional, stricter)* **Gate the production promotion on CI too.** Branch
   protection already blocks the merge, so this is belt-and-suspenders. Options:
   - Vercel **Deployment Protection**, or
   - a Vercel **"Ignored Build Step"** that only builds when checks pass, or
   - drive the deploy from a GitHub Actions job that runs *after* E2E.
5. **Know your escape hatch:** if a bad deploy ever slips through, use Vercel →
   Deployments → **Instant Rollback** to re-promote the last good build in
   seconds (no rebuild needed).

---

## 4. Test credentials: `.env.local` vs GitHub Actions secrets

This trips people up, so to be explicit:

| Where tests run | Where creds come from | What you must do |
| --------------- | --------------------- | ---------------- |
| **Locally** (`npm run test`) | `.env.local` in the repo root, auto-loaded by `playwright.config.ts` (via `dotenv`). | Put `TEST_EMAIL` / `TEST_PASSWORD` (and the rest) in `.env.local`. ✅ Already done. |
| **CI** (GitHub Actions) | GitHub **repository secrets** — `.env.local` is git-ignored and never reaches CI. | Add the same values under **Settings → Secrets and variables → Actions → Secrets** (not *Variables*). |

- `.env.local` is in `.gitignore`, so it is *never* pushed — CI genuinely
  cannot see it. That's why the values must **also** live as Actions secrets.
- The workflow has a **"Verify required secrets"** step that fails the run early
  with a clear message if `TEST_EMAIL` / `TEST_PASSWORD` (and the Supabase keys)
  are missing — so a missing secret shows up as an obvious CI error, not a
  mysterious skipped test.
- Never commit real credentials to the repo or to any tracked file.

---

## 5. Related docs

- [`docs/tests/CI_SETUP.md`](tests/CI_SETUP.md) — how to configure the CI secrets
  and the dedicated **test** Supabase project.
- [`docs/tests/E2E_TESTING.md`](tests/E2E_TESTING.md) — the test suites, the
  tracking process, and the change log.
- [`GO-LIVE.md`](../GO-LIVE.md) — production launch checklist (env vars, Stripe
  live mode, domain).
