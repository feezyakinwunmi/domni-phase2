"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TicketTypeEditor, type TicketTypeDraft } from "./TicketTypeEditor";
import type { TicketTemplate } from "@/components/events/TicketTemplatePicker";
import type { RegistrationFieldDraft } from "./RegistrationFormBuilder";

export interface SectionDraft {
  id: string;
  title: string;
  description: string;
  ticketTypes: TicketTypeDraft[];
}

interface SectionEditorProps {
  section: SectionDraft;
  index: number;
  onChange: (patch: Partial<SectionDraft>) => void;
  onRemove: () => void;
  removable: boolean;
  eventTitle: string;
  templates: TicketTemplate[];
  plan: string;
  registrationFields: RegistrationFieldDraft[];
}

function emptyTicketType(): TicketTypeDraft {
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    price: "",
    quantity: "",
    maxPerBuyer: "",
    perksText: "",
    ticketTemplateId: null,
    templateCustomization: null,
  };
}

export function SectionEditor({
  section,
  index,
  onChange,
  onRemove,
  removable,
  eventTitle,
  templates,
  plan,
  registrationFields,
}: SectionEditorProps) {
  function updateTicketType(id: string, patch: Partial<TicketTypeDraft>) {
    onChange({
      ticketTypes: section.ticketTypes.map((tt) => (tt.id === id ? { ...tt, ...patch } : tt)),
    });
  }

  function addTicketType() {
    onChange({ ticketTypes: [...section.ticketTypes, emptyTicketType()] });
  }

  function removeTicketType(id: string) {
    onChange({ ticketTypes: section.ticketTypes.filter((tt) => tt.id !== id) });
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-violet-600">
              {index + 1}
            </span>
            <Label className="mb-0">Section name</Label>
          </div>
          <Input
            className="mt-1.5"
            value={section.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="e.g. Awards Night, Dinner, After Party"
          />
        </div>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="mt-8 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
            aria-label="Remove section"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-3">
        <Label>Section description</Label>
        <Input
          value={section.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Optional"
        />
      </div>

      <div className="mt-5 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Ticket types
        </p>
        {section.ticketTypes.map((tt) => (
          <TicketTypeEditor
            key={tt.id}
            ticketType={tt}
            onChange={(patch) => updateTicketType(tt.id, patch)}
            onRemove={() => removeTicketType(tt.id)}
            removable={section.ticketTypes.length > 1}
            eventTitle={eventTitle}
            templates={templates}
            plan={plan}
            registrationFields={registrationFields}
          />
        ))}

        <Button type="button" variant="secondary" size="sm" onClick={addTicketType}>
          <Plus className="h-3.5 w-3.5" /> Add ticket type
        </Button>
      </div>
    </div>
  );
}

export { emptyTicketType };
