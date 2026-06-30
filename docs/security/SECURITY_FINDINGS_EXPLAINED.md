# 🛡️ Security Findings — Explained in Details

**Companion to [`SECURITY_AUDIT.md`](SECURITY_AUDIT.md).**

The audit report is a checklist: it says *what* was fixed, but not *why it mattered* or
*how* we fixed it. This document fills that gap. It is written for someone with **no
security background** — every issue is explained with a plain-language description, a
realistic real-world example, and the fix in simple terms.

> 💡 **How to read this:** Findings are grouped by theme (not by the audit's number order),
> because many of the 28 findings are variations of the same underlying idea. Each finding
> keeps its original audit number in brackets, e.g. **[#5]**, so you can cross-reference.

---

## 📖 Mini-glossary (read this first)

| Term | Plain-English meaning |
| --- | --- |
| **Client / browser** | The user's side. **Anything here can be faked** by a malicious user. |
| **Server** | Our code running on Vercel. The user can't tamper with it — so it's where we enforce rules. |
| **Authentication** | "Who are you?" — proving you're logged in. |
| **Authorization** | "What are you allowed to do?" — e.g. only admins can delete products. |
| **Endpoint / API route** | A URL our app exposes, like `/api/orders`, that does something when called. |
| **RLS (Row Level Security)** | A database rule that says "this user can only see their own rows." |
| **Secret / key** | A password-like string that proves our server is allowed to do powerful things. |
| **Sanitize** | Clean user input so it can't contain hidden malicious code. |

---

## 1. 🔑 Keeping secrets secret

**The core idea:** Some keys are like the **master key to the whole building**. If a thief
gets one, they own everything. These must never appear in code that ends up on GitHub or in
the browser.

### [#2] Master database key was written directly inside scripts
- **What was wrong:** The Supabase *service-role key* (a master key that can read/edit/delete
  **any** data and ignores all safety rules) was typed directly into 4 helper scripts.
- **Why it's dangerous — real example:** Imagine writing your house alarm's master code on a
  sticky note and posting it on a public notice board. The moment those scripts hit GitHub,
  anyone could copy the key and download or wipe the entire customer database.
- **How we fixed it:** The key was removed from the code. Scripts now read it from a private
  `.env.local` file (which is never uploaded). The code just says "get the key from the
  environment" instead of containing the key itself.

### [#3] Public database key also hardcoded
- **What was wrong:** The "anon" key (a less powerful key) was also hardcoded in 4 scripts.
- **Why it matters:** Less catastrophic than #2, but still bad hygiene — keys should always
  live in environment variables, never in source code.
- **How we fixed it:** Same as above — moved to environment variables.

### [#4] Test passwords written in plain text in scripts
- **What was wrong:** Real test-account passwords were typed straight into diagnostic scripts.
- **Why it's dangerous — real example:** Like leaving your gym locker code in a shared
  document — anyone reading the script could log in as that user.
- **How we fixed it:** Passwords now come from environment variables; the scripts refuse to
  run if those aren't set.

### [#16] The "cron password" was guessable
- **What was wrong:** Our scheduled job (which sends booking reminders) was protected by the
  secret `test-cron-secret-12345` — trivially guessable.
- **Why it's dangerous — real example:** A door whose PIN is "12345". Anyone could trigger our
  internal jobs by guessing it.
- **How we fixed it:** Replaced it with a strong random 64-character secret.

### [#17] Confirmed the secrets file was never uploaded
- **What was wrong:** Nothing — this was a *verification*. We double-checked that `.env.local`
  (the file holding all our real secrets) had never accidentally been committed to git history.
- **Why it matters:** Even one accidental commit in the past would leak everything permanently.
- **Result:** Verified clean — it was never committed.

### [#14] / [#15] Tidy-up of ignore rules and the example file
- **#14:** Made sure temporary log/bundle files can't be accidentally committed (added them to
  `.gitignore`).
- **#15:** Filled in the `.env.example` template so a new developer knows which keys they need —
  with **placeholders only**, no real values.

---

## 2. 🚪 Access control — making sure people can only touch their own stuff

**The core idea:** Logging in answers "*who are you?*". It does **not** automatically answer
"*what are you allowed to see/do?*". Many bugs here came from checking only the first question.

### [#5] Users could edit *other people's* saved addresses (IDOR)
- **What was wrong:** When saving an address, the app trusted a `benutzer_id` ("user ID") sent
  **from the browser** to decide whose address it was.
- **Why it's dangerous — real example:** It's like a delivery form where you write your *own*
  name in the "deliver to" box — but the system lets you write *anyone's* name. By changing the
  ID, user A could overwrite user B's address. This class of bug is called **IDOR** (Insecure
  Direct Object Reference).
- **How we fixed it:** The server now **ignores** any ID from the browser and instead uses the
  identity from the logged-in session. You can only ever act as *yourself*.

### [#6] The media library was open to the public
- **What was wrong:** `GET /api/media` had **no login check** — anyone on the internet could
  list uploaded files.
- **Why it's dangerous:** Like a filing cabinet in the lobby with no lock.
- **How we fixed it:** Added an authentication check so only authorized users can access it.

### [#7] / [#8] "Logged in" was treated the same as "admin"
- **What was wrong:** Editing services (`/api/services`) and legal content (`/api/content`)
  only checked that you were *logged in* — not that you were an *admin*.
- **Why it's dangerous — real example:** A shop where any customer with an account could walk
  behind the counter and change the prices or the terms & conditions.
- **How we fixed it:** Added an **admin-only** guard (`requireAdmin()`) to these actions.

### [#19] Any logged-in user could see *everyone's* orders
- **What was wrong:** `GET /api/orders` returned **all** orders to any logged-in user.
- **Why it's dangerous — real example:** Logging into your bank and seeing every other
  customer's statements. A privacy disaster.
- **How we fixed it:** Admins see all orders; normal users see **only their own**.

### [#20] Bookings could be snooped on by guessing
- **What was wrong:** `GET /api/bookings` let a non-admin look up bookings by passing an email,
  enabling them to enumerate other people's appointments.
- **How we fixed it:** Logged-in users are now scoped to their own bookings; the email
  parameter is ignored for authenticated users.

### [#21] Public product list quietly used the master key
- **What was wrong:** The public product listing used the *admin* database client, which
  **bypasses** the database's built-in safety rules (RLS).
- **Why it matters:** Using the master key for routine public reads is risky — if the query is
  ever extended, it could accidentally expose data the safety rules were meant to hide.
- **How we fixed it:** Switched to the normal (anon) client so the database's Row Level
  Security rules always apply.

### [#26] Email-template editor had no lock and no input limits
- **What was wrong:** No admin check, and no limit on input size.
- **How we fixed it:** Added admin-only access, capped subject (500 chars) and body (100 KB),
  and sanitized the HTML.

### [#27] A setup endpoint was completely unprotected
- **What was wrong:** `seed-availability` (which populates technician availability) required
  **no login at all**.
- **Why it's dangerous:** A stranger could spam or corrupt the scheduling data.
- **How we fixed it:** Added an admin-only guard.

---

## 3. 💳 Protecting money — never trust prices from the browser

**The core idea:** The browser can be edited by the user. So **the price must always be
decided by the server**, never accepted from the client.

### [#22] / [#23] The customer could set their own price
- **What was wrong:** During checkout, the **price came from the browser**. There was also no
  protection against the same payment being submitted twice.
- **Why it's dangerous — real example:** A self-checkout where you type in the price of the TV
  yourself. A malicious user could open browser tools and change a €1,200 air-conditioner to
  €1.00, then pay €1.
- **How we fixed it:**
  1. The server now **looks up the real price in the database** and ignores whatever the
     browser claims.
  2. It verifies the product exists and is active.
  3. It uses a Stripe **idempotency key** — a unique "ticket number" that guarantees a
     double-clicked or retried payment is only charged **once**.

---

## 4. 🧪 Dangerous input — stopping hidden malicious code

**The core idea:** Anything a user types could secretly contain code or tricks. We must clean
it before storing or displaying it.

### [#9] Rich-text content wasn't cleaned (XSS risk)
- **What was wrong:** Text from the rich-text editor was saved to the database **as-is**,
  including any HTML.
- **Why it's dangerous — real example:** This is called **XSS** (Cross-Site Scripting). An
  attacker could type a hidden `<script>` into a content field. When another user (or an admin)
  views that page, the script runs in *their* browser — potentially stealing their session and
  taking over their account.
- **How we fixed it:** All HTML is passed through a **sanitizer** that only allows safe tags
  (like bold, lists, links) and strips anything dangerous (like `<script>`).

### [#12] Uploads could be aimed at the wrong storage area
- **What was wrong:** The upload code didn't check **which storage bucket** a file was being
  written to.
- **Why it's dangerous:** Like a mailroom that lets you drop a package into *any* department's
  inbox, including restricted ones.
- **How we fixed it:** The bucket name is now validated against an allowlist.

### [#13] Filenames could "escape" their folder (path traversal)
- **What was wrong:** A crafted filename like `../../secret/file` could climb out of the
  intended upload folder.
- **Why it's dangerous — real example:** Telling a hotel "put this in room 101", but the name
  secretly means "go up two floors into the manager's office." This is **path traversal**.
- **How we fixed it:** Filenames are now cleaned so they can't contain directory-climbing
  sequences.

---

## 5. 🔒 Locking the doors — transport, headers, and CSRF

### [#10] Development setting that disabled certificate checks
- **What was wrong:** A setting (`NODE_TLS_REJECT_UNAUTHORIZED = 0`) turned off HTTPS
  certificate verification. It's needed on certain corporate networks for local dev — but it's
  **dangerous if it ever runs in production**.
- **Why it's dangerous:** It's like accepting any ID at the door without checking it's real —
  opening the door to "man-in-the-middle" eavesdropping.
- **How we fixed it:** It is now **strictly limited to development** and is stripped out in
  production.

### [#11] Missing security headers
- **What was wrong:** The site didn't send standard protective HTTP headers.
- **Why it matters — plain version:** Security headers are like default safety instructions the
  browser obeys — e.g. "don't let other sites embed me in a hidden frame" (clickjacking
  protection), "always use HTTPS", "don't guess file types."
- **How we fixed it:** Added a full set: `Content-Security-Policy`, `Strict-Transport-Security`
  (HSTS), `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, and `Permissions-Policy`.

### [#24] Session cookies weren't hardened (CSRF protection)
- **What was wrong:** Login cookies didn't set the `SameSite`, `Secure`, and `httpOnly` flags.
- **Why it's dangerous — real example:** **CSRF** (Cross-Site Request Forgery) is when a
  malicious site tricks your browser into making a request to *our* site using your logged-in
  cookie — without you realizing. Like someone forging your signature because the bank attached
  it automatically.
- **How we fixed it:** Cookies now use `SameSite=Lax` (don't send my cookie to other sites'
  requests), `httpOnly` (JavaScript can't read it, blunting XSS), and `Secure` (HTTPS only) in
  production.

---

## 6. 🌊 Surviving abuse — rate limiting

**The core idea:** Even with perfect locks, an attacker can simply hammer a door millions of
times. **Rate limiting** caps how often someone can call sensitive endpoints.

### [#1] No rate limiting on login / booking / checkout
- **What was wrong:** These endpoints could be called unlimited times.
- **Why it's dangerous — real example:** A **brute-force** attack — a bot trying thousands of
  password guesses per second on the login form until one works.
- **How we fixed it:** Added a rate limiter that blocks an IP after too many attempts in a
  short window.

### [#25] The rate limiter forgot its counts on serverless
- **What was wrong:** The first limiter stored counts **in memory**. On Vercel (serverless),
  functions restart constantly ("cold starts"), wiping the memory — so the limit effectively
  reset and attackers could slip through.
- **How we fixed it:** In production it now uses **Upstash Redis** (a shared external memory
  that survives restarts), with the in-memory version kept only as a local-dev fallback.

---

## 7. 🤐 Not leaking internal details

### [#28] Error messages exposed raw database details
- **What was wrong:** When something failed, the raw database error was sent back to the user.
- **Why it's dangerous — real example:** A database error can reveal table names, column names,
  and query structure — a free **map of the building** for an attacker.
- **How we fixed it:** A helper (`lib/api-response.ts`) now shows users a generic, safe message
  in production while logging the full detail privately on the server for us to debug.

---

## 8. ⚙️ Operational correctness

### [#18] The scheduled job pointed at the wrong URL
- **What was wrong:** The cron configuration called `/api/cron/reminders`, but the real route is
  `/api/cron/booking-reminders` — so reminder emails would silently never run.
- **Why it matters:** Not a "hacker" issue, but a reliability/security-operations bug — a
  security control that doesn't run is the same as not having it.
- **How we fixed it:** Corrected the path in `vercel.json`.

---

## 🧰 The reusable security toolkit we built

Instead of fixing each route in a one-off way, we built small shared helpers so every route
is protected **the same, correct way**:

| File | What it does, in plain English |
| --- | --- |
| `lib/auth-guard.ts` | One-line "are you logged in?" (`requireAuth`) and "are you an admin?" (`requireAdmin`) checks reused everywhere. |
| `lib/sanitize.ts` | Cleans user HTML/text and validates IDs, so malicious input can't sneak through. |
| `lib/rate-limit.ts` | Caps how often sensitive endpoints can be hit, to stop brute-force/abuse. |
| `lib/api-response.ts` | Hides raw error details from users while keeping full logs for us. |

---

## 🗺️ Quick reference — finding number → plain-language name

| # | Plain-language name | Theme |
| --- | --- | --- |
| 1 | No limit on login/checkout attempts | Rate limiting |
| 2 | Master DB key hardcoded in scripts | Secrets |
| 3 | Public DB key hardcoded in scripts | Secrets |
| 4 | Test passwords in plain text | Secrets |
| 5 | Could edit other users' addresses (IDOR) | Access control |
| 6 | Media list open to everyone | Access control |
| 7 | Non-admins could edit services | Access control |
| 8 | Non-admins could edit legal content | Access control |
| 9 | Unsanitized rich text (XSS) | Dangerous input |
| 10 | Certificate checks disabled | Transport |
| 11 | Missing security headers | Headers |
| 12 | Uploads to unvalidated buckets | Dangerous input |
| 13 | Filename path traversal | Dangerous input |
| 14 | Temp files not git-ignored | Secrets/hygiene |
| 15 | Incomplete `.env.example` | Secrets/hygiene |
| 16 | Weak cron secret | Secrets |
| 17 | Verified secrets never committed | Secrets |
| 18 | Wrong cron URL | Operations |
| 19 | Users could see all orders | Access control |
| 20 | Users could snoop bookings | Access control |
| 21 | Public reads bypassed RLS | Access control |
| 22 | Client-supplied checkout prices | Payment integrity |
| 23 | Cart prices from client | Payment integrity |
| 24 | Cookies not hardened (CSRF) | Transport/CSRF |
| 25 | Rate limiter reset on cold start | Rate limiting |
| 26 | Email templates unguarded | Access control |
| 27 | Unauthenticated setup endpoint | Access control |
| 28 | Raw DB errors leaked to users | Info disclosure |

---

*If anything here is still unclear, that's a documentation bug — tell me which finding and
I'll rewrite it even more simply.*

