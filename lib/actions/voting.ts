"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createCampaignSchema, castVoteSchema } from "@/lib/validations/voting";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { calculateSaleFees, type SaleFees } from "@/lib/billing/fees";
import { formatZodIssue, isUuid, toUserMessage, type ActionResult } from "@/lib/errors";
import { splitFor, splitMatches, type SplitParams } from "@/lib/paystack";

const TX_OPTIONS = { maxWait: 10_000, timeout: 30_000 };

type VoteMetadata = {
  nomineeId: string;
  voterEmail: string;
  quantity: number;
  saleFees?: SaleFees;
  split?: SplitParams;
  payoutMode?: "subaccount" | "manual";
};

export type VoteResult =
  | { status: "voted"; message: string }
  | { status: "payment"; reference: string; amountKobo: number; email: string; publicKey: string; split: SplitParams }
  | { status: "error"; error: string };

async function requirePayoutIfPaid(userId: string, pricePerVote: number) {
  if (pricePerVote <= 0) return null;
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { paystackSubaccountCode: true } });
  return profile?.paystackSubaccountCode
    ? null
    : "Add your payout bank account in Settings → Payout account before running paid voting, so vote money is paid to you.";
}

export async function createCampaign(payload: unknown): Promise<ActionResult<{ campaignId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "You need to be logged in to create a campaign." };

    const parsed = createCampaignSchema.safeParse(payload);
    if (!parsed.success) return { ok: false, error: formatZodIssue(parsed.error.issues[0]) };
    const { title, description, eventId, pricePerVote, startsAt, endsAt, nominees } = parsed.data;

    const payoutProblem = await requirePayoutIfPaid(user.id, pricePerVote);
    if (payoutProblem) return { ok: false, error: payoutProblem };

    if (eventId) {
      const event = await prisma.event.findUnique({ where: { id: eventId }, select: { organizerId: true } });
      if (event?.organizerId !== user.id) return { ok: false, error: "You can only link your own events." };
    }

    const campaign = await prisma.votingCampaign.create({
      data: {
        organizerId: user.id,
        eventId: eventId || null,
        title,
        description: description || null,
        pricePerVoteKobo: Math.round(pricePerVote * 100),
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        nominees: {
          create: nominees.map((n) => ({ name: n.name, bio: n.bio || null, imageUrl: n.imageUrl || null })),
        },
      },
      select: { id: true },
    });

    revalidatePath("/organizer/voting");
    return { ok: true, campaignId: campaign.id };
  } catch (err) {
    return { ok: false, error: toUserMessage(err, "We couldn't create the campaign. Please try again.") };
  }
}

/**
 * Edits a campaign *without* touching existing nominees' votes: nominees are
 * matched by id and updated in place. (The old version deleted and recreated
 * every nominee, which silently wiped all votes.)
 */
export async function updateCampaign(campaignId: string, payload: unknown): Promise<ActionResult<{ campaignId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "You need to be logged in." };
    if (!isUuid(campaignId)) return { ok: false, error: "Campaign not found." };

    const existing = await prisma.votingCampaign.findUnique({
      where: { id: campaignId },
      include: { nominees: { select: { id: true, name: true, voteCount: true } } },
    });
    if (!existing || existing.organizerId !== user.id) return { ok: false, error: "Campaign not found." };

    const parsed = createCampaignSchema.safeParse(payload);
    if (!parsed.success) return { ok: false, error: formatZodIssue(parsed.error.issues[0]) };
    const { title, description, pricePerVote, startsAt, endsAt, nominees } = parsed.data;

    const payoutProblem = await requirePayoutIfPaid(user.id, pricePerVote);
    if (payoutProblem) return { ok: false, error: payoutProblem };

    const totalVotes = existing.nominees.reduce((n, x) => n + x.voteCount, 0);
    const newPriceKobo = Math.round(pricePerVote * 100);
    if (totalVotes > 0 && newPriceKobo !== existing.pricePerVoteKobo) {
      return { ok: false, error: "Votes have already been cast, so the price per vote can't change." };
    }

    const existingIds = new Map(existing.nominees.map((n) => [n.id, n]));
    const keepIds = new Set(nominees.map((n) => n.id).filter((id): id is string => !!id && existingIds.has(id)));
    const removed = existing.nominees.filter((n) => !keepIds.has(n.id));
    const removedWithVotes = removed.find((n) => n.voteCount > 0);
    if (removedWithVotes) {
      return { ok: false, error: `"${removedWithVotes.name}" already has votes and can't be removed.` };
    }

    await prisma.$transaction(async (tx) => {
      await tx.votingCampaign.update({
        where: { id: campaignId },
        data: {
          title,
          description: description || null,
          pricePerVoteKobo: newPriceKobo,
          startsAt: new Date(startsAt),
          endsAt: new Date(endsAt),
        },
      });

      if (removed.length) await tx.nominee.deleteMany({ where: { id: { in: removed.map((n) => n.id) } } });

      for (const n of nominees) {
        const data = { name: n.name, bio: n.bio || null, imageUrl: n.imageUrl || null };
        if (n.id && keepIds.has(n.id)) await tx.nominee.update({ where: { id: n.id }, data });
        else await tx.nominee.create({ data: { ...data, campaignId } });
      }
    }, TX_OPTIONS);

    revalidatePath(`/organizer/voting/${campaignId}`);
    revalidatePath(`/vote/${campaignId}`);
    return { ok: true, campaignId };
  } catch (err) {
    return { ok: false, error: toUserMessage(err, "We couldn't save the campaign. Please try again.") };
  }
}

export async function deleteCampaign(campaignId: string): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "You need to be logged in." };
    if (!isUuid(campaignId)) return { ok: false, error: "Campaign not found." };

    const campaign = await prisma.votingCampaign.findUnique({
      where: { id: campaignId },
      select: { organizerId: true, nominees: { select: { voteCount: true } } },
    });
    if (!campaign || campaign.organizerId !== user.id) return { ok: false, error: "Campaign not found." };
    if (campaign.nominees.some((n) => n.voteCount > 0)) {
      return { ok: false, error: "This campaign has votes (and payments) recorded, so it can't be deleted." };
    }

    await prisma.votingCampaign.delete({ where: { id: campaignId } });
    revalidatePath("/organizer/voting");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toUserMessage(err, "Couldn't delete the campaign.") };
  }
}

/**
 * Starts a vote. Paid campaigns return Paystack popup params (votes are only
 * counted after verifyVotePurchase confirms the charge). Free campaigns
 * count immediately but allow one vote per email per campaign.
 */
export async function initializeVotePayment(input: { nomineeId: string; voterEmail: string; quantity: number }): Promise<VoteResult> {
  try {
    const parsed = castVoteSchema.safeParse(input);
    if (!parsed.success) return { status: "error", error: parsed.error.issues[0]?.message ?? "Invalid vote." };
    const { nomineeId, voterEmail, quantity } = parsed.data;

    const nominee = await prisma.nominee.findUnique({
      where: { id: nomineeId },
      include: { campaign: { include: { organizer: { select: { createdAt: true, paystackSubaccountCode: true } } } } },
    });
    if (!nominee) return { status: "error", error: "Nominee not found." };

    const { campaign } = nominee;
    const now = new Date();
    if (now < campaign.startsAt) return { status: "error", error: "Voting hasn't opened yet." };
    if (now > campaign.endsAt) return { status: "error", error: "Voting has closed." };

    if (campaign.pricePerVoteKobo === 0) {
      const already = await prisma.vote.count({
        where: { voterEmail: { equals: voterEmail, mode: "insensitive" }, nominee: { campaignId: campaign.id } },
      });
      if (already > 0) return { status: "error", error: "This email has already voted in this campaign." };

      await prisma.$transaction([
        prisma.transaction.create({
          data: {
            type: "VOTE_PURCHASE",
            status: "SUCCESSFUL",
            amountKobo: 0,
            reference: `FREEVOTE-${randomUUID()}`,
            metadata: { nomineeId, voterEmail, quantity: 1 },
            votes: { create: { nomineeId, voterEmail, quantity: 1 } },
          },
        }),
        prisma.nominee.update({ where: { id: nomineeId }, data: { voteCount: { increment: 1 } } }),
      ]);

      revalidatePath(`/vote/${campaign.id}`);
      return { status: "voted", message: `Thanks! Your vote for ${nominee.name} has been counted.` };
    }

    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
    if (!publicKey) return { status: "error", error: "Payments aren't configured yet." };

    const saleFees = calculateSaleFees({
      subtotalKobo: campaign.pricePerVoteKobo * quantity,
      organizerCreatedAt: campaign.organizer.createdAt,
    });
    const split = splitFor(campaign.organizer.paystackSubaccountCode, saleFees);
    const reference = `VOTE-${randomUUID()}`;

    await prisma.transaction.create({
      data: {
        type: "VOTE_PURCHASE",
        status: "PENDING",
        amountKobo: saleFees.subtotalKobo,
        reference,
        metadata: {
          nomineeId,
          voterEmail,
          quantity,
          saleFees,
          split,
          payoutMode: split.subaccount ? "subaccount" : "manual",
        } satisfies VoteMetadata,
      },
    });

    return { status: "payment", reference, amountKobo: saleFees.subtotalKobo, email: voterEmail, publicKey, split };
  } catch (err) {
    return { status: "error", error: toUserMessage(err, "We couldn't start your vote. Please try again.") };
  }
}

export async function verifyVotePurchase(reference: string): Promise<{ success: true; message: string } | { success: false; error: string }> {
  try {
    if (typeof reference !== "string" || !reference) return { success: false, error: "Missing payment reference." };

    const transaction = await prisma.transaction.findUnique({ where: { reference } });
    if (!transaction || transaction.type !== "VOTE_PURCHASE") return { success: false, error: "Transaction not found." };

    const metadata = transaction.metadata as VoteMetadata;
    const done = { success: true as const, message: `Payment confirmed — ${metadata.quantity} vote(s) counted. Thank you!` };
    if (transaction.status === "SUCCESSFUL") return done;

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.status) {
      return { success: false, error: "We couldn't confirm your payment yet. If you were charged, your votes will be counted shortly." };
    }

    const fail = async (error: string) => {
      await prisma.transaction.updateMany({ where: { id: transaction.id, status: "PENDING" }, data: { status: "FAILED" } });
      return { success: false as const, error };
    };
    if (data.data?.status !== "success") return fail("Payment was not completed.");
    if (data.data.amount !== transaction.amountKobo) return fail("Payment amount mismatch. Please contact support.");
    if (!splitMatches(metadata.split, data.data)) return fail("Payment routing didn't match this vote. Please contact support.");

    // Claim + count in one transaction: the webhook and the browser callback
    // can't both add the votes, and a failure rolls the claim back.
    const counted = await prisma.$transaction(async (tx) => {
      const claim = await tx.transaction.updateMany({
        where: { id: transaction.id, status: "PENDING" },
        data: { status: "SUCCESSFUL" },
      });
      if (claim.count === 0) return false;

      await tx.vote.create({
        data: { nomineeId: metadata.nomineeId, voterEmail: metadata.voterEmail, quantity: metadata.quantity, transactionId: transaction.id },
      });
      await tx.nominee.update({ where: { id: metadata.nomineeId }, data: { voteCount: { increment: metadata.quantity } } });
      return true;
    }, TX_OPTIONS);

    if (counted) {
      const nominee = await prisma.nominee.findUnique({ where: { id: metadata.nomineeId }, select: { campaignId: true } });
      if (nominee) revalidatePath(`/vote/${nominee.campaignId}`);
    }
    return done;
  } catch (err) {
    return { success: false, error: toUserMessage(err, "We couldn't confirm your payment. If you were charged, contact support with your reference.") };
  }
}
