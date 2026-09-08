/*
# Create invoices table (single-tenant, no auth)

1. New Tables
   - `invoices`
     - `id` (uuid, primary key)
     - `name` (text, not null) — user-given label for the invoice
     - `file_data` (text, not null) — base64-encoded PDF data URL
     - `file_size` (integer) — original file size in bytes
     - `created_at` (timestamptz) — upload timestamp

2. Security
   - Enable RLS on `invoices`.
   - Allow anon + authenticated full CRUD (single-tenant app, no sign-in).
*/

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  file_data text NOT NULL,
  file_size integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_invoices" ON invoices;
CREATE POLICY "anon_select_invoices" ON invoices FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_invoices" ON invoices;
CREATE POLICY "anon_insert_invoices" ON invoices FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_invoices" ON invoices;
CREATE POLICY "anon_update_invoices" ON invoices FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_invoices" ON invoices;
CREATE POLICY "anon_delete_invoices" ON invoices FOR DELETE
  TO anon, authenticated USING (true);
