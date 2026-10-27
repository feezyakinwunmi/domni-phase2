import { Prisma } from "@prisma/client";
import type { ZodIssue } from "zod";

export type ActionResult<T = {}> =
  | ({ ok: true } & T)
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Prisma throws P2023 ("Error creating UUID") on malformed ids — check first. */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/**
 * Turns anything thrown by Prisma/Supabase/fetch into a message that is safe
 * and useful to show an end user. The raw error is always logged server-side.
 */
export function toUserMessage(err: unknown, fallback = "Something went wrong. Please try again."): string {
  console.error("[domni]", err);

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        return "That record already exists. Please refresh and try again.";
      case "P2003":
        return "This item is still linked to other records (e.g. sold tickets) and can't be changed that way.";
      case "P2023":
        return "That link looks invalid or incomplete.";
      case "P2025":
        return "We couldn't find that record — it may have been deleted.";
      case "P2021":
      case "P2022":
        return "The database is out of date with the app. Run `npx prisma db push` and restart the server.";
      case "P2024":
        return "The database is busy right now. Please try again in a moment.";
      case "P2028":
        return "The save took too long and was cancelled. Please try again.";
      case "P1001":
      case "P1002":
      case "P1017":
        return "Can't reach the database right now. Check your connection and try again.";
    }
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    return "Can't connect to the database. Check DATABASE_URL and that your Supabase project isn't paused.";
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return "Some of the submitted data was invalid.";
  }

  const message = err instanceof Error ? err.message : "";
  if (/prepared statement .* (already exists|does not exist)/i.test(message)) {
    return "Database connection hiccup. Please try again.";
  }
  if (/fetch failed|ENOTFOUND|ECONNRESET|ETIMEDOUT/i.test(message)) {
    return "Network problem — please check your connection and try again.";
  }

  return fallback;
}

/** "sections.0.ticketTypes.1.title" → "Section 1 › Ticket 2: Ticket name is required" */
export function formatZodIssue(issue: ZodIssue | undefined): string {
  if (!issue) return "Please check the form for errors.";

  const crumbs: string[] = [];
  for (let i = 0; i < issue.path.length; i++) {
    const key = issue.path[i];
    const next = issue.path[i + 1];
    if (typeof next !== "number") continue;
    if (key === "sections") crumbs.push(`Section ${next + 1}`);
    if (key === "ticketTypes") crumbs.push(`Ticket ${next + 1}`);
    if (key === "registrationFields") crumbs.push(`Form field ${next + 1}`);
    if (key === "extras") crumbs.push(`Detail ${next + 1}`);
  }

  return crumbs.length ? `${crumbs.join(" › ")}: ${issue.message}` : issue.message;
}
