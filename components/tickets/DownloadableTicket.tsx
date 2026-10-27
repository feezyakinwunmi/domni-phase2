"use client";

import { useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";

let warmedUp = false;

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "ticket";
}

/** Renders a DOM node to a PNG at 3× resolution — pixel-identical to what's on screen. */
export async function nodeToPng(node: HTMLElement) {
  const { toPng } = await import("html-to-image");
  await document.fonts?.ready;
  const opts = { pixelRatio: 3, cacheBust: true };
  // Safari sometimes paints images/fonts only on the second pass; warm up once.
  if (!warmedUp) {
    await toPng(node, opts).catch(() => undefined);
    warmedUp = true;
  }
  return toPng(node, opts);
}

export function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function DownloadableTicket({
  children,
  filename,
  index,
}: {
  children: React.ReactNode;
  filename: string;
  index?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    if (!ref.current) return;
    setBusy(true);
    setError(null);
    try {
      const png = await nodeToPng(ref.current);
      triggerDownload(png, `${slug(filename)}.png`);
    } catch (err) {
      console.error(err);
      setError("Couldn't create the image. Try 'Save as PDF' instead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center">
      {/* inline-block so the capture is exactly the ticket, with no surrounding page */}
      <div ref={ref} data-ticket-index={index} className="inline-block">
        {children}
      </div>
      <button
        type="button"
        onClick={download}
        disabled={busy}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60 print:hidden"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {busy ? "Preparing…" : "Download image"}
      </button>
      {error && <p className="mt-2 text-xs text-red-500 print:hidden">{error}</p>}
    </div>
  );
}
