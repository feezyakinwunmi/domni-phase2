"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { AlertCircle, Loader2, Minus, Plus, Ticket, X } from "lucide-react";
import { initializeTicketPurchase, verifyTicketPurchase } from "@/lib/actions/tickets";
import { RegistrationFields } from "@/components/forms/RegistrationFields";
import { validateRegistration, type RegistrationFieldDef } from "@/lib/event-details";
import { formatNaira } from "@/lib/format";

interface TicketModalProps {
  ticketTypeId: string;
  ticketTitle: string;
  priceKobo: number;
  remaining: number;
  maxPerBuyer: number | null;
  disabled?: boolean;
  disabledReason?: string;
  registrationFields: RegistrationFieldDef[];
  nameLabel: string;
  emailLabel: string;
}

const MAX_PER_ORDER = 20;

export function TicketModal({
  ticketTypeId,
  ticketTitle,
  priceKobo,
  remaining,
  maxPerBuyer,
  disabled,
  disabledReason,
  registrationFields,
  nameLabel,
  emailLabel,
}: TicketModalProps) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const maxQty = Math.max(1, Math.min(remaining, maxPerBuyer ?? MAX_PER_ORDER, MAX_PER_ORDER));
  const isFree = priceKobo === 0;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !loading && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, loading]);

  function clearFieldError(key: string) {
    if (fieldErrors[key]) setFieldErrors(({ [key]: _, ...rest }) => rest);
  }

  async function handleContinue() {
    setError(null);

    const errors = validateRegistration(registrationFields, { name, email, answers }, { nameLabel, emailLabel });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      setError("Please fix the highlighted fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await initializeTicketPurchase({ ticketTypeId, quantity, name, email, answers });

      if (res.status === "error") {
        setFieldErrors(res.fieldErrors ?? {});
        setError(res.error);
        setLoading(false);
        return;
      }

      if (res.status === "issued") {
        window.location.href = res.redirect;
        return;
      }

      if (!window.PaystackPop) {
        setError("The payment window is still loading. Please try again in a moment.");
        setLoading(false);
        return;
      }

      window.PaystackPop.setup({
        key: res.publicKey,
        email: res.email,
        amount: res.amountKobo,
        ref: res.reference,
        ...res.split,
        onClose: () => setLoading(false),
        callback: (response) => {
          verifyTicketPurchase(response.reference)
            .then((verifyRes) => {
              if (verifyRes.success) {
                window.location.href = verifyRes.redirect;
              } else {
                setError(verifyRes.error);
                setLoading(false);
              }
            })
            .catch(() => {
              setError(`We couldn't confirm your payment. Keep this reference: ${response.reference}`);
              setLoading(false);
            });
        },
      }).openIframe();
    } catch {
      setError("Network problem — please check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <>
      {!isFree && <Script src="https://js.paystack.co/v1/inline.js" strategy="lazyOnload" />}

      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? disabledReason : undefined}
        className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
          disabled ? "cursor-not-allowed bg-slate-200 text-slate-500" : "bg-violet-600 text-white hover:bg-violet-700"
        }`}
      >
        <Ticket className="h-4 w-4" />
        {disabled ? disabledReason || "Unavailable" : isFree ? "Register for free" : "Get tickets"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[999] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
          onClick={() => !loading && setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Register for ${ticketTitle}`}
        >
          <div
            className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-ink-800">{ticketTitle}</h2>
                <p className="text-sm text-slate-500">{formatNaira(priceKobo)} per ticket</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} disabled={loading} className="rounded-full p-1 hover:bg-slate-100" aria-label="Close">
                <X />
              </button>
            </div>

            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                handleContinue();
              }}
            >
              <RegistrationFields
                idPrefix={`tt-${ticketTypeId}`}
                nameLabel={nameLabel}
                emailLabel={emailLabel}
                name={name}
                email={email}
                onNameChange={(v) => {
                  setName(v);
                  clearFieldError("__name");
                }}
                onEmailChange={(v) => {
                  setEmail(v);
                  clearFieldError("__email");
                }}
                fields={registrationFields}
                answers={answers}
                onAnswerChange={(id, v) => {
                  setAnswers((prev) => ({ ...prev, [id]: v }));
                  clearFieldError(id);
                }}
                errors={fieldErrors}
              />

              <div className="mb-5 mt-6 flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <span className="text-sm font-medium text-slate-600">Quantity</span>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="rounded-lg p-1 hover:bg-slate-100 disabled:opacity-30"
                    aria-label="Fewer tickets"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center text-lg font-bold" aria-live="polite">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                    disabled={quantity >= maxQty}
                    className="rounded-lg p-1 hover:bg-slate-100 disabled:opacity-30"
                    aria-label="More tickets"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {quantity >= maxQty && maxQty > 1 && (
                <p className="-mt-3 mb-4 text-xs text-slate-400">Maximum {maxQty} per order.</p>
              )}

              <div className="mb-5 flex justify-between rounded-xl bg-slate-50 p-4">
                <span>Total</span>
                <span className="font-bold">{formatNaira(priceKobo * quantity)}</span>
              </div>

              {error && (
                <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Please wait…" : isFree ? "Confirm registration" : "Continue to payment"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
