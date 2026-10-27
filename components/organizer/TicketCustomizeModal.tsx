"use client";

import { useState } from "react";
import { X, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { uploadTicketLogo } from "@/lib/supabase/storage";
import type { TicketCustomization, ParticleVariant } from "@/components/tickets/types";

const ACCENT_PRESETS = [
  "#0f172a",
  "#7c3aed",
  "#1d4ed8",
  "#d4af37",
  "#ec4899",
  "#16a34a",
];

const OVERLAY_OPTIONS: { value: ParticleVariant; label: string }[] = [
  { value: "none", label: "None" },
  { value: "dots", label: "Dots" },
  { value: "geometric", label: "Geometric" },
  { value: "confetti", label: "Confetti" },
];

interface Props {
  value: TicketCustomization | null;
  onSave: (value: TicketCustomization) => void;
  onClose: () => void;
}

export function TicketCustomizeModal({ value, onSave, onClose }: Props) {
  const [logoUrl, setLogoUrl] = useState(value?.logoUrl || "");
  const [accentColor, setAccentColor] = useState(value?.accentColor || "");
  const [particleOverlay, setParticleOverlay] = useState<ParticleVariant>(
    value?.particleOverlay || "none"
  );
  const [uploading, setUploading] = useState(false);

  async function handleLogoUpload(file: File) {
    setUploading(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("You need to be logged in.");

      const url = await uploadTicketLogo(file, user.id);
      setLogoUrl(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Logo upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function handleSave() {
    onSave({
      logoUrl: logoUrl || undefined,
      accentColor: accentColor || undefined,
      particleOverlay,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">Customize Design</h2>

          <button type="button" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="space-y-5">
          <div>
            <Label>Logo</Label>

            <label
              htmlFor="ticket-logo"
              className="mt-1 flex h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm"
            >
              <ImagePlus size={16} />
              {uploading
                ? "Uploading..."
                : logoUrl
                ? "Logo uploaded — click to replace"
                : "Upload logo"}
            </label>

            <input
              id="ticket-logo"
              hidden
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoUpload(file);
              }}
            />

            {logoUrl && (
              <img
                src={logoUrl}
                alt=""
                className="mt-3 h-12 w-12 rounded-lg object-cover"
              />
            )}
          </div>

          <div>
            <Label>Accent color</Label>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {ACCENT_PRESETS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAccentColor(color)}
                  className={`h-8 w-8 rounded-full border-2 ${
                    accentColor === color ? "border-violet-600" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={color}
                />
              ))}

              <input
                type="color"
                value={accentColor || "#000000"}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-8 w-8 cursor-pointer rounded-full border border-slate-200 bg-transparent p-0"
              />
            </div>
          </div>

          <div>
            <Label>Particle overlay (optional)</Label>

            <div className="mt-2 grid grid-cols-4 gap-2">
              {OVERLAY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setParticleOverlay(opt.value)}
                  className={`rounded-xl border py-2 text-xs font-medium ${
                    particleOverlay === opt.value
                      ? "border-violet-600 bg-violet-50 text-violet-700"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Button className="mt-6 w-full" onClick={handleSave} disabled={uploading}>
          Save Customization
        </Button>
      </div>
    </div>
  );
}
