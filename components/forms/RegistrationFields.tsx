"use client";

import { cn } from "@/lib/utils";
import { PhotoField } from "./PhotoField";
import type { RegistrationFieldDef } from "@/lib/event-details";

const inputClass =
  "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-ink-800 placeholder:text-slate-400 focus:border-violet-400";

function FieldShell({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink-700">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}

export interface RegistrationFieldsProps {
  nameLabel: string;
  emailLabel: string;
  name: string;
  email: string;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  fields: RegistrationFieldDef[];
  answers: Record<string, string>;
  onAnswerChange: (fieldId: string, value: string) => void;
  errors?: Record<string, string>;
  idPrefix?: string;
  /** Builder preview: photo fields pick a local file instead of uploading. */
  previewOnly?: boolean;
}

/**
 * Renders the organizer-defined checkout form. Used by the real checkout
 * modal and by the builder's live preview, so what organizers see is exactly
 * what attendees get.
 */
export function RegistrationFields({
  nameLabel,
  emailLabel,
  name,
  email,
  onNameChange,
  onEmailChange,
  fields,
  answers,
  onAnswerChange,
  errors = {},
  idPrefix = "reg",
  previewOnly = false,
}: RegistrationFieldsProps) {
  const errorClass = (key: string) => (errors[key] ? "border-red-300 focus:border-red-400" : "");

  return (
    <div className="space-y-4">
      <FieldShell id={`${idPrefix}-name`} label={nameLabel} required error={errors.__name}>
        <input
          id={`${idPrefix}-name`}
          className={cn(inputClass, errorClass("__name"))}
          autoComplete="name"
          value={name}
          aria-invalid={!!errors.__name}
          onChange={(e) => onNameChange(e.target.value)}
        />
      </FieldShell>

      <FieldShell id={`${idPrefix}-email`} label={emailLabel} required error={errors.__email}>
        <input
          id={`${idPrefix}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          className={cn(inputClass, errorClass("__email"))}
          placeholder="you@example.com"
          value={email}
          aria-invalid={!!errors.__email}
          onChange={(e) => onEmailChange(e.target.value)}
        />
      </FieldShell>

      {fields.map((field) => {
        const id = `${idPrefix}-${field.id}`;
        const value = answers[field.id] ?? "";
        const common = {
          id,
          "aria-invalid": !!errors[field.id],
          "aria-describedby": errors[field.id] ? `${id}-error` : undefined,
        };

        let control: React.ReactNode;

        switch (field.type) {
          case "textarea":
            control = (
              <textarea
                {...common}
                rows={3}
                className={cn(inputClass, "h-auto py-3", errorClass(field.id))}
                placeholder={field.placeholder ?? undefined}
                value={value}
                onChange={(e) => onAnswerChange(field.id, e.target.value)}
              />
            );
            break;

          case "select":
            control = (
              <select
                {...common}
                className={cn(inputClass, errorClass(field.id))}
                value={value}
                onChange={(e) => onAnswerChange(field.id, e.target.value)}
              >
                <option value="">{field.placeholder || "Select…"}</option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            );
            break;

          case "radio":
            control = (
              <div role="radiogroup" className="flex flex-wrap gap-2" {...common}>
                {field.options.map((opt) => (
                  <label
                    key={opt}
                    className={cn(
                      "cursor-pointer rounded-xl border px-4 py-2.5 text-sm transition",
                      value === opt
                        ? "border-violet-500 bg-violet-50 text-violet-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name={id}
                      value={opt}
                      checked={value === opt}
                      onChange={() => onAnswerChange(field.id, opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            );
            break;

          case "checkbox": {
            const picked = value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];
            control = (
              <div className="flex flex-wrap gap-2" {...common}>
                {field.options.map((opt) => {
                  const on = picked.includes(opt);
                  return (
                    <label
                      key={opt}
                      className={cn(
                        "cursor-pointer rounded-xl border px-4 py-2.5 text-sm transition",
                        on ? "border-violet-500 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-600 hover:border-slate-300"
                      )}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={on}
                        onChange={() =>
                          onAnswerChange(field.id, (on ? picked.filter((p) => p !== opt) : [...picked, opt]).join(", "))
                        }
                      />
                      {on ? "✓ " : ""}
                      {opt}
                    </label>
                  );
                })}
              </div>
            );
            break;
          }

          case "photo":
            control = (
              <PhotoField
                id={id}
                value={value}
                hint={field.placeholder}
                invalid={!!errors[field.id]}
                previewOnly={previewOnly}
                onChange={(url) => onAnswerChange(field.id, url)}
              />
            );
            break;

          default:
            control = (
              <input
                {...common}
                type={field.type === "phone" ? "tel" : field.type}
                inputMode={field.type === "number" ? "decimal" : field.type === "phone" ? "tel" : undefined}
                className={cn(inputClass, errorClass(field.id))}
                placeholder={field.placeholder ?? undefined}
                value={value}
                onChange={(e) => onAnswerChange(field.id, e.target.value)}
              />
            );
        }

        return (
          <FieldShell key={field.id} id={id} label={field.label} required={field.required} error={errors[field.id]}>
            {control}
          </FieldShell>
        );
      })}
    </div>
  );
}
