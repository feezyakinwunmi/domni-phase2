// Server-only: uses PAYSTACK_SECRET_KEY. Never import from a client component.
import type { SaleFees } from "@/lib/billing/fees";

const BASE = "https://api.paystack.co";

export class PaystackError extends Error {}

/** Server-to-server Paystack call. Throws PaystackError with Paystack's own message. */
export async function paystack<T = any>(path: string, init: RequestInit & { revalidate?: number } = {}): Promise<T> {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new PaystackError("Payments aren't configured (PAYSTACK_SECRET_KEY missing).");

  const { revalidate, ...rest } = init;
  const res = await fetch(`${BASE}${path}`, {
    ...rest,
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json", ...rest.headers },
    ...(revalidate ? { next: { revalidate } } : { cache: "no-store" }),
  });

  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.status) {
    throw new PaystackError(body?.message || `Paystack request failed (${res.status}).`);
  }
  return body.data as T;
}

export type Bank = { name: string; code: string };

export async function listBanks(): Promise<Bank[]> {
  const banks = await paystack<{ name: string; code: string; active: boolean; is_deleted: boolean }[]>(
    "/bank?country=nigeria&perPage=300",
    { revalidate: 60 * 60 * 24 }
  );
  const seen = new Set<string>();
  return banks
    .filter((b) => b.active && !b.is_deleted && !seen.has(b.code) && seen.add(b.code))
    .map((b) => ({ name: b.name, code: b.code }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function resolveAccount(accountNumber: string, bankCode: string) {
  const data = await paystack<{ account_name: string; account_number: string }>(
    `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`
  );
  return data.account_name;
}

/**
 * Creates (or updates) the organizer's Paystack subaccount. percentage_charge
 * is 0 because DOMNI's fee is passed per transaction as a flat
 * `transaction_charge` — so promos and fee changes never need a subaccount edit.
 */
export async function upsertSubaccount(opts: {
  existingCode?: string | null;
  businessName: string;
  bankCode: string;
  accountNumber: string;
  email: string;
}) {
  const body = JSON.stringify({
    business_name: opts.businessName.slice(0, 100),
    settlement_bank: opts.bankCode,
    account_number: opts.accountNumber,
    percentage_charge: 0,
    primary_contact_email: opts.email,
  });

  if (opts.existingCode) {
    const data = await paystack<{ subaccount_code: string }>(`/subaccount/${opts.existingCode}`, { method: "PUT", body });
    return data.subaccount_code ?? opts.existingCode;
  }
  const data = await paystack<{ subaccount_code: string }>("/subaccount", { method: "POST", body });
  return data.subaccount_code;
}

export type SplitParams = {
  subaccount?: string;
  transaction_charge?: number;
  bearer?: "subaccount" | "account";
};

/**
 * The popup runs in the buyer's browser, so its split params could be
 * tampered with (e.g. routing the money to the buyer's own subaccount).
 * Compare what Paystack actually settled against what we recorded.
 */
export function splitMatches(expected: SplitParams | undefined, verified: any): boolean {
  const actual: string | null = verified?.subaccount?.subaccount_code || null;
  return actual === (expected?.subaccount || null);
}

/**
 * Split for a sale: the organizer's subaccount receives the payment minus
 * DOMNI's fee, and bears Paystack's processing fee (matching
 * calculateSaleFees). No subaccount → the full amount lands in DOMNI's
 * balance and must be paid out manually (flagged in the admin panel).
 */
export function splitFor(subaccountCode: string | null | undefined, fees: SaleFees): SplitParams {
  if (!subaccountCode) return {};
  // Paystack rejects a charge that leaves the subaccount nothing after its fee.
  const maxCharge = Math.max(0, fees.subtotalKobo - fees.estimatedPaystackFeeKobo - 100);
  return {
    subaccount: subaccountCode,
    transaction_charge: Math.min(fees.domniFeeKobo, maxCharge),
    bearer: "subaccount",
  };
}
