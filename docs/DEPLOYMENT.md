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

## 2. Recommended flow (Git Flow: `develop` → `main`)

The repo is now **public**, so GitHub branch protection **enforces for free** and
GitHub **Actions minutes are unlimited**. We use a **Git Flow** model with two
permanent branches:

- **`main`** — production. Protected. Vercel deploys the **live site** from it.
  Nothing lands here except a green, tested release.
- **`develop`** — permanent integration / **staging** branch. This is where all
  day-to-day work happens (directly, or via optional short-lived `feature/*`
  branches that merge back into `develop`). Vercel gives `develop` its own
  **Preview URL** — a always-on staging environment to test on.

You **release** by opening a PR from `develop → main`. E2E must pass, and
GitHub **auto-merges** it the moment it's green — then Vercel deploys production.

```
  feature/* (optional)                 develop  (permanent staging)
        │  merge back                      │  ← all your daily work lands here
        └──────────────▶ develop ──────────┤     (Vercel Preview URL = staging)
                                           │
                                  push triggers E2E on develop
                                           │
                            ── ready to release? ──
                                           │
                                           ▼
                         Open PR: develop ──▶ main   +  Enable auto-merge
                                           │
                             ┌─────────────┴──────────────┐
                             │  GitHub Actions E2E on PR   │
                             └─────────────┬──────────────┘
                                           │
             ❌ red  → merge BLOCKED (branch protection), main + prod untouched
                                           │
             ✅ green → auto-merge → merges to main → Vercel PRODUCTION deploy
```

Benefits (all free now that the repo is public):
- **One place to work** — `develop` is your permanent branch; you don't recreate
  it. Optional `feature/*` branches keep bigger changes isolated.
- **Always-on staging** — the `develop` Preview URL lets you click-test the real
  app before any release.
- **Hard release gate** — GitHub *refuses* to merge `develop → main` while E2E is
  red, so broken code physically cannot reach production.
- **Auto-merge** — enable once per release PR; a green run ships itself.
- **`main` stays live and clean** at all times.

---

## 3. Why this works now (public repo)

> ✅ **You made the repo public, so GitHub branch protection / rulesets are now
> _enforced for free_.** The earlier message _"won't be enforced until you move
> to a GitHub Team account"_ only applied to **private** repos on the Free plan.
> The message you saw after that — _"This ruleset does not target any
> resources"_ — was **not** a paywall; it just meant the ruleset had no target
> branch selected yet. Once you set the target (default branch) and enforcement
> = Active, it applies. ✔️ You've done this.

Two things changed in your favor by going public:

| | Private (Free) | **Public (Free) — you are here** |
| --- | --- | --- |
| Branch protection / rulesets enforced? | ❌ no | ✅ **yes** |
| GitHub Actions minutes | ~2,000 / month | ✅ **unlimited** |
| Required status checks can block merge? | ❌ no | ✅ **yes** |
| Auto-merge available? | limited | ✅ **yes** |

So the release gate is now **GitHub branch protection on `main`** — it's simple
*and* gives a real technical block. (Option B, gating Vercel directly, remains
available in §5 if you ever want the deploy itself — not just the merge — to be
conditional, but you don't need it.)

> ⚠️ **One caveat about going public:** everything in the repo is now visible to
> the world — including full source, and any secret ever committed to git
> history. Confirm no real credentials were ever committed (`.env.local` is
> git-ignored, so it's fine). All live secrets stay in GitHub Actions secrets /
> Vercel env vars, never in the code — so being public is safe for the app, but
> treat the codebase itself as visible.

---

## 4. Setup — Git Flow + branch protection + auto-merge (step by step)

### One-time setup

**A. Create the permanent `develop` branch** (from an up-to-date `main`):
```bash
git checkout main && git pull
git checkout -b develop
git push -u origin develop
```

**B. Protect `main` with the ruleset** (you've done the ruleset — verify it has):
1. Settings → **Rules → Rulesets** → your ruleset.
2. **Target branches** → *Include default branch* (`main`). *(Fixes the "does
   not target any resources" message.)*
3. **Enforcement status = Active.**
4. Rules enabled:
   - ✅ **Require a pull request before merging** — set **Required approvals = 0**
     (you're solo; you don't need to approve your own PRs).
   - ✅ **Require status checks to pass** → add the check named **`Playwright
     E2E`** (the job name from `.github/workflows/e2e.yml`). *GitHub only lists a
     check here after it has run on a PR at least once — so open your first
     `develop → main` PR, let E2E run, then add it.*
   - ✅ (optional) **Block force pushes**.

   Leave **`develop` unprotected** — you push to it freely all day.

**C. Turn on auto-merge for the repo:**
1. Settings → **General** → scroll to **Pull Requests**.
2. Tick ✅ **Allow auto-merge**. Save.

**D. Vercel:** Project → Settings → **Build and Deployment** → confirm
**Production Branch = `main`**. Preview Deployments are on by default, so
`develop` automatically gets a stable **staging** Preview URL.

### Daily work — on `develop`

```bash
# switch to develop and keep it current
git checkout develop && git pull

# small change → commit straight onto develop
git add -A
git commit -m "Fix cart quantity rounding"
git push                     # → E2E runs on develop; Vercel updates the staging URL

# bigger/riskier change → isolate it in a feature branch off develop, then merge back
git checkout -b feature/customer-invoices
# ...work, commit...
git push -u origin feature/customer-invoices
#   (optional PR feature → develop, or just merge locally)
git checkout develop && git merge feature/customer-invoices && git push
git branch -d feature/customer-invoices
```

### Releasing — `develop → main`

```bash
# when develop is green and you're happy with the staging URL:
# open a PR: base = main, compare = develop
#   → on GitHub: "New pull request", base: main ← compare: develop
#   → click "Enable auto-merge"
#      • E2E ❌ red  → merge blocked; fix on develop, push, PR re-runs
#      • E2E ✅ green → auto-merge merges develop into main
#                       → Vercel deploys PRODUCTION
# after the release, pull main locally so it's current:
git checkout main && git pull
git checkout develop        # go back to working on develop
```

### Branch naming convention (for the optional `feature/*` branches)

Your two permanent branches are `main` and `develop`. Any *temporary* branch off
`develop` uses a `type/short-description` prefix — lowercase, hyphen-separated:

| Prefix | Use for | Example |
| --- | --- | --- |
| `feature/` | new functionality | `feature/customer-invoices` |
| `fix/` | bug fixes | `fix/cart-quantity-race` |
| `chore/` | deps, config, tooling | `chore/bump-next-15-5-19` |
| `docs/` | documentation only | `docs/deployment-guide` |
| `refactor/` | internal cleanup, no behaviour change | `refactor/email-templates` |

Avoid throwaway names like `my-change`, `test`, `tmp`. The name shows up in git
history — make it say what the change is.

> Note: with **Require a pull request before merging** active on `main`, a direct
> `git push origin main` is now **rejected**. Production changes *only* through a
> green `develop → main` PR — that's the guarantee.

---

## 5. (Optional) Also gate the Vercel deploy itself (Option B)

With Option A active, a red PR **can't merge**, so production is already
protected. Option B is only worth adding if you want the **deploy step itself**
(not just the merge) to be conditional — e.g. belt-and-suspenders, or if you
ever allow some direct pushes. You do **not** need this on top of Option A. Both
sub-options are free on Vercel Hobby.

**B1 — Ignored Build Step (simplest):**
1. Vercel → Project → Settings → **Build and Deployment → Ignored Build Step**
   (or `git.ignoreCommand` in `vercel.json`).
2. Provide a command that decides whether to build. Vercel's convention is
   **exit code `1` → build proceeds, exit code `0` → build is skipped/cancelled.**
3. Have that command check the commit's GitHub status (via the commit-status API
   with a token) and exit `0` (skip) when E2E hasn't passed. Result: a red commit
   never gets promoted to production.

**B2 — Deploy from GitHub Actions (full control):**
1. Turn **off** Vercel's automatic production deployments (Settings → Git), or
   keep it for Previews only.
2. Add a deploy job that runs **after** E2E and only on `main`, using the free
   Vercel CLI + a `VERCEL_TOKEN`:
   ```yaml
   deploy:
     needs: e2e          # ← only runs if E2E passed
     if: github.ref == 'refs/heads/main'
     runs-on: ubuntu-latest
     steps:
       - uses: actions/checkout@v4
       - run: npm i -g vercel
       - run: vercel pull --yes --environment=production --token=$VERCEL_TOKEN
       - run: vercel build --prod --token=$VERCEL_TOKEN
       - run: vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN
     env:
       VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
       VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
       VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
   ```
   This makes production deploys literally depend on green E2E. It's free, but
   it's the most moving parts — only add it if you want the hard guarantee.

> **Note on Vercel Hobby:** these mechanisms are all free, but Vercel's Hobby
> plan is intended for **non-commercial** use. A real business site may need
> **Pro** regardless of which gating option you choose — that's a plan/licensing
> matter, independent of A/B/C.

**Escape hatch (any option):** if a bad deploy ever slips through, use
Vercel → Deployments → **Instant Rollback** to re-promote the last good build in
seconds (no rebuild needed).

---

## 6. Staging environment (`develop`)

`develop` deploys to a Vercel **Preview** that acts as your always-on staging
site. It is deliberately wired to **test** infrastructure so you can click
around safely without touching real customers or money.

| Aspect | Staging (`develop` / Preview) | Production (`main`) |
| --- | --- | --- |
| URL | `https://staging.kks-said.de` (custom) + the auto `…-git-develop-…vercel.app` | `https://www.kks-said.de` |
| Supabase | **TEST** project (the same one CI seeds) | production project |
| Stripe | **test-mode** keys | live keys (after go-live) |
| Data shown | the seeded E2E catalog, not the real catalog | real catalog |

**Environment variables (Vercel → Settings → Environment Variables):**
- Every var the app needs is added a **second time scoped to `Preview` only**
  (Production values are untouched). Confirm each staging var shows the
  **Preview** tag — never tick Production for a test value, or the live site
  would talk to the test database.
- Use **test** values for Preview: test Supabase URL/anon/service-role key and
  Stripe `pk_test_…` / `sk_test_…`.
- Set the Preview **`NEXT_PUBLIC_APP_URL`** to `https://staging.kks-said.de`
  (fixes checkout redirects + email links on staging).
- After changing any Preview var, **redeploy `develop`** — env changes don't
  rebuild past deployments.

**Custom domain:** `staging.kks-said.de` is assigned to the Preview environment
and tracks `develop` (Vercel → Settings → Domains). It needs a DNS record
(usually a `CNAME` → `cname.vercel-dns.com`) and a few minutes for SSL; until
then use the auto `…-git-develop-…vercel.app` URL. A dedicated staging domain is
optional — the auto URL works fine on its own.

**Stripe webhooks on staging:** the production webhook signing secret is
live-mode and bound to the production URL, so it can't verify test-mode events.
Either accept that webhook-completion steps won't verify on staging, or add a
dedicated **test-mode** webhook endpoint in Stripe pointing at
`https://staging.kks-said.de/api/webhooks/stripe` and use *its* signing secret
for the Preview `STRIPE_WEBHOOK_SECRET`.

---

## 7. Test credentials & running E2E locally

> ⚠️ **This machine's `.env.local` points at the PRODUCTION Supabase project.**
> The Playwright suite creates/deletes users, orders, and addresses, and
> `npm run seed:test` **drops and recreates the whole `public` schema**. **Never
> run E2E or the seeder against `.env.local`** — it would corrupt/wipe
> production. Use the dedicated **TEST** project via `.env.e2e.local` instead.

| Where tests run | Where creds come from | What you must do |
| --------------- | --------------------- | ---------------- |
| **Local E2E** (`npm run test:e2e`) | **`.env.e2e.local`** (git-ignored), loaded *first* by `playwright.config.ts` so it overrides `.env.local` for the runner **and** the spawned dev server. | Copy `.env.e2e.local.example` → `.env.e2e.local` and fill in your **TEST** project + Stripe test keys. |
| **CI** (GitHub Actions) | GitHub **repository secrets** (the same test project). `.env*` files never reach CI. | Add the values under **Settings → Secrets and variables → Actions → Secrets** (not *Variables*). |
| **Local dev** (`npm run dev`) | `.env.local` (production) | Left as-is for developing against real data. |

**One-time local E2E setup:**
```bash
# 1. create your test-env file from the template and fill in TEST-project values
cp .env.e2e.local.example .env.e2e.local

# 2. seed the TEST database (safe: loads ONLY .env.e2e.local, never .env.local)
npm run seed:test:e2e

# 3. run the suite (uses port 3100 + test creds; TLS check relaxed for local intercept)
npm run test:e2e
```

Notes:
- `test:e2e` runs the dev server on **port 3100**, so it can't accidentally
  reuse a production dev server you have open on 3000.
- `NODE_TLS_REJECT_UNAUTHORIZED=0` is set only for these local scripts to work
  around this machine's TLS interception; it is never used in CI or production.
- Leave Upstash vars **unset** in `.env.e2e.local` so the rate limiter uses its
  in-memory fallback (avoids cross-run 429 flakiness).
- Never commit real credentials to the repo or any tracked file.

---

## 8. Related docs

- [`docs/tests/CI_SETUP.md`](tests/CI_SETUP.md) — how to configure the CI secrets
  and the dedicated **test** Supabase project.
- [`docs/tests/E2E_TESTING.md`](tests/E2E_TESTING.md) — the test suites, the
  tracking process, and the change log.
- [`docs/TECH_STACK.md`](TECH_STACK.md) — framework/library versions, update
  urgency, and dependency health.
- [`GO-LIVE.md`](../GO-LIVE.md) — production launch checklist (env vars, Stripe
  live mode, domain).
