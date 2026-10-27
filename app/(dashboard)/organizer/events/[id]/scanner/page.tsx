"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Scanner } from "@yudiel/react-qr-scanner";
import { ArrowLeft, Keyboard } from "lucide-react";
import type { CheckinResponse } from "@/app/api/tickets/checkin/route";

const STYLES: Record<CheckinResponse["result"], string> = {
  admitted: "border-emerald-300 bg-emerald-50 text-emerald-800",
  already: "border-amber-300 bg-amber-50 text-amber-800",
  invalid: "border-red-300 bg-red-50 text-red-800",
  wrong_event: "border-red-300 bg-red-50 text-red-800",
  void: "border-red-300 bg-red-50 text-red-800",
  error: "border-slate-300 bg-slate-50 text-slate-700",
};

const ICONS: Record<CheckinResponse["result"], string> = {
  admitted: "✅",
  already: "⚠️",
  invalid: "❌",
  wrong_event: "❌",
  void: "⛔",
  error: "⚠️",
};

// The camera reports the same code many times per second; ignore repeats briefly.
const REPEAT_WINDOW_MS = 3000;

export default function ScannerPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const [last, setLast] = useState<CheckinResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [admitted, setAdmitted] = useState(0);
  const [manual, setManual] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const recent = useRef<{ code: string; at: number } | null>(null);

  async function checkIn(code: string) {
    const value = code.trim();
    if (!value || busy) return;
    const now = Date.now();
    if (recent.current && recent.current.code === value && now - recent.current.at < REPEAT_WINDOW_MS) return;
    recent.current = { code: value, at: now };

    setBusy(true);
    try {
      const res = await fetch("/api/tickets/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qrCode: value, eventId }),
      });
      const data: CheckinResponse = await res.json();
      setLast(data);
      if (data.result === "admitted") {
        setAdmitted((n) => n + 1);
        navigator.vibrate?.(120);
      } else {
        navigator.vibrate?.([80, 60, 80]);
      }
    } catch {
      setLast({ result: "error", message: "Network error — check your connection." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg">
      <Link href={`/organizer/events/${eventId}`} className="mb-4 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Back to event
      </Link>

      <div className="mb-4 flex items-end justify-between">
        <h1 className="text-3xl font-bold">Ticket scanner</h1>
        <p className="text-sm text-slate-500">
          Admitted this session: <strong className="text-slate-900">{admitted}</strong>
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-black">
        {cameraError ? (
          <p className="p-8 text-center text-sm text-white/80">{cameraError}</p>
        ) : (
          <Scanner
            onScan={(result) => {
              if (result.length > 0) checkIn(result[0].rawValue);
            }}
            onError={() => setCameraError("Couldn't access the camera. Allow camera permission, or type ticket numbers below.")}
            paused={busy}
          />
        )}
      </div>

      <div className={`mt-4 rounded-2xl border-2 p-5 text-center transition ${last ? STYLES[last.result] : "border-slate-200 bg-white text-slate-500"}`} aria-live="polite">
        {busy ? (
          <p className="text-lg font-semibold">Checking…</p>
        ) : last ? (
          <>
            <p className="text-2xl font-bold">
              {ICONS[last.result]} {last.message}
            </p>
            {last.photoUrl && (
              <img src={last.photoUrl} alt="Ticket holder" className="mx-auto mt-3 h-28 w-28 rounded-2xl object-cover ring-4 ring-white" />
            )}
            {last.attendee && (
              <p className="mt-2 text-sm">
                {last.attendee} · {last.ticketType}
                {last.ticketNumber && <span className="ml-1 font-mono">({last.ticketNumber})</span>}
              </p>
            )}
            {last.checkedInAt && <p className="mt-1 text-xs">First checked in {last.checkedInAt}</p>}
          </>
        ) : (
          <p className="text-lg font-semibold">Point the camera at a ticket QR code</p>
        )}
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          recent.current = null; // a manual entry is always deliberate
          checkIn(manual);
          setManual("");
        }}
      >
        <div className="relative flex-1">
          <Keyboard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="Or type ticket number, e.g. DMN-7KQ2X9PA"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 font-mono text-sm uppercase placeholder:normal-case placeholder:font-sans"
          />
        </div>
        <button type="submit" disabled={!manual.trim() || busy} className="rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white disabled:opacity-50">
          Check in
        </button>
      </form>
    </main>
  );
}
