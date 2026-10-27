import { z } from "zod";

export const nomineeSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Every nominee needs a name").max(80),
  bio: z.string().max(500).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export const createCampaignSchema = z
  .object({
    title: z.string().trim().min(3, "Give your campaign a name (at least 3 characters)").max(120),
    description: z.string().max(2000).optional(),
    eventId: z.string().uuid().optional().or(z.literal("")),
    pricePerVote: z.coerce.number({ invalid_type_error: "Price must be a number" }).min(0, "Price can't be negative").max(1_000_000),
    // ISO strings built in the browser so the organizer's timezone is respected.
    startsAt: z.string().min(1, "Opening time is required").refine((v) => !Number.isNaN(Date.parse(v)), "Invalid opening time"),
    endsAt: z.string().min(1, "Closing time is required").refine((v) => !Number.isNaN(Date.parse(v)), "Invalid closing time"),
    nominees: z.array(nomineeSchema).min(2, "Add at least two nominees").max(200),
  })
  .refine((c) => Date.parse(c.endsAt) > Date.parse(c.startsAt), {
    message: "Voting must close after it opens",
    path: ["endsAt"],
  });

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const castVoteSchema = z.object({
  nomineeId: z.string().uuid("Invalid nominee"),
  voterEmail: z.string().trim().toLowerCase().email("Enter a valid email"),
  quantity: z.coerce.number().int().min(1, "Vote at least once").max(1000, "That's a lot of votes — try a smaller number"),
});

export type CastVoteInput = z.infer<typeof castVoteSchema>;
