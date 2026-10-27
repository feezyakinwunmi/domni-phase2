"use client";

import { useState } from "react";
import { Trash2, Eye, Sparkles } from "lucide-react";
import { CreatableSelect } from "@/components/ui/creatable-select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TICKET_TYPE_PRESETS } from "@/lib/constants/ticket-presets";
import { TicketDesignPicker } from "./TicketDesignPicker";
import { TicketCustomizeModal } from "./TicketCustomizeModal";
import { TicketPreviewModal } from "./TicketPreviewModal";
import type { TicketTemplate } from "@/components/events/TicketTemplatePicker";
import type { TicketCustomization } from "@/components/tickets/types";
import type { RegistrationFieldDraft } from "./RegistrationFormBuilder";

export interface TicketTypeDraft {
  id: string;
  title: string;
  description: string;
  price: string;
  quantity: string;
  maxPerBuyer: string;
  perksText: string; // comma-separated, split into an array on submit
  ticketTemplateId: string | null;
  templateCustomization: TicketCustomization | null;
}

interface TicketTypeEditorProps {
  ticketType: TicketTypeDraft;
  onChange: (patch: Partial<TicketTypeDraft>) => void;
  onRemove: () => void;
  removable: boolean;
  eventTitle: string;
  templates: TicketTemplate[];
  plan: string;
  registrationFields: RegistrationFieldDraft[];
}

export function TicketTypeEditor({
  ticketType,
  onChange,
  onRemove,
  removable,
  eventTitle,
  templates,
  plan,
  registrationFields,
}: TicketTypeEditorProps) {
  const [customizing, setCustomizing] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const isPro = plan === "PRO";
  const selectedTemplate = templates.find((t) => t.id === ticketType.ticketTemplateId);

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <Label>Ticket name</Label>
          <CreatableSelect
            value={ticketType.title}
            onChange={(title) => onChange({ title })}
            options={TICKET_TYPE_PRESETS}
            placeholder="e.g. VIP, or type your own"
          />
        </div>
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

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <Label>Price (₦)</Label>
          <Input
            type="number"
            min={0}
            value={ticketType.price}
            onChange={(e) => onChange({ price: e.target.value })}
            placeholder="5000"
          />
        </div>
        <div>
          <Label>Quantity</Label>
          <Input
            type="number"
            min={1}
            value={ticketType.quantity}
            onChange={(e) => onChange({ quantity: e.target.value })}
            placeholder="100"
          />
        </div>
        <div>
          <Label>Max per buyer</Label>
          <Input
            type="number"
            min={1}
            value={ticketType.maxPerBuyer}
            onChange={(e) => onChange({ maxPerBuyer: e.target.value })}
            placeholder="Optional"
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
        <div className="mb-3 flex items-center justify-between">
          <Label className="mb-0">Ticket design</Label>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!isPro}
              title={isPro ? undefined : "Upgrade to Pro to customize designs"}
              onClick={() => setCustomizing(true)}
            >
              <Sparkles className="h-3.5 w-3.5" /> Customize
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!ticketType.ticketTemplateId}
              onClick={() => setPreviewing(true)}
            >
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
          onSave={(customization) => onChange({ templateCustomization: customization })}
          onClose={() => setCustomizing(false)}
        />
      )}

      {previewing && (
        <TicketPreviewModal
          eventTitle={eventTitle}
          ticketTypeTitle={ticketType.title}
          templateKey={selectedTemplate?.templateKey ?? null}
          customization={ticketType.templateCustomization}
          registrationFields={registrationFields}
          onClose={() => setPreviewing(false)}
        />
      )}
    </div>
  );
}
