"use client";

import { Plus, Trash2 } from "lucide-react";
import { CreatableSelect } from "@/components/ui/creatable-select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DragHandle, MoveButtons, useSortable } from "@/components/ui/sortable";
import { cn } from "@/lib/utils";
import {
  EXTRA_DETAIL_PRESETS,
  HOST_LABEL_PRESETS,
  VENUE_LABEL_PRESETS,
  type EventDetails,
  type EventExtra,
} from "@/lib/event-details";

interface Props {
  details: EventDetails;
  onDetailsChange: (patch: Partial<EventDetails>) => void;
  hostValue: string;
  onHostValueChange: (v: string) => void;
  venueValue: string;
  onVenueValueChange: (v: string) => void;
}

/** One "label: value" row where the label is pick-from-presets-or-type-your-own. */
function LabeledRow({
  label,
  onLabelChange,
  presets,
  value,
  onValueChange,
  valuePlaceholder,
}: {
  label: string;
  onLabelChange: (v: string) => void;
  presets: readonly string[];
  value: string;
  onValueChange: (v: string) => void;
  valuePlaceholder: string;
}) {
  return (
    <div className="grid flex-1 gap-2 sm:grid-cols-[180px_1fr]">
      <CreatableSelect value={label} onChange={onLabelChange} options={presets} placeholder="Label" />
      <Input value={value} onChange={(e) => onValueChange(e.target.value)} placeholder={valuePlaceholder} />
    </div>
  );
}

export function EventDetailsEditor({
  details,
  onDetailsChange,
  hostValue,
  onHostValueChange,
  venueValue,
  onVenueValueChange,
}: Props) {
  const extras = details.extras;
  const setExtras = (next: EventExtra[]) => onDetailsChange({ extras: next });
  const sortable = useSortable(extras, setExtras);

  function updateExtra(id: string, patch: Partial<EventExtra>) {
    setExtras(extras.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Rename any label to fit your event — e.g. change <strong>School</strong> to <strong>Organization</strong> or{" "}
        <strong>Church</strong>. Leave a value empty to hide it.
      </p>

      <LabeledRow
        label={details.hostLabel}
        onLabelChange={(hostLabel) => onDetailsChange({ hostLabel })}
        presets={HOST_LABEL_PRESETS}
        value={hostValue}
        onValueChange={onHostValueChange}
        valuePlaceholder={`e.g. ${details.hostLabel === "School" ? "University of Lagos" : "Name"}`}
      />

      <LabeledRow
        label={details.venueLabel}
        onLabelChange={(venueLabel) => onDetailsChange({ venueLabel })}
        presets={VENUE_LABEL_PRESETS}
        value={venueValue}
        onValueChange={onVenueValueChange}
        valuePlaceholder="e.g. Main Auditorium"
      />

      <div className="space-y-2" {...sortable.containerProps}>
        {extras.map((extra, index) => (
          <div
            key={extra.id}
            {...sortable.itemProps(extra.id, index)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl transition",
              sortable.overIndex === index && "ring-2 ring-violet-200",
              sortable.draggingId === extra.id && "opacity-40"
            )}
          >
            <DragHandle {...sortable.handleProps(extra.id, index)} />
            <MoveButtons index={index} count={extras.length} onMove={sortable.move} />
            <LabeledRow
              label={extra.label}
              onLabelChange={(label) => updateExtra(extra.id, { label })}
              presets={EXTRA_DETAIL_PRESETS}
              value={extra.value}
              onValueChange={(value) => updateExtra(extra.id, { value })}
              valuePlaceholder="Value"
            />
            <button
              type="button"
              onClick={() => setExtras(extras.filter((x) => x.id !== extra.id))}
              className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"
              aria-label="Remove detail"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={extras.length >= 20}
        onClick={() => setExtras([...extras, { id: crypto.randomUUID(), label: "", value: "" }])}
      >
        <Plus className="h-3.5 w-3.5" /> Add a detail (dress code, theme, contact…)
      </Button>
    </div>
  );
}
