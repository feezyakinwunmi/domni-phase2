-- Editable event labels ("School" -> "Organization", etc.) and extra details.
-- Additive and nullable: safe to run on a live database.
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "details" JSONB;

-- New ticket designs (idempotent). Equivalent to `node scripts/seed-templates.js`.
INSERT INTO "ticket_templates" ("name", "templateKey", "isPremium", "orientation", "config") VALUES
  ('Boarding Pass', 'boarding-pass', false, 'landscape', '{"style":"travel","primaryColor":"#0ea5e9","particleOverlay":"none"}'),
  ('Editorial',     'editorial',     true,  'portrait',  '{"style":"editorial-serif","primaryColor":"#9f1239","particleOverlay":"none"}'),
  ('Holo Foil',     'holo-foil',     true,  'portrait',  '{"style":"holographic","primaryColor":"#c0c7d6","particleOverlay":"stars"}')
ON CONFLICT ("templateKey") DO NOTHING;
