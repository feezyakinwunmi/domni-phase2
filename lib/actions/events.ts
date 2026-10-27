"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { createEventSchema, type CreateEventInput } from "@/lib/validations/event";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireEventOwner } from "@/lib/auth";
import { formatZodIssue, toUserMessage, type ActionResult } from "@/lib/errors";

// Generous limits: the Supabase pooler adds a round trip per statement and an
// event with many sections/fields can take a few seconds to write.
const TX_OPTIONS = { maxWait: 10_000, timeout: 30_000 };

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
  return `${base || "event"}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Validates the payload and enforces plan limits server-side: free organizers
 * can't attach premium designs or customizations by calling the action directly.
 */
async function parseAndAuthorize(payload: unknown, userId: string) {
  const parsed = createEventSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false as const, error: formatZodIssue(parsed.error.issues[0]) };
  }

  const data = parsed.data;
  const profile = await prisma.profile.findUnique({ where: { id: userId }, select: { plan: true } });
  if (!profile) {
    return { ok: false as const, error: "Your organizer profile wasn't found. Try signing out and back in." };
  }
  const isPro = profile.plan === "PRO";

  const templateIds = [
    ...new Set(data.sections.flatMap((s) => s.ticketTypes.map((t) => t.ticketTemplateId)).filter(Boolean)),
  ] as string[];

  if (templateIds.length) {
    const templates = await prisma.ticketTemplate.findMany({
      where: { id: { in: templateIds } },
      select: { id: true, isPremium: true },
    });
    if (templates.length !== templateIds.length) {
      return { ok: false as const, error: "One of the selected ticket designs no longer exists. Pick another design." };
    }
    if (!isPro && templates.some((t) => t.isPremium)) {
      return { ok: false as const, error: "Premium ticket designs need the Pro plan." };
    }
  }

  if (!isPro) {
    for (const section of data.sections) {
      for (const tt of section.ticketTypes) tt.templateCustomization = null;
    }
  }

  return { ok: true as const, data };
}

function ticketTypeData(tt: CreateEventInput["sections"][number]["ticketTypes"][number]) {
  return {
    title: tt.title,
    description: tt.description || null,
    perks: tt.perks,
    priceKobo: Math.round(tt.price * 100),
    quantity: tt.quantity,
    maxPerBuyer: tt.maxPerBuyer ?? null,
    ticketTemplateId: tt.ticketTemplateId || null,
    templateCustomization: tt.templateCustomization ?? Prisma.DbNull,
  };
}

function fieldData(field: CreateEventInput["registrationFields"][number], index: number) {
  return {
    label: field.label,
    type: field.type,
    fieldType: field.type,
    placeholder: field.placeholder || null,
    required: field.required,
    options: field.options,
    sortOrder: index,
  };
}

function eventData(data: CreateEventInput) {
  return {
    title: data.title,
    description: data.description || null,
    venue: data.venue || null,
    schoolName: data.schoolName || null,
    coverImage: data.coverImageUrl || null,
    startsAt: new Date(data.startsAt),
    endsAt: data.endsAt ? new Date(data.endsAt) : null,
    details: data.details,
  };
}

export async function createEvent(payload: unknown): Promise<ActionResult<{ eventId: string }>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "You need to be logged in to create an event." };

    const checked = await parseAndAuthorize(payload, user.id);
    if (!checked.ok) return checked;
    const data = checked.data;

    // A single nested create is one atomic statement batch — no partial events.
    const event = await prisma.event.create({
      data: {
        ...eventData(data),
        organizerId: user.id,
        slug: slugify(data.title),
        status: "DRAFT",
        registrationFields: { create: data.registrationFields.map(fieldData) },
        sections: {
          create: data.sections.map((section, sectionIndex) => ({
            title: section.title,
            description: section.description || null,
            sortOrder: sectionIndex,
            ticketTypes: { create: section.ticketTypes.map(ticketTypeData) },
          })),
        },
      },
      select: { id: true },
    });

    revalidatePath("/dashboard");
    return { ok: true, eventId: event.id };
  } catch (err) {
    return { ok: false, error: toUserMessage(err, "We couldn't create your event. Please try again.") };
  }
}

export async function updateEvent(eventId: string, payload: unknown): Promise<ActionResult<{ eventId: string }>> {
  try {
    const auth = await requireEventOwner(eventId);
    if (!auth.ok) return auth;

    const checked = await parseAndAuthorize(payload, auth.user.id);
    if (!checked.ok) return checked;
    const { sections, registrationFields } = checked.data;

    const existing = await prisma.event.findUniqueOrThrow({
      where: { id: eventId },
      select: {
        sections: { select: { id: true, ticketTypes: { select: { id: true, title: true, quantitySold: true } } } },
        registrationFields: { select: { id: true } },
      },
    });

    const existingSectionIds = new Set(existing.sections.map((s) => s.id));
    const existingTicketTypes = new Map(
      existing.sections.flatMap((s) => s.ticketTypes.map((tt) => [tt.id, { ...tt, sectionId: s.id }] as const))
    );
    const existingFieldIds = new Set(existing.registrationFields.map((f) => f.id));

    const incomingTicketTypeIds = new Set(sections.flatMap((s) => s.ticketTypes.map((tt) => tt.id)).filter(Boolean));

    // Ticket types with sales can't be deleted (tickets reference them) or
    // shrunk below what's already sold.
    for (const tt of existingTicketTypes.values()) {
      if (tt.quantitySold > 0 && !incomingTicketTypeIds.has(tt.id)) {
        return {
          ok: false,
          error: `"${tt.title}" already has ${tt.quantitySold} ticket(s) sold and can't be removed. Set its quantity to ${tt.quantitySold} to stop sales instead.`,
        };
      }
    }
    for (const section of sections) {
      for (const tt of section.ticketTypes) {
        const prev = tt.id ? existingTicketTypes.get(tt.id) : undefined;
        if (prev && tt.quantity < prev.quantitySold) {
          return {
            ok: false,
            error: `"${tt.title}" has ${prev.quantitySold} sold — quantity can't be lower than that.`,
          };
        }
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.event.update({ where: { id: eventId }, data: eventData(checked.data) });

      // --- registration fields
      const keepFieldIds = registrationFields.map((f) => f.id).filter((id): id is string => !!id && existingFieldIds.has(id));
      await tx.registrationField.deleteMany({ where: { eventId, id: { notIn: keepFieldIds } } });

      for (const [index, field] of registrationFields.entries()) {
        if (field.id && existingFieldIds.has(field.id)) {
          await tx.registrationField.update({ where: { id: field.id }, data: fieldData(field, index) });
        } else {
          await tx.registrationField.create({ data: { ...fieldData(field, index), eventId } });
        }
      }

      // --- ticket types removed from the form (all unsold — checked above)
      const removedTicketTypeIds = [...existingTicketTypes.keys()].filter((id) => !incomingTicketTypeIds.has(id));
      if (removedTicketTypeIds.length) {
        await tx.ticketType.deleteMany({ where: { id: { in: removedTicketTypeIds } } });
      }

      // --- sections
      const keepSectionIds = sections.map((s) => s.id).filter((id): id is string => !!id && existingSectionIds.has(id));
      const removedSectionIds = [...existingSectionIds].filter((id) => !keepSectionIds.includes(id));
      if (removedSectionIds.length) {
        await tx.eventSection.deleteMany({ where: { id: { in: removedSectionIds } } });
      }

      for (const [sectionIndex, section] of sections.entries()) {
        const sectionData = {
          title: section.title,
          description: section.description || null,
          sortOrder: sectionIndex,
        };

        const sectionId =
          section.id && existingSectionIds.has(section.id)
            ? (await tx.eventSection.update({ where: { id: section.id }, data: sectionData })).id
            : (await tx.eventSection.create({ data: { ...sectionData, eventId } })).id;

        for (const tt of section.ticketTypes) {
          if (tt.id && existingTicketTypes.has(tt.id)) {
            // Moving a ticket type between sections is allowed.
            await tx.ticketType.update({ where: { id: tt.id }, data: { ...ticketTypeData(tt), sectionId } });
          } else {
            await tx.ticketType.create({ data: { ...ticketTypeData(tt), sectionId } });
          }
        }
      }
    }, TX_OPTIONS);

    revalidatePath(`/organizer/events/${eventId}`);
    revalidatePath("/dashboard");
    revalidatePath("/events");
    return { ok: true, eventId };
  } catch (err) {
    return { ok: false, error: toUserMessage(err, "We couldn't save your changes. Please try again.") };
  }
}

export async function setEventStatus(
  eventId: string,
  status: "PUBLISHED" | "DRAFT" | "CANCELLED"
): Promise<ActionResult> {
  try {
    const auth = await requireEventOwner(eventId);
    if (!auth.ok) return auth;

    if (status === "PUBLISHED") {
      const ticketTypes = await prisma.ticketType.findMany({ where: { section: { eventId } }, select: { priceKobo: true } });
      if (ticketTypes.length === 0) return { ok: false, error: "Add at least one ticket type before publishing." };

      if (ticketTypes.some((t) => t.priceKobo > 0)) {
        const organizer = await prisma.profile.findUnique({
          where: { id: auth.user.id },
          select: { paystackSubaccountCode: true },
        });
        if (!organizer?.paystackSubaccountCode) {
          return {
            ok: false,
            error: "Add your payout bank account in Settings → Payout account before publishing paid tickets, so sales can be paid to you.",
          };
        }
      }
    }

    const event = await prisma.event.update({ where: { id: eventId }, data: { status }, select: { slug: true } });

    revalidatePath("/dashboard");
    revalidatePath("/events");
    revalidatePath(`/events/${event.slug}`);
    revalidatePath(`/organizer/events/${eventId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toUserMessage(err, "Couldn't update the event status.") };
  }
}

export async function deleteEvent(eventId: string): Promise<ActionResult> {
  try {
    const auth = await requireEventOwner(eventId);
    if (!auth.ok) return auth;

    const soldTickets = await prisma.ticket.count({ where: { ticketType: { section: { eventId } } } });
    if (soldTickets > 0) {
      return {
        ok: false,
        error: `This event has ${soldTickets} ticket(s) issued, so it can't be deleted. Cancel or unpublish it instead.`,
      };
    }

    await prisma.$transaction(async (tx) => {
      // Voting campaigns can outlive the event they were attached to.
      await tx.votingCampaign.updateMany({ where: { eventId }, data: { eventId: null } });
      // Sections → ticket types, registration fields and comments cascade.
      await tx.event.delete({ where: { id: eventId } });
    }, TX_OPTIONS);

    revalidatePath("/dashboard");
    revalidatePath("/events");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toUserMessage(err, "Couldn't delete the event.") };
  }
}
