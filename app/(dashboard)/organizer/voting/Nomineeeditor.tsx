"use client";

import { Trash2, UserRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface NomineeDraft {
  id: string;
  name: string;
  bio: string;
  imageFile: File | null;
  imagePreview: string;
}

interface NomineeEditorProps {
  nominee: NomineeDraft;
  onChange: (patch: Partial<NomineeDraft>) => void;
  onRemove: () => void;
  removable: boolean;
}

export function NomineeEditor({ nominee, onChange, onRemove, removable }: NomineeEditorProps) {
  function handleFile(file: File | null) {
    if (!file) {
      onChange({ imageFile: null, imagePreview: "" });
      return;
    }
    onChange({ imageFile: file, imagePreview: URL.createObjectURL(file) });
  }

  return (
    <div className="flex items-start gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <label className="relative flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-slate-200 bg-white text-slate-400 hover:border-violet-300">
        {nominee.imagePreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={nominee.imagePreview} alt="" className="h-full w-full object-cover" />
        ) : (
          <UserRound className="h-6 w-6" />
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </label>

      <div className="flex-1 space-y-2">
        <div>
          <Label className="mb-1">Name</Label>
          <Input
            value={nominee.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Nominee name"
          />
        </div>
        <div>
          <Label className="mb-1">Bio</Label>
          <Input
            value={nominee.bio}
            onChange={(e) => onChange({ bio: e.target.value })}
            placeholder="Optional — a line about them"
          />
        </div>
      </div>

      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="mt-1 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
          aria-label="Remove nominee"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}