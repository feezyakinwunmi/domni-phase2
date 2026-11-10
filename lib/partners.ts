import { z } from "zod";

export const PARTNER_CATEGORIES = ["SPONSORSHIP", "EXHIBITION", "ADVERTISING", "VENDOR", "OTHER"] as const;
export type PartnerCategory = (typeof PARTNER_CATEGORIES)[number];

export const CATEGORY_META: Record<PartnerCategory, { label: string; plural: string; blurb: string }> = {
  SPONSORSHIP: { label: "Sponsorship", plural: "Sponsorship packages", blurb: "Put your brand at the heart of the event." },
  EXHIBITION: { label: "Exhibition", plural: "Exhibition stands", blurb: "Meet attendees face to face at your own stand." },
  ADVERTISING: { label: "Advertising", plural: "Advertising & logo placement", blurb: "Get seen on banners, screens, tickets and socials." },
  VENDOR: { label: "Vendor", plural: "Vendor & food stalls", blurb: "Sell your products or food to attendees on the day." },
  OTHER: { label: "Other", plural: "Other opportunities", blurb: "More ways to be part of the event." },
};

export const PRICING_MODELS = ["FIXED", "PER_SQM", "PER_UNIT", "ON_REQUEST"] as const;
export type PricingModel = (typeof PRICING_MODELS)[number];

export const PRICING_LABELS: Record<PricingModel, string> = {
  FIXED: "Fixed price",
  PER_SQM: "Per square metre",
  PER_UNIT: "Per unit (stand, slot…)",
  ON_REQUEST: "Price on request",
};

export const APPLICATION_STATUSES = ["PENDING", "APPROVED", "AWAITING_PAYMENT", "PAID", "REJECTED", "CANCELLED"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: "Under review",
  APPROVED: "Approved — awaiting payment",
  AWAITING_PAYMENT: "Awaiting payment",
  PAID: "Confirmed",
  REJECTED: "Not accepted",
  CANCELLED: "Cancelled",
};

/** Statuses whose partner counts as "in" (shown on the event page / tickets). */
export const CONFIRMED_STATUSES: ApplicationStatus[] = ["PAID"];

export interface PartnerPackageLike {
  pricingModel: string;
  priceKobo: number;
  unitLabel?: string | null;
  minUnits: number;
  maxUnits?: number | null;
}

export function unitNoun(pkg: Pick<PartnerPackageLike, "pricingModel" | "unitLabel">, count = 2) {
  if (pkg.pricingModel === "PER_SQM") return count === 1 ? "m²" : "m²";
  const label = pkg.unitLabel?.trim() || "unit";
  return count === 1 ? label : label.endsWith("s") ? label : `${label}s`;
}

/** True when the buyer picks a quantity (area or number of units). */
export function hasUnits(pkg: Pick<PartnerPackageLike, "pricingModel">) {
  return pkg.pricingModel === "PER_SQM" || pkg.pricingModel === "PER_UNIT";
}

export function priceFor(pkg: PartnerPackageLike, units: number) {
  if (pkg.pricingModel === "ON_REQUEST") return null;
  return hasUnits(pkg) ? pkg.priceKobo * units : pkg.priceKobo;
}

/** Validates a requested quantity against the package limits and remaining capacity. */
export function unitsProblem(
  pkg: PartnerPackageLike & { quantity?: number | null; quantityTaken?: number },
  units: number
): string | null {
  if (!Number.isInteger(units) || units < 1) return "Enter a valid quantity.";
  if (!hasUnits(pkg)) return units === 1 ? null : "This package is booked as one unit.";
  const noun = unitNoun(pkg);
  if (units < pkg.minUnits) return `The minimum is ${pkg.minUnits} ${noun}.`;
  if (pkg.maxUnits && units > pkg.maxUnits) return `The maximum is ${pkg.maxUnits} ${noun}.`;
  if (pkg.quantity != null) {
    const left = pkg.quantity - (pkg.quantityTaken ?? 0);
    if (units > left) return left > 0 ? `Only ${left} ${noun} left.` : "This package is fully booked.";
  }
  return null;
}

export function remainingOf(pkg: { quantity?: number | null; quantityTaken: number }) {
  return pkg.quantity == null ? null : Math.max(0, pkg.quantity - pkg.quantityTaken);
}

// ---------------------------------------------------------------------------
// Presets organizers can start from ("pick and use")
// ---------------------------------------------------------------------------

export interface PackagePreset {
  key: string;
  category: PartnerCategory;
  title: string;
  description: string;
  pricingModel: PricingModel;
  price: number; // naira
  unitLabel?: string;
  minUnits?: number;
  maxUnits?: number;
  quantity?: number;
  benefits: string[];
  highlight?: boolean;
  logoOnTicket?: boolean;
  requiresApproval?: boolean;
}

export const PACKAGE_PRESETS: PackagePreset[] = [
  {
    key: "headline",
    category: "SPONSORSHIP",
    title: "Headline Sponsor",
    description: "Exclusive top billing — the event is presented by your brand.",
    pricingModel: "ON_REQUEST",
    price: 0,
    quantity: 1,
    highlight: true,
    logoOnTicket: true,
    benefits: ["“Presented by” naming rights", "Largest logo on all banners & screens", "Logo on every attendee ticket", "5-minute stage address", "Premium exhibition space", "10 VIP passes"],
  },
  {
    key: "gold",
    category: "SPONSORSHIP",
    title: "Gold Sponsor",
    description: "Prominent brand visibility before, during and after the event.",
    pricingModel: "FIXED",
    price: 500000,
    quantity: 3,
    highlight: true,
    logoOnTicket: true,
    benefits: ["Logo on main stage banner", "Logo on attendee tickets", "Exhibition stand included", "3 social media features", "5 VIP passes"],
  },
  {
    key: "silver",
    category: "SPONSORSHIP",
    title: "Silver Sponsor",
    description: "Strong presence with logo placement and shout-outs.",
    pricingModel: "FIXED",
    price: 250000,
    quantity: 5,
    benefits: ["Logo on sponsor wall", "MC shout-out", "1 social media feature", "3 regular passes"],
  },
  {
    key: "bronze",
    category: "SPONSORSHIP",
    title: "Bronze Sponsor",
    description: "An affordable way to support the event and get noticed.",
    pricingModel: "FIXED",
    price: 100000,
    benefits: ["Logo on event page", "Thank-you post on socials", "2 regular passes"],
  },
  {
    key: "booth",
    category: "EXHIBITION",
    title: "Standard Booth (3m × 3m)",
    description: "Shell scheme booth with a table, two chairs and power.",
    pricingModel: "PER_UNIT",
    price: 75000,
    unitLabel: "booth",
    maxUnits: 4,
    quantity: 20,
    requiresApproval: false,
    benefits: ["9m² space", "1 table & 2 chairs", "Power socket", "Listing in event guide", "2 exhibitor passes"],
  },
  {
    key: "space",
    category: "EXHIBITION",
    title: "Raw Exhibition Space",
    description: "Bring your own setup. Pay only for the floor area you need.",
    pricingModel: "PER_SQM",
    price: 10000,
    minUnits: 9,
    maxUnits: 100,
    quantity: 400,
    benefits: ["Choose your own size", "Bring your own branding & furniture", "Exhibitor passes by size"],
  },
  {
    key: "ticketlogo",
    category: "ADVERTISING",
    title: "Logo on Tickets",
    description: "Your logo printed on every ticket attendees download and carry.",
    pricingModel: "FIXED",
    price: 80000,
    quantity: 4,
    logoOnTicket: true,
    benefits: ["Logo on every attendee ticket", "Logo on event page sponsor wall"],
  },
  {
    key: "banner",
    category: "ADVERTISING",
    title: "Banner Placement",
    description: "A roll-up or wall banner in a high-traffic spot at the venue.",
    pricingModel: "PER_UNIT",
    price: 30000,
    unitLabel: "banner",
    maxUnits: 5,
    quantity: 15,
    benefits: ["Prime location at the venue", "You supply the banner"],
  },
  {
    key: "social",
    category: "ADVERTISING",
    title: "Social Media Shout-out",
    description: "Dedicated posts about your brand on the event's social channels.",
    pricingModel: "PER_UNIT",
    price: 15000,
    unitLabel: "post",
    maxUnits: 10,
    requiresApproval: false,
    benefits: ["Feature post with your content", "Tagged in stories"],
  },
  {
    key: "food",
    category: "VENDOR",
    title: "Food & Drinks Stall",
    description: "Sell food and drinks to attendees throughout the event.",
    pricingModel: "FIXED",
    price: 40000,
    quantity: 10,
    benefits: ["Stall space in the food court", "Access from setup to close", "2 vendor passes"],
  },
  {
    key: "merch",
    category: "VENDOR",
    title: "Merchandise Stall",
    description: "Sell your products to an engaged audience.",
    pricingModel: "FIXED",
    price: 30000,
    quantity: 10,
    benefits: ["Table space in the marketplace", "2 vendor passes"],
  },
];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export const partnerPackageSchema = z
  .object({
    id: z.string().optional(),
    category: z.enum(PARTNER_CATEGORIES),
    title: z.string().trim().min(1, "Every partner package needs a name").max(80),
    description: z.string().max(500).optional(),
    benefits: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
    pricingModel: z.enum(PRICING_MODELS),
    price: z.coerce.number({ invalid_type_error: "Price must be a number" }).min(0, "Price can't be negative").max(100_000_000),
    unitLabel: z.string().trim().max(20).optional(),
    minUnits: z.coerce.number().int().min(1).default(1),
    maxUnits: z.coerce.number().int().min(1).optional(),
    quantity: z.coerce.number().int().min(1, "Availability must be at least 1").max(1_000_000).optional(),
    requiresApproval: z.boolean().default(true),
    highlight: z.boolean().default(false),
    logoOnTicket: z.boolean().default(false),
    showOnEventPage: z.boolean().default(true),
  })
  .refine((p) => p.pricingModel === "ON_REQUEST" || p.price > 0 || p.requiresApproval, {
    message: "Free packages must be set to 'Review applications first'",
    path: ["requiresApproval"],
  })
  .refine((p) => !p.maxUnits || p.maxUnits >= p.minUnits, { message: "Maximum must be at least the minimum", path: ["maxUnits"] });

export type PartnerPackageInput = z.infer<typeof partnerPackageSchema>;

export const partnerApplicationSchema = z.object({
  packageId: z.string().uuid("This package is no longer available"),
  companyName: z.string().trim().min(2, "Enter your company or brand name").max(120),
  contactName: z.string().trim().min(2, "Enter a contact person").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .max(20)
    .refine((v) => !v || /^[+\d][\d\s()-]{6,19}$/.test(v), "Enter a valid phone number")
    .optional(),
  website: z
    .string()
    .trim()
    .max(200)
    .refine((v) => !v || /^https?:\/\/\S+\.\S+/.test(v), "Website must start with https://")
    .optional(),
  logoUrl: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(1000).optional(),
  units: z.coerce.number().int().min(1).default(1),
});

export type PartnerApplicationInput = z.infer<typeof partnerApplicationSchema>;

/** Only accept logos uploaded through our endpoint. */
export function isPartnerLogoUrl(value: string) {
  return /^https:\/\/[^/]+\/storage\/v1\/object\/public\/partner-logos\/[\w\-/.]+$/.test(value);
}
