/*
# Create winning_articles table (single-tenant, no auth)

1. New Tables
   - `winning_articles`
     - `id` (uuid, primary key)
     - `name` (text, not null) — product name
     - `brand` (text) — brand name
     - `avg_sale_price` (numeric) — average selling price
     - `estimated_margin` (numeric) — estimated profit margin percentage
     - `velocity_score` (integer) — sales velocity 0-100
     - `trend` (text) — "rising", "stable", "falling"
     - `notes` (text) — admin notes
     - `created_at` (timestamptz)

2. Security
   - Enable RLS on `winning_articles`.
   - Allow anon + authenticated full CRUD (single-tenant, no auth).
*/

CREATE TABLE IF NOT EXISTS winning_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text DEFAULT '',
  avg_sale_price numeric DEFAULT 0,
  estimated_margin numeric DEFAULT 0,
  velocity_score integer DEFAULT 50,
  trend text DEFAULT 'stable',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE winning_articles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_winning_articles" ON winning_articles;
CREATE POLICY "anon_select_winning_articles" ON winning_articles FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_winning_articles" ON winning_articles;
CREATE POLICY "anon_insert_winning_articles" ON winning_articles FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_winning_articles" ON winning_articles;
CREATE POLICY "anon_update_winning_articles" ON winning_articles FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_winning_articles" ON winning_articles;
CREATE POLICY "anon_delete_winning_articles" ON winning_articles FOR DELETE
  TO anon, authenticated USING (true);
