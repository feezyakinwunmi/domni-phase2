"use client";

import { useState } from "react";
import { Camera, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Downscale to ≤ maxSide px JPEG in the browser so uploads are quick on mobile data. */
async function compressImage(file: File, maxSide = 900): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("decode"));
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.86)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

interface Props {
  id: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string | null;
  invalid?: boolean;
  /** Builder preview: pick a file locally without uploading anything. */
  previewOnly?: boolean;
}

export function PhotoField({ id, value, onChange, hint, invalid, previewOnly }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    if (!file.type.startsWith("image/")) return setError("Please choose an image.");

    if (previewOnly) return onChange(URL.createObjectURL(file));

    setUploading(true);
    try {
      let blob: Blob;
      try {
        blob = await compressImage(file);
      } catch {
        throw new Error("This photo format isn't supported. Please use a JPG or PNG.");
      }
      const body = new FormData();
      body.append("file", blob, "photo.jpg");
      const res = await fetch("/api/uploads/attendee-photo", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed. Please try again.");
      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className={cn("flex items-center gap-4 rounded-xl border border-dashed p-3", invalid ? "border-red-300" : "border-slate-200")}>
        <div className="relative flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100">
          {value ? (
            <img src={value} alt="Your photo" className="h-full w-full object-cover" />
          ) : (
            <Camera className="h-7 w-7 text-slate-400" />
          )}
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <label
              htmlFor={id}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700"
            >
              {value ? <RefreshCw className="h-3.5 w-3.5" /> : <Camera className="h-3.5 w-3.5" />}
              {uploading ? "Uploading…" : value ? "Change photo" : "Add photo"}
            </label>
            {value && !uploading && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-slate-500 hover:bg-slate-100 hover:text-red-600"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs text-slate-400">{hint || "A clear, front-facing photo. It will appear on your ticket."}</p>
          <input
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            capture="user"
            className="sr-only"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) handleFile(file);
            }}
          />
        </div>
      </div>
      {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
    </div>
  );
}
