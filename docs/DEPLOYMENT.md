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

## 3. Branch protection vs. wiring Vercel to gate on CI — which is better?

Short answer: **branch protection is both easier and better** for this project.
Do that. Wiring Vercel to gate on CI is more work, partly redundant, and only
worth it as an *extra* layer later.

| | **A. Branch protection** (recommended) | **B. Wire Vercel to gate on CI** |
| --- | --- | --- |
| Where it lives | GitHub (a few checkboxes) | Vercel build settings + a script / GitHub deploy job |
| Effort | ~2 minutes, no code | Moderate: custom "Ignored Build Step" or a GH Actions deploy pipeline |
| What it stops | Bad code from **merging into `main`** (so it never deploys) | A bad commit already on `main` from being **promoted** |
| Preview URLs | ✅ yes (per PR) | ✅ yes |
| Redundancy | — | Mostly redundant *if* you already have branch protection |
| Failure mode | Simple: red check = can't merge | More moving parts to debug |

**Why A wins:** branch protection stops the problem at the source — nothing bad
ever reaches `main`, so Vercel only ever deploys green code. Option B tries to
catch the problem *after* it's already on `main`, which is later and fiddlier.
Since you deploy `main`, guarding `main` is exactly the right lever.

> Keep B in your back pocket only if you later want a hard technical block on
> promotion (e.g. multiple people pushing directly to `main`). For a solo dev
> with the PR habit, A is enough.

---

## 4. Step-by-step: set up branch protection (Option A)

**One-time GitHub setup:**

1. Push at least one PR first so GitHub "knows" the check name. If you've never
   opened a PR, do the branch step below once; the **"Playwright E2E"** check
   appears in the list only after it has run against a PR at least once.
2. Go to **GitHub → your repo → Settings → Branches**.
3. Under **Branch protection rules**, click **Add branch ruleset** (or *Add
   rule* in the classic UI).
4. **Branch name pattern:** `main`.
5. Tick these:
   - ✅ **Require a pull request before merging**
     - (solo dev) set *Required approvals* to **0** — you don't need to approve
       your own PRs, you just need the checks to pass.
   - ✅ **Require status checks to pass before merging**
     - In the search box, add **`Playwright E2E`** (the job `name:` from
       `.github/workflows/e2e.yml`).
     - ✅ (optional) **Require branches to be up to date before merging.**
   - ✅ (optional) **Do not allow bypassing the above settings** — if you leave
     this *unticked*, you as admin can still force-merge in an emergency.
6. **Save changes.**

**Your day-to-day workflow after that:**

```bash
# 1. start work on a branch (never commit straight to main)
git checkout -b feature/my-change

# 2. commit + push
git add -A
git commit -m "..."
git push -u origin feature/my-change

# 3. open a PR on GitHub (the link is printed by the push, or use the GitHub UI)
#    → GitHub runs the E2E workflow automatically
#    → Vercel posts a Preview URL on the PR — click it to test the change live

# 4. when the E2E check is green, click "Merge pull request"
#    → merging into main triggers the Vercel PRODUCTION deploy
```

That's it. If E2E is red, the **Merge** button is disabled until you fix it —
production stays safe.

---

## 5. (Optional) Step-by-step: gate Vercel on CI (Option B)

Only if you want the extra technical block. Two common ways:

**B1 — Ignored Build Step (simplest Vercel-side option):**
1. Vercel → Project → **Settings → Git → Ignored Build Step**.
2. Set it to a command that **exits 0 to build, non-zero to skip**. Vercel only
   proceeds when the command "passes". You can point it at a check of the commit
   status via the GitHub API, or a simple guard script committed to the repo.

**B2 — Deploy from GitHub Actions (full control):**
1. Turn **off** Vercel's automatic Git deployments for production (Settings →
   Git), or restrict it to previews.
2. Add a deploy job to the workflow that runs **after** the E2E job and only on
   `main`, using the Vercel CLI:
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
   This makes production deploys literally depend on green E2E — but it's more to
   maintain, which is why Option A is the recommended starting point.

**Escape hatch (either option):** if a bad deploy ever slips through, use
Vercel → Deployments → **Instant Rollback** to re-promote the last good build in
seconds (no rebuild needed).

---

## 6. Test credentials: `.env.local` vs GitHub Actions secrets

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

## 7. Related docs

- [`docs/tests/CI_SETUP.md`](tests/CI_SETUP.md) — how to configure the CI secrets
  and the dedicated **test** Supabase project.
- [`docs/tests/E2E_TESTING.md`](tests/E2E_TESTING.md) — the test suites, the
  tracking process, and the change log.
- [`docs/TECH_STACK.md`](TECH_STACK.md) — framework/library versions, update
  urgency, and dependency health.
- [`GO-LIVE.md`](../GO-LIVE.md) — production launch checklist (env vars, Stripe
  live mode, domain).
