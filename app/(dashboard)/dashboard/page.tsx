import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CalendarPlus, Check, Circle, MapPin, Vote } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { compactNaira, fillDays } from "@/lib/admin";
import { formatDate, formatNaira, formatTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { ColumnChart } from "@/components/ui/column-chart";
import { Badge, Card, StatTile, STATUS_TONE } from "@/components/ui/panel";

export default async function DashboardOverviewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const since30 = new Date(Date.now() - 30 * 86_400_000);
  const since7 = new Date(Date.now() - 7 * 86_400_000);

  const [profile, events, campaignCount, registrations7, salesRows] = await Promise.all([
    prisma.profile.findUnique({ where: { id: user.id }, select: { fullName: true, paystackSubaccountCode: true } }),
    prisma.event.findMany({
      where: { organizerId: user.id },
      orderBy: { startsAt: "asc" },
      include: { sections: { include: { ticketTypes: { select: { priceKobo: true, quantity: true, quantitySold: true } } } } },
    }),
    prisma.votingCampaign.count({ where: { organizerId: user.id } }),
    prisma.ticket.count({ where: { createdAt: { gte: since7 }, ticketType: { section: { event: { organizerId: user.id } } } } }),
    prisma.$queryRaw<{ day: string; value: bigint }[]>`
      SELECT to_char((t."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Lagos', 'YYYY-MM-DD') AS day,
             SUM(t."amountKobo")::bigint AS value
      FROM "transactions" t
      JOIN "ticket_types" tt ON tt.id::text = t.metadata->>'ticketTypeId'
      JOIN "event_sections" s ON s.id = tt."sectionId"
      JOIN "events" e ON e.id = s."eventId"
      WHERE e."organizerId" = ${user.id}::uuid AND t.status = 'SUCCESSFUL' AND t."amountKobo" > 0
        AND t."createdAt" >= ${since30}
      GROUP BY 1`,
  ]);

  const now = new Date();
  const ticketTypes = events.flatMap((e) => e.sections.flatMap((s) => s.ticketTypes));
  const sold = ticketTypes.reduce((n, t) => n + t.quantitySold, 0);
  const gross = ticketTypes.reduce((n, t) => n + t.quantitySold * t.priceKobo, 0);
  const upcoming = events.filter((e) => (e.endsAt ?? e.startsAt) >= now && e.status !== "CANCELLED");
  const past = events.filter((e) => (e.endsAt ?? e.startsAt) < now || e.status === "CANCELLED").reverse();
  const sales = fillDays(salesRows.map((r) => ({ day: r.day, value: Number(r.value) })));

  const hasPaid = ticketTypes.some((t) => t.priceKobo > 0);
  const checklist = [
    { done: events.length > 0, label: "Create your first event", href: "/organizer/events/new" },
    { done: !!profile?.paystackSubaccountCode, label: "Connect your payout bank account", href: "/organizer/settings#payouts", optional: !hasPaid },
    { done: events.some((e) => e.status === "PUBLISHED"), label: "Publish an event and share the link", href: events[0] ? `/organizer/events/${events[0].id}` : "/organizer/events/new" },
  ];
  const showChecklist = checklist.some((c) => !c.done);
  const firstName = (profile?.fullName || user.email || "").split(/[\s@]/)[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-violet-600">{now.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Lagos" })}</p>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight text-ink-800">Welcome back{firstName ? `, ${firstName}` : ""}</h1>
          <p className="mt-1.5 text-sm text-slate-500">Here's how your events are doing.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/organizer/voting/new">
            <Button variant="secondary" className="gap-2">
              <Vote className="h-4 w-4" /> New campaign
            </Button>
          </Link>
          <Link href="/organizer/events/new">
            <Button className="gap-2">
              <CalendarPlus className="h-4 w-4" /> Create event
            </Button>
          </Link>
        </div>
      </div>

      {showChecklist && (
        <Card title="Get set up">
          <ol className="divide-y divide-slate-100">
            {checklist.map((c) => (
              <li key={c.label}>
                <Link href={c.href} className="flex items-center gap-3 px-5 py-3.5 text-sm hover:bg-slate-50">
                  {c.done ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  ) : (
                    <Circle className="h-6 w-6 text-slate-300" />
                  )}
                  <span className={c.done ? "text-slate-400 line-through" : "font-medium text-ink-800"}>{c.label}</span>
                  {"optional" in c && c.optional && !c.done && <span className="text-xs text-slate-400">(needed for paid tickets)</span>}
                  {!c.done && <ArrowRight className="ml-auto h-4 w-4 text-slate-400" />}
                </Link>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Gross ticket sales" value={compactNaira(gross)} hint="All events, before fees" />
        <StatTile label="Tickets issued" value={sold.toLocaleString()} hint={`+${registrations7} in the last 7 days`} />
        <StatTile label="Upcoming events" value={upcoming.length} hint={`${events.filter((e) => e.status === "DRAFT").length} draft(s)`} />
        <StatTile label="Voting campaigns" value={campaignCount} />
      </div>

      <Card title="Paid sales per day">
        <ColumnChart data={sales} kind="naira" label="Sales" />
      </Card>

      <section>
        <h2 className="mb-4 font-display text-xl font-semibold text-ink-800">Upcoming & live</h2>
        {upcoming.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50">
              <CalendarPlus className="h-6 w-6 text-violet-500" />
            </div>
            <p className="mt-4 font-semibold text-ink-800">No upcoming events</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">Create an event to start selling tickets and collecting registrations.</p>
            <Link href="/organizer/events/new" className="mt-5">
              <Button>Create an event</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} now={now} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-xl font-semibold text-ink-800">Past</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {past.slice(0, 6).map((e) => (
              <EventCard key={e.id} event={e} now={now} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

type EventWithTickets = {
  id: string;
  title: string;
  venue: string | null;
  coverImage: string | null;
  status: string;
  startsAt: Date;
  endsAt: Date | null;
  sections: { ticketTypes: { priceKobo: number; quantity: number; quantitySold: number }[] }[];
};

function EventCard({ event, now }: { event: EventWithTickets; now: Date }) {
  const tts = event.sections.flatMap((s) => s.ticketTypes);
  const sold = tts.reduce((n, t) => n + t.quantitySold, 0);
  const cap = tts.reduce((n, t) => n + t.quantity, 0);
  const gross = tts.reduce((n, t) => n + t.quantitySold * t.priceKobo, 0);
  const pct = cap ? Math.round((sold / cap) * 100) : 0;
  const live = event.startsAt <= now && (event.endsAt ?? event.startsAt) >= now;
  const start = new Date(event.startsAt);

  return (
    <Link
      href={`/organizer/events/${event.id}`}
      className="group flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-soft"
    >
      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-domni-gradient">
        {event.coverImage && <img src={event.coverImage} alt="" className="h-full w-full object-cover" />}
        <div className="absolute inset-x-1.5 bottom-1.5 rounded-lg bg-white/95 py-0.5 text-center leading-tight shadow-sm">
          <p className="text-[10px] font-semibold uppercase text-violet-600">{start.toLocaleDateString("en-NG", { month: "short", timeZone: "Africa/Lagos" })}</p>
          <p className="text-base font-bold text-ink-800">{start.toLocaleDateString("en-NG", { day: "numeric", timeZone: "Africa/Lagos" })}</p>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate font-semibold text-ink-800 group-hover:text-violet-700">{event.title}</h3>
          {live ? <Badge tone="green">LIVE</Badge> : <Badge tone={STATUS_TONE[event.status]}>{event.status}</Badge>}
        </div>
        <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-500">
          {formatDate(event.startsAt, { year: undefined })} · {formatTime(event.startsAt)}
          {event.venue && (
            <>
              <MapPin className="ml-1 h-3 w-3" /> {event.venue}
            </>
          )}
        </p>
        <div className="mt-3">
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">
              {sold} / {cap} sold
            </span>
            <span className="font-medium text-ink-800">{formatNaira(gross).replace("Free", "₦0")}</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-violet-100">
            <div className="h-full rounded-full bg-violet-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>
    </Link>
  );
}
