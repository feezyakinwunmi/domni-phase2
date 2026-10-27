import Link from "next/link";
import type { EventStatus, Prisma } from "@prisma/client";
import { ExternalLink, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE, pageParams } from "@/lib/admin";
import { formatDate, formatNaira } from "@/lib/format";
import { adminSetEventStatus, adminSetFeatured } from "@/lib/actions/admin";
import { ActionButton } from "@/components/admin/ActionButton";
import { Badge, Card, FilterBar, PageHeader, Pagination, STATUS_TONE, Table, Td } from "@/components/ui/panel";

type SP = { q?: string; status?: string; featured?: string; page?: string };
const STATUSES: EventStatus[] = ["PUBLISHED", "DRAFT", "ENDED", "CANCELLED"];

export default async function AdminEventsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { page, skip, take } = pageParams(sp.page);

  const where: Prisma.EventWhereInput = {
    ...(sp.q && {
      OR: [
        { title: { contains: sp.q, mode: "insensitive" } },
        { organizer: { email: { contains: sp.q, mode: "insensitive" } } },
        { schoolName: { contains: sp.q, mode: "insensitive" } },
      ],
    }),
    ...(sp.status && STATUSES.includes(sp.status as EventStatus) && { status: sp.status as EventStatus }),
    ...(sp.featured === "1" && { featured: true }),
  };

  const [total, events] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        organizer: { select: { id: true, email: true, fullName: true } },
        sections: { include: { ticketTypes: { select: { priceKobo: true, quantity: true, quantitySold: true } } } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader title="Events" description="Moderate, feature, or take down any event." />
      <Card>
        <FilterBar
          q={sp.q}
          placeholder="Search title, organizer email, school/organization"
          selects={[
            { name: "status", value: sp.status, options: [{ value: "", label: "All statuses" }, ...STATUSES.map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))] },
            { name: "featured", value: sp.featured, options: [{ value: "", label: "Featured & not" }, { value: "1", label: "Featured only" }] },
          ]}
        />
        <Table head={["Event", "Organizer", "Status", "Starts", "Sold", "Gross", "Actions"]} empty="No events match these filters.">
          {events.map((e) => {
            const tts = e.sections.flatMap((s) => s.ticketTypes);
            const sold = tts.reduce((n, t) => n + t.quantitySold, 0);
            const cap = tts.reduce((n, t) => n + t.quantity, 0);
            const gross = tts.reduce((n, t) => n + t.quantitySold * t.priceKobo, 0);
            return (
              <tr key={e.id} className="align-top">
                <Td className="max-w-[260px] whitespace-normal">
                  <span className="flex items-center gap-1.5 font-medium text-ink-800">
                    {e.featured && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-label="Featured" />}
                    {e.title}
                  </span>
                  {e.status === "PUBLISHED" && (
                    <Link href={`/events/${e.slug}`} target="_blank" className="mt-0.5 inline-flex items-center gap-1 text-xs text-violet-600 hover:underline">
                      Public page <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </Td>
                <Td>
                  <Link href={`/admin/users/${e.organizer.id}`} className="hover:text-violet-600">
                    {e.organizer.fullName || e.organizer.email}
                  </Link>
                </Td>
                <Td><Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge></Td>
                <Td>{formatDate(e.startsAt)}</Td>
                <Td>{sold} / {cap}</Td>
                <Td className="font-medium text-ink-800">{formatNaira(gross).replace("Free", "₦0")}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1.5">
                    <ActionButton action={adminSetFeatured.bind(null, e.id, !e.featured)}>{e.featured ? "Unfeature" : "Feature"}</ActionButton>
                    {e.status === "PUBLISHED" ? (
                      <ActionButton action={adminSetEventStatus.bind(null, e.id, "DRAFT")} tone="danger" confirm="Take this event offline (back to draft)?">
                        Take down
                      </ActionButton>
                    ) : (
                      e.status !== "CANCELLED" && (
                        <ActionButton action={adminSetEventStatus.bind(null, e.id, "PUBLISHED")} confirm="Publish this event on the organizer's behalf?">
                          Publish
                        </ActionButton>
                      )
                    )}
                    {e.status !== "CANCELLED" && (
                      <ActionButton action={adminSetEventStatus.bind(null, e.id, "CANCELLED")} tone="danger" confirm="Mark this event as cancelled? Ticket holders are NOT refunded automatically.">
                        Cancel
                      </ActionButton>
                    )}
                  </div>
                </Td>
              </tr>
            );
          })}
        </Table>
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/admin/events" params={{ q: sp.q, status: sp.status, featured: sp.featured }} />
      </Card>
    </>
  );
}
