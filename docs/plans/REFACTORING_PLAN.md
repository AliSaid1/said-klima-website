# Refactoring Plan & File Structure
**Project:** said-website-klima  
**Date:** 2026-03-28

---

## Current Structure vs. Target Structure

### Current Structure (abbreviated)
```
said-website-klima/
├── app/                   # Next.js App Router pages + API routes
├── components/            # React components (mixed public + admin)
├── hooks/                 # React hooks
├── lib/                   # Utilities, Supabase clients, validators
├── public/                # Static assets
├── scripts/               # Dev/diagnostic Node.js scripts
├── supabase/              # DB migrations
├── tests/                 # Playwright E2E tests
└── _archive/              # Archived docs and legacy files (NEW)
```

### Target Structure (after refactoring)
```
said-website-klima/
├── app/                          # Next.js App Router
│   ├── (public)/                 # Public route group
│   │   ├── page.tsx              # Homepage
│   │   ├── about/
│   │   ├── booking/
│   │   ├── cart/
│   │   ├── contact/
│   │   ├── legal/
│   │   ├── services/
│   │   └── shop/
│   ├── (auth)/                   # Auth route group
│   │   ├── account/
│   │   └── auth/
│   ├── admin/                    # Admin dashboard (protected)
│   └── api/                      # API routes
│       ├── auth/                 # (currently split across middleware)
│       ├── bookings/
│       ├── categories/
│       ├── checkout/
│       ├── content/
│       ├── cron/
│       ├── media/
│       ├── orders/
│       ├── products/
│       ├── services/
│       ├── settings/
│       ├── shop/
│       ├── technicians/
│       ├── upload/
│       └── webhooks/
│
├── components/
│   ├── layout/                   # Header, Footer (moved from root)
│   ├── home/                     # Hero, HowItWorks, Services, Products (homepage-specific)
│   ├── admin/                    # Admin UI components
│   ├── shop/                     # ProductActions (shop-specific)
│   └── ui/                       # Generic reusable UI (RichTextEditor, Skeleton, etc.)
│
├── hooks/                        # Custom React hooks
│   └── use-mobile.ts
│
├── lib/
│   ├── supabase/                 # Supabase clients (server, client, admin, middleware)
│   ├── validators/               # Zod schemas
│   ├── rate-limit.ts             # Rate limiter (NEW)
│   ├── sanitize.ts               # Input sanitizer (NEW)
│   ├── email.ts                  # Email helpers
│   ├── resend.ts                 # Resend client
│   ├── stripe.js                 # Stripe client
│   ├── cart-context.tsx          # Cart state
│   ├── data.ts                   # Static/shared data helpers
│   └── utils.ts                  # Generic utilities (cn, etc.)
│
├── public/
│   └── images/
│
├── scripts/                      # Dev/diagnostic scripts (not deployed)
│
├── supabase/
│   └── migrations/
│
├── tests/                        # Playwright E2E tests
│   ├── fixtures/
│   ├── account-addresses.spec.ts
│   └── upload.spec.ts
│
├── _archive/                     # ← Files kept but not in active use
│   ├── docs/                     # Planning documents (moved here)
│   └── scripts-legacy/           # Old scripts if any
│
├── middleware.ts
├── next.config.ts
├── .env.local                    # Secret (gitignored)
├── .env.example                  # Safe to commit (no real values)
└── .gitignore
```

---

## Refactoring Tasks (Priority Order)

### Phase 1 — Structure ✅ COMPLETE (2026-03-28)
| Task | Files Affected | Status |
|------|---------------|-------|
| Move Header/Footer into `components/layout/` | 6 files | ✅ Done |
| Move Hero/HowItWorks/Services/Products into `components/home/` | 6 files | ✅ Done |
| Move `ProductActions.tsx` → `components/shop/` | 1 file | ✅ Done |
| Move `ThemeProvider.tsx` → `components/layout/` | 1 file | ✅ Done |
| Update all imports across 9 layout files + app/page.tsx | 10 files | ✅ Done |
| Delete stale root-level component duplicates | 8 files | ✅ Done |
| Rename `lib/data.ts` → `lib/static-data.ts` | 1 file | ✅ Done |
| Move images from `lib/` → `public/images/` | 4 images | ✅ Done |
| Fix case mismatch: `installationPhoto` → `InstallationPhoto` in Services.tsx | 1 file | ✅ Done |

### Phase 2 — Performance ✅ COMPLETE (2026-03-28)
| Task | Benefit | Status |
|------|---------|-------|
| Add `loading.tsx` to 9 admin route segments | Better UX during data fetching | ✅ Done — uses shared `AdminPageSkeleton` |
| Memoize `AdminSidebar` and `AdminTopbar` with `React.memo` | Prevent re-renders on route changes | ✅ Done |
| Lazy-load `RichTextEditor` with `dynamic(() => import(...), { ssr: false })` | Reduce initial bundle by ~200kb | ✅ Done |
| Add `revalidate = 3600` to all 5 legal pages (ISR) | Reduce DB round-trips | ✅ Done |
| `generateStaticParams` for `/shop/[id]` | Static generation | ⚠️ Skipped — page is a Client Component; would require architectural change |
| Optimize images: move `.avif` hero images from `lib/` to `public/images/` | Correct asset location | ✅ Done |

### Phase 3 — Code Quality ✅ COMPLETE (2026-03-28)
| Task | Files Affected | Status |
|------|---------------|-------|
| `lib/auth-guard.ts` — shared auth helper | All admin API routes | ✅ Already existed & complete |
| `lib/api-response.ts` — consistent error/success shape | All API routes | ✅ Already existed & complete |
| Add barrel exports (`index.ts`) to `components/ui/`, `components/admin/`, `components/home/`, `components/layout/`, `lib/validators/` | 5 new index files | ✅ Done |
| Remove `Heading` extension duplication in `RichTextEditor.tsx` | 1 file | ✅ Already resolved (comment in code) |
| Fix unused `Link` import in `app/shop/layout.tsx` | 1 file | ✅ Done |

---

## Suggested `lib/auth-guard.ts` (create this)
```typescript
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function requireAdminOrUnauthorized() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 }), user: null };
  
  const admin = createAdminClient();
  const { data: benutzer } = await admin.from('benutzer').select('rolle').eq('id', user.id).single();
  if (benutzer?.rolle !== 'admin') return { error: NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 }), user: null };
  
  return { error: null, user };
}
```

---

## Files That Can Be Deleted (Safe to Remove)

| File | Reason | Action |
|------|--------|--------|
| `project_bundle_1.txt` | AI-generated bundle snapshot, not source code | **DELETE** |
| `project_bundle_2.txt` | Same as above | **DELETE** |
| `project_bundle_3.txt` | Same as above | **DELETE** |
| `project_bundle_4.txt` | Same as above | **DELETE** |
| `project_bundle_config.txt` | Same as above | **DELETE** |
| `dev-output.log` | Dev server log, not source code | **DELETE** |
| `scripts/_scan.ps1` | Temp scan script created during this audit session | **DELETE** |
| `tsconfig.tsbuildinfo` | TypeScript incremental build cache — regenerated automatically | **DELETE** (it's rebuilt) |

> ⚠️ **Files to ARCHIVE** (keep in `_archive/` — may contain useful reference):
> - `_archive/docs/ADDRESS_MANAGEMENT.md` ← already moved
> - `_archive/docs/FINAL_CHECKLIST.md` ← already moved
> - `_archive/docs/IMPLEMENTATION_SUMMARY.md` ← already moved
> - `_archive/docs/INSTRUCTIONS.md` ← already moved
> - `_archive/docs/PLAN.md` ← already moved
> - `_archive/docs/TESTING.md` ← already moved

> ✅ **Files to KEEP** (might use in future):
> - `app/services/page.tsx` — active services page, keep in main tree
> - `lib/diagnosePhoto.avif`, `lib/WartungPhoto.avif`, `lib/oldherophoto.avif` — move to `public/images/` instead

---

## Delete Checklist

Run these commands to clean up (after confirming each file is safe to delete):

```powershell
# From project root
$root = 'C:\Users\Ali.Said\Downloads\website\said-website-klima'
Remove-Item "$root\project_bundle_1.txt"
Remove-Item "$root\project_bundle_2.txt"
Remove-Item "$root\project_bundle_3.txt"
Remove-Item "$root\project_bundle_4.txt"
Remove-Item "$root\project_bundle_config.txt"
Remove-Item "$root\dev-output.log"
Remove-Item "$root\scripts\_scan.ps1"
# tsconfig.tsbuildinfo is safe to delete (TypeScript rebuilds it)
Remove-Item "$root\tsconfig.tsbuildinfo"
```

---

## Move Checklist (Image Assets)

Images stored in `lib/` should be in `public/images/`:
```powershell
$root = 'C:\Users\Ali.Said\Downloads\website\said-website-klima'
Move-Item "$root\lib\diagnosePhoto.avif"   "$root\public\images\diagnosePhoto.avif"
Move-Item "$root\lib\WartungPhoto.avif"    "$root\public\images\WartungPhoto.avif"
Move-Item "$root\lib\newherophoto.jpg"     "$root\public\images\newherophoto.jpg"
Move-Item "$root\lib\oldherophoto.avif"    "$root\public\images\oldherophoto.avif"
```
> ⚠️ After moving, update all `import` statements that reference these files.

