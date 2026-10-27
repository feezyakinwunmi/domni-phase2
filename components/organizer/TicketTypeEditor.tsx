"use client";

import { useState } from "react";
import { Copy, Eye, Lock, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { CreatableSelect } from "@/components/ui/creatable-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MoveButtons } from "@/components/ui/sortable";
import { TICKET_TYPE_PRESETS } from "@/lib/constants/ticket-presets";
import { TicketDesignPicker } from "./TicketDesignPicker";
import { TicketCustomizeModal } from "./TicketCustomizeModal";
import { TicketPreviewModal } from "./TicketPreviewModal";
import type { TicketTemplate } from "@/components/events/TicketTemplatePicker";
import type { TicketCustomization } from "@/components/tickets/types";
import type { RegistrationFieldDraft } from "./RegistrationFormBuilder";
import type { EventDetails } from "@/lib/event-details";

// Neutral silhouette shown in previews when the form collects attendee photos.
const SAMPLE_PHOTO =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23cbd5e1'/%3E%3Ccircle cx='40' cy='31' r='14' fill='%23f8fafc'/%3E%3Cpath d='M14 76c2-16 13-24 26-24s24 8 26 24z' fill='%23f8fafc'/%3E%3C/svg%3E";

export interface TicketTypeDraft {
  id: string;
  title: string;
  description: string;
  price: string;
  quantity: string;
  maxPerBuyer: string;
  perksText: string; // comma-separated, split into an array on submit
  quantitySold: number;
  ticketTemplateId: string | null;
  templateCustomization: TicketCustomization | null;
}

interface TicketTypeEditorProps {
  ticketType: TicketTypeDraft;
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  onDuplicate: () => void;
  onChange: (patch: Partial<TicketTypeDraft>) => void;
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

export function TicketTypeEditor({
  ticketType,
  index,
  count,
  onMove,
  onDuplicate,
  onChange,
  onRemove,
  removable,
  eventTitle,
  eventDate,
  venue,
  templates,
  plan,
  registrationFields,
}: TicketTypeEditorProps) {
  const [customizing, setCustomizing] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const isPro = plan === "PRO";
  const selectedTemplate = templates.find((t) => t.id === ticketType.ticketTemplateId);
  const sampleData = {
    eventName: eventTitle || "Your Event",
    ticketType: ticketType.title || "Ticket",
    date: eventDate || "Sat, 1 Jan · 6:00 PM",
    venue: venue || "Venue TBA",
    photoUrl: registrationFields.some((f) => f.type === "photo") ? SAMPLE_PHOTO : null,
    extraFields: registrationFields
      .filter((f) => f.label.trim() && f.type !== "photo")
      .slice(0, 4)
      .map((f) => ({ label: f.label, value: f.options[0] || f.placeholder || `Sample` })),
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-start gap-2">
        {count > 1 && <MoveButtons index={index} count={count} onMove={onMove} className="mt-7" />}
        <div className="flex-1">
          <Label>Ticket name</Label>
          <CreatableSelect
            value={ticketType.title}
            onChange={(title) => onChange({ title })}
            options={TICKET_TYPE_PRESETS}
            placeholder="e.g. VIP, or type your own"
          />
        </div>
        <button
          type="button"
          onClick={onDuplicate}
          className="mt-7 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Duplicate ticket type"
        >
          <Copy className="h-4 w-4" />
        </button>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className="mt-7 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
            aria-label="Remove ticket type"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {ticketType.quantitySold > 0 && (
        <p className="mt-2 text-xs text-amber-600">
          {ticketType.quantitySold} sold — this ticket can't be removed and its quantity can't go below that.
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <Label>Price (₦)</Label>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={ticketType.price}
            onChange={(e) => onChange({ price: e.target.value })}
            placeholder="0 = free"
          />
        </div>
        <div>
          <Label>Quantity</Label>
          <Input
            type="number"
            inputMode="numeric"
            min={Math.max(1, ticketType.quantitySold)}
            value={ticketType.quantity}
            onChange={(e) => onChange({ quantity: e.target.value })}
            placeholder="100"
          />
        </div>
        <div>
          <Label>Max per buyer</Label>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={ticketType.maxPerBuyer}
            onChange={(e) => onChange({ maxPerBuyer: e.target.value })}
            placeholder="No limit"
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label>Perks</Label>
          <Input
            value={ticketType.perksText}
            onChange={(e) => onChange({ perksText: e.target.value })}
            placeholder="Comma-separated"
          />
        </div>
      </div>

      <div className="mt-3">
        <Label>Description</Label>
        <Input
          value={ticketType.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="What's included with this ticket?"
        />
      </div>

      <div className="mt-5 border-t border-slate-200 pt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <Label className="mb-0">Ticket design</Label>

          <div className="flex items-center gap-2">
            {isPro ? (
              <Button type="button" variant="secondary" size="sm" onClick={() => setCustomizing(true)}>
                <Sparkles className="h-3.5 w-3.5" />
                {ticketType.templateCustomization ? "Edit design" : "Customize"}
              </Button>
            ) : (
              <Link
                href="/organizer/settings"
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-4 text-[13px] font-medium text-amber-700 hover:bg-amber-100"
              >
                <Lock className="h-3.5 w-3.5" /> Customize (Pro)
              </Link>
            )}

            <Button type="button" variant="secondary" size="sm" onClick={() => setPreviewing(true)}>
              <Eye className="h-3.5 w-3.5" /> Preview
            </Button>
          </div>
        </div>

        <TicketDesignPicker
          templates={templates}
          value={ticketType.ticketTemplateId}
          plan={plan}
          onChange={(id) => onChange({ ticketTemplateId: id })}
        />
      </div>

      {customizing && (
        <TicketCustomizeModal
          value={ticketType.templateCustomization}
          templateKey={selectedTemplate?.templateKey ?? null}
          sample={sampleData}
          onSave={(customization) => onChange({ templateCustomization: customization })}
          onClose={() => setCustomizing(false)}
        />
      )}

      {previewing && (
        <TicketPreviewModal
          templateKey={selectedTemplate?.templateKey ?? null}
          customization={ticketType.templateCustomization}
          sample={sampleData}
          onClose={() => setPreviewing(false)}
        />
      )}
    </div>
  );
}
