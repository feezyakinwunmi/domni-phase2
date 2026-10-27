"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreatableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  name?: string;
}

/**
 * A text input + dropdown hybrid: shows preset suggestions (VIP, Early Bird...)
 * but never blocks a custom value. Typing something that isn't a preset shows
 * a "Create <value>" row instead of an empty list — the organizer is never
 * stuck choosing from a fixed set.
 */
export function CreatableSelect({
  value,
  onChange,
  options,
  placeholder = "Select or type a ticket name",
  name,
}: CreatableSelectProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => setQuery(value), [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(value);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(query.trim().toLowerCase())
  );
  const exactMatch = options.some(
    (opt) => opt.toLowerCase() === query.trim().toLowerCase()
  );

  function select(next: string) {
    onChange(next);
    setQuery(next);
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <div className="relative">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim()) {
              e.preventDefault();
              select(query.trim());
            }
          }}
          placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-slate-100 bg-white px-4 pr-9 text-sm text-ink-800 placeholder:text-slate-400 focus:border-violet-400"
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>

      {open && (
        <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-100 bg-white shadow-soft">
          <ul className="max-h-56 overflow-y-auto py-1">
            {filtered.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => select(opt)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-ink-800 hover:bg-slate-50"
                >
                  {opt}
                  {opt === value && <Check className="h-4 w-4 text-violet-500" />}
                </button>
              </li>
            ))}
          </ul>

          {query.trim() && !exactMatch && (
            <button
              type="button"
              onClick={() => select(query.trim())}
              className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left text-sm font-medium text-violet-600 hover:bg-violet-50"
            >
              <Plus className="h-3.5 w-3.5" /> Create "{query.trim()}"
            </button>
          )}

          {!query.trim() && filtered.length === 0 && (
            <p className="px-4 py-2.5 text-sm text-slate-400">Start typing to search or create</p>
          )}
        </div>
      )}
    </div>
  );
}
