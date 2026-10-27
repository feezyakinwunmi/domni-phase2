import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isUuid } from "@/lib/errors";
import { CampaignForm } from "../../Campaignform";

interface EditCampaignPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCampaignPage({ params }: EditCampaignPageProps) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectedFrom=/organizer/voting/${id}/edit`);

  const campaign = await prisma.votingCampaign.findUnique({
    where: { id },
    include: { nominees: { orderBy: { createdAt: "asc" } } },
  });
  if (!campaign || campaign.organizerId !== user.id) notFound();

  const initialData = {
    id: campaign.id,
    title: campaign.title,
    description: campaign.description || "",
    pricePerVote: campaign.pricePerVoteKobo / 100,
    startsAt: campaign.startsAt.toISOString(),
    endsAt: campaign.endsAt.toISOString(),
    hasVotes: campaign.nominees.some((n) => n.voteCount > 0),
    nominees: campaign.nominees.map((n) => ({
      id: n.id,
      name: n.name,
      bio: n.bio || "",
      imagePreview: n.imageUrl || "",
      imageFile: null,
      voteCount: n.voteCount,
    })),
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-violet-600">Edit campaign</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">{campaign.title}</h1>
        </div>
        <Link
          href={`/organizer/voting/${campaign.id}`}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          ← Back
        </Link>
      </div>
      <CampaignForm initialData={initialData} />
    </div>
  );
}
