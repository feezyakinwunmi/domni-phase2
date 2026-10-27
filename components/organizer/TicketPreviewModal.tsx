"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { X } from "lucide-react";
import TicketRenderer from "@/components/tickets/TicketRenderer";
import type { TicketCustomization } from "@/components/tickets/types";
import type { RegistrationFieldDraft } from "./RegistrationFormBuilder";

interface Props {
  eventTitle: string;
  ticketTypeTitle: string;
  templateKey: string | null;
  customization: TicketCustomization | null;
  registrationFields: RegistrationFieldDraft[];
  onClose: () => void;
}

export function TicketPreviewModal({
  eventTitle,
  ticketTypeTitle,
  templateKey,
  customization,
  registrationFields,
  onClose,
}: Props) {
  const [qr, setQr] = useState("");

  useEffect(() => {
    QRCode.toDataURL("PREVIEW-SAMPLE").then(setQr);
  }, []);

  const extraFields = registrationFields
    .filter((field) => field.label.trim())
    .map((field) => ({
      label: field.label,
      value: field.placeholder || `Sample ${field.label}`,
    }));

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] overflow-y-auto rounded-3xl p-2">
        <div className="mb-4 flex items-center justify-between px-2">
          <h2 className="text-lg font-bold text-white">Ticket Preview</h2>

          <button type="button" onClick={onClose} className="text-white">
            <X />
          </button>
        </div>

        <TicketRenderer
          templateKey={templateKey}
          customization={customization}
          data={{
            eventName: eventTitle || "Your Event",
            attendeeName: "Jane Doe",
            ticketType: ticketTypeTitle || "Ticket",
            date: "Sat, Jan 1 · 6:00 PM",
            venue: "Venue TBA",
            qr,
            extraFields,
          }}
        />
      </div>
    </div>
  );
}
