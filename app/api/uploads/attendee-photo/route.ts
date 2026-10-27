import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

const BUCKET = "attendee-photos";
const MAX_BYTES = 4 * 1024 * 1024;

// Best-effort per-IP limit (per server instance) so the endpoint can't be used as free file hosting.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 15;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > MAX_PER_WINDOW;
}

/** Sniff the real format from magic bytes — the client-supplied MIME type can't be trusted. */
function detectImage(bytes: Uint8Array): { ext: string; type: string } | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: "jpg", type: "image/jpeg" };
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return { ext: "png", type: "image/png" };
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") {
    return { ext: "webp", type: "image/webp" };
  }
  return null;
}

/**
 * Anonymous attendees upload their registration photo here. Uploads go
 * through the service-role client, so the bucket needs no public write policy.
 */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
    if (rateLimited(ip)) {
      return NextResponse.json({ error: "Too many uploads. Please wait a few minutes." }, { status: 429 });
    }

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No photo received." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "Photo must be under 4 MB." }, { status: 413 });

    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = detectImage(bytes);
    if (!kind) return NextResponse.json({ error: "Please upload a JPG, PNG or WebP image." }, { status: 415 });

    const supabase = createAdminClient();
    const path = `${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${kind.ext}`;
    const upload = () => supabase.storage.from(BUCKET).upload(path, bytes, { contentType: kind.type, cacheControl: "31536000" });

    let { error } = await upload();
    if (error && /bucket not found/i.test(error.message)) {
      await supabase.storage.createBucket(BUCKET, { public: true, fileSizeLimit: MAX_BYTES });
      ({ error } = await upload());
    }
    if (error) {
      console.error("[domni] attendee photo upload failed", error);
      return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    console.error("[domni] attendee photo upload error", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
