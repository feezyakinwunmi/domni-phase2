"use client";

import { useState } from "react";
import { castVote } from "@/lib/actions/voting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface VoteFormProps {
  nomineeId: string;
  nomineeName: string;
  pricePerVoteKobo: number;
}

export function VoteForm({
  nomineeId,
  nomineeName,
  pricePerVoteKobo,
}: VoteFormProps) {
  const [quantity, setQuantity] = useState(1);
  const [email, setEmail] = useState("");

  const total =
    (pricePerVoteKobo / 100) * quantity;

  const handleVote = async (formData: FormData) => {
    await castVote(undefined as any, formData);
  };

  return (
    <form
      action={handleVote}
      className="mt-5 space-y-4"
    >
      <input
        type="hidden"
        name="nomineeId"
        value={nomineeId}
      />

      <div>
        <p className="text-sm text-slate-500">
          Voting for
        </p>

        <h3 className="text-lg font-semibold text-slate-900">
          {nomineeName}
        </h3>
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">
          Your Email
        </label>

        <Input
          type="email"
          name="voterEmail"
          value={email}
          onChange={(e) =>
            setEmail(e.target.value)
          }
          placeholder="you@example.com"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium text-slate-700">
          Number of Votes
        </label>

        <Input
          type="number"
          min={1}
          name="quantity"
          value={quantity}
          onChange={(e) =>
            setQuantity(Number(e.target.value))
          }
          required
        />
      </div>

      <div className="rounded-xl bg-slate-50 p-4">
        <p className="text-sm text-slate-500">
          Total Amount
        </p>

        <p className="mt-1 text-2xl font-bold text-slate-900">
          ₦{total.toLocaleString()}
        </p>
      </div>

      <Button className="w-full">
        Vote Now
      </Button>
    </form>
  );
}