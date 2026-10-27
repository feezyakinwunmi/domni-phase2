"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, BadgeCheck, Banknote, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getBanks, savePayoutAccount, verifyPayoutAccount } from "@/lib/actions/payouts";
import type { Bank } from "@/lib/paystack";

interface Props {
  current: { bankName: string | null; accountNumber: string | null; accountName: string | null; active: boolean };
}

export function PayoutSettings({ current }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(!current.active);
  const [banks, setBanks] = useState<Bank[] | null>(null);
  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [saving, startSaving] = useTransition();

  useEffect(() => {
    if (!editing || banks) return;
    getBanks().then((res) => (res.ok ? setBanks(res.banks) : setError(res.error)));
  }, [editing, banks]);

  // Auto-verify once the account number is complete, like a bank app does.
  useEffect(() => {
    setResolvedName(null);
    if (!bankCode || !/^\d{10}$/.test(accountNumber)) return;
    let cancelled = false;
    setVerifying(true);
    setError(null);
    verifyPayoutAccount(bankCode, accountNumber).then((res) => {
      if (cancelled) return;
      setVerifying(false);
      if (res.ok) setResolvedName(res.accountName);
      else setError(res.error);
    });
    return () => {
      cancelled = true;
    };
  }, [bankCode, accountNumber]);

  function save() {
    setError(null);
    startSaving(async () => {
      const res = await savePayoutAccount(bankCode, accountNumber);
      if (!res.ok) return setError(res.error);
      setEditing(false);
      router.refresh();
    });
  }

  if (!editing && current.active) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <BadgeCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{current.accountName}</p>
            <p className="text-sm text-slate-500">
              {current.bankName} · ••••{current.accountNumber?.slice(-4)}
            </p>
          </div>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(true)}>
          Change account
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="bank">Bank</Label>
          <select
            id="bank"
            value={bankCode}
            onChange={(e) => setBankCode(e.target.value)}
            disabled={!banks}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm disabled:opacity-60"
          >
            <option value="">{banks ? "Select your bank" : "Loading banks…"}</option>
            {banks?.map((b) => (
              <option key={b.code} value={b.code}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="acct">Account number</Label>
          <Input
            id="acct"
            inputMode="numeric"
            maxLength={10}
            value={accountNumber}
            placeholder="0123456789"
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
          />
        </div>
      </div>

      <div className="min-h-[24px] text-sm">
        {verifying && (
          <span className="flex items-center gap-2 text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Verifying account…
          </span>
        )}
        {resolvedName && (
          <span className="flex items-center gap-2 font-semibold text-emerald-700">
            <BadgeCheck className="h-4 w-4" /> {resolvedName}
          </span>
        )}
        {error && (
          <span className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" /> {error}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="button" onClick={save} disabled={!resolvedName || saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
          {saving ? "Saving…" : "Save payout account"}
        </Button>
        {current.active && (
          <Button type="button" variant="secondary" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
