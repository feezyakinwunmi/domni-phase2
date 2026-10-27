"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createEventSchema } from "@/lib/validations/event";
import { createClient } from "@/lib/supabase/server";

export async function updateEvent(
  eventId: string,
  payload: any
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You need to be logged in.");
  }

  const existing = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      organizerId: true,
      sections: {
        select: {
          id: true,
          ticketTypes: { select: { id: true, quantitySold: true } },
        },
      },
      registrationFields: { select: { id: true } },
    },
  });

  if (!existing || existing.organizerId !== user.id) {
    throw new Error("You don't have permission to edit this event.");
  }

  const parsed =
    createEventSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ||
        "Invalid form data"
    );
  }

  const {
    title,
    description,
    venue,
    schoolName,
    coverImageUrl,
    startsAt,
    endsAt,
    sections,
    registrationFields,
  } = parsed.data;

  const existingSectionIds = new Set(existing.sections.map((s) => s.id));

  const incomingSectionIds = new Set(
    sections.map((s) => s.id).filter((id): id is string => Boolean(id))
  );

  // A ticket type that already has sales can't be silently dropped — the
  // delete would violate the FK from tickets that already reference it.
  const incomingTicketTypeIds = new Set(
    sections.flatMap((s) =>
      s.ticketTypes.map((tt) => tt.id).filter((id): id is string => Boolean(id))
    )
  );

  for (const section of existing.sections) {
    for (const tt of section.ticketTypes) {
      if (tt.quantitySold > 0 && !incomingTicketTypeIds.has(tt.id)) {
        throw new Error(
          "One of your ticket types already has tickets sold and can't be removed — edit it instead of deleting it."
        );
      }
    }
  }

  // Sections removed entirely from the draft (safe: we already verified
  // above that nothing with sales is being dropped).
  const sectionIdsToDelete = existing.sections
    .filter((s) => !incomingSectionIds.has(s.id))
    .map((s) => s.id);

  if (sectionIdsToDelete.length > 0) {
    await prisma.ticketType.deleteMany({
      where: { sectionId: { in: sectionIdsToDelete } },
    });

    await prisma.eventSection.deleteMany({
      where: { id: { in: sectionIdsToDelete } },
    });
  }

  const existingFieldIds = new Set(existing.registrationFields.map((f) => f.id));

  const incomingFieldIds = new Set(
    registrationFields.map((f) => f.id).filter((id): id is string => Boolean(id))
  );

  const fieldIdsToDelete = [...existingFieldIds].filter(
    (id) => !incomingFieldIds.has(id)
  );

  if (fieldIdsToDelete.length > 0) {
    await prisma.registrationField.deleteMany({
      where: { id: { in: fieldIdsToDelete } },
    });
  }

  await prisma.event.update({
    where: {
      id: eventId,
    },

    data: {
      title,
      description,
      venue,
      schoolName,
      coverImage: coverImageUrl,
      startsAt: new Date(startsAt),
      endsAt: endsAt ? new Date(endsAt) : null,
    },
  });

  for (const [index, field] of registrationFields.entries()) {
    const fieldData = {
      label: field.label,
      type: field.type,
      fieldType: field.type,
      placeholder: field.placeholder,
      required: field.required,
      options: field.options
        ? field.options.split(",").map((x) => x.trim()).filter(Boolean)
        : undefined,
      sortOrder: index,
    };

    if (field.id && existingFieldIds.has(field.id)) {
      await prisma.registrationField.update({
        where: { id: field.id },
        data: fieldData,
      });
    } else {
      await prisma.registrationField.create({
        data: { ...fieldData, eventId },
      });
    }
  }

  for (const [sectionIndex, section] of sections.entries()) {
    const sectionIsExisting = Boolean(
      section.id && existingSectionIds.has(section.id)
    );

    const sectionRecord = sectionIsExisting
      ? await prisma.eventSection.update({
          where: { id: section.id! },
          data: {
            title: section.title,
            description: section.description,
            sortOrder: sectionIndex,
          },
        })
      : await prisma.eventSection.create({
          data: {
            eventId,
            title: section.title,
            description: section.description,
            sortOrder: sectionIndex,
          },
        });

    const existingTicketTypeIdsInSection = sectionIsExisting
      ? new Set(
          existing.sections
            .find((s) => s.id === sectionRecord.id)
            ?.ticketTypes.map((t) => t.id) ?? []
        )
      : new Set<string>();

    const incomingIdsForSection = new Set(
      section.ticketTypes.map((tt) => tt.id).filter((id): id is string => Boolean(id))
    );

    const ticketTypeIdsToDelete = [...existingTicketTypeIdsInSection].filter(
      (id) => !incomingIdsForSection.has(id)
    );

    if (ticketTypeIdsToDelete.length > 0) {
      await prisma.ticketType.deleteMany({
        where: { id: { in: ticketTypeIdsToDelete } },
      });
    }

    for (const tt of section.ticketTypes) {
      const ticketTypeData = {
        title: tt.title,
        description: tt.description,
        perks: tt.perks,
        priceKobo: Math.round(tt.price * 100),
        quantity: tt.quantity,
        maxPerBuyer: tt.maxPerBuyer,
        ticketTemplateId: tt.ticketTemplateId || undefined,
        templateCustomization: tt.templateCustomization || undefined,
      };

      if (tt.id && existingTicketTypeIdsInSection.has(tt.id)) {
        await prisma.ticketType.update({
          where: { id: tt.id },
          data: ticketTypeData,
        });
      } else {
        await prisma.ticketType.create({
          data: { ...ticketTypeData, sectionId: sectionRecord.id },
        });
      }
    }
  }

  redirect(
    `/organizer/events/${eventId}?updated=true`
  );
}
