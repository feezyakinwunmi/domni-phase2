import type { Prisma, TransactionStatus, TransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { compactNaira, PAGE_SIZE, pageParams } from "@/lib/admin";
import { formatDateTime, formatNaira } from "@/lib/format";
import { adminResolveRefund } from "@/lib/actions/admin";
import { ActionButton } from "@/components/admin/ActionButton";
import { Badge, Card, FilterBar, PageHeader, Pagination, StatTile, STATUS_TONE, Table, Td } from "@/components/ui/panel";

type SP = { q?: string; type?: string; status?: string; flag?: string; page?: string };
const TYPES: TransactionType[] = ["TICKET_PURCHASE", "VOTE_PURCHASE", "PLAN_UPGRADE", "PAYOUT"];
const STATUSES: TransactionStatus[] = ["SUCCESSFUL", "PENDING", "FAILED", "REVERSED"];

type Meta = {
  email?: string;
  voterEmail?: string;
  name?: string;
  quantity?: number;
  needsRefund?: boolean;
  payoutMode?: string;
  saleFees?: { domniFeeKobo?: number };
};

export default async function AdminTransactionsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { page, skip, take } = pageParams(sp.page);

  const where: Prisma.TransactionWhereInput = {
    ...(sp.type && TYPES.includes(sp.type as TransactionType) && { type: sp.type as TransactionType }),
    ...(sp.status && STATUSES.includes(sp.status as TransactionStatus) && { status: sp.status as TransactionStatus }),
    ...(sp.flag === "refund" && { metadata: { path: ["needsRefund"], equals: true } }),
    ...(sp.q && {
      OR: [
        { reference: { contains: sp.q, mode: "insensitive" } },
        { user: { email: { contains: sp.q, mode: "insensitive" } } },
        { metadata: { path: ["email"], string_contains: sp.q.toLowerCase() } },
        { metadata: { path: ["voterEmail"], string_contains: sp.q.toLowerCase() } },
      ],
    }),
  };

  const [total, rows, sums] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({ where, orderBy: { createdAt: "desc" }, skip, take, include: { user: { select: { email: true } } } }),
    prisma.transaction.aggregate({ where: { ...where, status: "SUCCESSFUL" }, _sum: { amountKobo: true }, _count: true }),
  ]);

  return (
    <>
      <PageHeader title="Transactions" description="Every payment: tickets, votes and Pro upgrades." />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatTile label="Matching transactions" value={total.toLocaleString()} />
        <StatTile label="Successful in this view" value={sums._count.toLocaleString()} />
        <StatTile label="Successful volume" value={compactNaira(sums._sum.amountKobo ?? 0)} />
      </div>

      <Card>
        <FilterBar
          q={sp.q}
          placeholder="Search reference or buyer email"
          selects={[
            { name: "type", value: sp.type, options: [{ value: "", label: "All types" }, ...TYPES.map((t) => ({ value: t, label: t.replace("_", " ").toLowerCase() }))] },
            { name: "status", value: sp.status, options: [{ value: "", label: "All statuses" }, ...STATUSES.map((s) => ({ value: s, label: s.toLowerCase() }))] },
            { name: "flag", value: sp.flag, options: [{ value: "", label: "No flag filter" }, { value: "refund", label: "Needs refund" }] },
          ]}
        />
        <Table head={["Reference", "Type", "Buyer", "Amount", "DOMNI fee", "Settled to", "Status", "When", ""]} empty="No transactions match these filters.">
          {rows.map((t) => {
            const m = (t.metadata ?? {}) as Meta;
            const buyer = t.user?.email ?? m.email ?? m.voterEmail ?? "—";
            const isSale = t.type === "TICKET_PURCHASE" || t.type === "VOTE_PURCHASE";
            return (
              <tr key={t.id}>
                <Td className="font-mono text-xs">{t.reference}</Td>
                <Td>{t.type.replace("_", " ").toLowerCase()}{m.quantity ? ` ×${m.quantity}` : ""}</Td>
                <Td>{buyer}</Td>
                <Td className="font-medium text-ink-800">{formatNaira(t.amountKobo)}</Td>
                <Td>{m.saleFees?.domniFeeKobo != null ? formatNaira(m.saleFees.domniFeeKobo).replace("Free", "₦0") : "—"}</Td>
                <Td>
                  {!isSale || t.amountKobo === 0 ? (
                    <span className="text-slate-300">—</span>
                  ) : m.payoutMode === "subaccount" ? (
                    <Badge tone="green">Organizer</Badge>
                  ) : (
                    <Badge tone="amber">DOMNI (manual)</Badge>
                  )}
                </Td>
                <Td>
                  <span className="flex flex-wrap gap-1">
                    <Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge>
                    {m.needsRefund && <Badge tone="red">REFUND</Badge>}
                  </span>
                </Td>
                <Td>{formatDateTime(t.createdAt)}</Td>
                <Td>
                  {m.needsRefund && (
                    <ActionButton action={adminResolveRefund.bind(null, t.id)} confirm="Confirm you've refunded this payment in the Paystack dashboard?">
                      Mark refunded
                    </ActionButton>
                  )}
                </Td>
              </tr>
            );
          })}
        </Table>
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/admin/transactions" params={{ q: sp.q, type: sp.type, status: sp.status, flag: sp.flag }} />
      </Card>
    </>
  );
}
