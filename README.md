# LYDRA — Demo

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

## 3. Set up environment variables

Copy the example file and fill in real values:

```bash
cp .env.example .env
```

| Variable | Where to get it | Notes |
|---|---|---|
| `DATABASE_URL` | Supabase → Project Settings → Database → **Connection pooling** URI | Port `6543`, used at runtime |
| `DIRECT_URL` | Supabase → Project Settings → Database → **Direct connection** URI | Port `5432`, used only by `prisma generate`/`db push` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Not required by current routes, grab it anyway |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Same as above |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API | Server-only, never expose client-side |
| `N8N_WEBHOOK_URL_v2` | Your n8n instance | See §6 below for the test URL flow |
| `N8N_SECRET` | Whatever your n8n workflow checks against | Sent as `x-n8n-secret` header |
| `DEMO_USER_ID` | Pick a UUID, e.g. `11111111-1111-1111-1111-111111111111` | Must match a seeded row in `user` (§5) |
| `DEMO_INTERNAL_KEY` | Generate a random string (see below) | Server-side check. Leave blank = API routes fully open |
| `NEXT_PUBLIC_DEMO_INTERNAL_KEY` | **Same value** as `DEMO_INTERNAL_KEY` | Needed so the browser can send it — must match exactly |

Generate a random key for the last two:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 4. Push the schema to Supabase

```bash
npx prisma generate
npx prisma db push
```

Confirm in Supabase's Table Editor that `user`, `chat_messages`, `receipts`, and `rates` all exist.

> If you already have these tables from elsewhere and want the schema to match exactly what's live in your DB instead of what's in this repo's `prisma/schema.prisma`, run `npx prisma db pull` instead of `db push` — it overwrites the schema file with your real table structure.

---

## 5. Seed the demo user

Run in Supabase's SQL editor (swap the UUID/email for your own if you like, just keep it matching `DEMO_USER_ID` in `.env`):

```sql
insert into "user" (id, email, name, currency, role, status)
values (
  '11111111-1111-1111-1111-111111111111',
  'demo@lydra-demo.com',
  'Demo User',
  'USD',
  'ADMIN',
  'active'
);
```

Also confirm the `rates` table has at least a `USD` row (needed for currency conversion math on the dashboard):
```sql
select * from rates where currency = 'USD';
-- if missing:
insert into rates (currency, rate) values ('USD', 1);
```

---

## 6. Connect n8n

The chat page posts to `/api/chat/save`, which forwards the message (plus any image/audio/PDF) to your n8n webhook at `N8N_WEBHOOK_URL_v2`, with a `x-n8n-secret` header matching `N8N_SECRET`.

**For testing/demoing without a production n8n setup:**
1. Open your n8n workflow
2. Use the **Webhook (test) URL** shown at the top of the Webhook trigger node (not the production URL) — this only listens while you have the workflow open with **"Listen for test event"** active
3. Paste that test URL into `N8N_WEBHOOK_URL_v2` in `.env`
4. Each time you (or a friend) want to test the chat, open the n8n workflow first and click **"Execute workflow"** / **"Listen for test event"** on the webhook node so it's actively listening — the test webhook only works while it's manually armed like this
5. Once you're ready for it to work without manual arming every time, activate the workflow and switch `N8N_WEBHOOK_URL_v2` to the **production URL** instead (shown in the same webhook node once the workflow is toggled Active)

**Expected response shape from n8n** — the route expects one of:
```json
{ "status": "success", "data": { "form_data": {...}, "is_duplicate": false, "duplicate_match_details": null } }
```
```json
{ "status": "success", "data": { "transactions": [...], "transaction_count": 3 } }
```
```json
{ "status": "error", "message_type": "alert", "output": "some message" }
```
or a plain text field (`text_response` / `output` / `response` / `message`) for a normal chat reply.

---

## 7. Run it

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

## 8. Build for production / deploy

```bash
npm run build
npm run start
```

If deploying on Vercel: add all the same env vars in Project Settings → Environment Variables (they don't carry over from your local `.env`). `package.json`'s `build` script already runs `prisma generate && next build`, which avoids Vercel's dependency-caching issue with stale Prisma clients.

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

**Build fails on Vercel with a Prisma "outdated client" error**
Make sure `package.json`'s `build` script is `prisma generate && next build`, not just `next build`.

**Dashboard shows no data even though receipts exist in Supabase**
Check the active period filter — it defaults to "All Time" in this repo, but if it's been changed to something like "This Month", older test receipts won't show. Also double check `DEMO_USER_ID` in `.env` matches the `user_id` on the receipt rows exactly.

**`/api/chat/save` or `/api/sync` returns 401**
`DEMO_INTERNAL_KEY` is set but `NEXT_PUBLIC_DEMO_INTERNAL_KEY` isn't (or they don't match). Both need the same value, and a full server restart is required after changing `NEXT_PUBLIC_*` vars (hot reload doesn't pick them up).
