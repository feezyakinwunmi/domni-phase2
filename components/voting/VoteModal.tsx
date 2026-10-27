"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initializeVotePayment, verifyVotePurchase } from "@/lib/actions/voting";
import { formatNaira } from "@/lib/format";

interface VoteModalProps {
  nomineeId: string;
  nomineeName: string;
  pricePerVoteKobo: number;
  disabled?: boolean;
}

const PRESETS = [1, 5, 10, 50, 100];

export function VoteModal({ nomineeId, nomineeName, pricePerVoteKobo, disabled }: VoteModalProps) {
  const router = useRouter();
  const isFree = pricePerVoteKobo === 0;
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !loading && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading]);

  function close() {
    if (loading) return;
    setOpen(false);
    setError(null);
    if (success) {
      setSuccess(null);
      router.refresh();
    }
  }

  async function handleVote() {
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Enter a valid email address.");

    setLoading(true);
    try {
      const res = await initializeVotePayment({ nomineeId, voterEmail: email, quantity: isFree ? 1 : quantity });

      if (res.status === "error") {
        setError(res.error);
        return setLoading(false);
      }
      if (res.status === "voted") {
        setSuccess(res.message);
        return setLoading(false);
      }
      if (!window.PaystackPop) {
        setError("The payment window is still loading. Please try again in a moment.");
        return setLoading(false);
      }

      window.PaystackPop.setup({
        key: res.publicKey,
        email: res.email,
        amount: res.amountKobo,
        ref: res.reference,
        ...res.split,
        onClose: () => setLoading(false),
        callback: (response) => {
          verifyVotePurchase(response.reference)
            .then((v) => (v.success ? setSuccess(v.message) : setError(v.error)))
            .catch(() => setError(`We couldn't confirm your payment. Keep this reference: ${response.reference}`))
            .finally(() => setLoading(false));
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

      <Button onClick={() => setOpen(true)} disabled={disabled}>
        {disabled ? "Closed" : "Vote"}
      </Button>

      {open && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={close} role="dialog" aria-modal="true" aria-label={`Vote for ${nomineeName}`}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Vote for {nomineeName}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {isFree ? "One free vote per email." : `${formatNaira(pricePerVoteKobo)} per vote`}
                </p>
              </div>
              <button onClick={close} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            {success ? (
              <div className="mt-6 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                <p className="mt-3 font-semibold text-slate-900">{success}</p>
                <Button className="mt-6 w-full" onClick={close}>
                  Done
                </Button>
              </div>
            ) : (
              <form
                className="mt-6 space-y-4"
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVote();
                }}
              >
                <div>
                  <label htmlFor={`vote-email-${nomineeId}`} className="mb-2 block text-sm font-medium">
                    Email
                  </label>
                  <Input id={`vote-email-${nomineeId}`} type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                {!isFree && (
                  <div>
                    <p className="mb-2 text-sm font-medium">Number of votes</p>
                    <div className="flex items-center overflow-hidden rounded-xl border border-slate-200">
                      <button type="button" aria-label="Fewer votes" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="flex h-12 w-12 items-center justify-center bg-slate-50 text-slate-700">
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        inputMode="numeric"
                        aria-label="Number of votes"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.min(1000, Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1)))}
                        className="h-12 flex-1 text-center text-lg font-semibold text-slate-900 outline-none"
                      />
                      <button type="button" aria-label="More votes" onClick={() => setQuantity((q) => Math.min(1000, q + 1))} className="flex h-12 w-12 items-center justify-center bg-slate-50 text-slate-700">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {PRESETS.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setQuantity(n)}
                          className={`rounded-full px-3 py-1 text-xs font-medium ${quantity === n ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!isFree && (
                  <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                    <span className="text-slate-500">Total</span>
                    <span className="text-xl font-bold text-slate-900">{formatNaira(pricePerVoteKobo * quantity)}</span>
                  </div>
                )}

                {error && (
                  <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {error}
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading ? "Please wait…" : isFree ? "Cast free vote" : "Continue to payment"}
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
