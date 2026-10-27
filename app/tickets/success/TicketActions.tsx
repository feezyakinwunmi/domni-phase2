"use client";

import { useState } from "react";
import { Images, Loader2, Printer, Share2 } from "lucide-react";
import { nodeToPng, triggerDownload } from "@/components/tickets/DownloadableTicket";

export function TicketActions({ eventTitle, count }: { eventTitle: string; count: number }) {
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function downloadAll() {
    setBusy(true);
    setNote(null);
    try {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-ticket-index]"));
      for (const [i, node] of nodes.entries()) {
        triggerDownload(await nodeToPng(node), `ticket-${i + 1}-of-${nodes.length}.png`);
        // Some browsers block rapid back-to-back downloads.
        await new Promise((r) => setTimeout(r, 400));
      }
    } catch {
      setNote("Couldn't create the images. Try 'Print / PDF' instead.");
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: `My ticket — ${eventTitle}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setNote("Link copied. Only share it with people you trust — it opens your ticket.");
    } catch (err) {
      // User dismissing the share sheet throws AbortError — not a failure.
      if (err instanceof Error && err.name === "AbortError") return;
      setNote("Couldn't share automatically — copy the address bar link instead.");
    }
  }

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-3">
        {count > 1 && (
          <button
            type="button"
            onClick={downloadAll}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-60 sm:col-span-3"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Images className="h-4 w-4" />}
            {busy ? "Preparing…" : `Download all ${count} tickets`}
          </button>
        )}
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 font-semibold hover:bg-slate-50 sm:col-span-2"
        >
          <Printer className="h-4 w-4" /> Print / Save as PDF
        </button>
        <button
          type="button"
          onClick={share}
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-3 font-semibold hover:bg-slate-50"
        >
          <Share2 className="h-4 w-4" /> Share
        </button>
      </div>
      {note && <p className="mt-3 text-center text-xs text-slate-500">{note}</p>}
    </div>
  );
}
