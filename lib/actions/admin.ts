"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { isUuid, toUserMessage, type ActionResult } from "@/lib/errors";

async function guard(targetId?: string) {
  const admin = await getAdmin();
  if (!admin) return { ok: false as const, error: "Not authorized." };
  if (targetId !== undefined && !isUuid(targetId)) return { ok: false as const, error: "Invalid id." };
  return { ok: true as const, admin };
}

function log(adminEmail: string, action: string, detail: Record<string, unknown>) {
  console.info("[domni:admin]", adminEmail, action, JSON.stringify(detail));
}

export async function adminSetRole(userId: string, role: "ATTENDEE" | "ORGANIZER" | "ADMIN"): Promise<ActionResult> {
  try {
    const g = await guard(userId);
    if (!g.ok) return g;
    if (userId === g.admin.id && role !== "ADMIN") return { ok: false, error: "You can't remove your own admin role." };
    if (!["ATTENDEE", "ORGANIZER", "ADMIN"].includes(role)) return { ok: false, error: "Invalid role." };

    await prisma.profile.update({ where: { id: userId }, data: { role } });
    log(g.admin.email, "set-role", { userId, role });
    revalidatePath(`/admin/users/${userId}`);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toUserMessage(err) };
  }
}

export async function adminSetPlan(userId: string, plan: "FREE" | "PRO"): Promise<ActionResult> {
  try {
    const g = await guard(userId);
    if (!g.ok) return g;
    if (plan !== "FREE" && plan !== "PRO") return { ok: false, error: "Invalid plan." };

    await prisma.profile.update({
      where: { id: userId },
      data: { plan, planActivatedAt: plan === "PRO" ? new Date() : null },
    });
    log(g.admin.email, "set-plan", { userId, plan });
    revalidatePath(`/admin/users/${userId}`);
    revalidatePath("/admin/pro");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toUserMessage(err) };
  }
}

/** Suspends sign-in via Supabase Auth's ban (existing sessions end on next refresh). */
export async function adminSetSuspended(userId: string, suspended: boolean): Promise<ActionResult> {
  try {
    const g = await guard(userId);
    if (!g.ok) return g;
    if (userId === g.admin.id) return { ok: false, error: "You can't suspend yourself." };

    const { error } = await createAdminClient().auth.admin.updateUserById(userId, {
      ban_duration: suspended ? "876000h" : "none",
    });
    if (error) return { ok: false, error: error.message };

    if (suspended) {
      // Hide a suspended organizer's live events too.
      await prisma.event.updateMany({ where: { organizerId: userId, status: "PUBLISHED" }, data: { status: "DRAFT" } });
    }
    log(g.admin.email, suspended ? "suspend" : "unsuspend", { userId });
    revalidatePath(`/admin/users/${userId}`);
    revalidatePath("/events");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toUserMessage(err) };
  }
}

export async function adminSetEventStatus(
  eventId: string,
  status: "PUBLISHED" | "DRAFT" | "CANCELLED" | "ENDED"
): Promise<ActionResult> {
  try {
    const g = await guard(eventId);
    if (!g.ok) return g;
    const event = await prisma.event.update({ where: { id: eventId }, data: { status }, select: { slug: true } });
    log(g.admin.email, "event-status", { eventId, status });
    revalidatePath("/admin/events");
    revalidatePath("/events");
    revalidatePath(`/events/${event.slug}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toUserMessage(err) };
  }
}

export async function adminSetFeatured(eventId: string, featured: boolean): Promise<ActionResult> {
  try {
    const g = await guard(eventId);
    if (!g.ok) return g;
    await prisma.event.update({ where: { id: eventId }, data: { featured } });
    log(g.admin.email, "featured", { eventId, featured });
    revalidatePath("/admin/events");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toUserMessage(err) };
  }
}

/**
 * Records that DOMNI paid an organizer by bank transfer for sales that settled
 * to DOMNI's own balance (before they connected a payout account). The amount
 * is recomputed server-side — never taken from the client.
 */
export async function adminRecordPayout(organizerId: string): Promise<ActionResult> {
  try {
    const g = await guard(organizerId);
    if (!g.ok) return g;

    const owed = await outstandingManualPayout(organizerId);
    if (owed <= 0) return { ok: false, error: "Nothing is owed to this organizer." };

    await prisma.transaction.create({
      data: {
        type: "PAYOUT",
        status: "SUCCESSFUL",
        amountKobo: owed,
        userId: organizerId,
        reference: `PAYOUT-${crypto.randomUUID()}`,
        metadata: { recordedBy: g.admin.email, method: "manual-transfer" },
      },
    });
    log(g.admin.email, "manual-payout", { organizerId, owed });
    revalidatePath("/admin/payouts");
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toUserMessage(err) };
  }
}

async function outstandingManualPayout(organizerId: string) {
  const [row] = await prisma.$queryRaw<{ owed: bigint | null }[]>`
    WITH sales AS (
      SELECT COALESCE((t.metadata->'saleFees'->>'estimatedOrganizerNetKobo')::bigint, t."amountKobo") AS net
      FROM "transactions" t
      JOIN "ticket_types" tt ON tt.id::text = t.metadata->>'ticketTypeId'
      JOIN "event_sections" s ON s.id = tt."sectionId"
      JOIN "events" e ON e.id = s."eventId"
      WHERE e."organizerId" = ${organizerId}::uuid AND t.type = 'TICKET_PURCHASE' AND t.status = 'SUCCESSFUL'
        AND t."amountKobo" > 0 AND COALESCE(t.metadata->>'payoutMode', 'manual') <> 'subaccount'
      UNION ALL
      SELECT COALESCE((t.metadata->'saleFees'->>'estimatedOrganizerNetKobo')::bigint, t."amountKobo")
      FROM "transactions" t
      JOIN "nominees" n ON n.id::text = t.metadata->>'nomineeId'
      JOIN "voting_campaigns" c ON c.id = n."campaignId"
      WHERE c."organizerId" = ${organizerId}::uuid AND t.type = 'VOTE_PURCHASE' AND t.status = 'SUCCESSFUL'
        AND t."amountKobo" > 0 AND COALESCE(t.metadata->>'payoutMode', 'manual') <> 'subaccount'
    )
    SELECT (COALESCE((SELECT SUM(net) FROM sales), 0)
          - COALESCE((SELECT SUM("amountKobo") FROM "transactions"
                      WHERE type = 'PAYOUT' AND status = 'SUCCESSFUL' AND "userId" = ${organizerId}::uuid), 0))::bigint AS owed`;
  return Number(row?.owed ?? 0);
}

/** Marks a flagged refund as handled after the admin refunded it in Paystack. */
export async function adminResolveRefund(transactionId: string): Promise<ActionResult> {
  try {
    const g = await guard(transactionId);
    if (!g.ok) return g;
    const tx = await prisma.transaction.findUniqueOrThrow({ where: { id: transactionId } });
    await prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: "REVERSED",
        metadata: { ...((tx.metadata as object) ?? {}), needsRefund: false, refundedBy: g.admin.email, refundedAt: new Date().toISOString() },
      },
    });
    log(g.admin.email, "refund-resolved", { transactionId });
    revalidatePath("/admin/transactions");
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toUserMessage(err) };
  }
}
