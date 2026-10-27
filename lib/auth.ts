import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/errors";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Resolves the signed-in user and confirms they own `eventId`.
 * Every organizer mutation goes through this — never trust an id from the client.
 */
export async function requireEventOwner(eventId: string) {
  const user = await getCurrentUser();
  if (!user) return { ok: false as const, error: "You need to be logged in." };
  if (!isUuid(eventId)) return { ok: false as const, error: "Event not found." };

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, organizerId: true, status: true },
  });

  if (!event) return { ok: false as const, error: "Event not found." };
  if (event.organizerId !== user.id) {
    return { ok: false as const, error: "You don't have permission to manage this event." };
  }

  return { ok: true as const, user, event };
}
