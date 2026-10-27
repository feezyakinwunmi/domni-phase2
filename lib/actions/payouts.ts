"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { toUserMessage, type ActionResult } from "@/lib/errors";
import { listBanks, PaystackError, resolveAccount, upsertSubaccount, type Bank } from "@/lib/paystack";

const ACCOUNT_RE = /^\d{10}$/;

export async function getBanks(): Promise<ActionResult<{ banks: Bank[] }>> {
  try {
    return { ok: true, banks: await listBanks() };
  } catch (err) {
    return { ok: false, error: err instanceof PaystackError ? err.message : toUserMessage(err, "Couldn't load banks.") };
  }
}

export async function verifyPayoutAccount(bankCode: string, accountNumber: string): Promise<ActionResult<{ accountName: string }>> {
  try {
    if (!(await getCurrentUser())) return { ok: false, error: "You need to be logged in." };
    if (!bankCode) return { ok: false, error: "Choose your bank." };
    if (!ACCOUNT_RE.test(accountNumber)) return { ok: false, error: "Account number must be 10 digits." };

    return { ok: true, accountName: await resolveAccount(accountNumber, bankCode) };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof PaystackError ? "We couldn't find that account. Check the number and bank." : toUserMessage(err),
    };
  }
}

export async function savePayoutAccount(bankCode: string, accountNumber: string): Promise<ActionResult<{ accountName: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "You need to be logged in." };
    if (!ACCOUNT_RE.test(accountNumber)) return { ok: false, error: "Account number must be 10 digits." };

    const profile = await prisma.profile.findUnique({ where: { id: user.id } });
    if (!profile) return { ok: false, error: "Profile not found." };

    const [banks, accountName] = await Promise.all([listBanks(), resolveAccount(accountNumber, bankCode)]);
    const bank = banks.find((b) => b.code === bankCode);
    if (!bank) return { ok: false, error: "Unknown bank." };

    const subaccountCode = await upsertSubaccount({
      existingCode: profile.paystackSubaccountCode,
      businessName: profile.fullName || accountName,
      bankCode,
      accountNumber,
      email: profile.email,
    });

    await prisma.profile.update({
      where: { id: user.id },
      data: {
        payoutBankCode: bankCode,
        payoutBankName: bank.name,
        payoutAccountNumber: accountNumber,
        payoutAccountName: accountName,
        paystackSubaccountCode: subaccountCode,
        payoutUpdatedAt: new Date(),
      },
    });

    revalidatePath("/organizer/settings");
    return { ok: true, accountName };
  } catch (err) {
    return { ok: false, error: err instanceof PaystackError ? `Paystack: ${err.message}` : toUserMessage(err, "Couldn't save your payout account.") };
  }
}
