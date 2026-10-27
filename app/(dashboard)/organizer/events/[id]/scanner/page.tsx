"use client";

import { Scanner } from "@yudiel/react-qr-scanner";
import { useState } from "react";

export default function ScannerPage() {
  const [message, setMessage] = useState("");

  async function handleScan(value: string) {
    if (!value) return;

    const res = await fetch("/api/tickets/checkin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        qrCode: value,
      }),
    });

    const data = await res.json();

    setMessage(data.message);
  }

  return (
    <main className="mx-auto max-w-lg p-6">
      <h1 className="mb-6 text-3xl font-bold">
        Ticket Scanner
      </h1>

      <Scanner
        onScan={(result) => {
          if (result.length > 0) {
            handleScan(result[0].rawValue);
          }
        }}
      />

      <div className="mt-6 rounded-xl border p-4 text-center text-xl font-bold">
        {message || "Waiting for scan..."}
      </div>
    </main>
  );
}