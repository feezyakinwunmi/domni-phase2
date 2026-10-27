"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { toUserMessage, type ActionResult } from "@/lib/errors";

const profileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name (at least 2 characters)").max(80),
  phone: z
    .string()
    .trim()
    .max(20)
    .refine((v) => !v || /^[+\d][\d\s()-]{6,19}$/.test(v), "Enter a valid phone number"),
});

export async function updateProfile(input: { fullName: string; phone: string }): Promise<ActionResult> {
  try {
    const user = await getCurrentUser();
    if (!user) return { ok: false, error: "You need to be logged in." };

    const parsed = profileSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

    await prisma.profile.update({
      where: { id: user.id },
      data: { fullName: parsed.data.fullName, phone: parsed.data.phone || null },
    });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toUserMessage(err, "Couldn't save your profile.") };
  }
}
