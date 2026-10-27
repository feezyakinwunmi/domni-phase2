"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ImagePlus, Loader2, Plus, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { SectionEditor, emptyTicketType, type SectionDraft } from "./SectionEditor";
import { RegistrationFormBuilder, type RegistrationFieldDraft } from "./RegistrationFormBuilder";
import { EventDetailsEditor } from "./EventDetailsEditor";
import type { TicketTemplate } from "@/components/events/TicketTemplatePicker";

import { createEvent, updateEvent } from "@/lib/actions/events";
import { createEventSchema } from "@/lib/validations/event";
import { formatZodIssue } from "@/lib/errors";
import { normalizeOptions, parseEventDetails, FIELD_TYPES, type EventDetails, type FieldType } from "@/lib/event-details";
import { toDateTimeLocal } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { uploadEventCover } from "@/lib/supabase/storage";

// Shape of the event the edit page passes in (Prisma row + relations).
export interface EventFormInitialData {
  id: string;
  title: string;
  description: string | null;
  venue: string | null;
  schoolName: string | null;
  coverImage: string | null;
  startsAt: Date | string;
  endsAt: Date | string | null;
  details: unknown;
  sections: {
    id: string;
    title: string;
    description: string | null;
    ticketTypes: {
      id: string;
      title: string;
      description: string | null;
      priceKobo: number;
      quantity: number;
      quantitySold: number;
      maxPerBuyer: number | null;
      perks: string[];
      ticketTemplateId: string | null;
      templateCustomization: unknown;
    }[];
  }[];
  registrationFields: {
    id: string;
    label: string;
    type: string;
    placeholder: string | null;
    required: boolean | null;
    options: unknown;
  }[];
}

interface EventFormProps {
  initialData?: EventFormInitialData;
  plan?: string;
  templates: TicketTemplate[];
}

const MAX_COVER_BYTES = 5 * 1024 * 1024;

function sectionsFromInitialData(initialData?: EventFormInitialData): SectionDraft[] | null {
  if (!initialData?.sections?.length) return null;

  return initialData.sections.map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description || "",
    ticketTypes: section.ticketTypes.map((tt) => ({
      id: tt.id,
      title: tt.title,
      description: tt.description || "",
      price: String(tt.priceKobo / 100),
      quantity: String(tt.quantity),
      maxPerBuyer: tt.maxPerBuyer != null ? String(tt.maxPerBuyer) : "",
      perksText: tt.perks.join(", "),
      quantitySold: tt.quantitySold,
      ticketTemplateId: tt.ticketTemplateId,
      templateCustomization: (tt.templateCustomization as SectionDraft["ticketTypes"][number]["templateCustomization"]) ?? null,
    })),
  }));
}

function registrationFieldsFromInitialData(initialData?: EventFormInitialData): RegistrationFieldDraft[] {
  return (initialData?.registrationFields ?? []).map((field) => ({
    id: field.id,
    label: field.label,
    type: ((FIELD_TYPES as readonly string[]).includes(field.type) ? field.type : "text") as FieldType,
    placeholder: field.placeholder || "",
    required: field.required ?? false,
    options: normalizeOptions(field.options),
  }));
}

function emptySection(): SectionDraft {
  return { id: crypto.randomUUID(), title: "", description: "", ticketTypes: [emptyTicketType()] };
}

export function EventForm({ initialData, plan = "FREE", templates }: EventFormProps) {
  const router = useRouter();
  const isEdit = !!initialData;

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [venue, setVenue] = useState(initialData?.venue ?? "");
  const [schoolName, setSchoolName] = useState(initialData?.schoolName ?? "");
  // Filled after mount: the server renders in UTC, the browser in local time,
  // so computing these during SSR would hydrate the inputs with the wrong hour.
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [details, setDetails] = useState<EventDetails>(() => parseEventDetails(initialData?.details));

  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState(initialData?.coverImage ?? "");
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  const [sections, setSections] = useState<SectionDraft[]>(() => sectionsFromInitialData(initialData) ?? [emptySection()]);
  const [registrationFields, setRegistrationFields] = useState<RegistrationFieldDraft[]>(() =>
    registrationFieldsFromInitialData(initialData)
  );

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStartsAt(toDateTimeLocal(initialData?.startsAt));
    setEndsAt(toDateTimeLocal(initialData?.endsAt));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Warn before leaving with unsaved changes so a stray back-swipe doesn't wipe a half-built event.
  useEffect(() => {
    if (!dirty || submitting) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, submitting]);

  useEffect(() => {
    if (!coverFile) return setCoverPreview(null);
    const url = URL.createObjectURL(coverFile);
    setCoverPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);

  const previewDate = useMemo(() => {
    if (!startsAt) return "";
    const d = new Date(startsAt);
    return Number.isNaN(d.getTime())
      ? ""
      : `${d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} · ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }, [startsAt]);

  function updateSection(id: string, patch: Partial<SectionDraft>) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function moveSection(from: number, to: number) {
    if (to < 0 || to >= sections.length) return;
    setSections((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function showError(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }

  function buildPayload(cover: string) {
    return {
      title,
      description,
      venue,
      schoolName,
      coverImageUrl: cover,
      // datetime-local has no timezone; convert in the browser so the
      // organizer's local time is what gets stored.
      startsAt: startsAt ? new Date(startsAt).toISOString() : "",
      endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
      details: {
        ...details,
        extras: details.extras.filter((x) => x.label.trim() || x.value.trim()),
      },
      registrationFields: registrationFields.map(({ id, label, type, placeholder, required, options }) => ({
        id,
        label,
        type,
        placeholder,
        required,
        options,
      })),
      sections: sections.map((section) => ({
        id: section.id,
        title: section.title,
        description: section.description,
        ticketTypes: section.ticketTypes.map((ticket) => ({
          id: ticket.id,
          title: ticket.title,
          description: ticket.description,
          price: ticket.price.trim() === "" ? 0 : Number(ticket.price),
          quantity: ticket.quantity.trim() === "" ? NaN : Number(ticket.quantity),
          maxPerBuyer: ticket.maxPerBuyer.trim() === "" ? undefined : Number(ticket.maxPerBuyer),
          perks: ticket.perksText.split(",").map((x) => x.trim()).filter(Boolean),
          ticketTemplateId: ticket.ticketTemplateId,
          templateCustomization: ticket.templateCustomization,
        })),
      })),
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate before uploading the cover so a typo doesn't cost an upload.
    const preflight = createEventSchema.safeParse(buildPayload(coverUrl || ""));
    if (!preflight.success) return showError(formatZodIssue(preflight.error.issues[0]));

    setSubmitting(true);
    try {
      let cover = coverUrl;
      if (coverFile) {
        const {
          data: { user },
        } = await createClient().auth.getUser();
        if (!user) throw new Error("Your session expired — please log in again.");
        try {
          cover = await uploadEventCover(coverFile, user.id);
        } catch (err) {
          throw new Error(
            err instanceof Error && /bucket/i.test(err.message)
              ? "Cover upload failed: the 'event-covers' storage bucket is missing in Supabase."
              : "Cover upload failed. Try a smaller image or remove it."
          );
        }
        setCoverUrl(cover);
        setCoverFile(null);
      }

      const payload = buildPayload(cover);
      const result = isEdit ? await updateEvent(initialData.id, payload) : await createEvent(payload);

      if (!result.ok) {
        setSubmitting(false);
        return showError(result.error);
      }

      setDirty(false);
      router.push(`/organizer/events/${result.eventId}?${isEdit ? "updated" : "created"}=true`);
      router.refresh();
    } catch (err) {
      setSubmitting(false);
      showError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6"
      noValidate
      onChangeCapture={() => setDirty(true)}
      onDropCapture={() => setDirty(true)}
      onKeyDown={(e) => {
        // Enter in a text box (field label, option, headline…) shouldn't save the whole event.
        const el = e.target as HTMLElement;
        if (e.key === "Enter" && el.tagName === "INPUT" && (el as HTMLInputElement).type !== "submit") e.preventDefault();
      }}
      onClickCapture={(e) => {
        if ((e.target as HTMLElement).closest("button[type=button]")) setDirty(true);
      }}
    >
      <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Event details</p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="event-title">Event name</Label>
            <Input id="event-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Founders' Night 2026" />
          </div>

          <div>
            <Label htmlFor="starts-at">Starts at</Label>
            <Input id="starts-at" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="ends-at">Ends at <span className="font-normal text-slate-400">(optional)</span></Label>
            <Input id="ends-at" type="datetime-local" value={endsAt} min={startsAt || undefined} onChange={(e) => setEndsAt(e.target.value)} />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="event-description">Description</Label>
            <textarea
              id="event-description"
              rows={4}
              maxLength={5000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's happening, who it's for, what to expect…"
              className="w-full rounded-xl border border-slate-100 bg-white px-4 py-3 text-sm text-ink-800 placeholder:text-slate-400 focus:border-violet-400"
            />
          </div>

          <div className="sm:col-span-2">
            <Label>Cover image</Label>
            <div className="flex flex-wrap items-center gap-3">
              {(coverPreview || coverUrl) && (
                <div className="relative">
                  <img src={coverPreview || coverUrl} alt="Cover preview" className="h-20 w-32 rounded-xl object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverFile(null);
                      setCoverUrl("");
                    }}
                    className="absolute -right-2 -top-2 rounded-full bg-white p-1 shadow"
                    aria-label="Remove cover image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
              <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-100 px-4 text-sm hover:border-violet-300">
                <ImagePlus size={16} />
                {coverFile ? coverFile.name : coverUrl ? "Replace image" : "Upload image"}
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    e.target.value = "";
                    if (!file) return;
                    if (!file.type.startsWith("image/")) return showError("The cover must be an image.");
                    if (file.size > MAX_COVER_BYTES) return showError("The cover image must be under 5 MB.");
                    setError(null);
                    setCoverFile(file);
                  }}
                />
              </label>
              <span className="text-xs text-slate-400">JPG or PNG, up to 5 MB. 16:9 looks best.</span>
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Labels & extra info</p>
          <EventDetailsEditor
            details={details}
            onDetailsChange={(patch) => setDetails((d) => ({ ...d, ...patch }))}
            hostValue={schoolName}
            onHostValueChange={setSchoolName}
            venueValue={venue}
            onVenueValueChange={setVenue}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sections & tickets</p>
          <Button type="button" variant="secondary" size="sm" onClick={() => setSections((s) => [...s, emptySection()])}>
            <Plus size={14} /> Add section
          </Button>
        </div>

        {sections.map((section, index) => (
          <SectionEditor
            key={section.id}
            section={section}
            index={index}
            count={sections.length}
            onMove={moveSection}
            eventTitle={title}
            eventDate={previewDate}
            venue={venue}
            details={details}
            templates={templates}
            plan={plan}
            registrationFields={registrationFields}
            onChange={(patch) => updateSection(section.id, patch)}
            onRemove={() => setSections((s) => s.filter((x) => x.id !== section.id))}
            removable={sections.length > 1 && section.ticketTypes.every((t) => t.quantitySold === 0)}
          />
        ))}
      </div>

      <RegistrationFormBuilder
        fields={registrationFields}
        onChange={setRegistrationFields}
        nameLabel={details.nameLabel}
        emailLabel={details.emailLabel}
        onLabelsChange={(patch) => setDetails((d) => ({ ...d, ...patch }))}
      />

      {error && (
        <div ref={errorRef} role="alert" className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button type="submit" disabled={submitting} className="shadow-lg">
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Saving…" : isEdit ? "Save changes" : "Create event"}
        </Button>
      </div>
    </form>
  );
}
