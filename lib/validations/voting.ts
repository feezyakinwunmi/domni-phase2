import { z } from "zod";

export const nomineeSchema = z.object({
  name: z.string().min(1, "Nominee name is required"),
  bio: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export const createCampaignSchema = z.object({
  title: z.string().min(3, "Give your campaign a name"),
  description: z.string().optional(),
  eventId: z.string().uuid().optional().or(z.literal("")),
  pricePerVote: z.coerce.number().min(0, "Price can't be negative"),
  startsAt: z.string().min(1, "Start date is required"),
  endsAt: z.string().min(1, "End date is required"),
  nominees: z.array(nomineeSchema).min(2, "Add at least two nominees"),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const castVoteSchema = z.object({
  nomineeId: z.string().uuid(),
  voterEmail: z.string().email("Enter a valid email"),
  quantity: z.coerce.number().int().min(1, "Vote at least once").max(1000, "That's a lot of votes — try a smaller number"),
});

export type CastVoteInput = z.infer<typeof castVoteSchema>;