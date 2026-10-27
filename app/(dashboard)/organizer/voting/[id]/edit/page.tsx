import { notFound } from "next/navigation";
import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { CampaignForm } from "../../Campaignform";

interface EditCampaignPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditCampaignPage({
  params,
}: EditCampaignPageProps) {
  const { id } = await params;
  const campaign = await prisma.votingCampaign.findUnique({
    where: {
      id,
    },
    include: {
      nominees: true,
    },
  });

  if (!campaign) {
    notFound();
  }

  const initialData = {
    id: campaign.id,
    title: campaign.title,
    description: campaign.description || "",
    pricePerVote: campaign.pricePerVoteKobo / 100,
    startsAt: new Date(campaign.startsAt)
      .toISOString()
      .slice(0, 16),
    endsAt: new Date(campaign.endsAt)
      .toISOString()
      .slice(0, 16),

    nominees: campaign.nominees.map((nominee) => ({
      id: nominee.id,
      name: nominee.name,
      bio: nominee.bio || "",
      imagePreview: nominee.imageUrl || "",
      imageFile: null,
    })),
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-violet-600">
              Edit Campaign
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              {campaign.title}
            </h1>
          </div>

          <Link
            href={`/organizer/voting/${campaign.id}`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            ← Back
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <CampaignForm initialData={initialData} />
        </div>
      </div>
    </main>
  );
}