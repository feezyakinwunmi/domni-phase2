"use client";

import { useState } from "react";
import { compactNaira } from "@/lib/admin-format";

/** Validated single-series hue (passes lightness/chroma/contrast on white). */
const BAR = "#6D5AE6";
const BAR_HOVER = "#4A3FBF";

function niceMax(v: number) {
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  const n = v / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * mag;
}

function shortDay(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

/**
 * Daily column chart: one series, so no legend — the card title names it.
 * Hover/focus shows a tooltip; "View as table" gives the same data accessibly.
 */
export function ColumnChart({
  data,
  kind,
  label,
}: {
  data: { day: string; value: number }[];
  /** Formatting is chosen by name: functions can't cross the server→client boundary. */
  kind: "naira" | "count";
  label: string;
}) {
  const format = (v: number) => (kind === "naira" ? compactNaira(v) : Math.round(v).toLocaleString("en-NG"));
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const max = niceMax(Math.max(...data.map((d) => d.value)));
  const total = data.reduce((n, d) => n + d.value, 0);
  const ticks = [max, max / 2, 0];

  return (
    <div className="p-5">
      <p className="text-sm text-slate-500">
        Last {data.length} days · <span className="font-semibold text-ink-800">{format(total)}</span> total
      </p>

      {showTable ? (
        <div className="mt-4 max-h-64 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400">
                <th className="py-1 font-medium">Day</th>
                <th className="py-1 text-right font-medium">{label}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.day} className="border-t border-slate-100">
                  <td className="py-1.5 text-slate-600">{shortDay(d.day)}</td>
                  <td className="py-1.5 text-right font-medium text-ink-800">{format(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="mt-4 flex gap-3">
          <div className="flex h-44 flex-col justify-between text-right text-[11px] text-slate-400" aria-hidden="true">
            {ticks.map((t) => (
              <span key={t} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
                {format(t)}
              </span>
            ))}
          </div>

          <div className="relative flex-1">
            {/* recessive hairline grid */}
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden="true">
              {ticks.map((t) => (
                <div key={t} className="h-px bg-slate-100" />
              ))}
            </div>

            <div
              className="relative flex h-44 items-end gap-[2px]"
              role="img"
              aria-label={`${label}, last ${data.length} days, total ${format(total)}`}
              onMouseLeave={() => setActive(null)}
            >
              {data.map((d, i) => (
                <button
                  key={d.day}
                  type="button"
                  className="group relative flex h-full flex-1 items-end justify-center outline-none"
                  onMouseEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  aria-label={`${shortDay(d.day)}: ${format(d.value)}`}
                >
                  <span
                    className="block w-full max-w-[24px] rounded-t-[4px] transition-colors"
                    style={{
                      height: d.value > 0 ? `max(${(d.value / max) * 100}%, 3px)` : 0,
                      backgroundColor: active === i ? BAR_HOVER : BAR,
                    }}
                  />
                </button>
              ))}

              {active !== null && (
                <div
                  className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-ink-800 px-2.5 py-1.5 text-xs text-white shadow-lg"
                  style={{ left: `${((active + 0.5) / data.length) * 100}%` }}
                >
                  <span className="text-white/60">{shortDay(data[active].day)}</span>{" "}
                  <span className="font-semibold">{format(data[active].value)}</span>
                </div>
              )}
            </div>

            <div className="mt-2 flex justify-between text-[11px] text-slate-400" aria-hidden="true">
              <span>{shortDay(data[0].day)}</span>
              <span>{shortDay(data[Math.floor(data.length / 2)].day)}</span>
              <span>{shortDay(data[data.length - 1].day)}</span>
            </div>
          </div>
        </div>
      )}

      <button type="button" onClick={() => setShowTable((s) => !s)} className="mt-3 text-xs font-medium text-violet-600 hover:underline">
        {showTable ? "View as chart" : "View as table"}
      </button>
    </div>
  );
}
