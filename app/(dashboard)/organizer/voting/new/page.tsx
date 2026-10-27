import Link from "next/link";
import { CampaignForm } from "../Campaignform";

export default function NewCampaignPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-violet-600">
              Voting Campaign
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Create Campaign
            </h1>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            ← Back
          </Link>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <CampaignForm />
        </div>
      </div>
    </main>
  );
}