"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Mail, Phone } from "lucide-react";
import { cancelPartnerApplication, reviewPartnerApplication } from "@/lib/actions/partners";
import { STATUS_LABELS, type ApplicationStatus } from "@/lib/partners";
import { formatDateTime, formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";

export interface ManagedApplication {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string | null;
  website: string | null;
  logoUrl: string | null;
  notes: string | null;
  units: number;
  unitText: string | null;
  amountKobo: number;
  status: string;
  organizerNote: string | null;
  createdAt: string;
  packageTitle: string;
  onRequest: boolean;
}

const TONES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-600/20",
  APPROVED: "bg-sky-50 text-sky-700 ring-sky-600/20",
  AWAITING_PAYMENT: "bg-slate-50 text-slate-600 ring-slate-500/20",
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  REJECTED: "bg-red-50 text-red-700 ring-red-600/20",
  CANCELLED: "bg-slate-50 text-slate-500 ring-slate-500/20",
};

const FILTERS = [
  { id: "open", label: "Needs action", match: (s: string) => s === "PENDING" },
  { id: "active", label: "Approved & paid", match: (s: string) => ["APPROVED", "PAID"].includes(s) },
  { id: "all", label: "All", match: () => true },
] as const;

function Row({ app }: { app: ManagedApplication }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"approve" | "reject" | "cancel" | null>(null);
  const [quote, setQuote] = useState(app.amountKobo ? String(app.amountKobo / 100) : "");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (!res.ok) return setError((res as { error: string }).error);
      setMode(null);
      router.refresh();
    });
  }

  return (
    <li className="p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
          {app.logoUrl ? (
            <img src={app.logoUrl} alt="" className="max-h-full max-w-full object-contain p-1" />
          ) : (
            <span className="text-lg font-bold text-slate-300">{app.companyName.charAt(0)}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink-800">{app.companyName}</p>
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", TONES[app.status])}>
              {STATUS_LABELS[app.status as ApplicationStatus] ?? app.status}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            {app.packageTitle}
            {app.unitText && ` · ${app.unitText}`} ·{" "}
            <span className="font-medium text-ink-800">{app.amountKobo ? formatNaira(app.amountKobo) : app.onRequest ? "Quote needed" : "Free"}</span>
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>{app.contactName}</span>
            <a href={`mailto:${app.email}`} className="flex items-center gap-1 hover:text-violet-600">
              <Mail className="h-3 w-3" /> {app.email}
            </a>
            {app.phone && (
              <a href={`tel:${app.phone}`} className="flex items-center gap-1 hover:text-violet-600">
                <Phone className="h-3 w-3" /> {app.phone}
              </a>
            )}
            {app.website && (
              <a href={app.website} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1 hover:text-violet-600">
                <ExternalLink className="h-3 w-3" /> Website
              </a>
            )}
            <span>{formatDateTime(app.createdAt)}</span>
          </div>
          {app.notes && <p className="mt-2 rounded-lg bg-slate-50 p-2.5 text-sm text-slate-600">{app.notes}</p>}
          {app.organizerNote && <p className="mt-2 text-xs text-slate-400">Your note: {app.organizerNote}</p>}
        </div>

        <div className="flex flex-wrap gap-2">
          {app.status === "PENDING" && (
            <>
              <button type="button" onClick={() => setMode(mode === "approve" ? null : "approve")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">
                Approve
              </button>
              <button type="button" onClick={() => setMode(mode === "reject" ? null : "reject")} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                Decline
              </button>
            </>
          )}
          {["APPROVED", "PAID", "AWAITING_PAYMENT"].includes(app.status) && (
            <button type="button" onClick={() => setMode(mode === "cancel" ? null : "cancel")} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50">
              Cancel booking
            </button>
          )}
          <a href={`/partner/${app.id}`} target="_blank" className="rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:text-violet-600">
            Their page ↗
          </a>
        </div>
      </div>

      {mode && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
          {mode === "approve" && (
            <div className="mb-3">
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                {app.onRequest ? "Your quote (₦) — 0 for free / in-kind" : "Amount to charge (₦)"}
              </label>
              <input
                type="number"
                min={0}
                inputMode="decimal"
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                className="h-10 w-48 rounded-lg border border-slate-200 bg-white px-3 text-sm"
              />
            </div>
          )}
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            {mode === "approve" ? "Message to the partner (optional)" : mode === "reject" ? "Reason (optional, shown to them)" : "Reason (optional)"}
          </label>
          <textarea rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-sm" />
          {mode === "cancel" && app.status === "PAID" && (
            <p className="mt-2 text-xs text-amber-700">This partner has paid. Cancelling frees their spot — refund them from your Paystack dashboard.</p>
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={pending || (mode === "approve" && quote.trim() === "")}
              onClick={() =>
                run(() =>
                  mode === "approve"
                    ? reviewPartnerApplication(app.id, "approve", { quoteNaira: Number(quote), note })
                    : mode === "reject"
                    ? reviewPartnerApplication(app.id, "reject", { note })
                    : cancelPartnerApplication(app.id, note)
                )
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-50",
                mode === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
              )}
            >
              {pending && <Loader2 className="h-3 w-3 animate-spin" />}
              {mode === "approve" ? "Confirm approval" : mode === "reject" ? "Decline application" : "Cancel booking"}
            </button>
            <button type="button" onClick={() => setMode(null)} className="rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-white">
              Back
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export function PartnerApplicationsManager({ applications }: { applications: ManagedApplication[] }) {
  const pendingCount = applications.filter((a) => a.status === "PENDING").length;
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>(pendingCount ? "open" : "all");
  const match = FILTERS.find((f) => f.id === filter)!.match;
  const shown = applications.filter((a) => match(a.status));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap gap-1.5 border-b border-slate-100 p-3">
        {FILTERS.map((f) => {
          const n = applications.filter((a) => f.match(a.status)).length;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn("rounded-lg px-3 py-1.5 text-xs font-semibold", filter === f.id ? "bg-ink-800 text-white" : "text-slate-500 hover:bg-slate-50")}
            >
              {f.label} <span className="opacity-60">({n})</span>
            </button>
          );
        })}
      </div>
      {shown.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-slate-400">Nothing here.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {shown.map((a) => (
            <Row key={a.id} app={a} />
          ))}
        </ul>
      )}
    </div>
  );
}
