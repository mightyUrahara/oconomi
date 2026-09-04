import { prisma } from "@/app/lib/prisma";
import DashboardDemo from "./DashboardDemo";

// DEMO NOTE: no auth/session — every request reads this fixed demo user's
// data. Must match the row you seeded in `user` (see setup checklist).
const DEMO_USER_ID = process.env.DEMO_USER_ID || "demo-user";

export const dynamic = "force-dynamic"; // always fetch fresh, no static caching

export default async function DashboardPage() {
  const rawReceipts = await prisma.receipts.findMany({
    where: { user_id: DEMO_USER_ID },
    orderBy: { receipt_date: "desc" },
  });

  const expenses = rawReceipts.map(
    (r: Awaited<ReturnType<typeof prisma.receipts.findMany>>[number]) => ({
    id: r.id,
    receipt_date: r.receipt_date
      // Lock to noon UTC so no timezone shifts the day backward, same fix
      // your production dashboard used.
      ? r.receipt_date.toISOString().split("T")[0] + "T12:00:00Z"
      : new Date().toISOString(),
    merchant_name: r.merchant_name || undefined,
    category: r.category || undefined,
    total: r.total ? Number(r.total) : 0,
    tax: r.tax ? Number(r.tax) : 0,
    currency: r.currency || "USD",
    flow_type: (r.flow_type as "income" | "expense") || "expense",
    payment_method: r.payment_method || undefined,
    }),
  );

  const ratesData = await prisma.rates.findMany();
  const rates = (ratesData as Array<{ currency: string; rate: unknown }>).reduce<Record<string, number>>((acc, item) => {
    acc[item.currency] = Number(item.rate);
    return acc;
  }, {} as Record<string, number>);

  if (!rates["USD"]) rates["USD"] = 1;

  return <DashboardDemo expenses={expenses} rates={rates} baseCurrency="USD" />;
}