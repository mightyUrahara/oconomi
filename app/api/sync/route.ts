import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { sanitizeInput } from "@/app/lib/validation";

const DEMO_USER_ID = process.env.DEMO_USER_ID || "demo-user";
const DEMO_INTERNAL_KEY = process.env.DEMO_INTERNAL_KEY || "";

function normalizeDate(dateInput: string | Date | null | undefined): Date | undefined {
  if (!dateInput) return undefined;
  try {
    const validDate = new Date(dateInput);
    if (isNaN(validDate.getTime())) return undefined;
    const justDate = validDate.toISOString().split('T')[0];
    return new Date(`${justDate}T12:00:00Z`);
  } catch (e) {
    return undefined;
  }
}

export async function POST(req: Request) {
  if (DEMO_INTERNAL_KEY && req.headers.get("x-demo-key") !== DEMO_INTERNAL_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = DEMO_USER_ID;

  const body = await req.json();
  const { type, ...data } = body;

  try {
    // ── CREATE SINGLE RECEIPT ──────────────────────────────────────────────
    if (type === 'create_receipt') {
      const { item } = data;
      if (!item) return NextResponse.json({ error: "No item provided" }, { status: 400 });

      await prisma.receipts.create({
        data: {
          user_id:          userId,
          merchant_name: item.merchant_name ? sanitizeInput(item.merchant_name).slice(0, 100) : null,
          merchant_address: item.company_address || null,
          city:          item.city          ? sanitizeInput(item.city).slice(0, 100)          : null,
          invoice_id:       item.receipt_id      || null,
          receipt_date:   normalizeDate(item.date) || new Date(),
          payment_method:   item.payment_method  || null,
          currency:         item.currency        || 'USD',
          total:            parseFloat(item.total) || 0,
          tax:              parseFloat(item.tax)  || 0,
          category:      item.category      ? sanitizeInput(item.category).slice(0, 100)      : null,
          tags:             item.tags            ? [item.tags] : [],
          flow_type:        item.flow_type       || 'expense',
          workspace:        item.workspace       || 'business',
          is_recurring:     item.is_recurring    === true,
          frequency:        item.frequency       || null,
          receipt_link:     item.receipt_link    || null,
        },
      });
      return NextResponse.json({ success: true });
    }

    // ── CREATE BATCH RECEIPTS ──────────────────────────────────────────────
    if (type === 'create_receipt_batch') {
      const { items } = data;

      if (!Array.isArray(items) || items.length === 0) {
        return NextResponse.json({ error: "No items provided" }, { status: 400 });
      }
      if (items.length > 100) {
        return NextResponse.json({ error: "Maximum 100 items per batch" }, { status: 400 });
      }

      const rows = items.map((item: any) => ({
        user_id:          userId,
        merchant_name: item.merchant_name ? sanitizeInput(item.merchant_name).slice(0, 100) : null,
        merchant_address: item.company_address || null,
        city:          item.city          ? sanitizeInput(item.city).slice(0, 100)          : null,
        invoice_id:       item.receipt_id      || null,
        receipt_date:   normalizeDate(item.date) || new Date(),
        payment_method:   item.payment_method  || null,
        currency:         item.currency        || 'USD',
        total:            parseFloat(item.total) || 0,
        tax:              parseFloat(item.tax)  || 0,
        category:      item.category      ? sanitizeInput(item.category).slice(0, 100)      : null,
        tags:             item.tags            ? [item.tags] : [],
        flow_type:        item.flow_type       || 'expense',
        workspace:        item.workspace       || 'business',
        is_recurring:     item.is_recurring    === true,
        frequency:        item.frequency       || null,
        receipt_link:     item.receipt_link    || null,
      }));

      await prisma.receipts.createMany({ data: rows });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action type" }, { status: 400 });

  } catch (error) {
    console.error("[demo/sync] Error:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}