"use client";

import { useState } from "react";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { initiateProUpgrade, verifyProUpgrade } from "@/lib/actions/plan";

export function UpgradeProButton() {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);

    try {
      const res = await initiateProUpgrade();

      if (res.alreadyPro) {
        alert("You're already on the Pro plan.");
        setLoading(false);
        return;
      }

      if (!window.PaystackPop) {
        alert("Payment is still loading, please try again in a moment.");
        setLoading(false);
        return;
      }

      const handler = window.PaystackPop.setup({
        key: res.publicKey,
        email: res.email,
        amount: res.amountKobo,
        ref: res.reference,
        onClose: () => setLoading(false),
        callback: (response) => {
          verifyProUpgrade(response.reference).then((verifyRes) => {
            if (verifyRes.success) {
              window.location.reload();
            } else {
              alert(verifyRes.error || "Payment verification failed.");
              setLoading(false);
            }
          });
        },
      });

      handler.openIframe();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <>
      <Script src="https://js.paystack.co/v1/inline.js" strategy="lazyOnload" />
      <Button onClick={handleUpgrade} disabled={loading}>
        {loading ? "Please wait..." : "Upgrade to Pro"}
      </Button>
    </>
  );
}
