# Crystolia — Demo Runbook (MAHAT Final Presentation)

A step-by-step script for an 8–10 minute live demonstration of the Crystolia B2B platform.
No passwords or secrets appear in this document — use the credential placeholders and keep real
credentials in your password manager only.

## URLs used during the demo

| Surface | URL | Account type |
|---|---|---|
| Marketing / landing (lead form) | https://crystolia.com | Anonymous visitor |
| Customer portal | https://business.crystolia.com | Demo customer (`<demo customer email>`) |
| Admin console | https://admin.crystolia.com | Admin (`<admin email>`) |
| Backend API health | https://api.crystolia.com/health | None (public health check) |
| CI / operations | https://github.com/ShaiMullo/crystolia-app/actions | GitHub account |

Prepare **two browser profiles** (or one normal + one incognito window): one logged in as admin,
one for the customer journey. This avoids cookie collisions and lets you switch instantly.

---

## Presentation flow (8–10 minutes)

### 0. Opening (0:00–0:30) — anonymous
Say what Crystolia is: a B2B ordering and back-office platform for an edible-oil distributor —
customer portal, admin CRM/ERP, and an operations pipeline (invoices, payments, shipments)
with production-grade CI/CD, backups, and monitoring.

### 1. Lead submission (0:30–1:30) — anonymous visitor
1. Open https://crystolia.com, scroll to the contact form.
2. Submit a lead (name, company, phone, message).
   - The form posts to `POST https://api.crystolia.com/api/v1/leads`.
3. Switch to the **admin console → Leads**.

**Expected result:** the lead appears in the admin Leads list, and the admin phone receives an
SMS notification (when SMS is configured). The lead's timeline records whether the SMS was sent.

### 2. Business registration → admin approval (1:30–3:00)
1. In the customer window, open https://business.crystolia.com/he/auth and register a new
   business (name, email, password, company name, phone, country, VAT number).
   - **Expected:** the account is created in `pending` state — the user **cannot** log in yet.
     A pending-approval message is shown; the admin is notified.
2. In the admin window, open **Registrations** (nav badge shows the pending count).
3. Approve the registration.
   - **Expected:** the customer receives an approval notification; their company record is
     created; they can now log in.

*Talking point:* registration is **approval-gated** — no stranger can self-provision an account
into the CRM.

### 3. Customer onboarding + order placement (3:00–4:30) — demo customer
1. Log in as the newly approved customer (or use the prepared `<demo customer email>` to save time).
2. If delivery/billing details are incomplete, the portal routes to **onboarding** first.
   - **Expected:** ordering is blocked (HTTP 403 `ORDER_PROFILE_INCOMPLETE` server-side) until
     address, city, billing address, and billing email are filled.
3. Place a new order: pick quantities and submit.
   - **Expected:** the order is created in `pending` status with a total computed **by the
     backend from authoritative SKU pricing**. Client-supplied names/prices are ignored —
     there is a test in the suite proving a tampered price does not change the total.

### 4. Admin order approval + inventory (4:30–5:30) — admin
1. Open **Orders → the new order** in the admin console.
2. Change status `pending → approved`.
   - **Expected:** stock for the ordered SKUs is **reserved** (visible under Inventory as
     reserved quantity); the customer is notified by email + SMS; the order timeline shows
     translated entries — "Status changed: Pending → Approved" and
     "Customer update sent by email and SMS" (or a professional warning if a channel failed).

### 5. Invoice: draft → issued PDF (5:30–6:30) — admin, then customer
1. Create an invoice for the order (draft).
   - **Expected (customer dashboard → Invoices):** the draft shows the state
     "PDF available after invoice issuance" — no dead button, no fake PDF.
2. Click **Issue** on the invoice (Green Invoice integration).
   - **Expected:** a real PDF link appears in the admin invoice table **and** as a working
     "Download PDF" link on the customer dashboard (opens in a new tab).
   - If Green Invoice credentials are not configured in the environment, the invoice stays
     a draft and the UI reports the failure — show the draft state instead and explain.

### 6. Payment + shipment (6:30–7:30) — admin
1. Record a **manual payment** (bank transfer) against the invoice under Payments.
   - **Expected:** invoice `paymentStatus` moves to `paid` (or `partial`).
   - *Talking point:* online card checkout is intentionally **not** enabled — payments are
     recorded as business/manual payments.
2. Create a shipment for the order; mark it delivered.
   - **Expected:** the order auto-completes (`shipped/approved → completed`) via a timeline
     event "Updated automatically when the shipment was delivered"; reserved stock is deducted.

### 7. Operations: CI/CD, backups, monitoring (7:30–9:00) — GitHub
Open the GitHub **Actions** tab and show:
- **CI** — typecheck + 60+ backend tests + frontend builds on every push/PR.
- **Database Backup** (nightly 02:30 UTC): mongodump from production over a
  temporarily-opened firewall, **restore-tested in an isolated MongoDB in CI**, then uploaded
  to a **private S3 bucket with server-side encryption** (35-day retention).
- **Production Uptime** — every 5 minutes checks the API health endpoint, admin console, and
  business portal.
- **Demo Deploy** — builds GHCR images and deploys the Caddy/Docker-Compose stack to Lightsail.

Also show **Admin → System → Backups** for the in-app view.

### 8. Close (9:00–10:00)
Summarize: approval-gated onboarding, server-side pricing security, full order-to-cash flow,
and real production operations (HTTPS, CI, encrypted verified backups, uptime monitoring).

---

## Fallback plan

| Failure | What to do |
|---|---|
| SMS or email not delivered during demo | This is by design **best-effort**: the order/approval still succeeds. Show the order timeline — a failed channel appears as a translated, professional warning (e.g., "SMS delivery failed"), not an error dump. |
| Green Invoice unavailable / not configured | Show the draft invoice state ("PDF available after invoice issuance") and the admin issue flow; explain the invoice is never faked as issued. Show a previously issued invoice's PDF link if one exists. |
| Internet down at the venue | Run the full stack locally: `make up` (Docker Compose: Mongo + backend :4000 + client :3000 + admin :3001), then `cd backend && npm run seed:demo` for deterministic demo data. Rehearse this once beforehand. |
| Production site unreachable | Show the uptime-monitor history (it will have caught it), then switch to the local fallback above. |
| Live registration flow too slow | Use the pre-approved `<demo customer email>` account and narrate the approval flow with the existing Registrations screen. |

**Pre-capture screenshots** of every step above as a last-resort deck.

## Pre-demo checklist (day before + 30 min before)

- [ ] Latest **CI** run on `main` is green.
- [ ] Latest **Production Uptime** runs are green (all three services).
- [ ] Latest **Database Backup** run is green (restore test passed).
- [ ] `https://api.crystolia.com/health` returns `"status":"ok"`.
- [ ] Admin account logs in at https://admin.crystolia.com.
- [ ] Demo customer account logs in at https://business.crystolia.com.
- [ ] Demo customer profile is complete (so ordering is not blocked mid-demo).
- [ ] Products exist with stock; at least one previously issued invoice with a PDF exists.
- [ ] Two browser profiles prepared and logged in; GitHub Actions tab open.
- [ ] Optional: tidy old test orders via the admin console (cancel, don't delete).
- [ ] **Do NOT run any seed or reset script against production.** `seed:demo`/`reset:demo`
      are development-only and guarded, and must stay unused here.
- [ ] Phone with the admin SIM available (to show the SMS arriving).
- [ ] Screenshots deck downloaded locally (offline fallback).

## Post-demo cleanup checklist

- [ ] Log out of both browser profiles (admin + customer).
- [ ] Close/exit incognito windows; close the GitHub tab if on a shared machine.
- [ ] Optionally cancel demo orders created live (admin console) — **never** delete
      production data or run destructive resets.
- [ ] If a throwaway registration was created live, deactivate it in Admin → Users.
- [ ] Verify no credentials were left in browser autofill on a borrowed machine.
