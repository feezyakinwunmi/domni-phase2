"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { PRO_PLAN_PRICE_KOBO } from "@/lib/constants/pricing";

export async function initiateProUpgrade() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You need to be logged in.");
  }

  const profile = await prisma.profile.findUnique({ where: { id: user.id } });

  if (!profile) {
    throw new Error("Profile not found.");
  }

  if (profile.plan === "PRO") {
    return { alreadyPro: true as const };
  }

  const reference = `PLAN-${crypto.randomUUID()}`;

  await prisma.transaction.create({
    data: {
      userId: user.id,
      type: "PLAN_UPGRADE",
      status: "PENDING",
      amountKobo: PRO_PLAN_PRICE_KOBO,
      reference,
      metadata: { userId: user.id },
    },
  });

  return {
    alreadyPro: false as const,
    reference,
    amountKobo: PRO_PLAN_PRICE_KOBO,
    email: profile.email,
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? "",
  };
}

export async function verifyProUpgrade(reference: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { reference },
  });

  if (!transaction || transaction.type !== "PLAN_UPGRADE") {
    return { success: false as const, error: "Transaction not found." };
  }

  if (transaction.status === "SUCCESSFUL") {
    return { success: true as const };
  }

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    }
  );

  const data = await response.json();

  if (!data.status || data.data?.status !== "success") {
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "FAILED" },
    });

    return { success: false as const, error: "Payment could not be verified." };
  }

  if (data.data.amount !== transaction.amountKobo) {
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: "FAILED" },
    });

    return { success: false as const, error: "Payment amount mismatch." };
  }

  const claim = await prisma.transaction.updateMany({
    where: { id: transaction.id, status: "PENDING" },
    data: { status: "SUCCESSFUL" },
  });

  if (claim.count === 1 && transaction.userId) {
    await prisma.profile.update({
      where: { id: transaction.userId },
      data: { plan: "PRO" },
    });
  }

  return { success: true as const };
}
