import { prisma } from "@/lib/prisma";
import type { TicketTemplate } from "@/components/events/TicketTemplatePicker";

/** Ticket designs for the picker. Free designs first; never throws. */
export async function getTicketTemplates(): Promise<TicketTemplate[]> {
  try {
    const rows = await prisma.ticketTemplate.findMany({ orderBy: { createdAt: "asc" } });
    return rows
      .filter((r) => r.templateKey)
      .map((r) => ({ id: r.id, name: r.name, templateKey: r.templateKey!, isPremium: r.isPremium ?? false }))
      .sort((a, b) => Number(a.isPremium) - Number(b.isPremium));
  } catch (err) {
    console.error("[domni] failed to load ticket templates", err);
    return [];
  }
}
