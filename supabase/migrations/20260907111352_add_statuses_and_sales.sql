/*
# Add unit status columns and sales table

1. Modified Tables
   - `inventory_items`
     - `qty_available` (integer, default = quantity) — units not yet listed
     - `qty_published` (integer, default 0) — units listed on platforms
     - `qty_reserved` (integer, default 0) — units reserved by buyers

2. New Tables
   - `sales`
     - `id` (uuid, primary key)
     - `inventory_item_id` (uuid, FK to inventory_items)
     - `item_name` (text) — snapshot of name at sale time
     - `item_size` (text) — snapshot of size
     - `cost_price` (numeric) — cost per unit at sale time
     - `sale_price` (numeric) — actual sale price entered by user
     - `sold_at` (timestamptz) — when the sale was recorded

3. Security
   - RLS enabled on `sales` with anon+authenticated CRUD (single-tenant, no auth).
   - Existing inventory_items policies remain unchanged.

4. Notes
   - qty_available defaults to the current quantity value for existing rows.
   - No destructive changes.
*/

-- Add status breakdown columns to inventory_items
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'qty_available'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN qty_available integer NOT NULL DEFAULT 0;
    ALTER TABLE inventory_items ADD COLUMN qty_published integer NOT NULL DEFAULT 0;
    ALTER TABLE inventory_items ADD COLUMN qty_reserved integer NOT NULL DEFAULT 0;
    -- Backfill: set all existing units as available
    UPDATE inventory_items SET qty_available = quantity;
  END IF;
END $$;

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_item_id uuid REFERENCES inventory_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  item_size text NOT NULL,
  cost_price numeric NOT NULL,
  sale_price numeric NOT NULL,
  sold_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_sales" ON sales;
CREATE POLICY "anon_select_sales" ON sales FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_sales" ON sales;
CREATE POLICY "anon_insert_sales" ON sales FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_sales" ON sales;
CREATE POLICY "anon_update_sales" ON sales FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_sales" ON sales;
CREATE POLICY "anon_delete_sales" ON sales FOR DELETE
  TO anon, authenticated USING (true);
