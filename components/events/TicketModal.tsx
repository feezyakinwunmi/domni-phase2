"use client";

import { useState } from "react";
import Script from "next/script";
import { Ticket, X, Minus, Plus } from "lucide-react";
import { initializeTicketPurchase, verifyTicketPurchase } from "@/lib/actions/tickets";

interface RegistrationField {
  id: string;
  label: string;
  type: string;
  placeholder?: string;
  required: boolean;
  options: string[];
}

interface TicketModalProps {
  ticketTypeId: string;
  ticketTitle: string;
  priceKobo: number;
  disabled?: boolean;
  registrationFields: RegistrationField[];
}

export function TicketModal({
  ticketTypeId,
  ticketTitle,
  priceKobo,
  disabled,
  registrationFields,
}: TicketModalProps) {
  const [open, setOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [formValues, setFormValues] = useState<
    Record<string, string>
  >({});

  const total = (priceKobo / 100) * quantity;

  async function handleContinue() {
    if (!email.trim()) {
      alert("Email is required.");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.set("ticketTypeId", ticketTypeId);
      formData.set("quantity", quantity.toString());

      formData.set(
        "registrationData",
        JSON.stringify({
          ...formValues,
          "Full Name": name,
          Email: email,
        })
      );

      const res = await initializeTicketPurchase(formData);

      if (res.success) {
        window.location.href = res.redirect;
        return;
      }

      if (res.requiresPayment) {
        if (!window.PaystackPop) {
          alert("Payment is still loading, please try again in a moment.");
          setLoading(false);
          return;
        }

        const handler = window.PaystackPop.setup({
          key: res.publicKey,
          email: res.email,
          amount: res.amountKobo,
          ref: res.reference,
          onClose: () => setLoading(false),
          callback: (response) => {
            verifyTicketPurchase(response.reference).then((verifyRes) => {
              if (verifyRes.success) {
                window.location.href = verifyRes.redirect;
              } else {
                alert(verifyRes.error || "Payment verification failed.");
                setLoading(false);
              }
            });
          },
        });

        handler.openIframe();
        return;
      }

      setLoading(false);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <>
      {priceKobo > 0 && (
        <Script src="https://js.paystack.co/v1/inline.js" strategy="lazyOnload" />
      )}

      <button
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${
          disabled
            ? "cursor-not-allowed bg-slate-200 text-slate-500"
            : "bg-violet-600 text-white"
        }`}
      >
        <Ticket className="h-4 w-4" />
        {priceKobo === 0 ? "Get Free Ticket" : "Buy Ticket"}
      </button>

      {open && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold">{ticketTitle}</h2>

              <button onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">
                Full Name
                <span className="ml-1 text-red-500">*</span>
              </label>

              <input
                type="text"
                className="h-12 w-full rounded-xl border px-4"
                placeholder="John Doe"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium">
                Email
                <span className="ml-1 text-red-500">*</span>
              </label>

              <input
                type="email"
                className="h-12 w-full rounded-xl border px-4"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {registrationFields.map((field) => (
              <div key={field.id} className="mb-4">
                <label className="mb-2 block text-sm font-medium">
                  {field.label}
                  {field.required && (
                    <span className="ml-1 text-red-500">*</span>
                  )}
                </label>

                {field.type === "select" ? (
                  <select
                    className="h-12 w-full rounded-xl border px-4"
                    value={formValues[field.label] || ""}
                    required={field.required}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        [field.label]: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select...</option>

                    {field.options.map((option) => (
                      <option
                        key={option}
                        value={option}
                      >
                        {option}
                      </option>
                    ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    className="w-full rounded-xl border p-3"
                    placeholder={field.placeholder}
                    required={field.required}
                    value={formValues[field.label] || ""}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        [field.label]: e.target.value,
                      }))
                    }
                  />
                ) : (
                  <input
                    type={field.type}
                    className="h-12 w-full rounded-xl border px-4"
                    placeholder={field.placeholder}
                    required={field.required}
                    value={formValues[field.label] || ""}
                    onChange={(e) =>
                      setFormValues((prev) => ({
                        ...prev,
                        [field.label]: e.target.value,
                      }))
                    }
                  />
                )}
              </div>
            ))}

            <div className="mb-5 flex items-center justify-between rounded-xl border p-3">
              <button
                type="button"
                onClick={() =>
                  setQuantity((q) => Math.max(1, q - 1))
                }
              >
                <Minus />
              </button>

              <span className="text-lg font-bold">
                {quantity}
              </span>

              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
              >
                <Plus />
              </button>
            </div>

            <div className="mb-6 rounded-xl bg-slate-50 p-4">
              <div className="flex justify-between">
                <span>Total</span>

                <span className="font-bold">
                  {priceKobo === 0
                    ? "FREE"
                    : `₦${total.toLocaleString()}`}
                </span>
              </div>
            </div>

            <button
              onClick={handleContinue}
              disabled={loading}
              className="w-full rounded-xl bg-violet-600 py-3 font-semibold text-white"
            >
              {loading
                ? "Please wait..."
                : priceKobo === 0
                ? "Get Free Ticket"
                : "Continue to Payment"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}