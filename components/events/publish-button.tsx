"use client";

import { Eye } from "lucide-react";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { publishEvent } from "@/lib/actions/publish-event";

interface PublishButtonProps {
  eventId: string;
  status: string;
}

export function PublishButton({
  eventId,
  status,
}: PublishButtonProps) {
  const [isPending, startTransition] = useTransition();

  const isPublished = status === "PUBLISHED";

  return (
    <Button
      disabled={isPending || isPublished}
      onClick={() => {
        startTransition(async () => {
          await publishEvent(eventId);
        });
      }}
      className="gap-2 bg-emerald-600 hover:bg-emerald-700"
    >
      <Eye className="h-4 w-4" />

      {isPending
        ? "Publishing..."
        : isPublished
        ? "Published"
        : "Publish Event"}
    </Button>
  );
}