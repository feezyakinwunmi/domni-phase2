import { z } from "zod";

export const ticketTemplateCustomizationSchema = z.object({
  logoUrl: z.string().url().optional(),
  accentColor: z.string().optional(),
  particleOverlay: z.enum(["none", "dots", "geometric", "confetti"]).optional(),
});

export const ticketTypeSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Ticket name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  quantity: z.coerce.number().int().min(1),
  maxPerBuyer: z.coerce.number().int().min(1).optional(),
  perks: z.array(z.string()).default([]),
  ticketTemplateId: z.string().uuid().nullable().optional(),
  templateCustomization: ticketTemplateCustomizationSchema.nullable().optional(),
});

export const eventSectionSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, "Section name is required"),
  description: z.string().optional(),
  ticketTypes: z
    .array(ticketTypeSchema)
    .min(1, "Add at least one ticket type"),
});

export const registrationFieldSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  type: z.enum([
    "text",
    "email",
    "phone",
    "number",
    "textarea",
    "select",
    "date",
  ]),
  placeholder: z.string().optional(),
  required: z.boolean(),
  options: z.string().optional(),
});

export const createEventSchema = z.object({
  title: z.string().min(3, "Give your event a name"),
  description: z.string().optional(),
  venue: z.string().optional(),
  schoolName: z.string().optional(),
  coverImageUrl: z.string().url().optional().or(z.literal("")),
  startsAt: z.string().min(1, "Start date is required"),
  endsAt: z.string().optional(),

  sections: z
    .array(eventSectionSchema)
    .min(1, "Add at least one section"),

  registrationFields: z
    .array(registrationFieldSchema)
    .default([]),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type TicketTypeInput = z.infer<typeof ticketTypeSchema>;
export type EventSectionInput = z.infer<typeof eventSectionSchema>;
export type RegistrationFieldInput = z.infer<
  typeof registrationFieldSchema
>;