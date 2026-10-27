"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { X } from "lucide-react";
import TicketRenderer, { LANDSCAPE_TEMPLATES } from "@/components/tickets/TicketRenderer";
import type { TicketCustomization, TicketRenderData } from "@/components/tickets/types";

export type TicketSample = Omit<TicketRenderData, "attendeeName" | "qr" | "ticketNumber">;

export function useSampleQr() {
  const [qr, setQr] = useState("");
  useEffect(() => {
    QRCode.toDataURL("DOMNI-PREVIEW", { margin: 1, width: 256 }).then(setQr).catch(() => setQr(""));
  }, []);
  return qr;
}

/** Renders a ticket at natural size, scaled down to fit `maxWidth`. */
export function ScaledTicket({
  templateKey,
  customization,
  data,
  maxWidth,
}: {
  templateKey: string | null;
  customization: TicketCustomization | null;
  data: TicketRenderData;
  maxWidth: number;
}) {
  const natural = LANDSCAPE_TEMPLATES.has(templateKey ?? "") ? 560 : 340;
  const scale = Math.min(1, maxWidth / natural);

  return (
    <div style={{ width: natural * scale }} className="mx-auto">
      <div style={{ width: natural, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <TicketRenderer templateKey={templateKey} customization={customization} data={data} />
      </div>
    </div>
  );
}

interface Props {
  templateKey: string | null;
  customization: TicketCustomization | null;
  sample: TicketSample;
  onClose: () => void;
}

export function TicketPreviewModal({ templateKey, customization, sample, onClose }: Props) {
  const qr = useSampleQr();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Ticket preview"
    >
      <div className="max-h-[92vh] w-full max-w-[600px] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between px-2">
          <h2 className="text-lg font-bold text-white">Ticket preview</h2>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-white hover:bg-white/10" aria-label="Close preview">
            <X />
          </button>
        </div>

        <ScaledTicket
          templateKey={templateKey}
          customization={customization}
          maxWidth={typeof window === "undefined" ? 560 : Math.min(560, window.innerWidth - 48)}
          data={{ ...sample, attendeeName: "Jane Doe", qr, ticketNumber: "DMN-7KQ2X9PA" }}
        />
      </div>
    </div>
  );
}
