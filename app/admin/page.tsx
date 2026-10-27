import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { compactNaira, fillDays } from "@/lib/admin";
import { formatDateTime, formatNaira } from "@/lib/format";
import { Badge, Card, PageHeader, StatTile, STATUS_TONE, Table, Td } from "@/components/ui/panel";
import { ColumnChart } from "@/components/ui/column-chart";

type Totals = { gross: bigint | null; fees: bigint | null; count: bigint };

export default async function AdminOverviewPage() {
  const since30 = new Date(Date.now() - 30 * 86_400_000);

  const [
    users,
    organizers,
    proUsers,
    newUsers30,
    events,
    publishedEvents,
    tickets,
    checkedIn,
    campaigns,
    [sales],
    [pro],
    revenueRows,
    signupRows,
    refundsNeeded,
    stalePending,
    manualPayoutOrganizers,
    recentTx,
    recentUsers,
  ] = await Promise.all([
    prisma.profile.count(),
    prisma.profile.count({ where: { role: "ORGANIZER" } }),
    prisma.profile.count({ where: { plan: "PRO" } }),
    prisma.profile.count({ where: { createdAt: { gte: since30 } } }),
    prisma.event.count(),
    prisma.event.count({ where: { status: "PUBLISHED" } }),
    prisma.ticket.count(),
    prisma.ticket.count({ where: { status: "CHECKED_IN" } }),
    prisma.votingCampaign.count(),
    prisma.$queryRaw<Totals[]>`
      SELECT SUM("amountKobo")::bigint AS gross,
             SUM(COALESCE((metadata->'saleFees'->>'domniFeeKobo')::bigint, 0))::bigint AS fees,
             COUNT(*)::bigint AS count
      FROM "transactions"
      WHERE status = 'SUCCESSFUL' AND type IN ('TICKET_PURCHASE', 'VOTE_PURCHASE') AND "amountKobo" > 0`,
    prisma.$queryRaw<Totals[]>`
      SELECT SUM("amountKobo")::bigint AS gross, 0::bigint AS fees, COUNT(*)::bigint AS count
      FROM "transactions" WHERE status = 'SUCCESSFUL' AND type = 'PLAN_UPGRADE'`,
    prisma.$queryRaw<{ day: string; value: bigint }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Lagos', 'YYYY-MM-DD') AS day,
             SUM("amountKobo")::bigint AS value
      FROM "transactions"
      WHERE status = 'SUCCESSFUL' AND "createdAt" >= ${since30}
      GROUP BY 1`,
    prisma.$queryRaw<{ day: string; value: bigint }[]>`
      SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Africa/Lagos', 'YYYY-MM-DD') AS day,
             COUNT(*)::bigint AS value
      FROM "profiles" WHERE "createdAt" >= ${since30}
      GROUP BY 1`,
    prisma.transaction.count({ where: { metadata: { path: ["needsRefund"], equals: true } } }),
    prisma.transaction.count({ where: { status: "PENDING", createdAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } } }),
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT e."organizerId")::bigint AS count
      FROM "transactions" t
      JOIN "ticket_types" tt ON tt.id::text = t.metadata->>'ticketTypeId'
      JOIN "event_sections" s ON s.id = tt."sectionId"
      JOIN "events" e ON e.id = s."eventId"
      WHERE t.status = 'SUCCESSFUL' AND t."amountKobo" > 0 AND COALESCE(t.metadata->>'payoutMode', 'manual') = 'manual'`,
    prisma.transaction.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.profile.findMany({ orderBy: { createdAt: "desc" }, take: 6, select: { id: true, email: true, fullName: true, role: true, plan: true, createdAt: true } }),
  ]);

  const revenue = fillDays(revenueRows.map((r) => ({ day: r.day, value: Number(r.value) })));
  const signups = fillDays(signupRows.map((r) => ({ day: r.day, value: Number(r.value) })));
  const manualOrgs = Number(manualPayoutOrganizers[0]?.count ?? 0);

  const alerts = [
    refundsNeeded > 0 && { text: `${refundsNeeded} payment(s) need a refund (tickets sold out after payment)`, href: "/admin/transactions?flag=refund" },
    manualOrgs > 0 && { text: `${manualOrgs} organizer(s) have sales that settled to DOMNI and need a manual payout`, href: "/admin/payouts" },
    stalePending > 0 && { text: `${stalePending} payment(s) pending for over an hour — check them in Paystack`, href: "/admin/transactions?status=PENDING" },
  ].filter(Boolean) as { text: string; href: string }[];

  return (
    <>
      <PageHeader title="Overview" description="Everything happening on DOMNI at a glance." />

      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((a) => (
            <Link key={a.href} href={a.href} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:bg-amber-100">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">{a.text}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Sales volume (tickets + votes)" value={compactNaira(Number(sales?.gross ?? 0))} hint={`${Number(sales?.count ?? 0).toLocaleString()} paid orders`} />
        <StatTile label="DOMNI fees earned" value={compactNaira(Number(sales?.fees ?? 0))} hint="From ticket & vote sales" />
        <StatTile label="Pro revenue" value={compactNaira(Number(pro?.gross ?? 0))} hint={`${proUsers} active Pro account(s)`} />
        <StatTile label="Users" value={users.toLocaleString()} hint={`${organizers} organizers · +${newUsers30} in 30 days`} />
        <StatTile label="Events" value={events.toLocaleString()} hint={`${publishedEvents} published`} />
        <StatTile label="Tickets issued" value={tickets.toLocaleString()} hint={`${checkedIn.toLocaleString()} checked in`} />
        <StatTile label="Voting campaigns" value={campaigns.toLocaleString()} />
        <StatTile label="Open issues" value={alerts.length} tone={alerts.length ? "warning" : "default"} hint={alerts.length ? "See alerts above" : "All clear"} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Revenue per day">
          <ColumnChart data={revenue} kind="naira" label="Revenue" />
        </Card>
        <Card title="New sign-ups per day">
          <ColumnChart data={signups} kind="count" label="Sign-ups" />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Latest transactions" action={<Link href="/admin/transactions" className="text-sm font-medium text-violet-600 hover:underline">View all</Link>}>
          <Table head={["Type", "Amount", "Status", "When"]} empty="No transactions yet.">
            {recentTx.map((t) => (
              <tr key={t.id}>
                <Td>{t.type.replace("_", " ").toLowerCase()}</Td>
                <Td className="font-medium text-ink-800">{formatNaira(t.amountKobo)}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                </Td>
                <Td>{formatDateTime(t.createdAt)}</Td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card title="Newest accounts" action={<Link href="/admin/users" className="text-sm font-medium text-violet-600 hover:underline">View all</Link>}>
          <ul className="divide-y divide-slate-100">
            {recentUsers.map((u) => (
              <li key={u.id}>
                <Link href={`/admin/users/${u.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink-800">{u.fullName || u.email}</span>
                    <span className="block truncate text-xs text-slate-400">{u.email}</span>
                  </span>
                  <span className="flex gap-1.5">
                    <Badge tone={STATUS_TONE[u.role]}>{u.role}</Badge>
                    {u.plan === "PRO" && <Badge tone="violet">PRO</Badge>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
