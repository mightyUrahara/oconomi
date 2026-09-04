"use client";

import { useMemo, useState } from "react";
import { Wallet, TrendingUp, TrendingDown, ChevronDown, X } from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const EXPENSE_CATEGORIES = [
  "Food & Dining", "Shopping", "Office Supplies & Stationery", "Transport", "Travel",
  "Home & Living", "Bills & Utilities", "Technology", "Finance & Insurance", "Taxes & Licenses",
  "Repair & Maintenance", "Health & Personal Care", "Education", "Entertainment",
  "Gifts & Donations", "Pets", "Advertising & Marketing", "Professional Services",
  "Payroll & Benefits", "Delivery & Freight", "Cost of Goods Sold", "Other",
];
const INCOME_CATEGORIES = ["Salary", "Freelance", "Business", "Investments", "Grants & Subsidies", "Gifts & Support", "Pension"];

const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"];

type Txn = {
  id: string | number;
  receipt_date: string;
  merchant_name?: string;
  category?: string;
  total: number;
  currency?: string;
  flow_type?: "income" | "expense";
  payment_method?: string;
};

const PERIODS = ["This Month", "Last Month", "This Year", "All Time"] as const;

function inPeriod(date: Date, period: (typeof PERIODS)[number]) {
  const now = new Date();
  if (period === "This Month") return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  if (period === "Last Month") {
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return date.getMonth() === last.getMonth() && date.getFullYear() === last.getFullYear();
  }
  if (period === "This Year") return date.getFullYear() === now.getFullYear();
  return true;
}

export default function DashboardDemo({
  expenses, rates, baseCurrency = "USD",
}: { expenses: Txn[]; rates: Record<string, number>; baseCurrency?: string }) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>("All Time");
  const [flowType, setFlowType] = useState<"all" | "expense" | "income">("all");
  const [category, setCategory] = useState<string>("all");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);

  const convert = (amt: number, currency?: string) => {
    const rate = rates[(currency || baseCurrency).toUpperCase()] ?? 1;
    return amt / rate;
  };

  const filtered = useMemo(() => {
    return (expenses || []).filter((item) => {
      const d = new Date(item.receipt_date);
      if (!inPeriod(d, period)) return false;
      const flow = (item.flow_type || "expense").toLowerCase();
      if (flowType !== "all" && flow !== flowType) return false;
      if (category !== "all" && (item.category || "") !== category) return false;
      if (paymentMethod && !(item.payment_method || "").toLowerCase().includes(paymentMethod.toLowerCase())) return false;
      return true;
    });
  }, [expenses, period, flowType, category, paymentMethod]);

  const stats = useMemo(() => {
    let totalIncome = 0, totalExpense = 0;
    const byCategory: Record<string, number> = {};

    for (const item of filtered) {
      const amt = convert(Number(item.total) || 0, item.currency);
      const isIncome = (item.flow_type || "expense").toLowerCase() === "income";
      if (isIncome) totalIncome += amt;
      else {
        totalExpense += amt;
        const cat = item.category || "Other";
        byCategory[cat] = (byCategory[cat] || 0) + amt;
      }
    }

    const categoryData = Object.entries(byCategory)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return { totalIncome, totalExpense, net: totalIncome - totalExpense, categoryData };
  }, [filtered, rates]);

  const trendData = useMemo(() => {
    // Group by day within the filtered set, sorted chronologically
    const byDay: Record<string, { day: string; expense: number; income: number }> = {};
    for (const item of filtered) {
      const d = new Date(item.receipt_date);
      const key = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      if (!byDay[key]) byDay[key] = { day: label, expense: 0, income: 0 };
      const amt = convert(Number(item.total) || 0, item.currency);
      if ((item.flow_type || "expense").toLowerCase() === "income") byDay[key].income += amt;
      else byDay[key].expense += amt;
    }
    return Object.keys(byDay).sort().map((k) => byDay[k]).slice(-14);
  }, [filtered, rates]);

  const fmt = (n: number) => `${baseCurrency} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const categoryOptions = flowType === "income" ? INCOME_CATEGORIES : flowType === "expense" ? EXPENSE_CATEGORIES : [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-neutral-950 text-neutral-100">
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">Dashboard</h1>
          <p className="text-xs text-neutral-500">Demo · current finances</p>
        </div>
        <button
          onClick={() => setShowFilters((s) => !s)}
          className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-neutral-300 hover:border-neutral-700"
        >
          Filters <ChevronDown size={14} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
        </button>
      </header>

      {/* Filter bar */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-3 border-b border-neutral-800 bg-neutral-900/60 px-6 py-4">
          <div className="flex gap-1 rounded-xl border border-neutral-800 bg-neutral-900 p-1">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${period === p ? "bg-emerald-500 text-black" : "text-neutral-400 hover:text-neutral-200"}`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex gap-1 rounded-xl border border-neutral-800 bg-neutral-900 p-1">
            {(["all", "expense", "income"] as const).map((v) => (
              <button
                key={v}
                onClick={() => { setFlowType(v); setCategory("all"); }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors ${flowType === v ? "bg-emerald-500 text-black" : "text-neutral-400 hover:text-neutral-200"}`}
              >
                {v}
              </button>
            ))}
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-300 outline-none"
          >
            <option value="all">All categories</option>
            {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <input
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            placeholder="Payment method"
            className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-300 outline-none placeholder:text-neutral-600"
          />

          {(category !== "all" || paymentMethod || flowType !== "all") && (
            <button
              onClick={() => { setCategory("all"); setPaymentMethod(""); setFlowType("all"); }}
              className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-300"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>
      )}

      <main className="mx-auto max-w-6xl space-y-6 px-6 py-6">
        {/* Summary boxes */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-500/30 bg-linear-to-br from-emerald-500/10 to-transparent p-5">
            <div className="mb-2 flex items-center gap-2 text-emerald-400"><Wallet size={16} /><span className="text-xs font-semibold uppercase tracking-wide">Net Balance</span></div>
            <div className="text-2xl font-bold">{fmt(stats.net)}</div>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <div className="mb-2 flex items-center gap-2 text-blue-400"><TrendingUp size={16} /><span className="text-xs font-semibold uppercase tracking-wide">Income</span></div>
            <div className="text-2xl font-bold">{fmt(stats.totalIncome)}</div>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <div className="mb-2 flex items-center gap-2 text-red-400"><TrendingDown size={16} /><span className="text-xs font-semibold uppercase tracking-wide">Expenses</span></div>
            <div className="text-2xl font-bold">{fmt(stats.totalExpense)}</div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <h3 className="mb-4 text-sm font-semibold text-neutral-300">Spending by category</h3>
            {stats.categoryData.length === 0 ? (
              <p className="py-10 text-center text-xs text-neutral-600">No expense data for this filter</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={stats.categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {stats.categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "#171717", border: "1px solid #262626", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5">
            <h3 className="mb-4 text-sm font-semibold text-neutral-300">Trend</h3>
            {trendData.length === 0 ? (
              <p className="py-10 text-center text-xs text-neutral-600">No data for this filter</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#737373" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#737373" }} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background: "#171717", border: "1px solid #262626", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Transaction list */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900">
          <div className="border-b border-neutral-800 px-5 py-4">
            <h3 className="text-sm font-semibold text-neutral-300">Transactions ({filtered.length})</h3>
          </div>
          <div className="divide-y divide-neutral-800">
            {filtered.length === 0 && <p className="px-5 py-10 text-center text-xs text-neutral-600">No transactions match this filter</p>}
            {filtered.slice(0, 50).map((item) => {
              const isIncome = (item.flow_type || "expense").toLowerCase() === "income";
              return (
                <div key={item.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <div className="text-sm font-medium">{item.merchant_name || "Unknown"}</div>
                    <div className="text-xs text-neutral-500">{item.category || "General"} · {new Date(item.receipt_date).toLocaleDateString()}</div>
                  </div>
                  <div className={`text-sm font-semibold ${isIncome ? "text-emerald-400" : "text-neutral-200"}`}>
                    {isIncome ? "+" : "-"}{fmt(convert(Number(item.total) || 0, item.currency))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}