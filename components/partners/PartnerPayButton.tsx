"use client";

import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { startPartnerPayment, verifyPartnerPayment } from "@/lib/actions/partners";
import { formatNaira } from "@/lib/format";
import { useSubmitLock } from "@/lib/use-submit-lock";

export function PartnerPayButton({ applicationId, amountKobo }: { applicationId: string; amountKobo: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lock = useSubmitLock();
  const pay = () => lock(payImpl);

  async function payImpl() {
    setError(null);
    setBusy(true);
    try {
      const res = await startPartnerPayment(applicationId);
      if (!res.ok) {
        setError(res.error);
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
        onClose: () => setBusy(false),
        callback: (r) => {
          verifyPartnerPayment(r.reference)
            .then((v) => (v.success ? router.refresh() : setError(v.error)))
            .catch(() => setError(`We couldn't confirm your payment. Keep this reference: ${r.reference}`))
            .finally(() => setBusy(false));
        },
      }).openIframe();
    } catch {
      setError("Network problem — please try again.");
      setBusy(false);
    }
  }

  return (
    <div>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="lazyOnload" />
      <button
        type="button"
        onClick={pay}
        disabled={busy}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-domni-gradient font-semibold text-white shadow-glow disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        {busy ? "Please wait…" : `Pay ${formatNaira(amountKobo)} securely`}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
