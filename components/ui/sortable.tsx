"use client";

import { useState, type DragEvent, type KeyboardEvent } from "react";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export const PRESET_MIME = "application/x-domni-preset";

/**
 * Drag-and-drop reordering for a list of `{ id }` items using native HTML5 DnD.
 * Only the grip handle starts a drag, so text inputs inside a row stay
 * selectable. Optionally accepts items dragged in from a palette
 * (dataTransfer type PRESET_MIME) via `onExternalDrop`.
 */
export function useSortable<T extends { id: string }>(
  items: T[],
  onReorder: (next: T[]) => void,
  onExternalDrop?: (presetKey: string, index: number) => void
) {
  const [armedId, setArmedId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  function move(from: number, to: number) {
    if (from === to || from < 0 || to < 0 || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
  }

  function accepts(e: DragEvent) {
    return dragId !== null || (!!onExternalDrop && e.dataTransfer.types.includes(PRESET_MIME));
  }

  function handleDrop(e: DragEvent, index: number) {
    e.preventDefault();
    e.stopPropagation();
    const preset = e.dataTransfer.getData(PRESET_MIME);
    if (preset && onExternalDrop) {
      onExternalDrop(preset, index);
    } else if (dragId) {
      move(items.findIndex((i) => i.id === dragId), Math.min(index, items.length - 1));
    }
    reset();
  }

  function reset() {
    setDragId(null);
    setArmedId(null);
    setOverIndex(null);
  }

  return {
    overIndex,
    draggingId: dragId,
    move,
    itemProps: (id: string, index: number) => ({
      draggable: armedId === id,
      onDragStart: (e: DragEvent) => {
        setDragId(id);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", id);
      },
      onDragOver: (e: DragEvent) => {
        if (!accepts(e)) return;
        e.preventDefault();
        if (overIndex !== index) setOverIndex(index);
      },
      onDrop: (e: DragEvent) => handleDrop(e, index),
      onDragEnd: reset,
    }),
    /** Spread on the list wrapper so drops below the last item append. */
    containerProps: {
      onDragOver: (e: DragEvent) => {
        if (!accepts(e)) return;
        e.preventDefault();
      },
      onDrop: (e: DragEvent) => handleDrop(e, items.length),
      onDragLeave: (e: DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverIndex(null);
      },
    },
    handleProps: (id: string, index: number) => ({
      onPointerDown: () => setArmedId(id),
      onPointerUp: () => setArmedId(null),
      onKeyDown: (e: KeyboardEvent) => {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          move(index, index - 1);
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          move(index, index + 1);
        }
      },
    }),
  };
}

export function DragHandle(props: React.HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label="Drag to reorder (or use arrow keys)"
      className="cursor-grab touch-none rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing"
      {...props}
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}

/** Up/down buttons — the touch-screen fallback, since HTML5 drag doesn't fire on mobile. */
export function MoveButtons({
  index,
  count,
  onMove,
  className,
}: {
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      <button
        type="button"
        aria-label="Move up"
        disabled={index === 0}
        onClick={() => onMove(index, index - 1)}
        className="rounded p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Move down"
        disabled={index === count - 1}
        onClick={() => onMove(index, index + 1)}
        className="rounded p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-30"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
