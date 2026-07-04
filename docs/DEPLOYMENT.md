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

## 2. Recommended flow (branch protection + auto-merge)

The repo is now **public**, so GitHub branch protection **enforces for free**,
and GitHub **Actions minutes are unlimited**. That unlocks the real fix: make
`main` protected so nothing lands on it unless the E2E suite is green — and let
GitHub **auto-merge** the PR the moment it passes, so you don't have to babysit
it.

```
   feature/xyz
        │  git push
        ▼
   ┌─────────────────────────────┐        ┌───────────────────────────────┐
   │  Open PR → main             │───────▶│  Vercel PREVIEW deployment      │
   │  + click "Enable auto-merge"│        │  unique URL, test it live       │
   └─────────────────────────────┘        └───────────────────────────────┘
        │
        ▼
   ┌─────────────────────────────┐
   │  GitHub Actions E2E on PR   │
   └─────────────────────────────┘
        │
        ├── ❌ red  →  merge BLOCKED by branch protection, main untouched, prod safe
        │
        └── ✅ green → auto-merge fires → merges to main
                                             │
                                             ▼
                                   Vercel PRODUCTION deploy
                                   (only ever from tested code)
```

Benefits (all free now that the repo is public):
- **Hard block, not a habit** — GitHub *refuses* to merge a red PR. Broken code
  physically cannot reach `main` or production.
- **Auto-merge** — enable it once per PR; GitHub merges automatically when E2E
  goes green, so a passing run ships itself.
- **Preview URLs** — click through the real change before it's live.
- **`main` stays deployable** at all times.

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

So the recommended flow is now **Option A (GitHub branch protection)** — it's the
simplest *and* gives a real technical block. The old "just don't click merge on
red" discipline workaround is no longer necessary. (Option B, gating Vercel
directly, remains available in §5 if you ever want the deploy itself — not just
the merge — to be conditional, but you don't need it.)

> ⚠️ **One caveat about going public:** everything in the repo is now visible to
> the world — including full source, and any secret ever committed to git
> history. Confirm no real credentials were ever committed (`.env.local` is
> git-ignored, so it's fine). All live secrets stay in GitHub Actions secrets /
> Vercel env vars, never in the code — so being public is safe for the app, but
> treat the codebase itself as visible.

---

## 4. Option A setup — branch protection + auto-merge (step by step)

### One-time setup

**A. Ruleset / branch protection** (you've done the ruleset — verify it has):
1. Settings → **Rules → Rulesets** → your ruleset.
2. **Target branches** → *Include default branch* (`main`). *(Fixes the "does
   not target any resources" message.)*
3. **Enforcement status = Active.**
4. Rules enabled:
   - ✅ **Require a pull request before merging** — set **Required approvals = 0**
     (you're solo; you don't need to approve your own PRs).
   - ✅ **Require status checks to pass** → add the check named **`Playwright
     E2E`** (the job name from `.github/workflows/e2e.yml`). *GitHub only lists a
     check here after it has run on a PR at least once — so open your first PR,
     let E2E run, then add it.*
   - ✅ (optional) **Block force pushes**.

**B. Turn on auto-merge for the repo:**
1. Settings → **General** → scroll to **Pull Requests**.
2. Tick ✅ **Allow auto-merge**. Save.

**C. Vercel (confirm, likely already set):** Project → Settings →
**Build and Deployment** → Production Branch = `main`. Preview Deployments for
branches/PRs are on by default.

### Every change from now on

```bash
# 1. branch off main with a descriptive, professional name (see convention below)
git checkout main && git pull
git checkout -b feature/customer-invoices

# 2. commit + push
git add -A
git commit -m "Add customer invoice download"
git push -u origin feature/customer-invoices

# 3. open a PR → main (the push prints a "Create a pull request" link).
#    On the PR page click "Enable auto-merge".
#      → GitHub Actions runs E2E automatically (free, unlimited)
#      → Vercel posts a Preview URL — open it, click-test the change
#
#    • E2E ❌ red  → merge stays blocked; fix and push again to the same branch
#    • E2E ✅ green → auto-merge merges the PR into main for you
#                     → Vercel deploys production from the merged commit

# 4. after merge, tidy up
git checkout main && git pull
git branch -d feature/customer-invoices     # GitHub also offers a "Delete branch" button
```

### Branch naming convention (professional)

Use a `type/short-description` prefix, lowercase, hyphen-separated:

| Prefix | Use for | Example |
| --- | --- | --- |
| `feature/` | new functionality | `feature/customer-invoices` |
| `fix/` | bug fixes | `fix/cart-quantity-race` |
| `chore/` | deps, config, tooling | `chore/bump-next-15-5-19` |
| `docs/` | documentation only | `docs/deployment-branch-protection` |
| `refactor/` | internal cleanup, no behaviour change | `refactor/email-templates` |

Avoid throwaway names like `my-change`, `test`, `tmp`. The branch name shows up
in the PR and git history — make it say what the change is.

> Note: with **Require a pull request before merging** active, direct
> `git push origin main` is now **rejected** — every change must go through a PR.
> That's the point: it guarantees prod only ever sees tested code.

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
