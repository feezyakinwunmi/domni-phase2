"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, Minus, Plus, X } from "lucide-react";
import { submitPartnerApplication, verifyPartnerPayment } from "@/lib/actions/partners";
import { hasUnits, priceFor, unitNoun, unitsProblem } from "@/lib/partners";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useSubmitLock } from "@/lib/use-submit-lock";

export interface BookablePackage {
  id: string;
  title: string;
  pricingModel: string;
  priceKobo: number;
  unitLabel: string | null;
  minUnits: number;
  maxUnits: number | null;
  quantity: number | null;
  quantityTaken: number;
  requiresApproval: boolean;
}

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-ink-800 placeholder:text-slate-400 focus:border-violet-400";

function Field({ label, error, required, children, className }: { label: string; error?: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-sm font-medium text-ink-700">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}

function LogoUpload({ value, onChange, error }: { value: string; onChange: (url: string) => void; error?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function upload(file: File) {
    setErr(null);
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return setErr("Use a PNG, JPG or WebP file.");
    if (file.size > 2 * 1024 * 1024) return setErr("Logo must be under 2 MB.");
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);
      // Logos keep their original format (PNG transparency matters).
      const res = await fetch("/api/uploads/attendee-photo?kind=logo", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed.");
      onChange(data.url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className={cn("flex items-center gap-3 rounded-xl border border-dashed p-3", error ? "border-red-300" : "border-slate-200")}>
        <div className="flex h-14 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50">
          {value ? <img src={value} alt="Your logo" className="max-h-full max-w-full object-contain" /> : <ImagePlus className="h-5 w-5 text-slate-400" />}
        </div>
        <label className={cn("cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-violet-300", busy && "pointer-events-none opacity-60")}>
          {busy ? "Uploading…" : value ? "Replace logo" : "Upload logo"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) upload(f);
            }}
          />
        </label>
        {value && !busy && (
          <button type="button" onClick={() => onChange("")} className="text-xs text-slate-400 hover:text-red-500">
            Remove
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-400">PNG with a transparent background looks best. Used on the event page and tickets if your package includes it.</p>
      {(err || error) && <p className="mt-1 text-xs text-red-500">{err || error}</p>}
    </div>
  );
}

export function PartnerBookingModal({ pkg, onClose }: { pkg: BookablePackage; onClose: () => void }) {
  const units0 = hasUnits(pkg) ? pkg.minUnits : 1;
  const [units, setUnits] = useState(units0);
  const [form, setForm] = useState({ companyName: "", contactName: "", email: "", phone: "", website: "", logoUrl: "", notes: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ applicationId: string; paid: boolean } | null>(null);

  const total = priceFor(pkg, units);
  const instant = !pkg.requiresApproval && total !== null && total > 0;
  const unitErr = unitsProblem(pkg, units);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (fieldErrors[k]) setFieldErrors(({ [k]: _, ...rest }) => rest);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [busy, onClose]);

  const lock = useSubmitLock();
  const submit = () => lock(submitImpl);

  async function submitImpl() {
    setError(null);
    if (unitErr) return setError(unitErr);
    setBusy(true);
    try {
      const res = await submitPartnerApplication({ packageId: pkg.id, units, ...form });
      if (res.status === "error") {
        setFieldErrors(res.fieldErrors ?? {});
        setError(res.error);
        return setBusy(false);
      }
      if (res.status === "submitted") {
        setDone({ applicationId: res.applicationId, paid: false });
        return setBusy(false);
      }
      if (!window.PaystackPop) {
        setError("The payment window is still loading. Please try again in a moment.");
        return setBusy(false);
      }
      window.PaystackPop.setup({
        key: res.publicKey,
        email: res.email,
        amount: res.amountKobo,
        ref: res.reference,
        ...res.split,
        onClose: () => {
          setBusy(false);
          // They can finish paying later from their booking page.
          setDone({ applicationId: res.applicationId, paid: false });
        },
        callback: (r) => {
          verifyPartnerPayment(r.reference)
            .then((v) => (v.success ? setDone({ applicationId: v.applicationId, paid: true }) : setError(v.error)))
            .catch(() => setError(`We couldn't confirm your payment. Keep this reference: ${r.reference}`))
            .finally(() => setBusy(false));
        },
      }).openIframe();
    } catch {
      setError("Network problem — please check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center bg-ink-900/50 sm:items-center sm:p-4" onClick={() => !busy && onClose()} role="dialog" aria-modal="true" aria-label={pkg.title}>
      {instant && <Script src="https://js.paystack.co/v1/inline.js" strategy="lazyOnload" />}
      <div className="max-h-[94vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white sm:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-violet-600">{instant ? "Book" : "Apply for"}</p>
            <h2 className="text-lg font-bold text-ink-800">{pkg.title}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-full p-1.5 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {done ? (
          <div className="px-6 py-10 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h3 className="mt-4 text-xl font-bold text-ink-800">{done.paid ? "Booking confirmed!" : instant ? "Booking saved" : "Application sent!"}</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
              {done.paid
                ? "Payment received. The organizer will be in touch with setup details."
                : instant
                ? "Your booking isn't paid yet. You can complete payment from your booking page."
                : "The organizer will review your application. Bookmark your booking page to check its status and pay once approved."}
            </p>
            <a href={`/partner/${done.applicationId}`} className="mt-6 inline-flex h-11 items-center rounded-full bg-domni-gradient px-6 text-sm font-semibold text-white">
              View my booking page
            </a>
          </div>
        ) : (
          <form
            className="space-y-4 px-6 py-5"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            {hasUnits(pkg) && (
              <Field label={pkg.pricingModel === "PER_SQM" ? "Space needed (m²)" : `Number of ${unitNoun(pkg)}`} error={fieldErrors.units}>
                <div className="flex items-center gap-3">
                  <div className="flex items-center overflow-hidden rounded-xl border border-slate-200">
                    <button type="button" aria-label="Less" onClick={() => setUnits((u) => Math.max(pkg.minUnits, u - 1))} className="flex h-11 w-11 items-center justify-center bg-slate-50">
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      inputMode="numeric"
                      value={units}
                      aria-label="Quantity"
                      onChange={(e) => setUnits(Number(e.target.value.replace(/\D/g, "")) || 0)}
                      className="h-11 w-20 text-center text-base font-semibold outline-none"
                    />
                    <button type="button" aria-label="More" onClick={() => setUnits((u) => u + 1)} className="flex h-11 w-11 items-center justify-center bg-slate-50">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-xs text-slate-500">
                    Min {pkg.minUnits}
                    {pkg.maxUnits ? ` · max ${pkg.maxUnits}` : ""} {unitNoun(pkg)}
                  </span>
                </div>
                {unitErr && units > 0 && <p className="mt-1 text-xs text-amber-600">{unitErr}</p>}
              </Field>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company / brand" required error={fieldErrors.companyName} className="sm:col-span-2">
                <input className={inputClass} value={form.companyName} onChange={set("companyName")} autoComplete="organization" />
              </Field>
              <Field label="Contact person" required error={fieldErrors.contactName}>
                <input className={inputClass} value={form.contactName} onChange={set("contactName")} autoComplete="name" />
              </Field>
              <Field label="Phone" error={fieldErrors.phone}>
                <input className={inputClass} type="tel" value={form.phone} onChange={set("phone")} autoComplete="tel" />
              </Field>
              <Field label="Email" required error={fieldErrors.email}>
                <input className={inputClass} type="email" value={form.email} onChange={set("email")} autoComplete="email" />
              </Field>
              <Field label="Website" error={fieldErrors.website}>
                <input className={inputClass} type="url" placeholder="https://" value={form.website} onChange={set("website")} />
              </Field>
            </div>

            <Field label="Logo" error={fieldErrors.logoUrl}>
              <LogoUpload value={form.logoUrl} onChange={(logoUrl) => setForm((f) => ({ ...f, logoUrl }))} />
            </Field>

            <Field label={instant ? "Anything we should know?" : "Tell the organizer about your business"} error={fieldErrors.notes}>
              <textarea rows={3} maxLength={1000} className={cn(inputClass, "h-auto py-3")} value={form.notes} onChange={set("notes")} />
            </Field>

            <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
              <span className="text-sm text-slate-500">{total === null ? "Price" : "Total"}</span>
              <span className="text-lg font-bold text-ink-800">
                {total === null ? "Quoted by the organizer" : formatNaira(total)}
              </span>
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-domni-gradient font-semibold text-white disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Please wait…" : instant ? "Continue to payment" : "Send application"}
            </button>
            {!instant && <p className="text-center text-xs text-slate-400">No payment now — you&apos;ll pay once the organizer approves.</p>}
          </form>
        )}
      </div>
    </div>
  );
}
