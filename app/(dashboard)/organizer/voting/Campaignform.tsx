"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { NomineeEditor, type NomineeDraft } from "./Nomineeeditor";
import { createCampaign, updateCampaign } from "@/lib/actions/voting";
import { createCampaignSchema } from "@/lib/validations/voting";
import { formatZodIssue } from "@/lib/errors";
import { toDateTimeLocal } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { uploadNomineeImage } from "@/lib/supabase/storage";

function emptyNominee(): NomineeDraft {
  return { id: crypto.randomUUID(), name: "", bio: "", imageFile: null, imagePreview: "" };
}

interface CampaignFormProps {
  initialData?: {
    id: string;
    title: string;
    description: string;
    pricePerVote: number;
    startsAt: string; // ISO
    endsAt: string; // ISO
    hasVotes: boolean;
    nominees: { id: string; name: string; bio: string; imagePreview: string; imageFile: null; voteCount: number }[];
  };
}

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export function CampaignForm({ initialData }: CampaignFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [pricePerVote, setPricePerVote] = useState(initialData ? String(initialData.pricePerVote) : "");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [nominees, setNominees] = useState<NomineeDraft[]>(initialData?.nominees ?? [emptyNominee(), emptyNominee()]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Local-time values are only correct in the browser (see EventForm).
  useEffect(() => {
    setStartsAt(toDateTimeLocal(initialData?.startsAt));
    setEndsAt(toDateTimeLocal(initialData?.endsAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const votesById = new Map(initialData?.nominees.map((n) => [n.id, n.voteCount]) ?? []);

  function updateNominee(id: string, patch: Partial<NomineeDraft>) {
    if (patch.imageFile && patch.imageFile.size > MAX_IMAGE_BYTES) {
      setError("Nominee photos must be under 3 MB.");
      return;
    }
    setNominees((prev) => prev.map((n) => (n.id === id ? { ...n, ...patch } : n)));
  }

  function payloadWith(images: string[]) {
    return {
      title,
      description,
      eventId: "",
      pricePerVote: pricePerVote.trim() === "" ? 0 : Number(pricePerVote),
      startsAt: startsAt ? new Date(startsAt).toISOString() : "",
      endsAt: endsAt ? new Date(endsAt).toISOString() : "",
      nominees: nominees.map((n, i) => ({ id: n.id, name: n.name, bio: n.bio, imageUrl: images[i] ?? "" })),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate before uploading photos so a typo doesn't cost uploads.
    const preflight = createCampaignSchema.safeParse(
      payloadWith(nominees.map((n) => (n.imagePreview.startsWith("http") ? n.imagePreview : "")))
    );
    if (!preflight.success) return setError(formatZodIssue(preflight.error.issues[0]));

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await createClient().auth.getUser();
      if (!user) throw new Error("Your session expired — please log in again.");

      const images = await Promise.all(
        nominees.map(async (n) => {
          if (n.imageFile) {
            try {
              return await uploadNomineeImage(n.imageFile, user.id);
            } catch {
              throw new Error(`Couldn't upload ${n.name || "a nominee"}'s photo. Check the 'nominee-photos' bucket exists.`);
            }
          }
          return n.imagePreview.startsWith("http") ? n.imagePreview : "";
        })
      );

      const payload = payloadWith(images);
      const res = initialData ? await updateCampaign(initialData.id, payload) : await createCampaign(payload);
      if (!res.ok) {
        setSubmitting(false);
        return setError(res.error);
      }

      router.push(`/organizer/voting/${res.campaignId}?${initialData ? "updated" : "created"}=true`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Campaign details</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="title">Campaign name</Label>
            <Input id="title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Most Influential Student" />
          </div>

          <div>
            <Label htmlFor="pricePerVote">Price per vote (₦)</Label>
            <Input
              id="pricePerVote"
              type="number"
              inputMode="decimal"
              min={0}
              value={pricePerVote}
              disabled={initialData?.hasVotes}
              onChange={(e) => setPricePerVote(e.target.value)}
              placeholder="0 = free (one vote per email)"
            />
            {initialData?.hasVotes && <p className="mt-1 text-xs text-slate-400">Locked — votes have already been cast.</p>}
          </div>
          <div />

          <div>
            <Label htmlFor="startsAt">Opens</Label>
            <Input id="startsAt" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="endsAt">Closes</Label>
            <Input id="endsAt" type="datetime-local" value={endsAt} min={startsAt || undefined} onChange={(e) => setEndsAt(e.target.value)} />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={3}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this campaign for?"
              className="w-full rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm placeholder:text-slate-400 focus:border-violet-400"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Nominees ({nominees.length})</p>
          <Button type="button" variant="secondary" size="sm" onClick={() => setNominees((prev) => [...prev, emptyNominee()])}>
            <Plus className="h-3.5 w-3.5" /> Add nominee
          </Button>
        </div>

        {nominees.map((nominee) => (
          <NomineeEditor
            key={nominee.id}
            nominee={nominee}
            onChange={(patch) => updateNominee(nominee.id, patch)}
            onRemove={() => setNominees((prev) => prev.filter((n) => n.id !== nominee.id))}
            removable={nominees.length > 2 && !votesById.get(nominee.id)}
          />
        ))}
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Saving…" : initialData ? "Save changes" : "Launch campaign"}
        </Button>
      </div>
    </form>
  );
}
