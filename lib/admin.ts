import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

/**
 * An admin is a profile with role ADMIN, or an email listed in ADMIN_EMAILS
 * (comma-separated) — the env list is how the first admin gets in.
 */
export async function getAdmin() {
  const user = await getCurrentUser();
  if (!user) return null;

  const allowList = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { id: true, email: true, fullName: true, role: true },
  });

  const email = (profile?.email ?? user.email ?? "").toLowerCase();
  if (profile?.role === "ADMIN" || (email && allowList.includes(email))) {
    return { id: user.id, email, name: profile?.fullName ?? email };
  }
  return null;
}

/** For admin pages: 404 (not 403) so the panel's existence isn't revealed. */
export async function requireAdminPage() {
  const admin = await getAdmin();
  if (!admin) notFound();
  return admin;
}

export const PAGE_SIZE = 25;

export function pageParams(raw: string | undefined) {
  const page = Math.max(1, Number.parseInt(raw ?? "1", 10) || 1);
  return { page, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE };
}

/** Daily totals for the last `days` days in Lagos time, gaps filled with 0. */
export function fillDays(rows: { day: string; value: number }[], days = 30) {
  const map = new Map(rows.map((r) => [r.day, r.value]));
  const out: { day: string; value: number }[] = [];
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" });
  for (let i = days - 1; i >= 0; i--) {
    const key = fmt.format(new Date(Date.now() - i * 86_400_000));
    out.push({ day: key, value: map.get(key) ?? 0 });
  }
  return out;
}

export { compactNaira } from "@/lib/admin-format";
