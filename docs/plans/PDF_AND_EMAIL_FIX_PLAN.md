# ⚠️ This file has been renamed

> **Moved to:** [`ORDER_PDF_AND_RECHNUNG_PLAN.md`](./ORDER_PDF_AND_RECHNUNG_PLAN.md)

This file is kept for reference only. All content has been updated and moved to the new plan file.

## What changed

- The "admin gets email" section was reframed: it is **NOT a bug** — the admin MUST receive an order notification email. A note was added explaining that the fix only applies to the edge case where the customer's email matches an admin user's email.
- A new **Task 3** was added covering how to utilize **Stripe's Invoice API** to generate a formal `Rechnung` PDF and send it to the customer (including Stripe Dashboard receipts, the `invoice_pdf` URL, and the customer billing portal).
- The file was renamed from `PDF_AND_EMAIL_FIX_PLAN.md` → `ORDER_PDF_AND_RECHNUNG_PLAN.md` to better reflect its full scope.
