"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createEventComment(formData: FormData) {
  const eventId = String(formData.get("eventId"));
  const name = String(formData.get("name"));
  const message = String(formData.get("message"));
  const parentId = formData.get("parentId")
    ? String(formData.get("parentId"))
    : null;

  if (!message.trim()) {
    throw new Error("Comment is required");
  }

  await prisma.event_comments.create({
    data: {
      id: crypto.randomUUID(),
      eventId,
      name: name || "Anonymous",
      message,
      parentId,
    },
  });

  revalidatePath("/events");
}