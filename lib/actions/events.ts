"use server";

import { redirect } from "next/navigation";
import { createEventSchema } from "@/lib/validations/event";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type EventActionState = { error?: string } | null;

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2, 7)
  );
}

export async function createEvent(
  _prevState: EventActionState,
  formData: FormData
): Promise<EventActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "You need to be logged in to create an event." };

  const raw = formData.get("payload");
  if (typeof raw !== "string") return { error: "Missing event data." };

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { error: "Couldn't read the event form data." };
  }

  const parsed = createEventSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form for errors." };
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

const event = await prisma.event.create({
  data: {
    organizerId: user.id,
    title,
    slug: slugify(title),
    description,
    venue,
    schoolName,
    coverImage: coverImageUrl || null,
    startsAt: new Date(startsAt),
    endsAt: endsAt ? new Date(endsAt) : null,
    status: "DRAFT",

    registrationFields: {
      create: registrationFields.map((field, index) => ({
        label: field.label,
        type: field.type,
        fieldType: field.type,
        placeholder: field.placeholder,
        required: field.required,
        options: field.options
          ? field.options
              .split(",")
              .map((x) => x.trim())
              .filter(Boolean)
          : undefined,
        sortOrder: index,
      })),
    },

    sections: {
      create: sections.map((section, sectionIndex) => ({
        title: section.title,
        description: section.description,
        sortOrder: sectionIndex,

        ticketTypes: {
          create: section.ticketTypes.map((tt) => ({
            title: tt.title,
            description: tt.description,
            perks: tt.perks,
            priceKobo: Math.round(tt.price * 100),
            quantity: tt.quantity,
            maxPerBuyer: tt.maxPerBuyer,
            ticketTemplateId: tt.ticketTemplateId || undefined,
            templateCustomization: tt.templateCustomization || undefined,
          })),
        },
      })),
    },
  },

  select: {
    id: true,
    slug: true,
  },
});

  redirect(`/organizer/events/${event.id}?created=true`);
}
