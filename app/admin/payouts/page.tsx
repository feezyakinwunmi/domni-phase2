import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { compactNaira } from "@/lib/admin";
import { formatNaira } from "@/lib/format";
import { adminRecordPayout } from "@/lib/actions/admin";
import { ActionButton } from "@/components/admin/ActionButton";
import { Badge, Card, PageHeader, StatTile, Table, Td } from "@/components/ui/panel";

type Row = {
  org: string;
  gross: bigint;
  fees: bigint;
  net_direct: bigint | null;
  net_manual: bigint | null;
  orders: bigint;
};

export default async function AdminPayoutsPage() {
  const [rows, paidOut, unconnected] = await Promise.all([
    prisma.$queryRaw<Row[]>`
      WITH sales AS (
        SELECT e."organizerId" AS org, t."amountKobo" AS amount,
               COALESCE((t.metadata->'saleFees'->>'domniFeeKobo')::bigint, 0) AS fee,
               COALESCE((t.metadata->'saleFees'->>'estimatedOrganizerNetKobo')::bigint, t."amountKobo") AS net,
               COALESCE(t.metadata->>'payoutMode', 'manual') AS mode
        FROM "transactions" t
        JOIN "ticket_types" tt ON tt.id::text = t.metadata->>'ticketTypeId'
        JOIN "event_sections" s ON s.id = tt."sectionId"
        JOIN "events" e ON e.id = s."eventId"
        WHERE t.type = 'TICKET_PURCHASE' AND t.status = 'SUCCESSFUL' AND t."amountKobo" > 0
        UNION ALL
        SELECT c."organizerId", t."amountKobo",
               COALESCE((t.metadata->'saleFees'->>'domniFeeKobo')::bigint, 0),
               COALESCE((t.metadata->'saleFees'->>'estimatedOrganizerNetKobo')::bigint, t."amountKobo"),
               COALESCE(t.metadata->>'payoutMode', 'manual')
        FROM "transactions" t
        JOIN "nominees" n ON n.id::text = t.metadata->>'nomineeId'
        JOIN "voting_campaigns" c ON c.id = n."campaignId"
        WHERE t.type = 'VOTE_PURCHASE' AND t.status = 'SUCCESSFUL' AND t."amountKobo" > 0
      )
      SELECT org,
             SUM(amount)::bigint AS gross,
             SUM(fee)::bigint AS fees,
             SUM(net) FILTER (WHERE mode = 'subaccount')::bigint AS net_direct,
             SUM(net) FILTER (WHERE mode <> 'subaccount')::bigint AS net_manual,
             COUNT(*)::bigint AS orders
      FROM sales GROUP BY org ORDER BY gross DESC`,
    prisma.transaction.groupBy({ by: ["userId"], where: { type: "PAYOUT", status: "SUCCESSFUL" }, _sum: { amountKobo: true } }),
    // Organizers with live paid tickets but no payout account (shouldn't happen after this release).
    prisma.profile.findMany({
      where: {
        paystackSubaccountCode: null,
        events: { some: { status: "PUBLISHED", sections: { some: { ticketTypes: { some: { priceKobo: { gt: 0 } } } } } } },
      },
      select: { id: true, email: true, fullName: true },
    }),
  ]);

  const profiles = await prisma.profile.findMany({
    where: { id: { in: rows.map((r) => r.org) } },
    select: { id: true, email: true, fullName: true, paystackSubaccountCode: true, payoutBankName: true },
  });
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const paidById = new Map(paidOut.map((p) => [p.userId, p._sum.amountKobo ?? 0]));

  const data = rows.map((r) => {
    const manual = Number(r.net_manual ?? 0);
    const paid = paidById.get(r.org) ?? 0;
    return { ...r, profile: byId.get(r.org), direct: Number(r.net_direct ?? 0), owed: Math.max(0, manual - paid), paid };
  });

  const totals = data.reduce(
    (acc, d) => ({ gross: acc.gross + Number(d.gross), fees: acc.fees + Number(d.fees), direct: acc.direct + d.direct, owed: acc.owed + d.owed }),
    { gross: 0, fees: 0, direct: 0, owed: 0 }
  );

  return (
    <>
      <PageHeader
        title="Payouts"
        description="Sales with a connected payout account settle straight to the organizer's bank via Paystack. Anything that settled to DOMNI must be transferred manually."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Organizer sales (gross)" value={compactNaira(totals.gross)} />
        <StatTile label="DOMNI fees" value={compactNaira(totals.fees)} />
        <StatTile label="Paid directly to organizers" value={compactNaira(totals.direct)} hint="Settled by Paystack split" />
        <StatTile label="Owed (manual transfer)" value={compactNaira(totals.owed)} tone={totals.owed > 0 ? "warning" : "default"} />
      </div>

      {unconnected.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>{unconnected.length}</strong> organizer(s) have live paid events but no payout account, so new sales settle to DOMNI:{" "}
          {unconnected.map((u, i) => (
            <span key={u.id}>
              {i > 0 && ", "}
              <Link href={`/admin/users/${u.id}`} className="underline">{u.fullName || u.email}</Link>
            </span>
          ))}
        </div>
      )}

      <Card>
        <Table head={["Organizer", "Payout account", "Orders", "Gross", "DOMNI fee", "Paid direct", "Owed", ""]} empty="No paid sales yet.">
          {data.map((d) => (
            <tr key={d.org}>
              <Td>
                <Link href={`/admin/users/${d.org}`} className="font-medium text-ink-800 hover:text-violet-600">
                  {d.profile?.fullName || d.profile?.email || d.org.slice(0, 8)}
                </Link>
              </Td>
              <Td>{d.profile?.paystackSubaccountCode ? <Badge tone="green">{d.profile.payoutBankName ?? "Connected"}</Badge> : <Badge tone="amber">Not connected</Badge>}</Td>
              <Td>{Number(d.orders).toLocaleString()}</Td>
              <Td className="font-medium text-ink-800">{formatNaira(Number(d.gross))}</Td>
              <Td>{formatNaira(Number(d.fees)).replace("Free", "₦0")}</Td>
              <Td>{formatNaira(d.direct).replace("Free", "₦0")}</Td>
              <Td className={d.owed > 0 ? "font-semibold text-amber-700" : ""}>{formatNaira(d.owed).replace("Free", "₦0")}</Td>
              <Td>
                {d.owed > 0 && (
                  <ActionButton
                    action={adminRecordPayout.bind(null, d.org)}
                    confirm={`Record that you've transferred ${formatNaira(d.owed)} to this organizer? Do the bank transfer first.`}
                  >
                    Record payout
                  </ActionButton>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      </Card>
      <p className="mt-3 text-xs text-slate-400">
        Net amounts use Paystack's actual fee where it was reported, otherwise DOMNI's estimate.
      </p>
    </>
  );
}
