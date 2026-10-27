"use client";

import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

import { deleteEvent } from "@/lib/actions/delete-event";

interface DeleteButtonProps {
  eventId: string;
}

export function DeleteButton({
  eventId,
}: DeleteButtonProps) {
  const [open, setOpen] = useState(false);

  const [isPending, startTransition] =
    useTransition();

  function handleDelete() {
    startTransition(async () => {
      await deleteEvent(eventId);
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => setOpen(true)}
        className="gap-2"
      >
        <Trash2 className="h-4 w-4" />
        Delete Event
      </Button>

      <ConfirmDialog
        open={open}
        loading={isPending}
        title="Delete Event"
        description="This action cannot be undone. All tickets, sections, and analytics linked to this event will be permanently removed."
        confirmText="Delete Forever"
        cancelText="Cancel"
        icon={<Trash2 className="h-5 w-5" />}
        onCancel={() => setOpen(false)}
        onConfirm={handleDelete}
      />
    </>
  );
}