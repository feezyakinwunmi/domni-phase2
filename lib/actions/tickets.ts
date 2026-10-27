"use server";

import { randomUUID } from "crypto";
import { customAlphabet, nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { calculateSaleFees, type SaleFees } from "@/lib/billing/fees";
import { splitFor, splitMatches, type SplitParams } from "@/lib/paystack";
import { isUuid, toUserMessage } from "@/lib/errors";
import {
  normalizeOptions,
  parseEventDetails,
  photoFromAnswers,
  validateRegistration,
  type RegistrationFieldDef,
} from "@/lib/event-details";

const MAX_PER_ORDER = 20;
const TX_OPTIONS = { maxWait: 10_000, timeout: 30_000 };
const ticketNumber = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 8);

type Answers = Record<string, string>;

type TicketPurchaseMetadata = {
  ticketTypeId: string;
  quantity: number;
  email: string;
  name: string;
  answers?: Answers; // keyed by registration field id
  registrationData?: Record<string, string>; // legacy: keyed by field label
  saleFees?: SaleFees;
  split?: SplitParams;
  payoutMode?: "subaccount" | "manual";
  needsRefund?: boolean;
};

export type PurchaseInput = {
  ticketTypeId: string;
  quantity: number;
  name: string;
  email: string;
  answers: Answers;
};

export type PurchaseResult =
  | { status: "issued"; redirect: string }
  | { status: "payment"; reference: string; amountKobo: number; email: string; publicKey: string; split: SplitParams }
  | { status: "error"; error: string; fieldErrors?: Record<string, string> };

export type VerifyResult = { success: true; redirect: string } | { success: false; error: string };

class SoldOutError extends Error {}

function loadTicketType(ticketTypeId: string) {
  return prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
    include: {
      section: {
        include: {
          event: {
            include: {
              registrationFields: { orderBy: { sortOrder: "asc" } },
              organizer: { select: { createdAt: true, paystackSubaccountCode: true } },
            },
          },
        },
      },
    },
  });
}

type LoadedTicketType = NonNullable<Awaited<ReturnType<typeof loadTicketType>>>;

function toFieldDefs(ticketType: LoadedTicketType): RegistrationFieldDef[] {
  return ticketType.section.event.registrationFields.map((f) => ({
    id: f.id,
    label: f.label,
    type: f.type,
    placeholder: f.placeholder,
    required: f.required ?? false,
    options: normalizeOptions(f.options),
  }));
}

/** Returns a user-facing reason the purchase can't happen, or null. */
function availabilityProblem(ticketType: LoadedTicketType, quantity: number): string | null {
  const event = ticketType.section.event;
  const now = new Date();

  if (event.status !== "PUBLISHED") return "This event isn't open for registration.";
  // No end time set → treat the event as over 24h after it starts.
  const endsAt = event.endsAt ?? new Date(event.startsAt.getTime() + 24 * 60 * 60 * 1000);
  if (endsAt < now) return "This event has already ended.";
  if (ticketType.salesStartAt && ticketType.salesStartAt > now) return "Sales for this ticket haven't started yet.";
  if (ticketType.salesEndAt && ticketType.salesEndAt < now) return "Sales for this ticket have closed.";

  const remaining = ticketType.quantity - ticketType.quantitySold;
  if (remaining <= 0) return "This ticket is sold out.";
  if (quantity > remaining) return `Only ${remaining} ticket(s) left.`;
  if (ticketType.maxPerBuyer && quantity > ticketType.maxPerBuyer) {
    return `You can buy at most ${ticketType.maxPerBuyer} of this ticket.`;
  }
  return null;
}

async function alreadyHeldByEmail(ticketTypeId: string, email: string) {
  return prisma.ticket.count({
    where: {
      ticketTypeId,
      guestEmail: { equals: email, mode: "insensitive" },
      status: { in: ["VALID", "CHECKED_IN"] },
    },
  });
}

/**
 * Reserves inventory and writes tickets + answers in one transaction.
 * The conditional UPDATE is the oversell guard: two buyers racing for the
 * last ticket can't both pass it, unlike the old read-then-increment.
 */
async function issueTickets(opts: {
  ticketTypeId: string;
  quantity: number;
  email: string;
  name: string;
  answers: Answers;
  fieldIds: string[];
  transactionId: string;
  photoUrl?: string | null;
}) {
  const owner = await prisma.profile.findFirst({
    where: { email: { equals: opts.email, mode: "insensitive" } },
    select: { id: true },
  });

  const tickets = Array.from({ length: opts.quantity }, () => ({
    id: randomUUID(),
    ticketTypeId: opts.ticketTypeId,
    transactionId: opts.transactionId,
    ownerId: owner?.id ?? null,
    guestEmail: opts.email,
    guestName: opts.name,
    holderName: opts.name,
    qrCode: nanoid(32),
    ticketNumber: `DMN-${ticketNumber()}`,
    photoUrl: opts.photoUrl ?? null,
  }));

  const answers = tickets.flatMap((ticket) =>
    opts.fieldIds
      .filter((fieldId) => (opts.answers[fieldId] ?? "").trim() !== "")
      .map((fieldId) => ({ ticketId: ticket.id, fieldId, value: opts.answers[fieldId].trim() }))
  );

  await prisma.$transaction(async (tx) => {
    const reserved = await tx.$executeRaw`
      UPDATE "ticket_types"
      SET "quantitySold" = "quantitySold" + ${opts.quantity}, "updatedAt" = NOW()
      WHERE "id" = ${opts.ticketTypeId}::uuid AND "quantitySold" + ${opts.quantity} <= "quantity"`;

    if (reserved === 0) throw new SoldOutError();

    await tx.ticket.createMany({ data: tickets });
    if (answers.length) await tx.registration_answers.createMany({ data: answers });
  }, TX_OPTIONS);

  return tickets.map((t) => t.id);
}

export async function initializeTicketPurchase(input: PurchaseInput): Promise<PurchaseResult> {
  try {
    const quantity = Math.floor(Number(input?.quantity));
    const name = String(input?.name ?? "").trim();
    const email = String(input?.email ?? "").trim().toLowerCase();
    const answers: Answers = {};
    for (const [k, v] of Object.entries(input?.answers ?? {})) answers[k] = String(v ?? "");

    if (!isUuid(input?.ticketTypeId)) return { status: "error", error: "This ticket is no longer available." };
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > MAX_PER_ORDER) {
      return { status: "error", error: `Choose between 1 and ${MAX_PER_ORDER} tickets.` };
    }

    const ticketType = await loadTicketType(input.ticketTypeId);
    if (!ticketType) return { status: "error", error: "This ticket is no longer available." };

    const problem = availabilityProblem(ticketType, quantity);
    if (problem) return { status: "error", error: problem };

    const event = ticketType.section.event;
    const details = parseEventDetails(event.details);
    const fields = toFieldDefs(ticketType);

    const fieldErrors = validateRegistration(fields, { name, email, answers }, details);
    if (Object.keys(fieldErrors).length) {
      return { status: "error", error: "Please fix the highlighted fields.", fieldErrors };
    }

    if (ticketType.maxPerBuyer) {
      const held = await alreadyHeldByEmail(ticketType.id, email);
      if (held + quantity > ticketType.maxPerBuyer) {
        const left = Math.max(0, ticketType.maxPerBuyer - held);
        return {
          status: "error",
          error: left
            ? `This email already has ${held} of these tickets — you can get ${left} more.`
            : `This email already has the maximum of ${ticketType.maxPerBuyer} for this ticket.`,
        };
      }
    }

    const fieldIds = fields.map((f) => f.id);

    // FREE — issue immediately. A zero-amount transaction groups the order so
    // the success page can show every ticket, not just the first.
    if (ticketType.priceKobo === 0) {
      const reference = `FREE-${randomUUID()}`;
      const transaction = await prisma.transaction.create({
        data: {
          type: "TICKET_PURCHASE",
          status: "SUCCESSFUL",
          amountKobo: 0,
          reference,
          metadata: { ticketTypeId: ticketType.id, quantity, email, name, answers },
        },
      });

      try {
        await issueTickets({
          ticketTypeId: ticketType.id,
          quantity,
          email,
          name,
          answers,
          fieldIds,
          transactionId: transaction.id,
          photoUrl: photoFromAnswers(fields, answers),
        });
      } catch (err) {
        await prisma.transaction.update({ where: { id: transaction.id }, data: { status: "FAILED" } }).catch(() => {});
        if (err instanceof SoldOutError) return { status: "error", error: "Sorry — those tickets just sold out." };
        throw err;
      }

      revalidatePath(`/events/${event.slug}`);
      return { status: "issued", redirect: `/tickets/success?order=${encodeURIComponent(reference)}` };
    }

    // PAID — record a pending transaction; tickets are only issued after
    // verifyTicketPurchase() confirms the charge with Paystack server-to-server.
    const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
    if (!publicKey) return { status: "error", error: "Payments aren't configured yet. Please contact the organizer." };

    const saleFees = calculateSaleFees({
      subtotalKobo: ticketType.priceKobo * quantity,
      organizerCreatedAt: event.organizer.createdAt,
    });
    const reference = `TICKET-${randomUUID()}`;
    // Organizer's share settles straight to their bank via their Paystack subaccount.
    const split = splitFor(event.organizer.paystackSubaccountCode, saleFees);

    await prisma.transaction.create({
      data: {
        type: "TICKET_PURCHASE",
        status: "PENDING",
        amountKobo: saleFees.subtotalKobo,
        reference,
        metadata: {
          ticketTypeId: ticketType.id,
          quantity,
          email,
          name,
          answers,
          saleFees,
          split,
          payoutMode: split.subaccount ? "subaccount" : "manual",
        } satisfies TicketPurchaseMetadata,
      },
    });

    return { status: "payment", reference, amountKobo: saleFees.subtotalKobo, email, publicKey, split };
  } catch (err) {
    return { status: "error", error: toUserMessage(err, "We couldn't start your registration. Please try again.") };
  }
}

export async function verifyTicketPurchase(reference: string): Promise<VerifyResult> {
  try {
    if (typeof reference !== "string" || !reference) return { success: false, error: "Missing payment reference." };

    const transaction = await prisma.transaction.findUnique({ where: { reference } });
    if (!transaction || transaction.type !== "TICKET_PURCHASE") {
      return { success: false, error: "Transaction not found." };
    }

    const successRedirect = `/tickets/success?order=${encodeURIComponent(reference)}`;
    if (transaction.status === "SUCCESSFUL") return { success: true, redirect: successRedirect };

    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      cache: "no-store",
    });
    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.status) {
      // Paystack unreachable / unknown ref — leave PENDING so the webhook can still settle it.
      return { success: false, error: "We couldn't confirm your payment yet. If you were charged, your tickets will be emailed shortly." };
    }

    if (data.data?.status !== "success") {
      await prisma.transaction.updateMany({ where: { id: transaction.id, status: "PENDING" }, data: { status: "FAILED" } });
      return { success: false, error: "Payment was not completed." };
    }

    if (data.data.amount !== transaction.amountKobo) {
      await prisma.transaction.updateMany({ where: { id: transaction.id, status: "PENDING" }, data: { status: "FAILED" } });
      return { success: false, error: "Payment amount mismatch. Please contact support." };
    }

    const expected = (transaction.metadata as TicketPurchaseMetadata | null)?.split;
    if (!splitMatches(expected, data.data)) {
      await prisma.transaction.updateMany({ where: { id: transaction.id, status: "PENDING" }, data: { status: "FAILED" } });
      return { success: false, error: "Payment routing didn't match this order. Please contact support." };
    }

    // Flip PENDING → SUCCESSFUL atomically so the webhook and the browser
    // callback can't both issue tickets.
    const claim = await prisma.transaction.updateMany({
      where: { id: transaction.id, status: "PENDING" },
      data: { status: "SUCCESSFUL" },
    });
    if (claim.count === 0) return { success: true, redirect: successRedirect };

    const metadata = transaction.metadata as TicketPurchaseMetadata;
    const actualPaystackFeeKobo = typeof data.data?.fees === "number" ? data.data.fees : metadata.saleFees?.estimatedPaystackFeeKobo;

    const ticketType = await loadTicketType(metadata.ticketTypeId);
    if (!ticketType) {
      await flagRefund(transaction.id, metadata);
      return { success: false, error: "Payment received but this ticket no longer exists. Contact the organizer for a refund." };
    }

    const fields = toFieldDefs(ticketType);
    const answers: Answers = metadata.answers ?? {};
    if (!metadata.answers && metadata.registrationData) {
      // Older pending orders stored answers by label.
      for (const f of fields) {
        const v = metadata.registrationData[f.label];
        if (v) answers[f.id] = v;
      }
    }

    try {
      await issueTickets({
        ticketTypeId: ticketType.id,
        quantity: metadata.quantity,
        email: metadata.email,
        name: metadata.name,
        answers,
        fieldIds: fields.map((f) => f.id),
        transactionId: transaction.id,
        photoUrl: photoFromAnswers(fields, answers),
      });
    } catch (err) {
      if (err instanceof SoldOutError) {
        await flagRefund(transaction.id, metadata);
        return { success: false, error: "Payment succeeded but tickets sold out while it was processing. The organizer has been flagged to refund you." };
      }
      // Transient failure: release the claim so a retry or the webhook can finish the job.
      await prisma.transaction.update({ where: { id: transaction.id }, data: { status: "PENDING" } }).catch(() => {});
      throw err;
    }

    if (metadata.saleFees && actualPaystackFeeKobo !== undefined) {
      await prisma.transaction
        .update({
          where: { id: transaction.id },
          data: {
            metadata: {
              ...metadata,
              saleFees: {
                ...metadata.saleFees,
                estimatedPaystackFeeKobo: actualPaystackFeeKobo,
                estimatedOrganizerNetKobo: Math.max(
                  0,
                  metadata.saleFees.subtotalKobo - metadata.saleFees.domniFeeKobo - actualPaystackFeeKobo
                ),
              },
            },
          },
        })
        .catch((e) => console.error("[domni] fee bookkeeping failed", e));
    }

    revalidatePath(`/events/${ticketType.section.event.slug}`);
    return { success: true, redirect: successRedirect };
  } catch (err) {
    return { success: false, error: toUserMessage(err, "We couldn't confirm your payment. If you were charged, please contact support with your reference.") };
  }
}

async function flagRefund(transactionId: string, metadata: TicketPurchaseMetadata) {
  await prisma.transaction
    .update({ where: { id: transactionId }, data: { metadata: { ...metadata, needsRefund: true } } })
    .catch((e) => console.error("[domni] failed to flag refund", e));
}
