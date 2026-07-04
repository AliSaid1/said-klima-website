# Tech Stack — Versions, Health & Update Strategy

An honest assessment of the technologies this app is built on: what version
we're on, whether it needs updating, how long each choice is good for, and the
few concrete things worth cleaning up to make this a **truly clean build**.

_Snapshot taken: 2026-07-04. Re-run `npm outdated` and `npm audit` to refresh._

---

## 1. Verdict first

**The stack is modern and well-chosen.** Next.js 15 + React 19 + TypeScript 5.9
+ Tailwind 4 is current-generation — you are *not* on anything legacy, and you
can stay on these major versions comfortably for a long time (see §5).

There are **three things holding it back from a perfect build**, and all three
are easy. **All three have now been applied** (see §3) — this section documents
the reasoning:

1. ✅ **Two unused dependencies were bloating the tree and dragging in almost all
   of the security vulnerabilities:** `@google/genai` and `firebase-tools`.
   Neither was imported anywhere in `app/`, `lib/`, `components/`, or `scripts/`
   (leftovers from the original Google AI Studio scaffold — hence the
   `"name": "ai-studio-applet"` in `package.json`). Removing them eliminated the
   **one critical** and most of the **high** advisories in one step.
2. ✅ **Next.js security patch applied** (15.5.14 → 15.5.19) — no breaking
   changes, just fixes. Same for React (19.2.4 → 19.2.7).
3. 🟡 **A batch of safe minor updates** has accumulated (Supabase, Stripe.js,
   Resend, Zod, TipTap, Playwright…). Harmless individually; worth doing in one
   sweep periodically — **not yet applied** (see §3, "Soon").

Result: `npm audit` dropped from **40 → 18** total (prod **23 → 10**), and the
**critical is gone**. Build + E2E smoke verified green after the changes.

---

## 2. Runtime snapshot

| Layer | Choice | Version (installed) | Notes |
| --- | --- | --- | --- |
| Runtime | Node.js | 24.11.0 local · **22** in CI | Next 15 needs Node ≥ 18.18. Match local to CI (22 LTS) to avoid surprises. |
| Framework | Next.js | 15.5.19 | App Router, RSC/SSR. Patched to latest 15.x. |
| UI runtime | React / React DOM | 19.2.7 | Latest major, patched. |
| Language | TypeScript | 5.9.3 | Solid. TS 6 is out but optional. |
| Styling | Tailwind CSS | 4.1.11 | v4 engine (`@tailwindcss/postcss`). Minor bumps available. |
| Auth/DB | Supabase (`supabase-js` / `ssr`) | 2.97.0 / 0.8.0 | Bump `supabase-js` (minor). `ssr` 0.8→0.12 is a deliberate review. |
| Payments | Stripe server SDK | 20.4.1 | API pinned `2026-02-25.clover` in `lib/stripe.ts`. Pin is intentional — don't bump blindly. |
| Payments (client) | `@stripe/stripe-js` / `react-stripe-js` | 9.0.0 / 6.0.0 | Safe minor bumps available. |
| Email | Resend | 6.9.2 | Minor bump available. |
| Validation | Zod + react-hook-form | 4.3.6 / 7.71.1 | Safe minor bumps. |
| Editor | TipTap | 3.20/3.21 | Bump the whole set together to 3.27. |
| Icons | lucide-react | 0.553.0 | v1 exists (major) — icons only, low risk but not urgent. |
| Animation | motion | 12.34.2 | Minor bump. |
| Testing | Playwright | 1.58.2 | Bump to 1.61 + `npx playwright install`. |

---

## 3. Update plan by urgency

Legend: **Now** = do this next · **Soon** = next maintenance sweep · **Later /
Hold** = deliberate, not urgent.

### ✅ Done — security & cleanup (applied 2026-07-04)

| Action | Status | Why |
| --- | --- | --- |
| **Removed `@google/genai`** | ✅ | Unused. Pulled `hono`, `protobufjs` (critical), `lodash`, `ws`, `path-to-regexp`, `express-rate-limit`, `fast-uri` — the bulk of the prod advisories. |
| **Removed `firebase-tools`** | ✅ | Unused dev dependency. Source of most dev-only advisories (`ws`, `yaml`, `universal-analytics`, …). |
| **`next` 15.5.14 → 15.5.19** | ✅ | Patch release; fixes several Next.js security advisories (SSRF, cache poisoning, middleware bypass, image-optimizer DoS). No API changes. |
| **`react` / `react-dom` 19.2.4 → 19.2.7** | ✅ | Patch. |

> Result: audit went from **40 → 18** (prod **23 → 10**); the **critical
> `protobufjs`** advisory is gone. `npm run build` + E2E smoke passed after.

### 🟡 Soon — safe minor sweep

Run when convenient; all backward-compatible within their major:

- `@supabase/supabase-js` 2.97 → 2.110
- `@stripe/stripe-js` 9.0 → 9.8 · `@stripe/react-stripe-js` 6.0 → 6.6
- `resend` 6.9 → 6.16
- `zod` 4.3 → 4.4 · `react-hook-form` 7.71 → 7.80
- `@tiptap/*` 3.20/3.21 → 3.27 (**bump all TipTap packages to the same version**)
- `motion` 12.34 → 12.42 · `date-fns` 4.1 → 4.4 · `react-big-calendar` 1.19 → 1.20
- `@react-pdf/renderer` 4.3 → 4.5 · `papaparse`, `postcss`, `postgres`, `dotenv` patches
- `tailwindcss` + `@tailwindcss/postcss` 4.1.11 → 4.3.x
- **Dev:** `@playwright/test` 1.58 → 1.61 (then `npx playwright install`)

### 🟢 Later / Hold — major bumps (deliberate, test carefully)

Not urgent. Each needs a read of its changelog + a run of the E2E suite:

- **Next.js 16** — big jump. Stay on 15 for now (see §5); plan this as a project.
- **TypeScript 6** — evaluate after ecosystem (types packages) catches up.
- **ESLint 10** (+ `eslint-config-next` 16.2) — flat-config/major; do together.
- **`@supabase/ssr` 0.12** — pre-1.0 lib; read the migration notes, test auth.
- **Stripe server SDK 22** — couple this with a reviewed `apiVersion` bump; the
  version is pinned on purpose in `lib/stripe.ts`, so upgrade intentionally.
- **`lucide-react` 1.x** — icons only; safe but low value, do opportunistically.
- **`@types/node` 20 → 22** — align with the Node 22 CI runtime (skip 26).

---

## 4. Security posture (from `npm audit`)

- **After cleanup:** ~**18** advisories (down from 40) — **10 in prod** (down
  from 23), and **no critical**. Remaining ones are transitive and lower-impact;
  the next minor sweep + `npm audit fix` (no `--force`) will trim them further.
- **The critical `protobufjs`** (arbitrary code execution / prototype pollution)
  is **resolved** — it only ever arrived via the now-removed `@google/genai`.
- **What was left behind before cleanup:** most highs (`hono`, `lodash`,
  `path-to-regexp`, `express-rate-limit`, `fast-uri`) came from `@google/genai`;
  the `next` advisories were fixed by the 15.5.19 patch.
- **Key insight:** the app was never vulnerable because of *bad* choices — it was
  carrying two dependencies it never used. Deleting them changed the picture
  dramatically.
- Don't run `npm audit fix --force` casually — it can install breaking majors.

---

## 5. Longevity — how long can we keep Next 15 / React 19?

**A long time.** Both are the current generation:

- **React 19** is the latest major. There is nothing newer to "fall behind." You
  only move when React 20 eventually ships, and even then 19 stays supported for
  a good while.
- **Next.js 15** is a current, actively-patched release. Next 16 exists, but
  Next typically supports the latest majors with security patches, so 15 remains
  a safe home. Practically: **stay on 15, apply its patch releases** (like
  15.5.19), and schedule the Next 16 upgrade as a deliberate project in roughly
  the next 6–12 months when you want its features — not out of urgency.
- **Tailwind 4** and **TypeScript 5.9** are likewise current; no pressure.

**Bottom line:** no forced upgrades on the horizon. Your job is *maintenance*
(patch + minor sweeps), not *migration*, for the foreseeable future.

---

## 6. Recommended maintenance routine

A light, repeatable habit keeps the build "perfect" without big-bang upgrades:

1. **Monthly (10 min):** `npm outdated` + `npm audit`. Apply patch/minor bumps
   for prod deps on a branch, let E2E run, merge if green.
2. **Per security advisory:** if `npm audit` shows a new high/critical in a dep
   you actually use, patch it promptly (branch → E2E → merge).
3. **Quarterly:** review the "Later / Hold" list — decide whether any major is
   now worth doing.
4. **Always upgrade on a branch + PR** so the E2E suite gates it (see
   [`DEPLOYMENT.md`](DEPLOYMENT.md)) — never bump majors straight on `main`.
5. After any dependency change, run `npm run build` **and** the E2E suite before
   merging.

---

## 7. Related docs

- [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) — release flow + branch protection.
- [`docs/tests/E2E_TESTING.md`](tests/E2E_TESTING.md) — the safety net that makes
  upgrades low-risk.
- [`README.md`](../README.md) — architecture overview.
