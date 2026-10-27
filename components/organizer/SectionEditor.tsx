"use client";

import { Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MoveButtons } from "@/components/ui/sortable";
import { TicketTypeEditor, type TicketTypeDraft } from "./TicketTypeEditor";
import type { TicketTemplate } from "@/components/events/TicketTemplatePicker";
import type { RegistrationFieldDraft } from "./RegistrationFormBuilder";
import type { EventDetails } from "@/lib/event-details";

export interface SectionDraft {
  id: string;
  title: string;
  description: string;
  ticketTypes: TicketTypeDraft[];
}

interface SectionEditorProps {
  section: SectionDraft;
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onChange: (patch: Partial<SectionDraft>) => void;
  onRemove: () => void;
  removable: boolean;
  eventTitle: string;
  eventDate: string;
  venue: string;
  details: EventDetails;
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
    quantitySold: 0,
    ticketTemplateId: null,
    templateCustomization: null,
  };
}

export function SectionEditor({
  section,
  index,
  count,
  onMove,
  onChange,
  onRemove,
  removable,
  ...shared
}: SectionEditorProps) {
  const ticketTypes = section.ticketTypes;

  function updateTicketType(id: string, patch: Partial<TicketTypeDraft>) {
    onChange({ ticketTypes: ticketTypes.map((tt) => (tt.id === id ? { ...tt, ...patch } : tt)) });
  }

  function moveTicketType(from: number, to: number) {
    if (to < 0 || to >= ticketTypes.length) return;
    const next = [...ticketTypes];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange({ ticketTypes: next });
  }

  function duplicateTicketType(index: number) {
    const src = ticketTypes[index];
    const copy: TicketTypeDraft = { ...src, id: crypto.randomUUID(), title: `${src.title} (copy)`, quantitySold: 0 };
    const next = [...ticketTypes];
    next.splice(index + 1, 0, copy);
    onChange({ ticketTypes: next });
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-soft">
      <div className="flex items-start gap-3">
        {count > 1 && <MoveButtons index={index} count={count} onMove={onMove} className="mt-7" />}
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
            placeholder="e.g. General Admission, Awards Night, Workshop Day 1"
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
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ticket types</p>
        {ticketTypes.map((tt, ttIndex) => (
          <TicketTypeEditor
            key={tt.id}
            ticketType={tt}
            index={ttIndex}
            count={ticketTypes.length}
            onMove={moveTicketType}
            onDuplicate={() => duplicateTicketType(ttIndex)}
            onChange={(patch) => updateTicketType(tt.id, patch)}
            onRemove={() => onChange({ ticketTypes: ticketTypes.filter((t) => t.id !== tt.id) })}
            removable={ticketTypes.length > 1 && tt.quantitySold === 0}
            {...shared}
          />
        ))}

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => onChange({ ticketTypes: [...ticketTypes, emptyTicketType()] })}
        >
          <Plus className="h-3.5 w-3.5" /> Add ticket type
        </Button>
      </div>
    </div>
  );
}

export { emptyTicketType };
