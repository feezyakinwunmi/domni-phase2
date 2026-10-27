"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteCampaign } from "@/lib/actions/voting";

export function DeleteCampaignButton({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col items-end">
      <Button type="button" variant="secondary" className="gap-2 hover:border-red-300 hover:text-red-600" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" /> Delete
      </Button>
      {error && <p className="mt-1 max-w-xs text-right text-xs text-red-500">{error}</p>}
      <ConfirmDialog
        open={open}
        loading={pending}
        title="Delete campaign"
        description="This permanently removes the campaign and its nominees. Campaigns that already have votes can't be deleted."
        confirmText="Delete forever"
        icon={<Trash2 className="h-5 w-5" />}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          start(async () => {
            const res = await deleteCampaign(campaignId);
            setOpen(false);
            if (!res.ok) return setError(res.error);
            router.push("/organizer/voting");
            router.refresh();
          })
        }
      />
    </div>
  );
}
