"use client";

import { useEffect, useState } from "react";
import { TicketTemplate } from "@/components/events/TicketTemplatePicker";


export function useTicketTemplates() {
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    async function load() {
      const res = await fetch(
        "/api/ticket-templates"
      );

      const data = await res.json();

      setTemplates(data);
      setLoading(false);
    }

    load();
  }, []);


  return {
    templates,
    loading,
  };
}