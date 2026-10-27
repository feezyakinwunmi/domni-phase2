    "use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface RegistrationFieldDraft {
  id: string;
  label: string;
  type:
    | "text"
    | "email"
    | "phone"
    | "number"
    | "textarea"
    | "select"
    | "date";

  placeholder: string;
  required: boolean;
  options: string;
}

interface Props {
  fields: RegistrationFieldDraft[];
  onChange: (fields: RegistrationFieldDraft[]) => void;
}

function emptyField(): RegistrationFieldDraft {
  return {
    id: crypto.randomUUID(),
    label: "",
    type: "text",
    placeholder: "",
    required: false,
    options: "",
  };
}

export function RegistrationFormBuilder({
  fields,
  onChange,
}: Props) {
  function updateField(
    id: string,
    patch: Partial<RegistrationFieldDraft>
  ) {
    onChange(
      fields.map((f) =>
        f.id === id ? { ...f, ...patch } : f
      )
    );
  }

  function remove(id: string) {
    onChange(fields.filter((f) => f.id !== id));
  }

  function add() {
    onChange([...fields, emptyField()]);
  }

  return (
    <div className="rounded-2xl border bg-white p-5 mt-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-lg">
            Registration Form
          </h3>

          <p className="text-sm text-slate-500">
            Collect extra attendee information.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          onClick={add}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Field
        </Button>
      </div>

      <div className="space-y-4">
        {fields.map((field) => (
          <div
            key={field.id}
            className="rounded-xl border p-4"
          >
            <div className="flex justify-between mb-3">
              <Label>Field</Label>

              <button
                type="button"
                onClick={() => remove(field.id)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Label</Label>

                <Input
                  value={field.label}
                  onChange={(e) =>
                    updateField(field.id, {
                      label: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label>Placeholder</Label>

                <Input
                  value={field.placeholder}
                  onChange={(e) =>
                    updateField(field.id, {
                      placeholder: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <Label>Field Type</Label>

                <select
                  className="h-10 w-full rounded-lg border px-3"
                  value={field.type}
                  onChange={(e) =>
                    updateField(field.id, {
                      type: e.target.value as any,
                    })
                  }
                >
                  <option value="text">Text</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="number">Number</option>
                  <option value="textarea">Textarea</option>
                  <option value="date">Date</option>
                  <option value="select">Dropdown</option>
                </select>
              </div>

              {field.type === "select" && (
                <div>
                  <Label>Options</Label>

                  <Input
                    placeholder="Male,Female"
                    value={field.options}
                    onChange={(e) =>
                      updateField(field.id, {
                        options: e.target.value,
                      })
                    }
                  />
                </div>
              )}

              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) =>
                    updateField(field.id, {
                      required: e.target.checked,
                    })
                  }
                />

                <span className="text-sm">
                  Required
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}