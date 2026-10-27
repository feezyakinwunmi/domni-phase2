"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteEvent } from "@/lib/actions/events";

interface DeleteButtonProps {
  eventId: string;
}

export function DeleteButton({ eventId }: DeleteButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteEvent(eventId);
      if (!res.ok) {
        setOpen(false);
        setError(res.error);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end">
      <Button type="button" variant="secondary" onClick={() => setOpen(true)} className="gap-2 hover:border-red-300 hover:text-red-600">
        <Trash2 className="h-4 w-4" />
        Delete
      </Button>
      {error && <p className="mt-1 max-w-xs text-right text-xs text-red-500">{error}</p>}

      <ConfirmDialog
        open={open}
        loading={isPending}
        title="Delete event"
        description="This permanently removes the event, its sections, ticket types and registration form. Events with issued tickets can't be deleted — unpublish them instead."
        confirmText="Delete forever"
        cancelText="Cancel"
        icon={<Trash2 className="h-5 w-5" />}
        onCancel={() => setOpen(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
