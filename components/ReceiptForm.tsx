"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Check, Trash2, Plus, X, Save, ChevronDown } from "lucide-react";

// ─── CONSTANTS (identical to production) ───────────────────────────────────

const EXPENSE_CATEGORIES = [
  "Food & Dining", "Shopping", "Office Supplies & Stationery", "Transport", "Travel",
  "Home & Living", "Bills & Utilities", "Technology", "Finance & Insurance",
  "Taxes & Licenses", "Repair & Maintenance", "Health & Personal Care", "Education",
  "Entertainment", "Gifts & Donations", "Pets", "Advertising & Marketing",
  "Professional Services", "Payroll & Benefits", "Delivery & Freight",
  "Cost of Goods Sold", "Other"
];

const INCOME_CATEGORIES = [
  "Salary", "Freelance", "Business", "Investments", "Grants & Subsidies", "Gifts & Support", "Pension"
];

const CURRENCIES = [
  "USD", "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN", "BAM",
  "BBD", "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB", "BRL", "BSD", "BTN", "BWP",
  "BYN", "BZD", "CAD", "CDF", "CHF", "CLF", "CLP", "CNH", "CNY", "COP", "CRC", "CUP",
  "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", "EGP", "ERN", "ETB", "EUR", "FJD", "FKP",
  "FOK", "GBP", "GEL", "GGP", "GHS", "GIP", "GMD", "GNF", "GTQ", "GYD", "HKD", "HNL",
  "HRK", "HTG", "HUF", "IDR", "ILS", "IMP", "INR", "IQD", "IRR", "ISK", "JEP", "JMD",
  "JOD", "JPY", "KES", "KGS", "KHR", "KID", "KMF", "KRW", "KWD", "KYD", "KZT", "LAK",
  "LBP", "LKR", "LRD", "LSL", "LYD", "MAD", "MDL", "MGA", "MKD", "MMK", "MNT", "MOP",
  "MRU", "MUR", "MVR", "MWK", "MXN", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK", "NPR",
  "NZD", "OMR", "PAB", "PEN", "PGK", "PHP", "PKR", "PLN", "PYG", "QAR", "RON", "RSD",
  "RUB", "RWF", "SAR", "SBD", "SCR", "SDG", "SEK", "SGD", "SHP", "SLE", "SLL", "SOS",
  "SRD", "SSP", "STN", "SYP", "SZL", "THB", "TJS", "TMT", "TND", "TOP", "TRY", "TTD",
  "TVD", "TWD", "TZS", "UAH", "UGX", "UYU", "UZS", "VES", "VND", "VUV", "WST", "XAF",
  "XCD", "XCG", "XDR", "XOF", "XPF", "YER", "ZAR", "ZMW", "ZWG", "ZWL"
];

// ─── TYPES (identical to production) ───────────────────────────────────────

interface FormData {
  company_name: string;
  company_address: string | null;
  city: string | null;
  receipt_id: string | null;
  date: string;
  payment_method: string | null;
  currency: string;
  total_with_tax: number | string;
  tax: number | string | null;
  total_without_tax: number | string | null;
  category: string;
  tags: string | null;
  vat_number: string | null;
  flow_type: string;
  workspace?: string;
  is_recurring: boolean;
  frequency: string | null;
  notes: string[] | null;
  receipt_link: string | null;
  splits?: SplitItem[];
}

interface SplitItem {
  category: string;
  percentage: number | string;
  tax: number | string | null;
  tags: string | null;
}

interface Transaction {
  form_data: FormData;
  is_duplicate: boolean;
  duplicate_match_details: string | null;
  status: 'pending' | 'saved' | 'deleted';
}

interface ReceiptFormProps {
  formData?: FormData;
  isDuplicate?: boolean;
  duplicateMatchDetails?: string | null;
  transactions?: Omit<Transaction, 'status'>[];
  transactionCount?: number;
  onDone: (result: 'saved' | 'discarded' | 'batch', meta?: { saved: number; discarded: number; savedItem?: FormData; savedItems?: FormData[] }) => void;
  userId: string;
  toastPosition?: 'center' | 'bottom-right';
  formTitle?: string;
}

// ─── FIELD COMPONENTS ───────────────────────────────────────────────────────

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-neutral-500">
    {children}
  </label>
);

const inputCls = "w-full rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-2 text-[13px] text-neutral-100 outline-none focus:border-emerald-500/60";

const FieldInput = ({ className, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) => (
  <input {...props} className={`${inputCls} ${error ? "border-red-500" : ""} ${className || ""}`} />
);

const CategorySelect = ({ value, flowType, onChange, error }: {
  value: string; flowType: string; onChange: (v: string) => void; error?: boolean;
}) => {
  const cats = flowType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className={`${inputCls} cursor-pointer appearance-none pr-7 ${error ? "border-red-500" : ""}`}
      >
        <option value="" disabled>Select category</option>
        {cats.map(c => <option key={c} value={c}>{c}</option>)}
        {![...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].includes(value) && value && (
          <option value={value}>{value}</option>
        )}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500" />
    </div>
  );
};

const CurrencySelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="relative">
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={`${inputCls} cursor-pointer appearance-none pr-7`}
    >
      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
    </select>
    <ChevronDown size={13} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500" />
  </div>
);

// ─── FLOW TOGGLE ────────────────────────────────────────────────────────────

const FlowToggle = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <div className="flex gap-1 rounded-lg border border-neutral-800 bg-neutral-950 p-1">
    {(['expense', 'income'] as const).map(t => (
      <button
        key={t}
        type="button"
        onClick={() => onChange(t)}
        className={`flex-1 rounded-md py-1.5 text-[11px] font-bold capitalize transition-colors ${
          value === t
            ? t === 'income' ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"
            : "text-neutral-500"
        }`}
      >
        {t === 'income' ? '📈 Income' : '📉 Expense'}
      </button>
    ))}
  </div>
);

// ─── SPLIT ROW ──────────────────────────────────────────────────────────────

const SplitRow = ({
  split, index, total, splitCount, flowType, isFirst, onUpdate, onRemove, splitError
}: {
  split: SplitItem; index: number; total: number; splitCount: number;
  flowType: string; isFirst: boolean; splitError?: string;
  onUpdate: (i: number, s: SplitItem) => void;
  onRemove: (i: number) => void;
}) => {
  const isLast = index === splitCount - 1;
  const canDelete = splitCount > 2 && !isFirst;
  const pct = parseFloat(String(split.percentage)) || 0;
  const derivedAmt = ((pct / 100) * total).toFixed(2);
  const tagOnly = (v: string) => v.replace(/[^a-zA-Z0-9\s,]/g, '');

  const handlePctChange = (v: string) => {
    const digits = v.replace(/[^0-9.]/g, '');
    const num = parseFloat(digits);
    if (!isNaN(num) && num > 99.99) return;
    onUpdate(index, { ...split, percentage: digits });
  };

  return (
    <div className={`flex flex-col gap-2 rounded-lg border bg-neutral-950 p-2.5 ${
      splitError ? "border-red-500" : isFirst ? "border-emerald-500/30" : "border-neutral-800"
    }`}>
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold uppercase ${isFirst ? "text-emerald-400" : "text-neutral-500"}`}>
          Split {index + 1} {isFirst ? '(original category)' : ''}
        </span>
        {canDelete ? (
          <button type="button" onClick={() => onRemove(index)} className="text-red-400">
            <X size={13} />
          </button>
        ) : (
          <span className="text-[9px] text-neutral-600">locked</span>
        )}
      </div>

      {splitError && <div className="text-[10px] text-red-400">{splitError}</div>}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Category *</FieldLabel>
          <CategorySelect value={split.category} flowType={flowType} onChange={v => onUpdate(index, { ...split, category: v })} error={!split.category && !!splitError} />
        </div>
        <div>
          <FieldLabel>% Share {isLast ? '(auto)' : ''}</FieldLabel>
          <div className="relative">
            <FieldInput
              type="text" inputMode="decimal"
              value={isLast ? pct.toFixed(2) : split.percentage}
              readOnly={isLast}
              onChange={e => handlePctChange(e.target.value)}
              placeholder="50"
              className={`pr-7 ${isLast ? "bg-neutral-900 opacity-70" : ""}`}
            />
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-500">%</span>
          </div>
          <div className="mt-0.5 text-[10px] text-neutral-500">= {total > 0 ? derivedAmt : '0.00'}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Tax (optional)</FieldLabel>
          <FieldInput type="text" inputMode="decimal" value={split.tax ?? ''} onChange={e => onUpdate(index, { ...split, tax: e.target.value.replace(/[^0-9.]/g, '') || null })} placeholder="0.00" maxLength={50} />
        </div>
        <div>
          <FieldLabel>Tag</FieldLabel>
          <FieldInput value={split.tags ?? ''} onChange={e => onUpdate(index, { ...split, tags: tagOnly(e.target.value) || null })} placeholder="e.g. Coffee" maxLength={50} />
        </div>
      </div>
    </div>
  );
};

// ─── VALIDATION (identical to production) ──────────────────────────────────

type FormErrors = Partial<Record<keyof FormData, string>>;

function validateForm(data: FormData): FormErrors {
  const errors: FormErrors = {};
  if (!data.company_name?.trim()) errors.company_name = 'Required';
  if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) errors.date = 'Required — YYYY-MM-DD';
  if (!data.currency) errors.currency = 'Required';
  if (!data.total_with_tax || parseFloat(String(data.total_with_tax)) <= 0) errors.total_with_tax = 'Required';
  if (!data.category) errors.category = 'Required';
  if (!data.flow_type) errors.flow_type = 'Required';
  return errors;
}

function validateSplits(splits: SplitItem[], total: number): string[] {
  const errors = splits.map((s, i) => {
    const pct = parseFloat(String(s.percentage)) || 0;
    const amt = (pct / 100) * total;
    if (!s.category) return `Split ${i + 1}: category is required`;
    if (amt <= 0) return `Split ${i + 1}: amount is 0 — adjust the percentage`;
    return '';
  });
  const totalPct = splits.reduce((sum, s) => sum + (parseFloat(String(s.percentage)) || 0), 0);
  if (Math.abs(totalPct - 100) > 0.01) {
    errors[errors.length - 1] = `Splits must add up to 100% (currently ${totalPct.toFixed(1)}%)`;
  }
  return errors;
}

// ─── SINGLE FORM FIELDS ─────────────────────────────────────────────────────

const SingleFormFields = ({ data, onChange, errors = {}, splitErrors = [] }: {
  data: FormData; onChange: (d: FormData) => void; errors?: FormErrors; splitErrors?: string[];
}) => {
  const isIncome = (data.flow_type || 'expense') === 'income';
  const splits = data.splits || [];
  const total = parseFloat(String(data.total_with_tax)) || 0;
  const hasSplit = splits.length > 0;

  const computeSplits = (raw: SplitItem[]): SplitItem[] => {
    if (raw.length < 2) return raw;
    const allButLast = raw.slice(0, -1);
    const usedPct = allButLast.reduce((s, r) => s + (parseFloat(String(r.percentage)) || 0), 0);
    const remainder = Math.max(0, parseFloat((100 - usedPct).toFixed(2)));
    return [...allButLast, { ...raw[raw.length - 1], percentage: remainder }];
  };

  const addSplitMode = () => onChange({ ...data, splits: [
    { category: data.category || '', percentage: 50, tax: null, tags: null },
    { category: '', percentage: 50, tax: null, tags: null },
  ] });

  const addSplit = () => {
    const evenPct = parseFloat((100 / (splits.length + 1)).toFixed(2));
    const newSplits: SplitItem[] = [...splits.map(s => ({ ...s, percentage: evenPct })), { category: '', percentage: evenPct, tax: null, tags: null }];
    onChange({ ...data, splits: computeSplits(newSplits) });
  };

  const updateSplit = (i: number, s: SplitItem) => {
    const updated = splits.map((sp, idx) => idx === i ? s : sp);
    onChange({ ...data, splits: computeSplits(updated) });
  };

  const removeSplit = (i: number) => {
    const remaining = splits.filter((_, idx) => idx !== i);
    if (remaining.length < 2) { onChange({ ...data, splits: [] }); return; }
    onChange({ ...data, splits: computeSplits(remaining) });
  };

  const handleTotalChange = (v: string) => onChange({ ...data, total_with_tax: v });

  const handleDateChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) formatted = `${digits.slice(0, 4)}-${digits.slice(4)}`;
    if (digits.length > 6) formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
    onChange({ ...data, date: formatted });
  };

  const numOnly = (v: string) => v.replace(/[^0-9.]/g, '');
  const textOnly = (v: string) => v.replace(/[^a-zA-Z0-9\s\-&.,'/()]/g, '');
  const tagOnly = (v: string) => v.replace(/[^a-zA-Z0-9\s,]/g, '');

  const ErrMsg = ({ field }: { field: keyof FormData }) =>
    errors[field] ? <div className="mt-0.5 text-[10px] text-red-400">{errors[field]}</div> : null;

  const isBusiness = String(data.workspace || 'business').toLowerCase() === 'business';

  return (
    <div className="flex flex-col gap-2.5">
      <FlowToggle value={data.flow_type || 'expense'} onChange={v => onChange({ ...data, flow_type: v, category: '' })} />

      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Date (YYYY-MM-DD) *</FieldLabel>
          <FieldInput type="text" value={data.date || ''} onChange={e => handleDateChange(e.target.value)} placeholder="2026-05-22" maxLength={10} error={!!errors.date} />
          <ErrMsg field="date" />
        </div>
        <div>
          <FieldLabel>Currency *</FieldLabel>
          <CurrencySelect value={data.currency || 'USD'} onChange={v => onChange({ ...data, currency: v })} />
        </div>
      </div>

      <div>
        <FieldLabel>{isIncome ? 'Source / Payer' : 'Merchant'} *</FieldLabel>
        <FieldInput type="text" value={data.company_name || ''} onChange={e => onChange({ ...data, company_name: textOnly(e.target.value) })} placeholder="e.g. Amazon" error={!!errors.company_name} maxLength={100} />
        <ErrMsg field="company_name" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Total Amount *</FieldLabel>
          <FieldInput type="text" inputMode="decimal" value={data.total_with_tax ?? ''} onChange={e => handleTotalChange(numOnly(e.target.value))} placeholder="0.00" error={!!errors.total_with_tax} maxLength={50} />
          <ErrMsg field="total_with_tax" />
        </div>
        <div>
          <FieldLabel>Category *</FieldLabel>
          <CategorySelect value={data.category || ''} flowType={data.flow_type || 'expense'} onChange={v => onChange({ ...data, category: v })} error={!!errors.category} />
          <ErrMsg field="category" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Tax (optional)</FieldLabel>
          <FieldInput type="text" inputMode="decimal" value={data.tax ?? ''} onChange={e => onChange({ ...data, tax: numOnly(e.target.value) || null })} placeholder="0.00" maxLength={50} />
        </div>
        <div>
          <FieldLabel>{isIncome ? 'Payment Destination' : 'Payment Method'}</FieldLabel>
          <FieldInput type="text" value={data.payment_method || ''} onChange={e => onChange({ ...data, payment_method: textOnly(e.target.value) || null })} placeholder="e.g. Card" maxLength={50} />
        </div>
      </div>

      <div className="grid grid-cols-2 items-end gap-2">
        <div>
          <FieldLabel>Tag</FieldLabel>
          <FieldInput type="text" value={data.tags || ''} onChange={e => onChange({ ...data, tags: tagOnly(e.target.value) || null })} placeholder="e.g. Coffee, Subscription" maxLength={50} />
        </div>

        <div className="flex flex-col gap-1">
          <FieldLabel>Workspace Context</FieldLabel>
          <div className="flex h-8.75 items-center justify-center gap-3 rounded-lg border border-neutral-800 bg-neutral-950 px-2">
            <span onClick={() => onChange({ ...data, workspace: 'personal' })} className={`cursor-pointer text-xs font-semibold transition-colors ${!isBusiness ? "text-emerald-400" : "text-neutral-500"}`}>Personal</span>
            <label className="inline-flex cursor-pointer items-center">
              <input type="checkbox" className="sr-only" checked={isBusiness} onChange={(e) => onChange({ ...data, workspace: e.target.checked ? 'business' : 'personal' })} />
              <div className={`relative h-5.5 w-10.5 rounded-full transition-colors ${isBusiness ? "bg-emerald-500" : "bg-neutral-700"}`}>
                <div className={`absolute top-0.5 h-4.5 w-4.5 rounded-full transition-all ${isBusiness ? "left-5.5 bg-black" : "left-0.5 bg-white"}`} />
              </div>
            </label>
            <span onClick={() => onChange({ ...data, workspace: 'business' })} className={`cursor-pointer text-xs font-semibold transition-colors ${isBusiness ? "text-emerald-400" : "text-neutral-500"}`}>Business</span>
          </div>
        </div>
      </div>

      {hasSplit && (
        <>
          <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-2 text-[11px] leading-snug text-amber-400">
            ⚡ Split mode — only the splits below will be logged. The original amount acts as the total reference.
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Category Splits ({splits.length})</div>
              <button type="button" onClick={addSplit} className="flex items-center gap-1 rounded-md border border-red-400/70 px-2 py-1 text-[11px] text-red-400">
                <Plus size={11} /> Add
              </button>
            </div>
            {splits.map((s, i) => (
              <SplitRow key={i} split={s} index={i} total={total} splitCount={splits.length} flowType={data.flow_type || 'expense'} isFirst={i === 0} splitError={splitErrors[i] || undefined} onUpdate={updateSplit} onRemove={removeSplit} />
            ))}
          </div>
        </>
      )}

      <div className="pb-3">
        {!hasSplit ? (
          <button type="button" onClick={addSplitMode} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-neutral-700 py-2 text-xs text-neutral-500 transition-colors hover:border-emerald-500 hover:text-emerald-400">
            <Plus size={13} /> Split Category
          </button>
        ) : (
          <button type="button" onClick={() => onChange({ ...data, splits: [] })} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-red-500/40 py-2 text-xs text-red-400">
            <X size={13} /> Cancel Split
          </button>
        )}
      </div>
    </div>
  );
};

// ─── SAVE TO DB (identical endpoint contract) ──────────────────────────────

async function saveReceiptToDB(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const DEMO_KEY = process.env.NEXT_PUBLIC_DEMO_INTERNAL_KEY || "";
  const demoHeaders = (): Record<string, string> =>
    DEMO_KEY ? { "x-demo-key": DEMO_KEY } : {};

  const hasSplits = formData.splits && formData.splits.length > 0;
  const masterTotal = parseFloat(String(formData.total_with_tax)) || 0;

  if (hasSplits) {
    const items = formData.splits!.map(s => {
      const pct = parseFloat(String(s.percentage)) || 0;
      const amt = parseFloat(((pct / 100) * masterTotal).toFixed(2));
      const tax = parseFloat(String(s.tax)) || 0;
      return {
        merchant_name: formData.company_name, company_address: formData.company_address,
        city: formData.city, receipt_id: formData.receipt_id, date: formData.date,
        payment_method: formData.payment_method, currency: formData.currency,
        total: amt, tax, total_without_tax: amt - tax,
        category: s.category, tags: s.tags, vat_number: formData.vat_number,
        flow_type: formData.flow_type, is_recurring: formData.is_recurring,
        frequency: formData.frequency, receipt_link: formData.receipt_link, notes: formData.notes,
        workspace: formData.workspace || 'business',
      };
    });
    const res = await fetch('/api/sync', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...demoHeaders() },
      body: JSON.stringify({ type: 'create_receipt_batch', items })
    });
    return { success: res.ok, error: (await res.json()).error };
  }

  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...demoHeaders() },
    body: JSON.stringify({
      type: 'create_receipt',
      item: {
        merchant_name: formData.company_name, company_address: formData.company_address,
        city: formData.city, receipt_id: formData.receipt_id, date: formData.date,
        payment_method: formData.payment_method, currency: formData.currency,
        total: masterTotal, tax: parseFloat(String(formData.tax)) || 0,
        total_without_tax: formData.total_without_tax, category: formData.category,
        tags: formData.tags, vat_number: formData.vat_number, flow_type: formData.flow_type,
        is_recurring: formData.is_recurring, frequency: formData.frequency,
        receipt_link: formData.receipt_link, notes: formData.notes,
        workspace: formData.workspace || 'business',
      }
    })
  });
  return { success: res.ok, error: (await res.json()).error };
}

// ─── TOAST ──────────────────────────────────────────────────────────────────

const Toast = ({ message, type, toastPosition = 'center' }: { message: string; type: 'success' | 'error'; toastPosition?: 'center' | 'bottom-right' }) => (
  <div
    className={`fixed z-9999 whitespace-nowrap rounded-full border px-4 py-2 text-[13px] font-semibold shadow-lg ${
      type === 'success' ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-400" : "border-red-500/40 bg-red-500/15 text-red-400"
    } ${toastPosition === 'bottom-right' ? "bottom-6 right-6 max-[768px]:hidden" : "bottom-20 left-1/2 -translate-x-1/2"}`}
  >
    {message}
  </div>
);

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────────

export function ReceiptForm({
  formData, isDuplicate, duplicateMatchDetails,
  transactions, transactionCount, onDone, toastPosition = 'center', formTitle
}: ReceiptFormProps) {
  const isBatch = !!transactions && transactions.length > 0;

  const [singleData, setSingleData] = useState<FormData>(formData || {} as FormData);
  const [singleSaving, setSingleSaving] = useState(false);
  const [singleErrors, setSingleErrors] = useState<FormErrors>({});
  const [singleSplitErrors, setSingleSplitErrors] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);

  const [batchItems, setBatchItems] = useState<Transaction[]>((transactions || []).map(t => ({ ...t, status: 'pending' as const })));
  const [batchErrors, setBatchErrors] = useState<FormErrors>({});
  const [batchSplitErrors, setBatchSplitErrors] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchDone, setBatchDone] = useState(false);

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const onDoneFiredRef = React.useRef(false);

  React.useEffect(() => {
    if (!isBatch || batchDone || onDoneFiredRef.current) return;
    const allProcessed = batchItems.length > 0 && batchItems.every(t => t.status !== 'pending');
    if (allProcessed) {
      onDoneFiredRef.current = true;
      const savedItems = batchItems.filter(t => t.status === 'saved').map(t => t.form_data);
      const discarded = batchItems.filter(t => t.status === 'deleted').length;
      onDone('batch', { saved: savedItems.length, discarded, savedItems });
      setTimeout(() => setBatchDone(true), 50);
    }
  }, [batchItems, isBatch, batchDone]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSingleSave = async () => {
    const errors = validateForm(singleData);
    if (Object.keys(errors).length > 0) {
      setSingleErrors(errors);
      showToast('⚠️ Please fix the required fields.', 'error');
      return;
    }
    if (singleData.splits && singleData.splits.length > 0) {
      const splitErrs = validateSplits(singleData.splits, parseFloat(String(singleData.total_with_tax)) || 0);
      if (splitErrs.some(e => e)) {
        setSingleSplitErrors(splitErrs);
        showToast('⚠️ Please fix the split errors.', 'error');
        return;
      }
    }
    setSingleErrors({});
    setSingleSplitErrors([]);
    setSingleSaving(true);
    const result = await saveReceiptToDB(singleData);
    setSingleSaving(false);
    if (result.success) {
      setDismissed(true);
      onDone('saved', { saved: 1, discarded: 0, savedItem: singleData });
    } else {
      showToast('❌ Failed to save. Please try again.', 'error');
    }
  };

  const handleSingleDiscard = () => {
    setDismissed(true);
    onDone('discarded', { saved: 0, discarded: 1 });
  };

  const handleBatchSaveOne = async (index: number) => {
    const item = batchItems[index];
    if (item.status !== 'pending') return;
    const errors = validateForm(item.form_data);
    if (Object.keys(errors).length > 0) {
      setBatchErrors(errors);
      showToast('⚠️ Please fix the required fields.', 'error');
      return;
    }
    if (item.form_data.splits && item.form_data.splits.length > 0) {
      const splitErrs = validateSplits(item.form_data.splits, parseFloat(String(item.form_data.total_with_tax)) || 0);
      if (splitErrs.some(e => e)) {
        setBatchSplitErrors(splitErrs);
        showToast('⚠️ Please fix the split errors.', 'error');
        return;
      }
    }
    setBatchErrors({});
    setBatchSplitErrors([]);
    const result = await saveReceiptToDB(item.form_data);
    if (result.success) {
      setBatchItems(prev => prev.map((t, i) => i === index ? { ...t, status: 'saved' } : t));
      showToast('✅ Receipt saved!', 'success');
      const nextPending = batchItems.findIndex((t, i) => i > index && t.status === 'pending');
      if (nextPending !== -1) setCurrentIndex(nextPending);
    } else {
      showToast('❌ Save failed. Try again.', 'error');
    }
  };

  const handleBatchDeleteOne = (index: number) => {
    setBatchItems(prev => prev.map((t, i) => i === index ? { ...t, status: 'deleted' } : t));
    const nextPending = batchItems.findIndex((t, i) => i !== index && t.status === 'pending');
    if (nextPending !== -1) setCurrentIndex(nextPending);
    showToast('🗑️ Receipt removed.', 'success');
  };

  const handleSaveAll = async () => {
    setBatchSaving(true);
    const pending = batchItems.filter(t => t.status === 'pending');
    const prevSaved = batchItems.filter(t => t.status === 'saved').map(t => t.form_data);
    const alreadyDeleted = batchItems.filter(t => t.status === 'deleted').length;
    const newlySavedItems: FormData[] = [];
    for (const item of pending) {
      const result = await saveReceiptToDB(item.form_data);
      if (result.success) newlySavedItems.push(item.form_data);
    }
    setBatchSaving(false);
    setBatchItems(prev => prev.map(t => t.status === 'pending' ? { ...t, status: 'saved' } : t));
    const allSavedItems = [...prevSaved, ...newlySavedItems];
    onDoneFiredRef.current = true;
    onDone('batch', { saved: allSavedItems.length, discarded: alreadyDeleted, savedItems: allSavedItems });
    setTimeout(() => setBatchDone(true), 50);
  };

  const goTo = (dir: number) => {
    let next = currentIndex + dir;
    while (next >= 0 && next < batchItems.length) {
      if (batchItems[next].status !== 'deleted') {
        setCurrentIndex(next);
        setBatchErrors({});
        setBatchSplitErrors([]);
        return;
      }
      next += dir;
    }
  };

  const pendingCount = batchItems.filter(t => t.status === 'pending').length;
  const savedCount = batchItems.filter(t => t.status === 'saved').length;
  const deletedCount = batchItems.filter(t => t.status === 'deleted').length;
  const currentItem = isBatch ? batchItems[currentIndex] : null;

  if (dismissed || batchDone) return null;

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} toastPosition={toastPosition} />}

      <div className="w-full max-w-105 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 px-3.5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-sm">🧾</div>
            <div>
              <div className="text-[13px] font-bold text-neutral-100">{isBatch ? 'Batch Import' : (formTitle ?? 'Review Transaction')}</div>
              {isBatch && <div className="text-[10px] text-neutral-500">{savedCount} saved · {pendingCount} pending · {deletedCount} removed</div>}
            </div>
          </div>

          {isBatch && (
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => goTo(-1)} disabled={currentIndex === 0} className="flex rounded-md border border-neutral-800 bg-neutral-950 p-1 text-neutral-500 disabled:opacity-30">
                <ChevronLeft size={14} />
              </button>
              <span className="min-w-10 text-center text-[11px] font-bold text-neutral-200">{currentIndex + 1} / {batchItems.length}</span>
              <button type="button" onClick={() => goTo(1)} disabled={currentIndex === batchItems.length - 1} className="flex rounded-md border border-neutral-800 bg-neutral-950 p-1 text-neutral-500 disabled:opacity-30">
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Duplicate alert */}
        {(isBatch ? currentItem?.is_duplicate : isDuplicate) && (
          <div className="mx-3 mt-2.5 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-xs leading-snug text-amber-400">
            <span className="font-bold">⚠️ Possible duplicate</span><br />
            <span className="opacity-85">{isBatch ? currentItem?.duplicate_match_details : duplicateMatchDetails}</span>
          </div>
        )}

        {/* Batch status pill */}
        {isBatch && currentItem && currentItem.status !== 'pending' && (
          <div className={`mx-3 mt-2.5 flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
            currentItem.status === 'saved' ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-red-500/20 bg-red-500/10 text-red-400"
          }`}>
            {currentItem.status === 'saved' ? <><Check size={13} /> Saved</> : <><X size={13} /> Removed</>}
          </div>
        )}

        {/* Body */}
        <div className="max-h-[75vh] overflow-y-auto px-3 pt-3">
          {isBatch && currentItem ? (
            <SingleFormFields
              data={currentItem.form_data}
              errors={batchErrors}
              splitErrors={batchSplitErrors}
              onChange={updated => setBatchItems(prev => prev.map((t, i) => i === currentIndex ? { ...t, form_data: updated } : t))}
            />
          ) : (
            <SingleFormFields data={singleData} errors={singleErrors} splitErrors={singleSplitErrors} onChange={setSingleData} />
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-neutral-800 px-3 py-3">
          {!isBatch && (
            <div className="grid grid-cols-[1fr_2fr] gap-2">
              <button type="button" onClick={handleSingleDiscard} className="flex items-center justify-center gap-1.5 rounded-lg border border-neutral-800 py-2.5 text-[13px] font-semibold text-neutral-400">
                <Trash2 size={14} /> Discard
              </button>
              <button type="button" onClick={handleSingleSave} disabled={singleSaving} className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px] font-bold transition-colors ${singleSaving ? "bg-neutral-800 text-neutral-500" : "bg-emerald-500 text-black"}`}>
                {singleSaving ? '⏳ Saving...' : <><Check size={14} /> Save</>}
              </button>
            </div>
          )}

          {isBatch && currentItem && currentItem.status === 'pending' && (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => handleBatchDeleteOne(currentIndex)} className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 py-2 text-xs font-semibold text-red-400">
                <Trash2 size={13} /> Remove
              </button>
              <button type="button" onClick={() => handleBatchSaveOne(currentIndex)} className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 py-2 text-xs font-bold text-emerald-400">
                <Save size={13} /> Save This
              </button>
            </div>
          )}

          {isBatch && pendingCount > 0 && (
            <button type="button" onClick={handleSaveAll} disabled={batchSaving} className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-[13px] font-extrabold transition-colors ${batchSaving ? "bg-neutral-800 text-neutral-500" : "bg-emerald-500 text-black"}`}>
              {batchSaving ? '⏳ Saving all...' : <><Check size={15} /> Save Remaining ({pendingCount})</>}
            </button>
          )}

          {isBatch && pendingCount === 0 && (
            <div className="py-1 text-center text-xs text-neutral-500">All receipts processed — {savedCount} saved, {deletedCount} removed.</div>
          )}
        </div>
      </div>
    </>
  );
}