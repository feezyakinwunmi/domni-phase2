import { z } from "zod";

/**
 * Organizer-editable labels and extra info for an event, stored in the
 * `events.details` JSON column. Every visible label on the public page and
 * checkout form comes from here, so "School" can become "Organization",
 * "Church", "Company"… without code changes.
 */
export const eventExtraSchema = z.object({
  id: z.string(),
  label: z.string().trim().min(1, "Give this detail a label").max(60),
  value: z.string().trim().min(1, "Fill in this detail or remove it").max(300),
});

export const eventDetailsSchema = z.object({
  hostLabel: z.string().trim().max(40).default("School"),
  venueLabel: z.string().trim().max(40).default("Venue"),
  nameLabel: z.string().trim().max(40).default("Full Name"),
  emailLabel: z.string().trim().max(40).default("Email"),
  extras: z.array(eventExtraSchema).max(20).default([]),
});

export type EventDetails = z.infer<typeof eventDetailsSchema>;
export type EventExtra = z.infer<typeof eventExtraSchema>;

export const DEFAULT_EVENT_DETAILS: EventDetails = {
  hostLabel: "School",
  venueLabel: "Venue",
  nameLabel: "Full Name",
  emailLabel: "Email",
  extras: [],
};

/** Never throws — bad/missing JSON falls back to defaults. */
export function parseEventDetails(raw: unknown): EventDetails {
  const parsed = eventDetailsSchema.safeParse(raw ?? {});
  if (!parsed.success) return DEFAULT_EVENT_DETAILS;
  const d = parsed.data;
  return {
    ...d,
    hostLabel: d.hostLabel || DEFAULT_EVENT_DETAILS.hostLabel,
    venueLabel: d.venueLabel || DEFAULT_EVENT_DETAILS.venueLabel,
    nameLabel: d.nameLabel || DEFAULT_EVENT_DETAILS.nameLabel,
    emailLabel: d.emailLabel || DEFAULT_EVENT_DETAILS.emailLabel,
  };
}

export const HOST_LABEL_PRESETS = [
  "School",
  "Organization",
  "Company",
  "Church",
  "Mosque",
  "Club",
  "Community",
  "Department",
  "Faculty",
  "Association",
  "Brand",
  "Hosted by",
] as const;

export const VENUE_LABEL_PRESETS = ["Venue", "Location", "Address", "Hall", "Online link", "Meeting point"] as const;

export const EXTRA_DETAIL_PRESETS = [
  "Dress code",
  "Age limit",
  "Theme",
  "Parking",
  "Contact",
  "Hashtag",
  "Gate opens",
  "Speakers",
  "Sponsors",
] as const;

// ---------------------------------------------------------------------------
// Registration (checkout) form fields
// ---------------------------------------------------------------------------

export const FIELD_TYPES = [
  "text",
  "textarea",
  "email",
  "phone",
  "number",
  "date",
  "url",
  "select",
  "radio",
  "checkbox",
  "photo",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Short answer",
  textarea: "Paragraph",
  email: "Email",
  phone: "Phone",
  number: "Number",
  date: "Date",
  url: "Link",
  select: "Dropdown",
  radio: "Single choice",
  checkbox: "Multiple choice",
  photo: "Photo upload",
};

export const CHOICE_TYPES: readonly FieldType[] = ["select", "radio", "checkbox"];

export function isChoiceType(type: string) {
  return (CHOICE_TYPES as readonly string[]).includes(type);
}

export interface FieldPreset {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  group: "basic" | "people" | "logistics";
}

export const FIELD_PRESETS: FieldPreset[] = [
  // basic building blocks
  { key: "text", label: "Short answer", type: "text", group: "basic" },
  { key: "textarea", label: "Paragraph", type: "textarea", group: "basic" },
  { key: "number", label: "Number", type: "number", group: "basic" },
  { key: "date", label: "Date", type: "date", group: "basic" },
  { key: "select", label: "Dropdown", type: "select", options: ["Option 1", "Option 2"], group: "basic" },
  { key: "radio", label: "Single choice", type: "radio", options: ["Yes", "No"], group: "basic" },
  { key: "checkbox", label: "Multiple choice", type: "checkbox", options: ["Option 1", "Option 2"], group: "basic" },
  { key: "url", label: "Link", type: "url", placeholder: "https://", group: "basic" },
  // people
  { key: "photo", label: "Profile photo", type: "photo", placeholder: "A clear photo of your face — it appears on your ticket", group: "people" },
  { key: "phone", label: "Phone number", type: "phone", placeholder: "080…", group: "people" },
  { key: "gender", label: "Gender", type: "select", options: ["Male", "Female", "Prefer not to say"], group: "people" },
  { key: "organization", label: "Organization", type: "text", placeholder: "Where do you work or study?", group: "people" },
  { key: "school", label: "School", type: "text", placeholder: "e.g. University of Lagos", group: "people" },
  { key: "department", label: "Department", type: "text", group: "people" },
  { key: "matric", label: "Matric number", type: "text", group: "people" },
  { key: "level", label: "Level", type: "select", options: ["100", "200", "300", "400", "500", "Postgraduate"], group: "people" },
  { key: "job", label: "Job title", type: "text", group: "people" },
  { key: "dob", label: "Date of birth", type: "date", group: "people" },
  { key: "socials", label: "Instagram handle", type: "text", placeholder: "@", group: "people" },
  // logistics
  { key: "tshirt", label: "T-shirt size", type: "select", options: ["S", "M", "L", "XL", "XXL"], group: "logistics" },
  { key: "dietary", label: "Dietary needs", type: "checkbox", options: ["Vegetarian", "Halal", "No nuts", "None"], group: "logistics" },
  { key: "emergency", label: "Emergency contact", type: "phone", group: "logistics" },
  { key: "referral", label: "How did you hear about us?", type: "select", options: ["Instagram", "X / Twitter", "WhatsApp", "A friend", "Other"], group: "logistics" },
  { key: "accessibility", label: "Accessibility needs", type: "textarea", group: "logistics" },
];

export interface RegistrationFieldDef {
  id: string;
  label: string;
  type: string;
  placeholder?: string | null;
  required: boolean;
  options: string[];
}

/** Legacy rows stored options as an array; anything else becomes []. */
export function normalizeOptions(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof raw === "string") return raw.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates attendee answers against the organizer's form definition.
 * Shared by the checkout modal (instant feedback) and the server (source of truth).
 * Keys of `answers` and of the returned errors are field ids; the built-in
 * name/email fields use the keys "__name" and "__email".
 */
export function validateRegistration(
  fields: RegistrationFieldDef[],
  input: { name: string; email: string; answers: Record<string, string> },
  labels: Pick<EventDetails, "nameLabel" | "emailLabel"> = DEFAULT_EVENT_DETAILS
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!input.name.trim()) errors.__name = `${labels.nameLabel} is required.`;
  else if (input.name.trim().length > 120) errors.__name = `${labels.nameLabel} is too long.`;

  if (!input.email.trim()) errors.__email = `${labels.emailLabel} is required.`;
  else if (!EMAIL_RE.test(input.email.trim())) errors.__email = "Enter a valid email address.";

  for (const field of fields) {
    const value = (input.answers[field.id] ?? "").trim();

    if (!value) {
      if (field.required) errors[field.id] = `${field.label} is required.`;
      continue;
    }

    if (value.length > 2000) {
      errors[field.id] = `${field.label} is too long.`;
      continue;
    }

    switch (field.type) {
      case "email":
        if (!EMAIL_RE.test(value)) errors[field.id] = "Enter a valid email address.";
        break;
      case "number":
        if (Number.isNaN(Number(value))) errors[field.id] = "Enter a number.";
        break;
      case "phone":
        if (!/^[+\d][\d\s()-]{6,19}$/.test(value)) errors[field.id] = "Enter a valid phone number.";
        break;
      case "photo":
        if (!isAttendeePhotoUrl(value)) errors[field.id] = "Upload the photo again.";
        break;
      case "url":
        if (!/^https?:\/\/\S+\.\S+/.test(value)) errors[field.id] = "Enter a full link starting with https://";
        break;
      case "select":
      case "radio":
        if (field.options.length && !field.options.includes(value)) errors[field.id] = "Pick one of the options.";
        break;
      case "checkbox": {
        const picked = value.split(",").map((s) => s.trim()).filter(Boolean);
        if (field.options.length && picked.some((p) => !field.options.includes(p))) {
          errors[field.id] = "Pick from the listed options.";
        }
        break;
      }
    }
  }

  return errors;
}

/** Only accept photos that went through our upload endpoint (not arbitrary URLs). */
export function isAttendeePhotoUrl(value: string) {
  return /^https:\/\/[^/]+\/storage\/v1\/object\/public\/attendee-photos\/[\w\-/.]+$/.test(value);
}

/** First photo answer, used as the ticket holder's picture. */
export function photoFromAnswers(fields: Pick<RegistrationFieldDef, "id" | "type">[], answers: Record<string, string>) {
  const field = fields.find((f) => f.type === "photo" && isAttendeePhotoUrl(answers[f.id] ?? ""));
  return field ? answers[field.id] : null;
}
