# Oconomi

**An AI Finance Assistant that replaces manual bookkeeping.**

Oconomi is an AI-powered financial intelligence assistant that helps people understand and manage their finances without manual bookkeeping. Add income and expenses through text, voice, images, or PDFs — AI converts each one into a structured financial record: amount, merchant, category, date, currency, and tags. Then just ask your own finances a question, in plain English, and get an answer grounded in your real data.

---

## What it does

AI converts receipts, voice notes, screenshots, and PDFs into clean expense/income records — no manual data entry required.

## Who it's for

Individuals and small businesses who want their finances tracked and explained, without spreadsheets.

## What we built

A working AI extraction pipeline, a finance-assistant chat, and a full web dashboard — live for this demo.

---

## From any input, to a clean financial record

Four input modes feed one AI pipeline. The user always reviews before anything is saved.

- 📷 **Photo / Receipt**
- 🖼️ **Screenshot / Image**
- 🎙️ **Voice note**
- 💬 **Chat / free text**

Each one goes through the **AI Extraction Engine**, which reads any input and structures it into amount, merchant, category, date, currency, and tags.

**Built-in safeguards:**
- **User-in-the-loop review** — every extraction is shown to the user for confirmation or edits before anything is saved to their history.
- **Duplicate detection** — incoming records are checked against existing transactions so the same receipt is never logged twice.
- **Multi-receipt / multi-batch** — one photo, PDF, or message can contain several receipts or line items; the AI splits them into separate records automatically.

---

## Ask your finances a question — in plain English

The assistant sits on top of the user's real transaction data. It's not a static chatbot — it's a data-grounded reasoning layer.

> **"How much did I spend on food this month?"**
> You spent $612 on Food & Dining this month — $340 personal, $272 business. That's 18% higher than last month, mostly from delivery orders.

> **"Compare that to Amazon spend"**
> You've spent $460 on Amazon total — $340 personal, $120 business, across both workspaces.

**What the assistant can do:**
- **Totals, comparisons & breakdowns** — spend by merchant, category, time range, or workspace, always pulled live from real records, never estimated.
- **Multi-currency aware** — converts and sums cleanly across currencies using live FX rates, without mixing up native amounts.
- **Personal vs. business workspaces** — every question can be scoped to personal, business, or both — one assistant, separate books.
- **Grounded, not guessed** — every number comes from a query against the user's actual data; the AI never calculates from memory.

---

## One web app: dashboard, filters, and AI chat

What we built and demoed — a live web dashboard backed by the same AI system.

- **Total Expenses / Total Income / Net** — always current, always reflecting real data
- **Filters** — Workspace • Category • Merchant • Date range • Currency
- **Transaction History** — every record the AI extracted, in one place
- **AI Chat** — ask a question, drop a receipt, get an answer — side by side with the dashboard

---

## Scaling the AI system beyond the MVP

The MVP proves the core loop works — extraction, review, and reasoning. Scaling means making that AI loop faster, smarter, and safer at volume.

- **Proactive AI insights** — move from answering questions to surfacing them first: anomaly detection, budget alerts, and spend forecasts pushed to the user.
- **On-demand query tools over static context** — replace fixed data blobs with live, on-demand SQL tools so the AI scales to years of history without losing accuracy.
- **Mobile-first capture** — iOS & Android apps for instant receipt capture and voice logging, syncing into the same AI pipeline in real time.
- **Enterprise-grade security** — workspace-level data isolation, prompt-injection hardening, and audit trails as usage — and stakes — grow.
- **Multi-user & team workspaces** — shared business workspaces with role-based access, so the assistant reasons over a whole team's finances, not just one user's.
- **Smarter extraction models** — continual fine-tuning on real receipt data to push accuracy higher and cut manual correction toward zero.