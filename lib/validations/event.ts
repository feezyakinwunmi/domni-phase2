import { z } from "zod";
import { eventDetailsSchema, FIELD_TYPES, isChoiceType } from "@/lib/event-details";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #7c3aed");

export const ticketTemplateCustomizationSchema = z.object({
  logoUrl: z.string().url().optional(),
  accentColor: hexColor.optional(),
  secondaryColor: hexColor.optional(),
  particleOverlay: z.enum(["none", "dots", "geometric", "confetti", "waves", "stars"]).optional(),
  fontStyle: z.enum(["default", "serif", "mono", "display"]).optional(),
  finish: z.enum(["none", "gloss", "foil", "grain"]).optional(),
  headline: z.string().trim().max(32).optional(),
  footerNote: z.string().trim().max(120).optional(),
  showDate: z.boolean().optional(),
  showVenue: z.boolean().optional(),
  showExtraFields: z.boolean().optional(),
  showTicketNumber: z.boolean().optional(),
});

export const ticketTypeSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Ticket name is required").max(80),
  description: z.string().max(500).optional(),
  price: z.coerce.number({ invalid_type_error: "Price must be a number" }).min(0, "Price can't be negative").max(10_000_000),
  quantity: z.coerce
    .number({ invalid_type_error: "Quantity must be a number" })
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(1_000_000),
  maxPerBuyer: z.coerce.number().int().min(1, "Max per buyer must be at least 1").max(100).optional(),
  perks: z.array(z.string().trim().max(60)).max(20).default([]),
  ticketTemplateId: z.string().uuid().nullable().optional(),
  templateCustomization: ticketTemplateCustomizationSchema.nullable().optional(),
});

export const eventSectionSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Section name is required").max(80),
  description: z.string().max(500).optional(),
  ticketTypes: z.array(ticketTypeSchema).min(1, "Add at least one ticket type"),
});

export const registrationFieldSchema = z
  .object({
    id: z.string().optional(),
    label: z.string().trim().min(1, "Every form field needs a label").max(80),
    type: z.enum(FIELD_TYPES),
    placeholder: z.string().max(120).optional(),
    required: z.boolean(),
    // Accept the legacy comma-separated string too.
    options: z
      .union([z.array(z.string()), z.string()])
      .optional()
      .transform((v) =>
        (Array.isArray(v) ? v : (v ?? "").split(","))
          .map((s) => s.replace(/,/g, " ").trim())
          .filter(Boolean)
      ),
  })
  .refine((f) => !isChoiceType(f.type) || f.options.length >= 1, {
    message: "Choice fields need at least one option",
    path: ["options"],
  });

export const createEventSchema = z
  .object({
    title: z.string().trim().min(3, "Give your event a name (at least 3 characters)").max(120),
    description: z.string().max(5000).optional(),
    venue: z.string().max(200).optional(),
    schoolName: z.string().max(120).optional(),
    coverImageUrl: z.string().url().optional().or(z.literal("")),
    // ISO strings built in the browser so the organizer's timezone is respected.
    startsAt: z.string().min(1, "Start date is required").refine((v) => !Number.isNaN(Date.parse(v)), "Invalid start date"),
    endsAt: z
      .string()
      .optional()
      .refine((v) => !v || !Number.isNaN(Date.parse(v)), "Invalid end date"),
    details: eventDetailsSchema.default({}),
    sections: z.array(eventSectionSchema).min(1, "Add at least one section"),
    registrationFields: z
      .array(registrationFieldSchema)
      .max(40)
      .default([])
      .refine((fields) => fields.filter((f) => f.type === "photo").length <= 1, "Only one photo field is allowed per form"),
  })
  .refine((e) => !e.endsAt || Date.parse(e.endsAt) > Date.parse(e.startsAt), {
    message: "The end time must be after the start time",
    path: ["endsAt"],
  });

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type TicketTypeInput = z.infer<typeof ticketTypeSchema>;
export type EventSectionInput = z.infer<typeof eventSectionSchema>;
export type RegistrationFieldInput = z.infer<typeof registrationFieldSchema>;
