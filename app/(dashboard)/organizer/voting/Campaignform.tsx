"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label, FieldError } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NomineeEditor, type NomineeDraft } from "./Nomineeeditor";
import { createCampaign } from "@/lib/actions/voting";
import { createCampaignSchema } from "@/lib/validations/voting";
import { createClient } from "@/lib/supabase/client";
import { uploadNomineeImage } from "@/lib/supabase/storage";
import { updateCampaign } from "@/lib/actions/voting";
function emptyNominee(): NomineeDraft {
  return { id: crypto.randomUUID(), name: "", bio: "", imageFile: null, imagePreview: "" };
}

interface CampaignFormProps {
  initialData?: {
    id: string;
    title: string;
    description: string;
    pricePerVote: number;
    startsAt: string;
    endsAt: string;

    nominees: {
      id: string;
      name: string;
      bio: string;
      imagePreview: string;
      imageFile: null;
    }[];
  };
}

export function CampaignForm({
  initialData,
}: CampaignFormProps) {
const [title, setTitle] = useState(initialData?.title || "");
const [description, setDescription] = useState(
  initialData?.description || ""
);
const [pricePerVote, setPricePerVote] = useState(
  initialData?.pricePerVote?.toString() || ""
);
const [startsAt, setStartsAt] = useState(
  initialData?.startsAt || ""
);
const [endsAt, setEndsAt] = useState(
  initialData?.endsAt || ""
);
const [nominees, setNominees] = useState<NomineeDraft[]>(
  initialData?.nominees || [emptyNominee(), emptyNominee()]
);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateNominee(id: string, patch: Partial<NomineeDraft>) {
    setNominees((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You need to be logged in to create a campaign.");
        setSubmitting(false);
        return;
      }

      const uploadedNominees = await Promise.all(
        nominees.map(async (n) => ({
          name: n.name,
          bio: n.bio,
          imageUrl: n.imageFile ? await uploadNomineeImage(n.imageFile, user.id) : "",
        }))
      );

      const payload = {
        title,
        description,
        eventId: "",
        pricePerVote: pricePerVote === "" ? 0 : Number(pricePerVote),
        startsAt,
        endsAt,
        nominees: uploadedNominees,
      };

      const parsed = createCampaignSchema.safeParse(payload);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Please check the form for errors.");
        setSubmitting(false);
        return;
      }

      const formData = new FormData();
      formData.set("payload", JSON.stringify(payload));
if (initialData) {
  formData.set("campaignId", initialData.id);
  await updateCampaign(null, formData);
} else {
  await createCampaign(null, formData);
}    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Campaign details
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="title">Campaign name</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Most Influential Student"
              required
            />
          </div>

          <div>
            <Label htmlFor="pricePerVote">Price per vote (₦)</Label>
            <Input
              id="pricePerVote"
              type="number"
              min={0}
              value={pricePerVote}
              onChange={(e) => setPricePerVote(e.target.value)}
              placeholder="100"
              required
            />
          </div>
          <div />

          <div>
            <Label htmlFor="startsAt">Opens</Label>
            <Input
              id="startsAt"
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="endsAt">Closes</Label>
            <Input
              id="endsAt"
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              required
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this campaign for?"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Nominees
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setNominees((prev) => [...prev, emptyNominee()])}
          >
            <Plus className="h-3.5 w-3.5" /> Add nominee
          </Button>
        </div>

        {nominees.map((nominee) => (
          <NomineeEditor
            key={nominee.id}
            nominee={nominee}
            onChange={(patch) => updateNominee(nominee.id, patch)}
            onRemove={() => setNominees((prev) => prev.filter((n) => n.id !== nominee.id))}
            removable={nominees.length > 2}
          />
        ))}
      </div>

      {error && <FieldError>{error}</FieldError>}

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Publishing…" : "Launch campaign"}
        </Button>
      </div>
    </form>
  );
}