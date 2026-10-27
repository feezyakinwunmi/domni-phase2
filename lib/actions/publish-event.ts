"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function publishEvent(eventId: string) {
  await prisma.event.update({
    where: {
      id: eventId,
    },
    data: {
      status: "PUBLISHED",
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(`/organizer/events/${eventId}`);
}