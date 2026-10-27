"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setEventStatus } from "@/lib/actions/events";

interface PublishButtonProps {
  eventId: string;
  status: string;
}

export function PublishButton({ eventId, status }: PublishButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isPublished = status === "PUBLISHED";

  function toggle() {
    setError(null);
    startTransition(async () => {
      const res = await setEventStatus(eventId, isPublished ? "DRAFT" : "PUBLISHED");
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end">
      <Button
        type="button"
        disabled={isPending}
        onClick={toggle}
        variant={isPublished ? "secondary" : "primary"}
        className={isPublished ? "gap-2" : "gap-2 bg-none bg-emerald-600 hover:bg-emerald-700"}
      >
        {isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {isPending ? (isPublished ? "Unpublishing…" : "Publishing…") : isPublished ? "Unpublish" : "Publish event"}
      </Button>
      {error && <p className="mt-1 max-w-xs text-right text-xs text-red-500">{error}</p>}
    </div>
  );
}
