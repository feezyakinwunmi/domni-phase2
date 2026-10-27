"use client";

import { useEffect, useState } from "react";
import { ImagePlus, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { uploadTicketLogo } from "@/lib/supabase/storage";
import { ScaledTicket, useSampleQr, type TicketSample } from "./TicketPreviewModal";
import type { ParticleVariant, TicketCustomization, TicketFinish, TicketFont } from "@/components/tickets/types";

const PALETTES: { name: string; accent: string; secondary: string }[] = [
  { name: "Classic Ink", accent: "#0f172a", secondary: "#6d5ae6" },
  { name: "Midnight Gold", accent: "#d4af37", secondary: "#141016" },
  { name: "Royal Violet", accent: "#a78bfa", secondary: "#1e1b4b" },
  { name: "Emerald Club", accent: "#34d399", secondary: "#064e3b" },
  { name: "Neon Pulse", accent: "#ec4899", secondary: "#6d28d9" },
  { name: "Ocean", accent: "#0ea5e9", secondary: "#0f172a" },
  { name: "Ruby", accent: "#e11d48", secondary: "#3f0d1b" },
  { name: "Champagne", accent: "#b08d57", secondary: "#f7f1e3" },
  { name: "Lagos Sunset", accent: "#f97316", secondary: "#7c2d12" },
  { name: "Mono", accent: "#e5e7eb", secondary: "#111827" },
];

const FONTS: { value: TicketFont; label: string; className: string }[] = [
  { value: "default", label: "Clean", className: "font-body" },
  { value: "display", label: "Bold", className: "font-display font-bold tracking-tight" },
  { value: "serif", label: "Elegant", className: "font-serif" },
  { value: "mono", label: "Technical", className: "font-mono" },
];

const FINISHES: { value: TicketFinish; label: string; swatch: string }[] = [
  { value: "none", label: "Matte", swatch: "linear-gradient(135deg,#e2e8f0,#cbd5e1)" },
  { value: "gloss", label: "Gloss", swatch: "linear-gradient(115deg,#cbd5e1 30%,#ffffff 45%,#cbd5e1 60%)" },
  { value: "foil", label: "Holo foil", swatch: "linear-gradient(125deg,#f0abfc,#fde68a,#67e8f9,#a78bfa)" },
  { value: "grain", label: "Paper grain", swatch: "repeating-radial-gradient(circle at 30% 30%,#e7e5e4 0 1px,#d6d3d1 1px 2px)" },
];

const OVERLAYS: { value: ParticleVariant; label: string }[] = [
  { value: "none", label: "None" },
  { value: "dots", label: "Dots" },
  { value: "geometric", label: "Lines" },
  { value: "waves", label: "Waves" },
  { value: "stars", label: "Stars" },
  { value: "confetti", label: "Confetti" },
];

const HEADLINE_IDEAS = ["Admit One", "VIP Access", "All Access", "Backstage", "Founders Circle", "Press Pass", "Guest List"];

const TOGGLES: { key: "showDate" | "showVenue" | "showExtraFields" | "showTicketNumber"; label: string }[] = [
  { key: "showDate", label: "Date & time" },
  { key: "showVenue", label: "Venue" },
  { key: "showExtraFields", label: "Attendee answers" },
  { key: "showTicketNumber", label: "Ticket number" },
];

interface Props {
  value: TicketCustomization | null;
  templateKey: string | null;
  sample: TicketSample;
  onSave: (value: TicketCustomization | null) => void;
  onClose: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      {children}
    </section>
  );
}

/** Strip unset keys so "reset" really falls back to the template's own look. */
function clean(c: TicketCustomization): TicketCustomization | null {
  const out = Object.fromEntries(Object.entries(c).filter(([, v]) => v !== undefined && v !== "")) as TicketCustomization;
  return Object.keys(out).length ? out : null;
}

export function TicketCustomizeModal({ value, templateKey, sample, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<TicketCustomization>(value ?? {});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const qr = useSampleQr();

  const set = (patch: Partial<TicketCustomization>) => setDraft((d) => ({ ...d, ...patch }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleLogoUpload(file: File) {
    setUploadError(null);
    if (!file.type.startsWith("image/")) return setUploadError("Please choose an image file.");
    if (file.size > 2 * 1024 * 1024) return setUploadError("Logo must be under 2 MB.");

    setUploading(true);
    try {
      const {
        data: { user },
      } = await createClient().auth.getUser();
      if (!user) throw new Error("Your session expired — please log in again.");
      set({ logoUrl: await uploadTicketLogo(file, user.id) });
    } catch (err) {
      setUploadError(
        err instanceof Error && /bucket/i.test(err.message)
          ? "The 'ticket-logos' storage bucket is missing in Supabase."
          : err instanceof Error
          ? err.message
          : "Logo upload failed."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-2 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-label="Ticket design studio">
      <div className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-ink-800">Design studio</h2>
            <p className="text-xs text-slate-500">Changes preview live. Nothing is saved until you click Apply.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[1fr_minmax(0,460px)] lg:overflow-hidden">
          {/* Live preview */}
          <div className="order-first flex items-start justify-center bg-[radial-gradient(circle_at_30%_20%,#ede9fe,transparent_60%),#f1f5f9] p-6 lg:order-last lg:overflow-y-auto">
            <div className="lg:sticky lg:top-0">
              <ScaledTicket
                templateKey={templateKey}
                customization={clean(draft)}
                maxWidth={420}
                data={{ ...sample, attendeeName: "Jane Doe", qr, ticketNumber: "DMN-7KQ2X9PA" }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-6 p-6 lg:overflow-y-auto">
            <Section title="Logo">
              <div className="flex items-center gap-3">
                {draft.logoUrl && <img src={draft.logoUrl} alt="" className="h-11 w-11 rounded-lg border object-cover" />}
                <label className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm hover:border-violet-300">
                  <ImagePlus size={16} />
                  {uploading ? "Uploading…" : draft.logoUrl ? "Replace" : "Upload logo"}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file);
                      e.target.value = "";
                    }}
                  />
                </label>
                {draft.logoUrl && (
                  <button type="button" className="text-xs text-slate-500 hover:text-red-500" onClick={() => set({ logoUrl: undefined })}>
                    Remove
                  </button>
                )}
              </div>
              {uploadError && <p className="mt-1.5 text-xs text-red-500">{uploadError}</p>}
            </Section>

            <Section title="Color palette">
              <div className="grid grid-cols-5 gap-2">
                {PALETTES.map((p) => {
                  const active = draft.accentColor === p.accent && draft.secondaryColor === p.secondary;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      title={p.name}
                      onClick={() => set({ accentColor: p.accent, secondaryColor: p.secondary })}
                      className={cn("group rounded-xl border p-1 transition", active ? "border-violet-500 ring-2 ring-violet-200" : "border-slate-200 hover:border-slate-300")}
                    >
                      <div className="h-8 rounded-lg" style={{ backgroundImage: `linear-gradient(135deg, ${p.secondary} 50%, ${p.accent} 50%)` }} />
                      <p className="mt-1 truncate text-[9px] text-slate-500">{p.name}</p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                {(["accentColor", "secondaryColor"] as const).map((key) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={draft[key] || (key === "accentColor" ? "#6d5ae6" : "#0f172a")}
                      onChange={(e) => set({ [key]: e.target.value })}
                      className="h-8 w-8 cursor-pointer rounded-lg border border-slate-200 bg-transparent p-0.5"
                    />
                    {key === "accentColor" ? "Accent" : "Base"}
                  </label>
                ))}
                {(draft.accentColor || draft.secondaryColor) && (
                  <button type="button" onClick={() => set({ accentColor: undefined, secondaryColor: undefined })} className="flex items-center gap-1 text-slate-400 hover:text-slate-700">
                    <RotateCcw className="h-3 w-3" /> Design default
                  </button>
                )}
              </div>
            </Section>

            <Section title="Typography">
              <div className="grid grid-cols-4 gap-2">
                {FONTS.map((f) => {
                  const active = (draft.fontStyle ?? "default") === f.value;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => set({ fontStyle: f.value === "default" ? undefined : f.value })}
                      className={cn("rounded-xl border py-2 text-center transition", active ? "border-violet-500 bg-violet-50" : "border-slate-200 hover:border-slate-300")}
                    >
                      <span className={cn("block text-xl text-ink-800", f.className)}>Aa</span>
                      <span className="text-[10px] text-slate-500">{f.label}</span>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="Finish">
              <div className="grid grid-cols-4 gap-2">
                {FINISHES.map((f) => {
                  const active = (draft.finish ?? "none") === f.value;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      onClick={() => set({ finish: f.value === "none" ? undefined : f.value })}
                      className={cn("rounded-xl border p-1 transition", active ? "border-violet-500 ring-2 ring-violet-200" : "border-slate-200 hover:border-slate-300")}
                    >
                      <div className="h-8 rounded-lg" style={{ backgroundImage: f.swatch }} />
                      <p className="mt-1 text-[10px] text-slate-500">{f.label}</p>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="Pattern">
              <div className="grid grid-cols-6 gap-1.5">
                {OVERLAYS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => set({ particleOverlay: o.value })}
                    className={cn(
                      "rounded-lg border py-2 text-[11px] font-medium transition",
                      draft.particleOverlay === o.value ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </Section>

            <Section title="Text">
              <Label>Headline</Label>
              <Input value={draft.headline ?? ""} maxLength={32} placeholder="Uses the design's default" onChange={(e) => set({ headline: e.target.value })} />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {HEADLINE_IDEAS.map((h) => (
                  <button key={h} type="button" onClick={() => set({ headline: h })} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600 hover:bg-violet-100 hover:text-violet-700">
                    {h}
                  </button>
                ))}
              </div>

              <Label className="mt-4">Footer note</Label>
              <Input
                value={draft.footerNote ?? ""}
                maxLength={120}
                placeholder="e.g. Non-transferable · Doors open 5 PM"
                onChange={(e) => set({ footerNote: e.target.value })}
              />
            </Section>

            <Section title="Show on ticket">
              <div className="grid grid-cols-2 gap-2">
                {TOGGLES.map((t) => {
                  const on = draft[t.key] ?? true;
                  return (
                    <label key={t.key} className="flex cursor-pointer items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      {t.label}
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-violet-600"
                        checked={on}
                        onChange={(e) => set({ [t.key]: e.target.checked ? undefined : false })}
                      />
                    </label>
                  );
                })}
              </div>
            </Section>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
          <button type="button" onClick={() => setDraft({})} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
            <RotateCcw className="h-3.5 w-3.5" /> Reset all
          </button>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={uploading}
              onClick={() => {
                onSave(clean(draft));
                onClose();
              }}
            >
              Apply design
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
