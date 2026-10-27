"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { initializeVotePayment } from "@/lib/actions/voting";

interface VoteModalProps {
  nomineeId: string;
  nomineeName: string;
  pricePerVoteKobo: number;
  disabled?: boolean;
}

export function VoteModal({
  nomineeId,
  nomineeName,
  pricePerVoteKobo,
  disabled,
}: VoteModalProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);

  const total = (pricePerVoteKobo / 100) * quantity;

  async function handleVote() {
    try {
      setLoading(true);

      const formData = new FormData();

      formData.set("nomineeId", nomineeId);
      formData.set("voterEmail", email);
      formData.set("quantity", quantity.toString());

      const res = await initializeVotePayment(formData);

      if (res?.checkoutUrl) {
        window.location.href = res.checkoutUrl;
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        Vote Now
      </Button>

{open && (
  <div className="fixed inset-0 z-[200]">
    {/* Backdrop */}
    <div
      className="absolute inset-0 bg-black/50"
      onClick={() => setOpen(false)}
    />

    {/* Center wrapper */}
    <div className="absolute inset-0 flex items-center justify-center p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Vote {nomineeName}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Complete payment to submit your votes.
            </p>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Email
            </label>

            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Number of votes
            </label>

            <div className="flex items-center overflow-hidden rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() =>
                  setQuantity((prev) => Math.max(1, prev - 1))
                }
                className="flex h-12 w-12 items-center justify-center bg-slate-50 text-xl font-bold text-slate-700"
              >
                −
              </button>

              <div className="flex h-12 flex-1 items-center justify-center text-lg font-semibold text-slate-900">
                {quantity}
              </div>

              <button
                type="button"
                onClick={() =>
                  setQuantity((prev) => prev + 1)
                }
                className="flex h-12 w-12 items-center justify-center bg-slate-50 text-xl font-bold text-slate-700"
              >
                +
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">
                Total Amount
              </span>

              <span className="text-xl font-bold text-slate-900">
                ₦{total.toLocaleString()}
              </span>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleVote}
            disabled={loading}
          >
            {loading
              ? "Redirecting..."
              : "Continue to Payment"}
          </Button>
        </div>
      </div>
    </div>
  </div>
)}

    </>
  );
}