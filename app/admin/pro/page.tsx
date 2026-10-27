import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { compactNaira } from "@/lib/admin";
import { formatDate, formatDateTime, formatNaira } from "@/lib/format";
import { adminSetPlan } from "@/lib/actions/admin";
import { ActionButton } from "@/components/admin/ActionButton";
import { Badge, Card, PageHeader, StatTile, STATUS_TONE, Table, Td } from "@/components/ui/panel";

export default async function AdminProPage() {
  const since30 = new Date(Date.now() - 30 * 86_400_000);

  const [proUsers, payments, totals, last30] = await Promise.all([
    prisma.profile.findMany({
      where: { plan: "PRO" },
      orderBy: [{ planActivatedAt: "desc" }, { createdAt: "desc" }],
      select: { id: true, email: true, fullName: true, planActivatedAt: true, createdAt: true, _count: { select: { events: true } } },
    }),
    prisma.transaction.findMany({
      where: { type: "PLAN_UPGRADE" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { id: true, email: true, fullName: true } } },
    }),
    prisma.transaction.aggregate({ where: { type: "PLAN_UPGRADE", status: "SUCCESSFUL" }, _sum: { amountKobo: true }, _count: true }),
    prisma.transaction.aggregate({ where: { type: "PLAN_UPGRADE", status: "SUCCESSFUL", createdAt: { gte: since30 } }, _sum: { amountKobo: true }, _count: true }),
  ]);

  // Paid = has a successful upgrade payment; the rest were granted by an admin.
  const paidIds = new Set(payments.filter((p) => p.status === "SUCCESSFUL").map((p) => p.userId));

  return (
    <>
      <PageHeader title="Pro subscribers" description="Who's on Pro, who paid for it, and what it has earned." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Active Pro accounts" value={proUsers.length} />
        <StatTile label="Paid upgrades (all time)" value={totals._count} />
        <StatTile label="Pro revenue (all time)" value={compactNaira(totals._sum.amountKobo ?? 0)} />
        <StatTile label="Last 30 days" value={compactNaira(last30._sum.amountKobo ?? 0)} hint={`${last30._count} upgrade(s)`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Pro accounts">
          <Table head={["Account", "Since", "Source", "Events", ""]} empty="No Pro accounts yet.">
            {proUsers.map((u) => (
              <tr key={u.id}>
                <Td>
                  <Link href={`/admin/users/${u.id}`} className="block hover:text-violet-600">
                    <span className="block font-medium text-ink-800">{u.fullName || u.email}</span>
                    <span className="block text-xs text-slate-400">{u.email}</span>
                  </Link>
                </Td>
                <Td>{u.planActivatedAt ? formatDate(u.planActivatedAt) : "—"}</Td>
                <Td>{paidIds.has(u.id) ? <Badge tone="green">Paid</Badge> : <Badge tone="slate">Granted</Badge>}</Td>
                <Td>{u._count.events}</Td>
                <Td>
                  <ActionButton action={adminSetPlan.bind(null, u.id, "FREE")} tone="danger" confirm="Revoke Pro for this account?">
                    Revoke
                  </ActionButton>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>

        <Card title="Upgrade payments">
          <Table head={["Account", "Amount", "Status", "When"]} empty="No upgrade payments yet.">
            {payments.map((p) => (
              <tr key={p.id}>
                <Td>
                  {p.user ? (
                    <Link href={`/admin/users/${p.user.id}`} className="hover:text-violet-600">{p.user.fullName || p.user.email}</Link>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td className="font-medium text-ink-800">{formatNaira(p.amountKobo)}</Td>
                <Td><Badge tone={STATUS_TONE[p.status]}>{p.status}</Badge></Td>
                <Td>{formatDateTime(p.createdAt)}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
    </>
  );
}
