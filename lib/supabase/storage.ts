import { createClient } from "@/lib/supabase/client";

/**
 * Uploads a file to the `event-covers` Supabase Storage bucket and
 * returns its public URL. Create the bucket (public) in the Supabase
 * dashboard, or via SQL:
 *   insert into storage.buckets (id, name, public) values ('event-covers', 'event-covers', true);
 */
export async function uploadEventCover(file: File, ownerId: string) {
  const supabase = createClient();
  const ext = file.name.split(".").pop();
  const path = `${ownerId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("event-covers").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from("event-covers").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Uploads a nominee photo to the `nominee-photos` bucket. Same bucket
 * creation pattern as above — see prisma/rls-policies.sql.
 */
export async function uploadNomineeImage(file: File, ownerId: string) {
  const supabase = createClient();
  const ext = file.name.split(".").pop();
  const path = `${ownerId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("nominee-photos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from("nominee-photos").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Uploads a ticket design logo to the `ticket-logos` bucket. Same bucket
 * creation pattern as above — create it (public) in the Supabase dashboard,
 * or via SQL:
 *   insert into storage.buckets (id, name, public) values ('ticket-logos', 'ticket-logos', true);
 */
export async function uploadTicketLogo(file: File, ownerId: string) {
  const supabase = createClient();
  const ext = file.name.split(".").pop();
  const path = `${ownerId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from("ticket-logos").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from("ticket-logos").getPublicUrl(path);
  return data.publicUrl;
}