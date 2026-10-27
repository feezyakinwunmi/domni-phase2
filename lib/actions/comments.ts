"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getAdmin } from "@/lib/admin";
import { isUuid, toUserMessage, type ActionResult } from "@/lib/errors";

export type CommentDTO = {
  id: string;
  name: string;
  message: string;
  createdAt: string;
  isOrganizer: boolean;
  replies: CommentDTO[];
};

export type CommentViewer = {
  /** Display name when signed in; null for guests (who type a name). */
  name: string | null;
  isOrganizer: boolean;
  canModerate: boolean;
};

const MAX_MESSAGE = 1000;
const MAX_NAME = 50;

// Best-effort flood control per IP (per server instance).
const recentPosts = new Map<string, number[]>();
function tooManyPosts(key: string) {
  const now = Date.now();
  const hits = (recentPosts.get(key) ?? []).filter((t) => now - t < 60_000);
  hits.push(now);
  recentPosts.set(key, hits);
  if (recentPosts.size > 5000) recentPosts.clear();
  return hits.length > 5;
}

function toDTO(c: { id: string; name: string; message: string; createdAt: Date; isOrganizerReply: boolean }): Omit<CommentDTO, "replies"> {
  return { id: c.id, name: c.name, message: c.message, createdAt: c.createdAt.toISOString(), isOrganizer: c.isOrganizerReply };
}

async function viewerFor(eventOrganizerId: string): Promise<CommentViewer> {
  const user = await getCurrentUser();
  if (!user) return { name: null, isOrganizer: false, canModerate: false };

  const [profile, admin] = await Promise.all([
    prisma.profile.findUnique({ where: { id: user.id }, select: { fullName: true, email: true } }),
    getAdmin(),
  ]);
  const isOrganizer = user.id === eventOrganizerId;
  return {
    name: profile?.fullName || (user.user_metadata?.full_name as string | undefined) || (profile?.email ?? user.email ?? "User").split("@")[0],
    isOrganizer,
    canModerate: isOrganizer || !!admin,
  };
}

/** Loaded when the comments panel opens, so event lists don't fetch every thread up front. */
export async function getEventComments(
  eventId: string
): Promise<ActionResult<{ comments: CommentDTO[]; total: number; viewer: CommentViewer }>> {
  try {
    if (!isUuid(eventId)) return { ok: false, error: "Event not found." };

    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { organizerId: true } });
    if (!event) return { ok: false, error: "Event not found." };

    const [rows, total, viewer] = await Promise.all([
      prisma.event_comments.findMany({
        where: { eventId, parentId: null },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: { other_event_comments: { orderBy: { createdAt: "asc" } } },
      }),
      prisma.event_comments.count({ where: { eventId } }),
      viewerFor(event.organizerId),
    ]);

    return {
      ok: true,
      total,
      viewer,
      comments: rows.map((c) => ({ ...toDTO(c), replies: c.other_event_comments.map((r) => ({ ...toDTO(r), replies: [] })) })),
    };
  } catch (err) {
    return { ok: false, error: toUserMessage(err, "Couldn't load comments.") };
  }
}

export async function createEventComment(input: {
  eventId: string;
  parentId?: string | null;
  name?: string;
  message: string;
  /** Honeypot — real users never fill this hidden field. */
  website?: string;
}): Promise<ActionResult<{ comment: CommentDTO }>> {
  try {
    const message = String(input?.message ?? "").trim();
    if (input?.website) return { ok: false, error: "Couldn't post your comment." };
    if (!isUuid(input?.eventId)) return { ok: false, error: "Event not found." };
    if (!message) return { ok: false, error: "Write something first." };
    if (message.length > MAX_MESSAGE) return { ok: false, error: `Comments can be at most ${MAX_MESSAGE} characters.` };

    const event = await prisma.event.findUnique({
      where: { id: input.eventId },
      select: { organizerId: true, status: true, slug: true },
    });
    if (!event || event.status !== "PUBLISHED") return { ok: false, error: "Comments are closed for this event." };

    const viewer = await viewerFor(event.organizerId);
    const name = (viewer.name ?? String(input.name ?? "")).trim().slice(0, MAX_NAME);
    if (!name) return { ok: false, error: "Add your name so people know who's asking." };
    // Guests can't pose as the organizer.
    if (!viewer.isOrganizer && /\b(organi[sz]er|admin|domni)\b/i.test(name)) {
      return { ok: false, error: "Please use your own name." };
    }

    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (tooManyPosts(`${ip}:${input.eventId}`)) return { ok: false, error: "You're posting too fast. Wait a minute and try again." };

    let parentId: string | null = null;
    if (input.parentId) {
      if (!isUuid(input.parentId)) return { ok: false, error: "That comment no longer exists." };
      const parent = await prisma.event_comments.findUnique({ where: { id: input.parentId }, select: { eventId: true, parentId: true } });
      if (!parent || parent.eventId !== input.eventId) return { ok: false, error: "That comment no longer exists." };
      // One level of threading: replying to a reply attaches to its parent.
      parentId = parent.parentId ?? input.parentId;
    }

    const created = await prisma.event_comments.create({
      data: { id: randomUUID(), eventId: input.eventId, parentId, name, message, isOrganizerReply: viewer.isOrganizer },
    });

    revalidatePath("/events");
    revalidatePath(`/events/${event.slug}`);
    return { ok: true, comment: { ...toDTO(created), replies: [] } };
  } catch (err) {
    return { ok: false, error: toUserMessage(err, "Couldn't post your comment. Please try again.") };
  }
}

/** The event's organizer (or an admin) can remove a comment and its replies. */
export async function deleteEventComment(commentId: string): Promise<ActionResult> {
  try {
    if (!isUuid(commentId)) return { ok: false, error: "Comment not found." };
    const comment = await prisma.event_comments.findUnique({
      where: { id: commentId },
      select: { events: { select: { organizerId: true, slug: true } } },
    });
    if (!comment) return { ok: false, error: "Comment not found." };

    const viewer = await viewerFor(comment.events.organizerId);
    if (!viewer.canModerate) return { ok: false, error: "You can't delete this comment." };

    await prisma.event_comments.delete({ where: { id: commentId } });
    revalidatePath("/events");
    revalidatePath(`/events/${comment.events.slug}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: toUserMessage(err, "Couldn't delete the comment.") };
  }
}
