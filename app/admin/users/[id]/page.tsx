import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/errors";
import { formatDate, formatDateTime, formatNaira } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/server";
import { adminSetPlan, adminSetRole, adminSetSuspended } from "@/lib/actions/admin";
import { ActionButton } from "@/components/admin/ActionButton";
import { Badge, Card, PageHeader, StatTile, STATUS_TONE, Table, Td } from "@/components/ui/panel";

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const [admin, profile, authUser] = await Promise.all([
    getAdmin(),
    prisma.profile.findUnique({
      where: { id },
      include: {
        events: { orderBy: { createdAt: "desc" }, take: 20, include: { sections: { include: { ticketTypes: true } } } },
        votingCampaigns: { orderBy: { createdAt: "desc" }, take: 10 },
        transactions: { orderBy: { createdAt: "desc" }, take: 15 },
        _count: { select: { tickets: true, events: true } },
      },
    }),
    createAdminClient()
      .auth.admin.getUserById(id)
      .then((r: any) => r.data?.user ?? null)
      .catch(() => null),
  ]);
  if (!profile) notFound();

  const bannedUntil = authUser?.banned_until ? new Date(authUser.banned_until) : null;
  const suspended = !!bannedUntil && bannedUntil > new Date();
  const isSelf = admin?.id === id;

  const sales = profile.events.flatMap((e) => e.sections.flatMap((s) => s.ticketTypes));
  const grossKobo = sales.reduce((n, t) => n + t.priceKobo * t.quantitySold, 0);
  const sold = sales.reduce((n, t) => n + t.quantitySold, 0);

  return (
    <>
      <Link href="/admin/users" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" /> All users
      </Link>
      <PageHeader
        title={profile.fullName || profile.email}
        description={profile.email}
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge tone={STATUS_TONE[profile.role]}>{profile.role}</Badge>
            <Badge tone={STATUS_TONE[profile.plan] ?? "slate"}>{profile.plan}</Badge>
            {suspended && <Badge tone="red">SUSPENDED</Badge>}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Joined" value={formatDate(profile.createdAt)} hint={authUser?.last_sign_in_at ? `Last sign-in ${formatDateTime(authUser.last_sign_in_at)}` : undefined} />
        <StatTile label="Events created" value={profile._count.events} />
        <StatTile label="Ticket sales (organizer)" value={formatNaira(grossKobo).replace("Free", "₦0")} hint={`${sold} tickets sold`} />
        <StatTile label="Tickets held" value={profile._count.tickets} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.4fr]">
        <Card title="Account management">
          <div className="space-y-5 p-5 text-sm">
            <div>
              <p className="mb-2 font-medium text-ink-800">Role</p>
              <div className="flex flex-wrap gap-2">
                {(["ATTENDEE", "ORGANIZER", "ADMIN"] as const).map((role) => (
                  <ActionButton
                    key={role}
                    action={adminSetRole.bind(null, id, role)}
                    tone={profile.role === role ? "primary" : "default"}
                    confirm={role === "ADMIN" ? "Give this person full admin access?" : undefined}
                  >
                    {role.charAt(0) + role.slice(1).toLowerCase()}
                  </ActionButton>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 font-medium text-ink-800">Plan</p>
              <p className="mb-2 text-xs text-slate-500">
                {profile.plan === "PRO"
                  ? `Pro since ${profile.planActivatedAt ? formatDate(profile.planActivatedAt) : "before tracking began"}.`
                  : "Free plan."}
              </p>
              {profile.plan === "PRO" ? (
                <ActionButton action={adminSetPlan.bind(null, id, "FREE")} tone="danger" confirm="Revoke Pro for this account?">
                  Revoke Pro
                </ActionButton>
              ) : (
                <ActionButton action={adminSetPlan.bind(null, id, "PRO")} confirm="Grant Pro for free (no payment)?">
                  Grant Pro
                </ActionButton>
              )}
            </div>

            <div>
              <p className="mb-2 font-medium text-ink-800">Payout account</p>
              {profile.paystackSubaccountCode ? (
                <p className="text-slate-600">
                  {profile.payoutAccountName} · {profile.payoutBankName} · ••••{profile.payoutAccountNumber?.slice(-4)}
                  <span className="mt-0.5 block font-mono text-xs text-slate-400">{profile.paystackSubaccountCode}</span>
                </p>
              ) : (
                <p className="text-slate-400">Not set up — paid sales would settle to DOMNI.</p>
              )}
            </div>

            {!isSelf && (
              <div>
                <p className="mb-2 font-medium text-ink-800">Access</p>
                {suspended ? (
                  <ActionButton action={adminSetSuspended.bind(null, id, false)}>Restore access</ActionButton>
                ) : (
                  <ActionButton
                    action={adminSetSuspended.bind(null, id, true)}
                    tone="danger"
                    confirm="Suspend this account? They can't sign in, and their published events are moved back to draft."
                  >
                    Suspend account
                  </ActionButton>
                )}
              </div>
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Events">
            <Table head={["Event", "Status", "Starts"]} empty="No events.">
              {profile.events.map((e) => (
                <tr key={e.id}>
                  <Td>
                    <Link href={`/admin/events?q=${encodeURIComponent(e.title)}`} className="font-medium text-ink-800 hover:text-violet-600">
                      {e.title}
                    </Link>
                  </Td>
                  <Td><Badge tone={STATUS_TONE[e.status]}>{e.status}</Badge></Td>
                  <Td>{formatDate(e.startsAt)}</Td>
                </tr>
              ))}
            </Table>
          </Card>

          <Card title="Their payments">
            <Table head={["Type", "Amount", "Status", "When"]} empty="No payments made by this account.">
              {profile.transactions.map((t) => (
                <tr key={t.id}>
                  <Td>{t.type.replace("_", " ").toLowerCase()}</Td>
                  <Td>{formatNaira(t.amountKobo)}</Td>
                  <Td><Badge tone={STATUS_TONE[t.status]}>{t.status}</Badge></Td>
                  <Td>{formatDateTime(t.createdAt)}</Td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
      </div>
    </>
  );
}
