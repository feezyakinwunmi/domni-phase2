import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE, pageParams } from "@/lib/admin";
import { formatDateTime, formatNaira } from "@/lib/format";
import { Badge, Card, FilterBar, PageHeader, Pagination, Table, Td } from "@/components/ui/panel";

type SP = { q?: string; page?: string };

export default async function AdminVotingPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { page, skip, take } = pageParams(sp.page);
  const where: Prisma.VotingCampaignWhereInput = sp.q
    ? { OR: [{ title: { contains: sp.q, mode: "insensitive" } }, { organizer: { email: { contains: sp.q, mode: "insensitive" } } }] }
    : {};

  const [total, campaigns] = await Promise.all([
    prisma.votingCampaign.count({ where }),
    prisma.votingCampaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        organizer: { select: { id: true, email: true, fullName: true } },
        nominees: { select: { voteCount: true } },
      },
    }),
  ]);
  const now = new Date();

  return (
    <>
      <PageHeader title="Voting" description="All voting campaigns and their vote totals." />
      <Card>
        <FilterBar q={sp.q} placeholder="Search campaign or organizer email" />
        <Table head={["Campaign", "Organizer", "Status", "Price/vote", "Votes", "Est. gross", "Closes"]} empty="No campaigns yet.">
          {campaigns.map((c) => {
            const votes = c.nominees.reduce((n, x) => n + x.voteCount, 0);
            const status = now < c.startsAt ? ["Upcoming", "amber"] : now > c.endsAt ? ["Closed", "slate"] : ["Live", "green"];
            return (
              <tr key={c.id}>
                <Td>
                  <span className="font-medium text-ink-800">{c.title}</span>
                  <Link href={`/vote/${c.id}`} target="_blank" className="ml-2 inline-flex items-center gap-1 text-xs text-violet-600 hover:underline">
                    Open <ExternalLink className="h-3 w-3" />
                  </Link>
                </Td>
                <Td>
                  <Link href={`/admin/users/${c.organizer.id}`} className="hover:text-violet-600">{c.organizer.fullName || c.organizer.email}</Link>
                </Td>
                <Td><Badge tone={status[1] as "green"}>{status[0]}</Badge></Td>
                <Td>{formatNaira(c.pricePerVoteKobo)}</Td>
                <Td>{votes.toLocaleString()}</Td>
                <Td className="font-medium text-ink-800">{formatNaira(votes * c.pricePerVoteKobo).replace("Free", "₦0")}</Td>
                <Td>{formatDateTime(c.endsAt)}</Td>
              </tr>
            );
          })}
        </Table>
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} basePath="/admin/voting" params={{ q: sp.q }} />
      </Card>
    </>
  );
}
