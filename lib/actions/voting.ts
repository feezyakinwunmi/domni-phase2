"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createCampaignSchema, castVoteSchema } from "@/lib/validations/voting";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { calculateSaleFees } from "@/lib/billing/fees";

export type VotingActionState = { error?: string; success?: string } | null;

export async function createCampaign(
  _prevState: VotingActionState,
  formData: FormData
): Promise<VotingActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be logged in to create a campaign." };

  const raw = formData.get("payload");
  if (typeof raw !== "string") return { error: "Missing campaign data." };

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { error: "Couldn't read the campaign form data." };
  }

  const parsed = createCampaignSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form for errors." };
  }

  const { title, description, eventId, pricePerVote, startsAt, endsAt, nominees } = parsed.data;

  const campaign = await prisma.votingCampaign.create({
    data: {
      organizerId: user.id,
      eventId: eventId || null,
      title,
      description,
      pricePerVoteKobo: Math.round(pricePerVote * 100),
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      nominees: {
        create: nominees.map((n) => ({
          name: n.name,
          bio: n.bio,
          imageUrl: n.imageUrl || null,
        })),
      },
    },
    select: { id: true },
  });

  redirect(`/organizer/voting/${campaign.id}?created=true`);
}



export async function initializeVotePayment(formData: FormData) {
  const parsed = castVoteSchema.safeParse({
    nomineeId: formData.get("nomineeId"),
    voterEmail: formData.get("voterEmail"),
    quantity: formData.get("quantity"),
  });

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Invalid vote data."
    );
  }

  const { nomineeId, voterEmail, quantity } = parsed.data;

  const nominee = await prisma.nominee.findUnique({
    where: {
      id: nomineeId,
    },
    include: {
      campaign: {
        include: {
          organizer: {
            select: { createdAt: true },
          },
        },
      },
    },
  });

  if (!nominee) {
    throw new Error("Nominee not found.");
  }

  const now = new Date();

  if (now < nominee.campaign.startsAt) {
    throw new Error("Voting has not started.");
  }

  if (now > nominee.campaign.endsAt) {
    throw new Error("Voting has ended.");
  }

  const saleFees = calculateSaleFees({
    subtotalKobo: nominee.campaign.pricePerVoteKobo * quantity,
    organizerCreatedAt: nominee.campaign.organizer.createdAt,
  });
  const amountKobo = saleFees.subtotalKobo;

  const reference = `VOTE-${crypto.randomUUID()}`;

  await prisma.transaction.create({
    data: {
      type: "VOTE_PURCHASE",
      status: "PENDING",
      amountKobo,
      reference,
      metadata: {
        nomineeId,
        voterEmail,
        quantity,
        saleFees,
      },
    },
  });

  const host = (await headers()).get("host");

  const response = await fetch(
    "https://api.paystack.co/transaction/initialize",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: voterEmail,
        amount: amountKobo,
        reference,

        callback_url: `http://${host}/vote/success?reference=${reference}`,
      }),
    }
  );

  const data = await response.json();

  if (!data.status) {
    throw new Error(data.message || "Payment failed");
  }

  return {
    checkoutUrl: data.data.authorization_url,
  };
}



export async function updateCampaign(
  _prevState: VotingActionState,
  formData: FormData
): Promise<VotingActionState> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  const campaignId = formData.get("campaignId");

  if (typeof campaignId !== "string") {
    return { error: "Campaign ID missing" };
  }

  const raw = formData.get("payload");

  if (typeof raw !== "string") {
    return { error: "Missing campaign data." };
  }

  let payload: unknown;

  try {
    payload = JSON.parse(raw);
  } catch {
    return { error: "Invalid campaign data." };
  }

  const parsed = createCampaignSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Please check the form.",
    };
  }

  const {
    title,
    description,
    pricePerVote,
    startsAt,
    endsAt,
    nominees,
  } = parsed.data;

  await prisma.votingCampaign.update({
    where: {
      id: campaignId,
      organizerId: user.id,
    },

    data: {
      title,
      description,
      pricePerVoteKobo: Math.round(pricePerVote * 100),
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),

      nominees: {
        deleteMany: {},

        create: nominees.map((nominee) => ({
          name: nominee.name,
          bio: nominee.bio,
          imageUrl: nominee.imageUrl || null,
        })),
      },
    },
  });

  revalidatePath(`/organizer/voting/${campaignId}`);

  redirect(`/organizer/voting/${campaignId}`);
}







/**
 * Casts a guest vote. Flutterwave isn't wired up yet (that lands in Phase 5),
 * so this records the transaction as SUCCESSFUL immediately and updates the
 * leaderboard in the same write. Once payments land, this should instead
 * create a PENDING transaction, redirect to Flutterwave checkout, and only
 * increment `voteCount` from the payment webhook after it confirms — never
 * from a client-trusted call. Don't ship this synchronous path to production
 * with real money attached to votes.
 */
export async function castVote(
  _prevState: VotingActionState,
  formData: FormData
): Promise<VotingActionState> {
  const parsed = castVoteSchema.safeParse({
    nomineeId: formData.get("nomineeId"),
    voterEmail: formData.get("voterEmail"),
    quantity: formData.get("quantity"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your entry." };
  }

  const { nomineeId, voterEmail, quantity } = parsed.data;

  const nominee = await prisma.nominee.findUnique({
    where: { id: nomineeId },
    include: { campaign: true },
  });

  if (!nominee) return { error: "Nominee not found." };

  const now = new Date();
  if (now < nominee.campaign.startsAt) return { error: "Voting hasn't opened yet." };
  if (now > nominee.campaign.endsAt) return { error: "Voting has closed for this campaign." };

  const amountKobo = nominee.campaign.pricePerVoteKobo * quantity;

  await prisma.$transaction([
    prisma.transaction.create({
      data: {
        type: "VOTE_PURCHASE",
        status: "SUCCESSFUL",
        amountKobo,
        reference: `VOTE-${crypto.randomUUID()}`,
        metadata: { voterEmail, nomineeId, quantity },
        votes: {
          create: { nomineeId, voterEmail, quantity },
        },
      },
    }),
    prisma.nominee.update({
      where: { id: nomineeId },
      data: { voteCount: { increment: quantity } },
    }),
  ]);

  revalidatePath(`/vote/${nominee.campaignId}`);
  return { success: `Thanks! Your ${quantity} vote${quantity > 1 ? "s" : ""} for ${nominee.name} counted.` };
}
