# Oconomi — Demo

A stripped-down MVP demo of LYDRA Finance: a chat interface that extracts receipts/transactions via AI, and a dashboard that visualizes them. No auth, no multi-user — everything runs as a single fixed demo account so anyone can clone this and have it working in a few minutes.

---

## 1. Clone the repo

```bash
git clone https://github.com/mightyUrahara/oconomi.git
cd oconomi
```

---

## 2. Install dependencies

```bash
npm install
```

> ⚠️ **Pin check:** if `npx prisma --version` ever prints something with `-rc` or `-dev` in it (e.g. `8.0.0-rc.9-dev.xx`), npm pulled a Prisma prerelease. Fix with:
> ```bash
> npm uninstall prisma @prisma/client
> npm install prisma@5.22.0 @prisma/client@5.22.0 --save-exact
> ```
> This repo's `package.json` already pins `5.22.0`, so a fresh `npm install` from this repo shouldn't hit this — this note is here in case anyone bumps the version later.

---

## 3. Get the `.env` file

This is a shared demo — the database, n8n webhook, and demo account are already set up. Just grab the `.env` file from whoever shared this repo with you and drop it in the project root (same folder as `package.json`). No Supabase or Prisma setup needed on your end — everything already points at the shared demo database.

---

## 4. GitHub access

You've been added as a collaborator on the GitHub repo — no Vercel account needed on your end. The repo is connected to Vercel, so any commit pushed to `main` auto-deploys there automatically; you don't need to do anything for that to happen.

1. Accept the GitHub invite (check your email, or ask for the repo link if you haven't already)
2. Clone it (§1 above) and you're set

For local dev, none of this matters — just run it as described below.

---

## 5. Run it

```bash
npm run dev
```

Open `http://localhost:3000` — it redirects to `/dashboard`. Use the nav bar to switch to `/chat`.

**Smoke test order:**
1. `/chat` loads with empty state
2. Send a plain text message → confirms `/api/chat/save` → n8n round-trip
3. Upload a receipt image → a form should appear → Save → confirms `/api/sync` write
4. `/dashboard` → the saved receipt should show up (defaults to "All Time" filter so nothing's hidden)

---

## Project structure

```
app/
  page.tsx                     # redirects "/" → "/dashboard"
  layout.tsx                   # root layout, NavBar, viewport lock
  globals.css                  # theme tokens (colors) — edit here to retheme the whole app

  chat/
    page.tsx                   # server wrapper, sets DEMO_USER_ID
    ChatDemo.tsx                # chat UI: text/image/audio/pdf upload, message rendering

  dashboard/
    page.tsx                   # server component — fetches receipts + rates from Supabase via Prisma
    DashboardDemo.tsx           # dashboard UI: summary boxes, charts, filters, transaction list

  api/
    chat/save/route.ts          # main chat send → n8n → DB
    chat/cleanup/route.ts       # trims chat_messages to last 50
    chat/save-message/route.ts  # persists a message (used after receipt form submit)
    sync/route.ts               # create_receipt / create_receipt_batch → writes to `receipts`

  lib/
    prisma.ts                   # Prisma client singleton
    rateLimit.ts                 # in-memory rate limiter (demo-grade, resets on restart)
    validation.ts                 # sanitizeForAI / sanitizeInput helpers

components/
  NavBar.tsx                    # top nav — Chat / Dashboard links
  ReceiptForm.tsx                # receipt review/edit form — single + batch modes, splits, save to /api/sync

prisma/
  schema.prisma                 # user / chat_messages / receipts / rates models
```

---

## Known demo limitations

- **No real auth** — every request runs as the fixed `DEMO_USER_ID`. Set `DEMO_INTERNAL_KEY` + `NEXT_PUBLIC_DEMO_INTERNAL_KEY` before sharing a public link, or anyone with the URL can write to the DB / trigger n8n calls.
- **Rate limiting is in-memory** — resets on every server restart/redeploy, not shared across serverless instances. Fine for a demo, not production-grade.
- **No chat history persistence on load** — chat always starts empty (by design, out of MVP scope).
- **No manual entry, export/import, or receipt image viewer** — intentionally stripped from the original production dashboard for this MVP.

---

## Troubleshooting

**`npx prisma generate` / `db push` says "Unknown command"**
You have a Prisma prerelease installed. See the pin-check note in §2.

**Dashboard shows no data even though receipts exist in Supabase**
Check the active period filter — it defaults to "All Time" in this repo, but if it's been changed to something like "This Month", older test receipts won't show. Also double check `DEMO_USER_ID` in `.env` matches the `user_id` on the receipt rows exactly.

**`/api/chat/save` or `/api/sync` returns 401**
`DEMO_INTERNAL_KEY` is set but `NEXT_PUBLIC_DEMO_INTERNAL_KEY` isn't (or they don't match). Both need the same value, and a full server restart is required after changing `NEXT_PUBLIC_*` vars (hot reload doesn't pick them up).