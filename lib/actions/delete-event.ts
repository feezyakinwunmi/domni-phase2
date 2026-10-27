"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export async function deleteEvent(
  eventId: string
) {
  await prisma.ticketType.deleteMany({
    where: {
      section: {
        eventId,
      },
    },
  });

  await prisma.eventSection.deleteMany({
    where: {
      eventId,
    },
  });

  await prisma.event.delete({
    where: {
      id: eventId,
    },
  });

  redirect("/dashboard");
}