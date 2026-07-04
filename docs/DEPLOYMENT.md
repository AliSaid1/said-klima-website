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

Introduce a feature branch and let Pull Requests be the gate. The E2E workflow
**already** runs on `pull_request → main`, so on the Free plan this needs *no
setup at all* — the only "rule" is your own habit of not merging on red (see §3
for why that's fine, and the paid/hard-gate alternatives).

```
   feature/xyz
        │  git push
        ▼
   ┌─────────────────────────────┐        ┌───────────────────────────────┐
   │  Open PR → main             │───────▶│  Vercel PREVIEW deployment      │
   └─────────────────────────────┘        │  unique URL, test it live       │
        │                                  └───────────────────────────────┘
        ▼
   ┌─────────────────────────────┐
   │  GitHub Actions E2E on PR   │   ✅ green  ─┐
   └─────────────────────────────┘             │  you check the result
        │                                       │  (auto-blocked only on
        ▼                                       │   paid/public — see §3)
   ❌ red  →  don't merge, fix first   ✅  →  Merge PR to main
                                                 │
                                                 ▼
                                      Vercel PRODUCTION deploy
                                      (only ever from green code)
```

Benefits (all free on your plan):
- **Bad code stays off production** — you only merge green PRs.
- **Preview URLs** let you click through the real change before it's live.
- **`main` stays deployable** at all times.
- You work alone and merge your own PRs — it's a 30-second habit, not
  bureaucracy.

---

## 3. Which approach on the **Free** plan? (important constraint)

> ⚠️ **GitHub branch protection / rulesets are _not enforced_ on a _private_
> repo on the Free plan.** They only enforce for **public** repos, or for
> **private** repos on **Pro/Team/Enterprise**. That's the message you saw:
> _"Your rulesets won't be enforced until you move to a GitHub Team account."_
> So Option A (below) can't technically *block* a merge on your current plan.

Good news: you don't need a paid plan to get a safe flow. Here are the three
realistic options and what each costs.

| | **A. GitHub branch protection** | **B. Vercel gates the deploy** | **C. PR + Preview + discipline** ✅ |
| --- | --- | --- | --- |
| Free on your plan? | ❌ not for private repos (needs Team, or make repo public) | ✅ yes (Vercel Hobby + GH Actions) | ✅ yes |
| Hard technical block? | ✅ (if you could use it) | ✅ | ⚠️ self-enforced (you just don't click merge) |
| Effort | low, but paywalled | medium (script/CLI + token) | lowest — a habit, no setup |
| Extra moving parts | none | Vercel token, build script | none |

**Recommendation for you: Option C.** As the **sole developer**, enforcement
mainly exists to stop *other* people from merging bad code — you don't have that
problem. Everything valuable in the "safe flow" is already free:

- GitHub **Actions still runs** your E2E on every branch/PR (Free plan includes
  ~2,000 Actions minutes/month for private repos — you're nowhere near it), so
  you still get the ✅/❌ signal on the PR.
- Vercel **Preview Deployments are free** on Hobby — every branch/PR gets its own
  URL to click-test before it's live.
- You simply **don't merge to `main` while the check is red.** For one person,
  that discipline is as good as an automated block.

If you later want a *hard* block without paying GitHub, add **Option B** on top
(§5) — it's free on Vercel. And if you ever want GitHub-native enforcement for
free, the only way is to **make the repo public** (not recommended for a
commercial client codebase).

### So… should you revert the ruleset you created?

You don't have to. It's simply **inert** on your plan — it neither helps nor
hurts right now.
- **Keep it** if you might make the repo public or upgrade to Team later; it will
  start enforcing automatically then. Zero cost to leave it.
- **Delete it** if you'd rather avoid a false sense of security / keep settings
  tidy. Either choice is fine — reverting is optional.

---

## 4. Recommended free workflow (Option C) — step by step

**One-time (optional but tidy):** in Vercel → Project → Settings →
**Build and Deployment** (Production Branch), confirm the **Production Branch is
`main`**. Preview Deployments for other branches are on by default.

**Every change:**

```bash
# 1. work on a branch — don't commit straight to main
git checkout -b feature/my-change

# 2. commit + push
git add -A
git commit -m "..."
git push -u origin feature/my-change

# 3. open a PR on GitHub (the push prints a link, or use the GitHub UI)
#    → GitHub Actions runs the E2E workflow automatically (free)
#    → Vercel posts a free Preview URL on the PR — open it and test the change live

# 4. only when the E2E check is GREEN, merge the PR
#    → merging into main triggers the Vercel PRODUCTION deploy

# 5. delete the branch (GitHub offers a button after merge), then locally:
git checkout main && git pull
```

The whole safety benefit — isolated work, automated tests, a live preview, and a
clean `main` — is free. The only thing you give up vs. a paid plan is the
automatic *merge block*, which you replace with "don't click merge on red."

> Tip: you can still push tiny fixes straight to `main` when you want the old
> speed — the choice is yours per-change, since nothing forces the PR.

---

## 5. (Optional) Add a real free hard-gate with Vercel (Option B)

Only if you want production promotion to be *technically* blocked on red CI,
without paying GitHub. Both sub-options are free on Vercel Hobby.

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
