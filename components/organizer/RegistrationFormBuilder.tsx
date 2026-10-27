"use client";

import { useState } from "react";
import { ChevronDown, Copy, Eye, EyeOff, Lock, Plus, Trash2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { DragHandle, MoveButtons, PRESET_MIME, useSortable } from "@/components/ui/sortable";
import { RegistrationFields } from "@/components/forms/RegistrationFields";
import { cn } from "@/lib/utils";
import {
  FIELD_PRESETS,
  FIELD_TYPE_LABELS,
  FIELD_TYPES,
  isChoiceType,
  type FieldType,
  type FieldPreset,
} from "@/lib/event-details";

export interface RegistrationFieldDraft {
  id: string;
  label: string;
  type: FieldType;
  placeholder: string;
  required: boolean;
  options: string[];
}

interface Props {
  fields: RegistrationFieldDraft[];
  onChange: (fields: RegistrationFieldDraft[]) => void;
  nameLabel: string;
  emailLabel: string;
  onLabelsChange: (patch: { nameLabel?: string; emailLabel?: string }) => void;
}

const GROUPS: { key: FieldPreset["group"]; title: string }[] = [
  { key: "basic", title: "Field types" },
  { key: "people", title: "About the attendee" },
  { key: "logistics", title: "Logistics" },
];

function fromPreset(preset: FieldPreset): RegistrationFieldDraft {
  return {
    id: crypto.randomUUID(),
    label: preset.group === "basic" ? "" : preset.label,
    type: preset.type,
    placeholder: preset.placeholder ?? "",
    required: false,
    options: preset.options ?? [],
  };
}

function OptionsEditor({ options, onChange }: { options: string[]; onChange: (o: string[]) => void }) {
  const [draft, setDraft] = useState("");

  function add(raw: string) {
    // Pasting "A, B, C" adds three options at once.
    const incoming = raw
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter((s) => s && !options.includes(s));
    if (incoming.length) onChange([...options, ...incoming]);
    setDraft("");
  }

  return (
    <div>
      <Label>Options</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt, i) => (
          <span key={opt} className="inline-flex items-center gap-1 rounded-full bg-violet-50 py-1 pl-3 pr-1 text-xs font-medium text-violet-700">
            <input
              className="w-auto min-w-[2ch] bg-transparent outline-none"
              size={Math.max(2, opt.length)}
              value={opt}
              onChange={(e) => {
                const next = [...options];
                next[i] = e.target.value.replace(/,/g, "");
                onChange(next);
              }}
              onBlur={() => onChange(options.map((o) => o.trim()).filter(Boolean))}
              aria-label={`Option ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => onChange(options.filter((_, j) => j !== i))}
              className="rounded-full p-0.5 hover:bg-violet-100"
              aria-label={`Remove ${opt}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <Input
          value={draft}
          placeholder="Type an option and press Enter (or paste a list)"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add(draft);
            }
          }}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (/[,\n]/.test(text)) {
              e.preventDefault();
              add(text);
            }
          }}
        />
        <Button type="button" variant="secondary" size="sm" className="h-11" onClick={() => add(draft)} disabled={!draft.trim()}>
          Add
        </Button>
      </div>
    </div>
  );
}

export function RegistrationFormBuilder({ fields, onChange, nameLabel, emailLabel, onLabelsChange }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState({ name: "", email: "", answers: {} as Record<string, string> });

  function insertAt(field: RegistrationFieldDraft, index = fields.length) {
    const next = [...fields];
    next.splice(index, 0, field);
    onChange(next);
    setExpandedId(field.id);
  }

  function addPreset(key: string, index?: number) {
    const preset = FIELD_PRESETS.find((p) => p.key === key);
    if (!preset) return;
    const existingPhoto = preset.type === "photo" && fields.find((f) => f.type === "photo");
    // One photo per attendee is all a ticket can show — jump to the existing field instead.
    if (existingPhoto) return setExpandedId(existingPhoto.id);
    insertAt(fromPreset(preset), index);
  }

  const sortable = useSortable(fields, onChange, addPreset);

  function update(id: string, patch: Partial<RegistrationFieldDraft>) {
    onChange(fields.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function duplicate(index: number) {
    const src = fields[index];
    insertAt({ ...src, id: crypto.randomUUID(), label: `${src.label} (copy)` }, index + 1);
  }

  function changeType(field: RegistrationFieldDraft, type: FieldType) {
    update(field.id, {
      type,
      options: isChoiceType(type) && field.options.length === 0 ? ["Option 1", "Option 2"] : field.options,
    });
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ink-800">Registration form</h3>
          <p className="text-sm text-slate-500">
            Pick fields from the library (click or drag), rename anything, and drag to reorder.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => setPreviewing((p) => !p)}>
          {previewing ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {previewing ? "Back to editing" : "Preview form"}
        </Button>
      </div>

      {previewing ? (
        <div className="mx-auto max-w-md rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-400">What attendees will see</p>
          <RegistrationFields
            idPrefix="preview"
            previewOnly
            nameLabel={nameLabel || "Full Name"}
            emailLabel={emailLabel || "Email"}
            name={preview.name}
            email={preview.email}
            onNameChange={(name) => setPreview((p) => ({ ...p, name }))}
            onEmailChange={(email) => setPreview((p) => ({ ...p, email }))}
            fields={fields.filter((f) => f.label.trim()).map((f) => ({ ...f, placeholder: f.placeholder || null }))}
            answers={preview.answers}
            onAnswerChange={(id, v) => setPreview((p) => ({ ...p, answers: { ...p.answers, [id]: v } }))}
          />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
          {/* Field library */}
          <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
            {GROUPS.map((group) => (
              <div key={group.key}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{group.title}</p>
                <div className="flex flex-wrap gap-1.5 lg:flex-col">
                  {FIELD_PRESETS.filter((p) => p.group === group.key).map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(PRESET_MIME, preset.key);
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => addPreset(preset.key)}
                      className="flex cursor-grab items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-left text-xs font-medium text-slate-600 transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 active:cursor-grabbing"
                    >
                      {preset.label}
                      <Plus className="h-3 w-3 flex-shrink-0 opacity-50" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </aside>

          {/* Canvas */}
          <div className="space-y-2" {...sortable.containerProps}>
            {/* Built-in fields: always collected (needed to deliver the ticket) but renameable */}
            {[
              { key: "nameLabel" as const, value: nameLabel, placeholder: "Full Name", hint: "Name on the ticket" },
              { key: "emailLabel" as const, value: emailLabel, placeholder: "Email", hint: "Where the ticket is sent" },
            ].map((builtin) => (
              <div key={builtin.key} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                <Lock className="h-4 w-4 flex-shrink-0 text-slate-300" aria-hidden="true" />
                <input
                  className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink-800 outline-none placeholder:text-slate-400"
                  value={builtin.value}
                  placeholder={builtin.placeholder}
                  aria-label={`Label for ${builtin.placeholder}`}
                  maxLength={40}
                  onChange={(e) => onLabelsChange({ [builtin.key]: e.target.value })}
                />
                <span className="hidden text-xs text-slate-400 sm:inline">{builtin.hint}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-500">Required</span>
              </div>
            ))}

            {fields.map((field, index) => {
              const open = expandedId === field.id;
              const isOver = sortable.overIndex === index;

              return (
                <div
                  key={field.id}
                  {...sortable.itemProps(field.id, index)}
                  className={cn(
                    "rounded-xl border bg-white transition",
                    isOver ? "border-violet-400 ring-2 ring-violet-100" : "border-slate-200",
                    sortable.draggingId === field.id && "opacity-40"
                  )}
                >
                  <div className="flex items-center gap-1.5 px-2 py-2">
                    <DragHandle {...sortable.handleProps(field.id, index)} />
                    <MoveButtons index={index} count={fields.length} onMove={sortable.move} />

                    <input
                      className="min-w-0 flex-1 bg-transparent px-1 text-sm font-medium text-ink-800 outline-none placeholder:text-red-400"
                      value={field.label}
                      placeholder="Untitled field — add a label"
                      aria-label="Field label"
                      maxLength={80}
                      onChange={(e) => update(field.id, { label: e.target.value })}
                    />

                    <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 sm:inline">
                      {FIELD_TYPE_LABELS[field.type]}
                    </span>

                    <button
                      type="button"
                      onClick={() => update(field.id, { required: !field.required })}
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold transition",
                        field.required ? "bg-violet-100 text-violet-700" : "bg-slate-50 text-slate-400 hover:text-slate-600"
                      )}
                      aria-pressed={field.required}
                    >
                      {field.required ? "Required" : "Optional"}
                    </button>

                    <button type="button" onClick={() => duplicate(index)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Duplicate field">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange(fields.filter((f) => f.id !== field.id))}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      aria-label="Remove field"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedId(open ? null : field.id)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      aria-expanded={open}
                      aria-label={open ? "Collapse field settings" : "Expand field settings"}
                    >
                      <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
                    </button>
                  </div>

                  {open && (
                    <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-2">
                      <div>
                        <Label>Answer type</Label>
                        <select
                          className="h-11 w-full rounded-xl border border-slate-100 bg-white px-3 text-sm"
                          value={field.type}
                          onChange={(e) => changeType(field, e.target.value as FieldType)}
                        >
                          {FIELD_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {FIELD_TYPE_LABELS[t]}
                            </option>
                          ))}
                        </select>
                      </div>

                      {field.type !== "radio" && field.type !== "checkbox" && (
                        <div>
                          <Label>{field.type === "select" ? "Prompt text" : field.type === "photo" ? "Instructions" : "Placeholder"}</Label>
                          <Input
                            value={field.placeholder}
                            placeholder="Optional hint shown in the box"
                            maxLength={120}
                            onChange={(e) => update(field.id, { placeholder: e.target.value })}
                          />
                        </div>
                      )}

                      {isChoiceType(field.type) && (
                        <div className="sm:col-span-2">
                          <OptionsEditor options={field.options} onChange={(options) => update(field.id, { options })} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            <div
              className={cn(
                "flex min-h-[64px] items-center justify-center rounded-xl border-2 border-dashed px-4 text-center text-xs text-slate-400 transition",
                sortable.overIndex === null && sortable.draggingId === null ? "border-slate-200" : "border-violet-300 bg-violet-50/50"
              )}
            >
              {fields.length === 0
                ? "Drag fields here, or click one in the library, to ask attendees more questions."
                : "Drop here to add at the end"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
