"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireEventOwner } from "@/lib/auth";
import { calculateSaleFees, type SaleFees } from "@/lib/billing/fees";
import { isUuid, toUserMessage, type ActionResult } from "@/lib/errors";
import { splitFor, splitMatches, type SplitParams } from "@/lib/paystack";
import { isPartnerLogoUrl, partnerApplicationSchema, priceFor, unitsProblem } from "@/lib/partners";

const TX_OPTIONS = { maxWait: 10_000, timeout: 30_000 };

type PartnerTxMetadata = {
  applicationId: string;
  saleFees?: SaleFees;
  split?: SplitParams;
  payoutMode?: "subaccount" | "manual";
  needsRefund?: boolean;
};

export type PaymentParams = {
  reference: string;
  amountKobo: number;
  email: string;
  publicKey: string;
  split: SplitParams;
};

export type SubmitResult =
  | { status: "submitted"; applicationId: string }
  | ({ status: "payment"; applicationId: string } & PaymentParams)
  | { status: "error"; error: string; fieldErrors?: Record<string, string> };

class FullyBookedError extends Error {}

/** Anything that can run raw SQL — the base client or an interactive transaction. */
type RawExecutor = { $executeRaw: (query: TemplateStringsArray, ...values: unknown[]) => PromiseLike<number> };

/** Conditional increment — the oversell guard (two businesses racing for the last stand). */
async function reserve(tx: RawExecutor, packageId: string, units: number) {
  const updated = await tx.$executeRaw`
    UPDATE "partner_packages"
    SET "quantityTaken" = "quantityTaken" + ${units}, "updatedAt" = NOW()
    WHERE "id" = ${packageId}::uuid AND ("quantity" IS NULL OR "quantityTaken" + ${units} <= "quantity")`;
  if (updated === 0) throw new FullyBookedError();
}

async function release(tx: RawExecutor, packageId: string, units: number) {
  if (units <= 0) return;
  await tx.$executeRaw`
    UPDATE "partner_packages"
    SET "quantityTaken" = GREATEST(0, "quantityTaken" - ${units}), "updatedAt" = NOW()
    WHERE "id" = ${packageId}::uuid`;
}

function loadPackage(packageId: string) {
  return prisma.partnerPackage.findUnique({
    where: { id: packageId },
    include: {
      event: {
        select: {
          id: true,
          slug: true,
          status: true,
          startsAt: true,
          endsAt: true,
          organizer: { select: { createdAt: true, paystackSubaccountCode: true } },
        },
      },
    },
  });
}

/** Records a pending Paystack charge for an application and returns popup params. */
async function createPayment(opts: {
  applicationId: string;
  amountKobo: number;
  email: string;
  organizer: { createdAt: Date; paystackSubaccountCode: string | null };
}): Promise<PaymentParams | { error: string }> {
  const publicKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY;
  if (!publicKey) return { error: "Payments aren't configured yet. Please contact the organizer." };

  const saleFees = calculateSaleFees({ subtotalKobo: opts.amountKobo, organizerCreatedAt: opts.organizer.createdAt });
  const split = splitFor(opts.organizer.paystackSubaccountCode, saleFees);
  const reference = `PARTNER-${randomUUID()}`;

  const transaction = await prisma.transaction.create({
    data: {
      type: "PARTNER_PAYMENT",
      status: "PENDING",
      amountKobo: saleFees.subtotalKobo,
      reference,
      metadata: {
        applicationId: opts.applicationId,
        saleFees,
        split,
        payoutMode: split.subaccount ? "subaccount" : "manual",
      } satisfies PartnerTxMetadata,
    },
  });
  await prisma.partnerApplication.update({ where: { id: opts.applicationId }, data: { transactionId: transaction.id } });

  return { reference, amountKobo: saleFees.subtotalKobo, email: opts.email, publicKey, split };
}

export async function submitPartnerApplication(input: unknown): Promise<SubmitResult> {
  try {
    const parsed = partnerApplicationSchema.safeParse(input);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
      return { status: "error", error: "Please fix the highlighted fields.", fieldErrors };
    }
    const data = parsed.data;
    if (data.logoUrl && !isPartnerLogoUrl(data.logoUrl)) {
      return { status: "error", error: "Please upload your logo again.", fieldErrors: { logoUrl: "Upload your logo again." } };
    }

    const pkg = await loadPackage(data.packageId);
    if (!pkg || pkg.event.status !== "PUBLISHED") return { status: "error", error: "This package is no longer available." };

    const eventEnd = pkg.event.endsAt ?? new Date(pkg.event.startsAt.getTime() + 86_400_000);
    if (eventEnd < new Date()) return { status: "error", error: "This event has already ended." };

    const units = pkg.pricingModel === "PER_SQM" || pkg.pricingModel === "PER_UNIT" ? data.units : 1;
    const problem = unitsProblem(pkg, units);
    if (problem) return { status: "error", error: problem, fieldErrors: { units: problem } };

    const amount = priceFor(pkg, units);
    const instant = !pkg.requiresApproval && amount !== null && amount > 0;

    // Double-submit guard: the same business applying for the same package
    // moments ago gets that application back.
    const recent = await prisma.partnerApplication.findFirst({
      where: {
        packageId: pkg.id,
        email: data.email,
        status: { in: ["PENDING", "AWAITING_PAYMENT"] },
        createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
      },
      select: { id: true, status: true },
    });
    if (recent?.status === "PENDING") return { status: "submitted", applicationId: recent.id };

    const application = await prisma.partnerApplication.create({
      data: {
        packageId: pkg.id,
        eventId: pkg.event.id,
        companyName: data.companyName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone || null,
        website: data.website || null,
        logoUrl: data.logoUrl || null,
        notes: data.notes || null,
        units,
        amountKobo: amount ?? 0,
        status: instant ? "AWAITING_PAYMENT" : "PENDING",
      },
    });

    revalidatePath(`/organizer/events/${pkg.event.id}`);

    if (!instant) return { status: "submitted", applicationId: application.id };

    const payment = await createPayment({
      applicationId: application.id,
      amountKobo: amount!,
      email: data.email,
      organizer: pkg.event.organizer,
    });
    if ("error" in payment) return { status: "error", error: payment.error };
    return { status: "payment", applicationId: application.id, ...payment };
  } catch (err) {
    return { status: "error", error: toUserMessage(err, "We couldn't send your application. Please try again.") };
  }
}

/** For approved applications (or a retried instant booking): start a fresh payment. */
export async function startPartnerPayment(applicationId: string): Promise<ActionResult<PaymentParams>> {
  try {
    if (!isUuid(applicationId)) return { ok: false, error: "Application not found." };
    const app = await prisma.partnerApplication.findUnique({
      where: { id: applicationId },
      include: { event: { select: { organizer: { select: { createdAt: true, paystackSubaccountCode: true } } } } },
    });
    if (!app) return { ok: false, error: "Application not found." };
    if (app.status !== "APPROVED" && app.status !== "AWAITING_PAYMENT") {
      return { ok: false, error: app.status === "PAID" ? "This booking is already paid." : "This application can't be paid right now." };
    }
    if (app.amountKobo <= 0) return { ok: false, error: "There's nothing to pay for this application." };

    const payment = await createPayment({
      applicationId: app.id,
      amountKobo: app.amountKobo,
      email: app.email,
      organizer: app.event.organizer,
    });
    if ("error" in payment) return { ok: false, error: payment.error };
    return { ok: true, ...payment };
  } catch (err) {
    return { ok: false, error: toUserMessage(err, "Couldn't start the payment.") };
  }
}

export async function verifyPartnerPayment(reference: string): Promise<{ success: true; applicationId: string } | { success: false; error: string }> {
  try {
    if (typeof reference !== "string" || !reference) return { success: false, error: "Missing payment reference." };
    const transaction = await prisma.transaction.findUnique({ where: { reference } });
    if (!transaction || transaction.type !== "PARTNER_PAYMENT") return { success: false, error: "Payment not found." };

    const metadata = transaction.metadata as PartnerTxMetadata;
    if (transaction.status === "SUCCESSFUL") return { success: true, applicationId: metadata.applicationId };

    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      cache: "no-store",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.status) {
      return { success: false, error: "We couldn't confirm your payment yet. If you were charged, it will be confirmed shortly." };
    }

    const fail = async (error: string) => {
      await prisma.transaction.updateMany({ where: { id: transaction.id, status: "PENDING" }, data: { status: "FAILED" } });
      return { success: false as const, error };
    };
    if (data.data?.status !== "success") return fail("Payment was not completed.");
    if (data.data.amount !== transaction.amountKobo) return fail("Payment amount mismatch. Please contact support.");
    if (!splitMatches(metadata.split, data.data)) return fail("Payment routing didn't match this booking. Please contact support.");

    let slug: string | null = null;
    let eventId: string | null = null;
    try {
      await prisma.$transaction(async (tx) => {
        const claim = await tx.transaction.updateMany({ where: { id: transaction.id, status: "PENDING" }, data: { status: "SUCCESSFUL" } });
        if (claim.count === 0) return;

        const app = await tx.partnerApplication.findUniqueOrThrow({
          where: { id: metadata.applicationId },
          include: { event: { select: { id: true, slug: true } } },
        });
        slug = app.event.slug;
        eventId = app.event.id;

        // Instant bookings reserve capacity only once paid; approved ones already hold it.
        let reservedUnits = app.reservedUnits;
        if (app.reservedUnits === 0) {
          await reserve(tx, app.packageId, app.units);
          reservedUnits = app.units;
        }
        await tx.partnerApplication.update({
          where: { id: app.id },
          data: { status: "PAID", reservedUnits, transactionId: transaction.id },
        });
      }, TX_OPTIONS);
    } catch (err) {
      if (err instanceof FullyBookedError) {
        // The rollback undid the claim; record the charge and flag it for a refund.
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: "SUCCESSFUL", metadata: { ...metadata, needsRefund: true } },
        });
        await prisma.partnerApplication.update({
          where: { id: metadata.applicationId },
          data: { status: "CANCELLED", organizerNote: "Fully booked while payment was processing — refund due." },
        });
        return { success: false, error: "Payment succeeded but this package sold out while it was processing. The organizer has been flagged to refund you." };
      }
      throw err;
    }

    if (slug) revalidatePath(`/events/${slug}`);
    if (eventId) revalidatePath(`/organizer/events/${eventId}`);
    return { success: true, applicationId: metadata.applicationId };
  } catch (err) {
    return { success: false, error: toUserMessage(err, "We couldn't confirm your payment. Contact support with your reference if you were charged.") };
  }
}

// ---------------------------------------------------------------------------
// Organizer actions
// ---------------------------------------------------------------------------

async function loadOwnedApplication(applicationId: string) {
  if (!isUuid(applicationId)) return { ok: false as const, error: "Application not found." };
  const app = await prisma.partnerApplication.findUnique({ where: { id: applicationId }, include: { event: { select: { slug: true } } } });
  if (!app) return { ok: false as const, error: "Application not found." };
  const auth = await requireEventOwner(app.eventId);
  if (!auth.ok) return auth;
  return { ok: true as const, app };
}

export async function reviewPartnerApplication(
  applicationId: string,
  decision: "approve" | "reject",
  opts: { quoteNaira?: number; note?: string } = {}
): Promise<ActionResult> {
  try {
    const owned = await loadOwnedApplication(applicationId);
    if (!owned.ok) return owned;
    const { app } = owned;
    if (app.status !== "PENDING") return { ok: false, error: "Only applications under review can be approved or rejected." };

    const note = opts.note?.trim().slice(0, 500) || null;

    if (decision === "reject") {
      await prisma.partnerApplication.update({ where: { id: app.id }, data: { status: "REJECTED", organizerNote: note } });
    } else {
      let amountKobo = app.amountKobo;
      if (opts.quoteNaira !== undefined) {
        const q = Number(opts.quoteNaira);
        if (!Number.isFinite(q) || q < 0 || q > 100_000_000) return { ok: false, error: "Enter a valid amount." };
        amountKobo = Math.round(q * 100);
      }

      try {
        await prisma.$transaction(async (tx) => {
          await reserve(tx, app.packageId, app.units);
          await tx.partnerApplication.update({
            where: { id: app.id },
            // Free / in-kind partnerships are confirmed straight away.
            data: { status: amountKobo > 0 ? "APPROVED" : "PAID", amountKobo, reservedUnits: app.units, organizerNote: note },
          });
        }, TX_OPTIONS);
      } catch (err) {
        if (err instanceof FullyBookedError) return { ok: false, error: "This package is fully booked. Increase its availability first." };
        throw err;
      }
    }

    revalidatePath(`/organizer/events/${app.eventId}`);
    revalidatePath(`/events/${app.event.slug}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toUserMessage(err, "Couldn't update the application.") };
  }
}

/** Cancels an approved/confirmed booking and frees its capacity. Refunds happen in Paystack. */
export async function cancelPartnerApplication(applicationId: string, note?: string): Promise<ActionResult> {
  try {
    const owned = await loadOwnedApplication(applicationId);
    if (!owned.ok) return owned;
    const { app } = owned;
    if (!["APPROVED", "PAID", "AWAITING_PAYMENT"].includes(app.status)) return { ok: false, error: "This application can't be cancelled." };

    await prisma.$transaction(async (tx) => {
      await release(tx, app.packageId, app.reservedUnits);
      await tx.partnerApplication.update({
        where: { id: app.id },
        data: { status: "CANCELLED", reservedUnits: 0, organizerNote: note?.trim().slice(0, 500) || app.organizerNote },
      });
    }, TX_OPTIONS);

    revalidatePath(`/organizer/events/${app.eventId}`);
    revalidatePath(`/events/${app.event.slug}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toUserMessage(err, "Couldn't cancel the booking.") };
  }
}
