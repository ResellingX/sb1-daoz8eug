/*
# Add quantity column to inventory_items

1. Modified Tables
   - `inventory_items`
     - `quantity` (integer, not null, default 1) — number of pairs in stock

2. Notes
   - Existing rows get quantity = 1 by default.
   - No destructive changes.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory_items' AND column_name = 'quantity'
  ) THEN
    ALTER TABLE inventory_items ADD COLUMN quantity integer NOT NULL DEFAULT 1;
  END IF;
END $$;
