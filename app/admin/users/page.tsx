import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE, pageParams } from "@/lib/admin";
import { formatDate } from "@/lib/format";
import { Badge, Card, FilterBar, PageHeader, Pagination, STATUS_TONE, Table, Td } from "@/components/ui/panel";

type SP = { q?: string; role?: string; plan?: string; page?: string };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { page, skip, take } = pageParams(sp.page);

  const where: Prisma.ProfileWhereInput = {
    ...(sp.q && {
      OR: [
        { email: { contains: sp.q, mode: "insensitive" } },
        { fullName: { contains: sp.q, mode: "insensitive" } },
      ],
    }),
    ...(sp.role && ["ATTENDEE", "ORGANIZER", "ADMIN"].includes(sp.role) && { role: sp.role as "ATTENDEE" }),
    ...(sp.plan && ["FREE", "PRO"].includes(sp.plan) && { plan: sp.plan }),
  };

  const [total, users] = await Promise.all([
    prisma.profile.count({ where }),
    prisma.profile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: { _count: { select: { events: true, tickets: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader title="Users" description="Every account on DOMNI — organizers, attendees and admins." />
      <Card>
        <FilterBar
          q={sp.q}
          placeholder="Search name or email"
          selects={[
            { name: "role", value: sp.role, options: [{ value: "", label: "All roles" }, { value: "ORGANIZER", label: "Organizers" }, { value: "ATTENDEE", label: "Attendees" }, { value: "ADMIN", label: "Admins" }] },
            { name: "plan", value: sp.plan, options: [{ value: "", label: "All plans" }, { value: "PRO", label: "Pro" }, { value: "FREE", label: "Free" }] },
          ]}
        />
        <Table head={["User", "Role", "Plan", "Events", "Tickets", "Payouts", "Joined"]} empty="No users match these filters.">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-slate-50">
              <Td>
                <Link href={`/admin/users/${u.id}`} className="block">
                  <span className="block font-medium text-ink-800 hover:text-violet-600">{u.fullName || "—"}</span>
                  <span className="block text-xs text-slate-400">{u.email}</span>
                </Link>
              </Td>
              <Td><Badge tone={STATUS_TONE[u.role]}>{u.role}</Badge></Td>
              <Td><Badge tone={STATUS_TONE[u.plan] ?? "slate"}>{u.plan}</Badge></Td>
              <Td>{u._count.events}</Td>
              <Td>{u._count.tickets}</Td>
              <Td>{u.paystackSubaccountCode ? <Badge tone="green">Connected</Badge> : <span className="text-slate-300">—</span>}</Td>
              <Td>{formatDate(u.createdAt)}</Td>
            </tr>
          ))}
        </Table>
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/admin/users" params={{ q: sp.q, role: sp.role, plan: sp.plan }} />
      </Card>
    </>
  );
}
